// Avvisi delle revisioni per email (modulo Scadenze).
// Il titolare, nella pagina Scadenze, indica a chi mandarli e quali attivare:
//  - riepilogo mensile: il primo del mese, le revisioni che scadono questo mese e il prossimo (più quelle già scadute)
//  - per ogni mezzo: a 60, 30, 10, 7 giorni e il giorno prima della scadenza
// Il controllo gira all'avvio e ogni 30 minuti, e manda solo dopo le 7 di mattina (ora italiana).
// Se il server era spento proprio quel giorno, l'avviso parte appena si riaccende (non si perde).
// Quando si registra la revisione la scadenza cambia: gli avvisi del vecchio ciclo si fermano e ne parte uno nuovo.
const { pool } = require('./db');
const email = require('./email');
const { funzioniAttive } = require('./funzioni');

const PASSI = [60, 30, 10, 7, 1];
const PREDEFINITE = { email: [], mensile: true, giorni: { 60: true, 30: true, 10: true, 7: true, 1: true } };
const ORA_INVIO = 7;
const MAX_TENTATIVI = 5;

// Impostazioni dell'azienda, sempre complete
function leggiImpostazioni(imp) {
  const a = (imp && imp.avvisiRevisioni) || {};
  const giorni = {};
  PASSI.forEach((g) => { giorni[g] = !(a.giorni && a.giorni[g] === false); });
  return {
    email: Array.isArray(a.email) ? a.email.filter((x) => email.EMAIL_VALIDA.test(x)) : [],
    mensile: a.mensile !== false,
    giorni,
  };
}

// ---------- date (sempre in ora italiana) ----------
function adessoRoma(d) {
  const p = {};
  new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Rome', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23' })
    .formatToParts(d || new Date()).forEach((x) => { p[x.type] = x.value; });
  return { oggi: `${p.year}-${p.month}-${p.day}`, ora: Number(p.hour) };
}
const giorniTra = (da, a) => Math.round((Date.parse(a + 'T00:00:00Z') - Date.parse(da + 'T00:00:00Z')) / 86400000);
function dataIt(iso) { const [y, m, d] = iso.split('-'); return `${d}/${m}/${y}`; }
const MESI = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
function fineMeseProssimo(oggi) {
  const [y, m] = oggi.split('-').map(Number);   // m = 1..12
  const d = new Date(Date.UTC(y, m + 1, 0));    // ultimo giorno del mese successivo
  return d.toISOString().slice(0, 10);
}
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const nomeMezzo = (m) => m.nome + (m.targa && m.targa !== m.nome ? ' (' + m.targa + ')' : '');
const traGiorni = (g) => g < 0 ? `scaduta da ${-g} ${g === -1 ? 'giorno' : 'giorni'}` : g === 0 ? 'scade oggi' : g === 1 ? 'scade domani' : `tra ${g} giorni`;

// Quale avviso del singolo mezzo tocca oggi: quello del passo attivo più vicino non ancora superato.
// Es. con 25 giorni alla scadenza tocca quello dei 30 (se si è perso), non quello dei 60.
function passoDiOggi(g, giorni) {
  const attivi = PASSI.filter((p) => giorni[p]).sort((a, b) => a - b);   // 1, 7, 10, 30, 60
  if (g < 0) return null;
  for (let i = 0; i < attivi.length; i++) {
    const p = attivi[i], sotto = i === 0 ? -1 : attivi[i - 1];
    if (g <= p && g > sotto) return p;
  }
  return null;
}

// ---------- testi delle email ----------
function cornice(titolo, corpoHtml, azienda) {
  const url = email.indirizzoStiva();
  const bottone = url ? `<p style="margin:24px 0 0"><a href="${esc(url)}/#/scadenze" style="background:#F5B800;color:#0E0F11;text-decoration:none;padding:11px 18px;border-radius:6px;font-weight:600;display:inline-block">Apri le scadenze in Stiva</a></p>` : '';
  return `<!doctype html><html><body style="margin:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;color:#111827">
<div style="max-width:620px;margin:0 auto;padding:24px 16px">
<div style="background:#fff;border-radius:10px;padding:26px 24px;border:1px solid #e5e7eb">
<div style="font-size:13px;color:#6b7280;letter-spacing:.04em;text-transform:uppercase;margin-bottom:6px">${esc(azienda)} · Scadenze revisioni</div>
<h1 style="font-size:21px;margin:0 0 16px;line-height:1.3">${titolo}</h1>
${corpoHtml}${bottone}
</div>
<p style="font-size:12px;color:#9ca3af;margin:14px 4px 0">Avviso automatico di Stiva. Il titolare può cambiare destinatari e avvisi nella pagina Scadenze.</p>
</div></body></html>`;
}

const AZIONE = {
  60: { titolo: 'fissare la prova e prenotare la revisione', testo: 'Scade questa revisione: <b>fissare la prova e prenotare la revisione</b>.' },
  30: { titolo: 'prove fatte? revisione prenotata?', testo: '<b>Le prove sono state fatte? La revisione è prenotata o già fatta?</b><br>Se la revisione è già fatta, registrala in Stiva (Scadenze → Registra revisione): così gli avvisi per questo mezzo si fermano.' },
  10: { titolo: 'mancano 10 giorni', testo: 'Mancano pochi giorni. <b>Controlla che l’appuntamento per la revisione sia confermato</b> e che le prove siano fatte.' },
  7: { titolo: 'manca una settimana', testo: 'Manca una settimana. <b>Verifica data e ora dell’appuntamento</b> e organizza i viaggi del mezzo per quel giorno.' },
  1: { titolo: 'portare il mezzo alla revisione', testo: '<b>Portare il mezzo alla revisione.</b>' },
};

function emailMezzo(m, passo, g, azienda) {
  const a = AZIONE[passo];
  const quando = g === 0 ? 'scade OGGI' : g === 1 ? 'scade DOMANI' : `scade tra ${g} giorni`;
  const oggetto = (passo === 1 ? (g === 0 ? 'OGGI' : 'DOMANI') + ' – portare il mezzo alla revisione: ' : `Revisione ${nomeMezzo(m)}: `) +
    (passo === 1 ? nomeMezzo(m) : a.titolo) + ` (scade il ${dataIt(m.scadenza)})`;
  const righe = [
    ['Mezzo', esc(nomeMezzo(m))],
    ['Scadenza revisione', `<b>${dataIt(m.scadenza)}</b> (${quando})`],
    m.ultima ? ['Ultima revisione', dataIt(m.ultima) + (m.officina ? ' – ' + esc(m.officina) : '')] : null,
  ].filter(Boolean);
  const html = cornice(`La revisione di ${esc(nomeMezzo(m))} ${quando}`,
    `<p style="font-size:16px;line-height:1.5;margin:0 0 16px;padding:12px 14px;background:${passo <= 7 ? '#fef2f2' : '#eff6ff'};border-radius:6px">${a.testo}</p>
<table style="border-collapse:collapse;font-size:14px">${righe.map(([k, v]) => `<tr><td style="padding:4px 14px 4px 0;color:#6b7280">${k}</td><td style="padding:4px 0">${v}</td></tr>`).join('')}</table>`, azienda);
  const testo = `${azienda} – Scadenze revisioni\n\nLa revisione di ${nomeMezzo(m)} ${quando} (${dataIt(m.scadenza)}).\n` +
    a.testo.replace(/<br>/g, '\n').replace(/<[^>]+>/g, '') + (email.indirizzoStiva() ? `\n\nApri Stiva: ${email.indirizzoStiva()}/#/scadenze` : '');
  return { oggetto, html, testo };
}

function emailMensile(mezzi, senzaData, oggi, azienda) {
  const fine = fineMeseProssimo(oggi);
  const [y, mm] = oggi.split('-').map(Number);
  const periodo = `${MESI[mm - 1]} e ${MESI[mm % 12]}${mm === 12 ? ' ' + (y + 1) : ''}`;
  const lista = mezzi.map((m) => ({ ...m, g: giorniTra(oggi, m.scadenza) })).filter((m) => m.scadenza <= fine).sort((a, b) => a.scadenza.localeCompare(b.scadenza));
  const scadute = lista.filter((m) => m.g < 0), prossime = lista.filter((m) => m.g >= 0);
  const oggetto = prossime.length || scadute.length
    ? `Revisioni di ${periodo}: ${prossime.length} in scadenza` + (scadute.length ? `, ${scadute.length} già scadut${scadute.length === 1 ? 'a' : 'e'}` : '')
    : `Revisioni di ${periodo}: nessuna scadenza`;
  const riga = (m) => `<tr><td style="padding:8px 10px;border-bottom:1px solid #e5e7eb">${esc(nomeMezzo(m))}</td>` +
    `<td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;white-space:nowrap"><b>${dataIt(m.scadenza)}</b></td>` +
    `<td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;color:${m.g < 0 ? '#b91c1c' : m.g <= 30 ? '#b45309' : '#374151'};white-space:nowrap">${traGiorni(m.g)}</td></tr>`;
  const tabella = (righe) => `<table style="border-collapse:collapse;width:100%;font-size:14px"><tr style="background:#f9fafb;text-align:left">` +
    `<th style="padding:8px 10px">Mezzo</th><th style="padding:8px 10px">Scadenza</th><th style="padding:8px 10px">Quando</th></tr>${righe.map(riga).join('')}</table>`;
  let corpo = '';
  if (scadute.length) corpo += `<p style="margin:0 0 8px;color:#b91c1c;font-weight:600">Già scadute: questi mezzi non possono circolare</p>${tabella(scadute)}<div style="height:18px"></div>`;
  corpo += prossime.length
    ? `<p style="margin:0 0 8px;font-weight:600">In scadenza a ${periodo}</p>${tabella(prossime)}
<p style="font-size:14px;color:#374151;line-height:1.5;margin:14px 0 0">Per ogni mezzo arriveranno anche gli avvisi singoli prima della scadenza. Quando la revisione è fatta, registrala in Stiva: gli avvisi di quel mezzo si fermano.</p>`
    : `<p style="font-size:15px;margin:0">Nessuna revisione in scadenza a ${periodo}.</p>`;
  if (senzaData) corpo += `<p style="font-size:14px;color:#b45309;margin:14px 0 0">${senzaData === 1 ? 'Un mezzo non ha' : senzaData + ' mezzi non hanno'} la data di scadenza della revisione: inseriscila in Stiva, altrimenti non arrivano avvisi.</p>`;
  const html = cornice(`Le revisioni dei prossimi 2 mesi`, corpo, azienda);
  const testo = `${azienda} – Revisioni di ${periodo}\n\n` +
    (scadute.length ? 'GIÀ SCADUTE:\n' + scadute.map((m) => `- ${nomeMezzo(m)}: ${dataIt(m.scadenza)} (${traGiorni(m.g)})`).join('\n') + '\n\n' : '') +
    (prossime.length ? 'IN SCADENZA:\n' + prossime.map((m) => `- ${nomeMezzo(m)}: ${dataIt(m.scadenza)} (${traGiorni(m.g)})`).join('\n') : 'Nessuna revisione in scadenza.') +
    (senzaData ? `\n\n${senzaData} mezzi senza data di scadenza della revisione.` : '') +
    (email.indirizzoStiva() ? `\n\nApri Stiva: ${email.indirizzoStiva()}/#/scadenze` : '');
  return { oggetto, html, testo };
}

// ---------- registro e invio (una sola volta per avviso, anche con più server accesi) ----------
async function prenota(chiave, aziendaId, mezzoId, tipo) {
  const { rows } = await pool.query(
    `INSERT INTO avvisi_inviati (chiave, azienda_id, mezzo_id, tipo) VALUES ($1,$2,$3,$4)
     ON CONFLICT (chiave) DO UPDATE SET tentativi = avvisi_inviati.tentativi + 1, esito = 'in_corso', errore = NULL, creato_il = now()
       WHERE avvisi_inviati.esito = 'errore' AND avvisi_inviati.tentativi < ${MAX_TENTATIVI}
     RETURNING id`, [chiave, aziendaId, mezzoId, tipo]);
  return rows.length ? rows[0].id : null;
}
async function spedisci(id, destinatari, msg) {
  try {
    await email.invia({ a: destinatari, oggetto: msg.oggetto, html: msg.html, testo: msg.testo });
    await pool.query("UPDATE avvisi_inviati SET esito='inviato', oggetto=$2, destinatari=$3 WHERE id=$1", [id, msg.oggetto, destinatari.join(', ')]);
    return true;
  } catch (e) {
    await pool.query("UPDATE avvisi_inviati SET esito='errore', errore=$2, oggetto=$3, destinatari=$4 WHERE id=$1",
      [id, String(e.message).slice(0, 500), msg.oggetto, destinatari.join(', ')]);
    console.error('Avviso revisione non inviato:', e.message);
    return false;
  }
}

// Il controllo vero e proprio. 'quando' serve solo alle prove (una data finta).
let inCorso = false;
async function controlla(quando) {
  if (inCorso || !email.attivo()) return { saltato: true };
  inCorso = true;
  const fatti = { mensili: 0, mezzi: 0, errori: 0 };
  try {
    const { oggi, ora } = adessoRoma(quando);
    if (ora < ORA_INVIO) return { saltato: true, motivo: 'presto' };
    const az = await pool.query("SELECT id, nome, funzioni, impostazioni FROM aziende WHERE attiva AND impostazioni ? 'avvisiRevisioni'");
    for (const a of az.rows) {
      if (!funzioniAttive(a.funzioni).scadenze) continue;
      const cfg = leggiImpostazioni(a.impostazioni);
      if (!cfg.email.length) continue;
      const { rows } = await pool.query(
        `SELECT id, nome, targa, to_char(scadenza_revisione,'YYYY-MM-DD') AS scadenza, to_char(ultima_revisione,'YYYY-MM-DD') AS ultima, officina_revisione AS officina
           FROM mezzi WHERE azienda_id=$1 AND proprieta='proprio' ORDER BY nome`, [a.id]);
      const conData = rows.filter((m) => m.scadenza), senzaData = rows.length - conData.length;

      // riepilogo del mese (dal primo al terzo giorno, se il primo il server era spento)
      if (cfg.mensile && Number(oggi.slice(8, 10)) <= 3) {
        const id = await prenota('mese:' + a.id + ':' + oggi.slice(0, 7), a.id, null, 'mensile');
        if (id) (await spedisci(id, cfg.email, emailMensile(conData, senzaData, oggi, a.nome))) ? fatti.mensili++ : fatti.errori++;
      }
      // avvisi dei singoli mezzi
      for (const m of conData) {
        const g = giorniTra(oggi, m.scadenza);
        const passo = passoDiOggi(g, cfg.giorni);
        if (!passo) continue;
        const id = await prenota(`m:${m.id}:${m.scadenza}:${passo}`, a.id, m.id, 'g' + passo);
        if (id) (await spedisci(id, cfg.email, emailMezzo(m, passo, g, a.nome))) ? fatti.mezzi++ : fatti.errori++;
      }
    }
  } catch (e) {
    if (!/does not exist/.test(e.message)) console.error('Controllo avvisi revisioni:', e.message);
  } finally { inCorso = false; }
  return fatti;
}

function avvia() {
  setTimeout(() => controlla(), 20000).unref();
  setInterval(() => controlla(), 30 * 60 * 1000).unref();
}

// Email di prova dalla pagina Scadenze
async function prova(aziendaId, destinatari) {
  const { rows } = await pool.query('SELECT nome FROM aziende WHERE id=$1', [aziendaId]);
  const nome = rows.length ? rows[0].nome : 'Stiva';
  const html = cornice('Email di prova',
    '<p style="font-size:15px;line-height:1.5;margin:0">Se leggi questo messaggio, gli avvisi delle revisioni arriveranno a questo indirizzo.</p>', nome);
  await email.invia({ a: destinatari, oggetto: 'Stiva – prova degli avvisi delle revisioni', html,
    testo: 'Se leggi questo messaggio, gli avvisi delle revisioni arriveranno a questo indirizzo.' });
}

async function ultimi(aziendaId, quanti) {
  const { rows } = await pool.query(
    `SELECT tipo, oggetto, destinatari, esito, errore, creato_il FROM avvisi_inviati
      WHERE azienda_id=$1 AND esito <> 'in_corso' ORDER BY creato_il DESC LIMIT $2`, [aziendaId, quanti || 15]);
  return rows;
}

module.exports = { avvia, controlla, prova, ultimi, leggiImpostazioni, passoDiOggi, PASSI, emailMezzo, emailMensile };
