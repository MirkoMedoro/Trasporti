// Calcolatore: foto dal telefono.
// Il computer apre una "sessione foto" e mostra un QR code. Il telefono lo inquadra, apre la pagina
// /scatta/<codice> (senza bisogno di accedere) e invia le foto. Il computer le riceve e ne legge le misure.
// Il codice vale 30 minuti ed è legato all'utente che l'ha creato. Le foto restano solo in memoria
// finché il computer le preleva: non vengono salvate nel database.
const express = require('express');
const crypto = require('crypto');
const { richiediLogin, richiediAzienda, richiediFunzione, richiediRuolo } = require('../auth');
const consumi = require('../consumiAi');

const r = express.Router();

const DURATA_MS = 30 * 60 * 1000;
const MAX_FOTO = 10;
const MAX_BASE64 = 16 * 1024 * 1024; // circa 12 MB di immagine
const sessioni = new Map();

function pulisciScadute() {
  const ora = Date.now();
  for (const [k, s] of sessioni) if (s.scade < ora) sessioni.delete(k);
}
setInterval(pulisciScadute, 5 * 60 * 1000).unref();

function sessioneValida(codice) {
  const s = sessioni.get(String(codice || ''));
  if (!s || s.scade < Date.now()) return null;
  return s;
}

// ---------- dal telefono (nessun accesso: vale il codice) ----------
r.get('/telefono/:codice', (req, res) => {
  const s = sessioneValida(req.params.codice);
  if (!s) return res.status(404).json({ errore: 'Collegamento scaduto: sul computer premi di nuovo "Leggi da foto" nel Calcolatore e inquadra il nuovo QR code.' });
  s.telefono = true;
  res.json({ azienda: s.azienda, utente: s.nomeUtente, inviate: s.inviate, max: MAX_FOTO });
});

r.post('/telefono/:codice', (req, res) => {
  const s = sessioneValida(req.params.codice);
  if (!s) return res.status(404).json({ errore: 'Collegamento scaduto: sul computer premi di nuovo "Leggi da foto" nel Calcolatore e inquadra il nuovo QR code.' });
  const tipo = String(req.body.tipo || ''), dati = String(req.body.dati || '');
  if (!/^image\/(jpeg|png|webp)$/.test(tipo)) return res.status(400).json({ errore: 'Invia una foto (JPG o PNG).' });
  if (!dati || dati.length > MAX_BASE64 || !/^[A-Za-z0-9+/=]+$/.test(dati.slice(0, 200))) return res.status(400).json({ errore: 'Foto mancante o troppo grande.' });
  if (s.inviate >= MAX_FOTO) return res.status(429).json({ errore: 'Hai già inviato ' + MAX_FOTO + ' foto con questo collegamento.' });
  s.telefono = true;
  s.inviate++;
  s.foto.push({ tipo, dati, ora: Date.now() });
  res.json({ ok: true, inviate: s.inviate });
});

// ---------- dal computer ----------
const pc = express.Router();
pc.use(richiediLogin, richiediAzienda, richiediFunzione('tassato'));

pc.post('/sessione', (req, res) => {
  pulisciScadute();
  // una sola sessione aperta per utente
  for (const [k, s] of sessioni) if (s.utenteId === req.utente.id) sessioni.delete(k);
  const codice = crypto.randomBytes(18).toString('base64url');
  sessioni.set(codice, {
    utenteId: req.utente.id, aziendaId: req.utente.azienda_id,
    azienda: req.utente.azienda_nome || '', nomeUtente: req.utente.nome || '',
    scade: Date.now() + DURATA_MS, foto: [], inviate: 0, telefono: false,
  });
  const base = (req.get('x-forwarded-proto') || req.protocol) + '://' + req.get('host');
  res.json({ codice, indirizzo: base + '/scatta/' + codice, scade: Date.now() + DURATA_MS });
});

// Il computer chiede se sono arrivate foto (e le preleva)
pc.get('/sessione/:codice', (req, res) => {
  const s = sessioneValida(req.params.codice);
  if (!s || s.utenteId !== req.utente.id) return res.status(404).json({ errore: 'Collegamento scaduto.' });
  const foto = s.foto; s.foto = [];
  res.json({ telefono: s.telefono, foto, scade: s.scade });
});

pc.delete('/sessione/:codice', (req, res) => {
  const s = sessioneValida(req.params.codice);
  if (s && s.utenteId === req.utente.id) sessioni.delete(req.params.codice);
  res.json({ ok: true });
});

// ---------- lettura intelligente delle misure (facoltativa, a pagamento a consumo) ----------
// Si possono usare più fornitori: basta mettere su Railway la chiave di quelli che si vogliono.
//   ANTHROPIC_API_KEY  (Claude)       modello: ANTHROPIC_MODEL (predefinito claude-sonnet-5-5)
//   GEMINI_API_KEY     (Google)       modello: GEMINI_MODEL    (predefinito gemini-3.8-flash)
//   MISTRAL_API_KEY    (Mistral, UE)  modello: MISTRAL_MODEL   (predefinito mistral-large-latest)
//   QWEN_API_KEY       (Alibaba)      modello: QWEN_MODEL      (predefinito qwen3-vl-plus); indirizzo: QWEN_BASE_URL
//   LETTURA_AI = anthropic | gemini | mistral | qwen  -> quale usare di solito (se manca: il primo con la chiave)
const ISTRUZIONI = `Questa foto mostra un foglio, un'email, una packing list o una tabella con le misure dei colli di una spedizione (azienda di trasporti italiana). Può essere in italiano o in un'altra lingua, stampata o scritta a mano.
Estrai le righe dei colli seguendo queste regole:
- COLLI: numero di colli della riga (colonne tipo Qty, Quantity, Pcs, Colli, NrPacking). Se il numero non c'è o la cella è vuota, vale 1.
  ATTENZIONE: colonne come "Packages", "Item", "Package no." che contengono codici (es. 2973, 2969/2970) NON sono il numero di colli.
- MISURE: lunghezza, larghezza, altezza in centimetri (converti da metri o millimetri). Le misure di una riga sono quelle di UN collo.
- PESO: solo il peso LORDO (Gross weight, Peso lordo, Peso). Ignora il peso netto (Net weight). Se il peso non c'è, lascia null.
  Indica se il peso scritto è di un singolo collo o di tutta la riga: nelle packing list con una riga "Total", se la somma dei pesi delle righe dà il totale, il peso è della riga intera.
- IGNORA: volumi/metri cubi (Cube, CBM, Volume), codici articolo, descrizioni dei prodotti, prezzi, costi, tariffe, diritti, fuel, IVA, firme, indirizzi, numeri scritti a mano sul margine.
- La riga "Total"/"Totale" NON è un collo: riporta i suoi valori solo in "totali".
- Nelle email o nei testi: prendi solo le righe dell'elenco (puntato o a righe) con le misure; ignora le misure citate dentro le frasi del testo se sono ripetute nell'elenco.
- NON SOVRAPPONIBILE: true solo se è scritto sulla riga di quel collo (non sovrapponibile, non impilabile, NS, non stackable). Una frase generale nel testo non conta: lo decide l'operatore.
- Non inventare numeri: se una cifra non si legge bene metti "incerto": true su quella riga (e null dove non si legge proprio).
Rispondi SOLO con un oggetto JSON valido, senza altro testo:
{"righe": [{"tipo_collo": "bancale, cassa, cartone… solo se indicato, altrimenti stringa vuota",
            "colli": numero, "lunghezza_cm": numero o null, "larghezza_cm": numero o null, "altezza_cm": numero o null,
            "peso_lordo_kg": numero o null, "peso_della_riga_intera": true se il peso è di tutti i colli della riga, false se di un collo,
            "non_sovrapponibile": true/false, "incerto": true/false}],
 "totali": {"colli": numero scritto nella riga Totale o null, "peso_lordo_kg": numero scritto nella riga Totale o null}}`;

async function chiamaJson(url, opzioni, nome) {
  const risp = await fetch(url, opzioni);
  const corpo = await risp.json().catch(() => ({}));
  if (!risp.ok) {
    console.error('Lettura misure ' + nome + ':', risp.status, JSON.stringify(corpo).slice(0, 400));
    const msg = (corpo.error && (corpo.error.message || corpo.error)) || corpo.message || '';
    throw new Error(nome + ' ha risposto con un errore (' + risp.status + ')' + (msg ? ': ' + String(msg).slice(0, 200) : '') + '.');
  }
  return corpo;
}

const FORNITORI = {
  anthropic: {
    nome: 'Claude (Anthropic)',
    chiave: () => process.env.ANTHROPIC_API_KEY,
    modello: () => process.env.ANTHROPIC_MODEL || 'claude-sonnet-5-5',
    async leggi(tipo, dati, segnale) {
      const modello = this.modello();
      // leggere una tabella non richiede ragionamento: sforzo basso = più rapido e meno token pagati (Haiku non lo accetta)
      const extra = /sonnet-5|opus-5|fable-5/.test(modello) ? { output_config: { effort: 'low' }, thinking: { type: 'between_tools' } } : {};
      const corpo = await chiamaJson('https://api.anthropic.com/v1/messages', {
        method: 'POST', signal: segnale,
        headers: { 'x-api-key': this.chiave(), 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
        body: JSON.stringify({
          model: modello, max_tokens: 8000, ...extra,
          messages: [{ role: 'user', content: [
            { type: 'image', source: { type: 'base64', media_type: tipo, data: dati } },
            { type: 'text', text: ISTRUZIONI },
          ] }],
        }),
      }, this.nome);
      const u = corpo.usage || {};
      return { testo: (corpo.content || []).filter((c) => c.type === 'text').map((c) => c.text).join(''), tokIn: u.input_tokens, tokOut: u.output_tokens };
    },
  },
  gemini: {
    nome: 'Gemini (Google)',
    chiave: () => process.env.GEMINI_API_KEY,
    modello: () => process.env.GEMINI_MODEL || 'gemini-3.8-flash',
    async leggi(tipo, dati, segnale) {
      const modello = this.modello();
      const corpo = await chiamaJson('https://generativelanguage.googleapis.com/v1beta/models/' + encodeURIComponent(modello) + ':generateContent', {
        method: 'POST', signal: segnale,
        headers: { 'x-goog-api-key': this.chiave(), 'content-type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ inline_data: { mime_type: tipo, data: dati } }, { text: ISTRUZIONI }] }],
          generationConfig: { responseMimeType: 'application/json', temperature: 0, maxOutputTokens: 8000, thinkingConfig: { thinkingLevel: 'low' } },
        }),
      }, this.nome);
      const c = (corpo.candidates || [])[0] || {};
      const u = corpo.usageMetadata || {};
      return {
        testo: ((c.content && c.content.parts) || []).filter((x) => !x.thought).map((x) => x.text || '').join(''),
        tokIn: u.promptTokenCount, tokOut: (u.candidatesTokenCount || 0) + (u.thoughtsTokenCount || 0),
      };
    },
  },
  mistral: {
    nome: 'Mistral (Francia)',
    chiave: () => process.env.MISTRAL_API_KEY,
    modello: () => process.env.MISTRAL_MODEL || 'mistral-large-latest',
    async leggi(tipo, dati, segnale) {
      const modello = this.modello();
      const corpo = await chiamaJson('https://api.mistral.ai/v1/chat/completions', {
        method: 'POST', signal: segnale,
        headers: { authorization: 'Bearer ' + this.chiave(), 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({
          model: modello, temperature: 0, max_tokens: 8000, response_format: { type: 'json_object' },
          messages: [{ role: 'user', content: [
            { type: 'text', text: ISTRUZIONI },
            { type: 'image_url', image_url: 'data:' + tipo + ';base64,' + dati },
          ] }],
        }),
      }, this.nome);
      const m = ((corpo.choices || [])[0] || {}).message || {};
      const testo = Array.isArray(m.content) ? m.content.map((x) => x.text || '').join('') : String(m.content || '');
      const u = corpo.usage || {};
      return { testo, tokIn: u.prompt_tokens, tokOut: u.completion_tokens };
    },
  },
  qwen: {
    nome: 'Qwen (Alibaba)',
    // chiave creata su Alibaba Cloud Model Studio (versione internazionale)
    chiave: () => process.env.QWEN_API_KEY || process.env.DASHSCOPE_API_KEY,
    modello: () => process.env.QWEN_MODEL || 'qwen3-vl-plus',
    indirizzo: () => (process.env.QWEN_BASE_URL || 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1').replace(/\/+$/, ''),
    async leggi(tipo, dati, segnale) {
      const modello = this.modello();
      const corpo = await chiamaJson(this.indirizzo() + '/chat/completions', {
        method: 'POST', signal: segnale,
        headers: { authorization: 'Bearer ' + this.chiave(), 'content-type': 'application/json' },
        body: JSON.stringify({
          model: modello, temperature: 0, max_tokens: 8000, enable_thinking: false,
          messages: [{ role: 'user', content: [
            { type: 'image_url', image_url: { url: 'data:' + tipo + ';base64,' + dati } },
            { type: 'text', text: ISTRUZIONI },
          ] }],
        }),
      }, this.nome);
      const m = ((corpo.choices || [])[0] || {}).message || {};
      const testo = Array.isArray(m.content) ? m.content.map((x) => x.text || '').join('') : String(m.content || '');
      const u = corpo.usage || {};
      return { testo, tokIn: u.prompt_tokens, tokOut: u.completion_tokens };
    },
  },
};
const attivi = () => Object.keys(FORNITORI).filter((k) => !!FORNITORI[k].chiave());
function predefinito() {
  const a = attivi(), scelto = String(process.env.LETTURA_AI || '').toLowerCase();
  return a.includes(scelto) ? scelto : a[0] || null;
}

// trasforma la risposta (JSON) nelle righe del Calcolatore e controlla i totali
function interpreta(testo) {
  const json = JSON.parse(testo.slice(testo.indexOf('{'), testo.lastIndexOf('}') + 1));
  const numero = (v) => (v === null || v === undefined || v === '' || !Number.isFinite(Number(v)) ? '' : Number(v));
  const righe = (Array.isArray(json.righe) ? json.righe : []).slice(0, 200).map((x) => {
    const n = numero(x.colli) > 0 ? numero(x.colli) : 1;
    let peso = numero(x.peso_lordo_kg);
    if (peso !== '' && x.peso_della_riga_intera && n > 1) peso = Math.round(peso / n * 10) / 10;   // peso per collo
    const l = numero(x.lunghezza_cm), p = numero(x.larghezza_cm), h = numero(x.altezza_cm);
    return {
      nome: String(x.tipo_collo || '').slice(0, 60), n, l, p, h, peso,
      impilabile: !x.non_sovrapponibile,
      incompleta: !!x.incerto || l === '' || p === '' || h === '',
    };
  }).filter((x) => x.l !== '' || x.p !== '' || x.h !== '');
  let totali = null;
  const t = json.totali || {};
  const totColli = numero(t.colli), totPeso = numero(t.peso_lordo_kg);
  if (totColli !== '' || totPeso !== '') {
    const colli = righe.reduce((a, x) => a + x.n, 0);
    const peso = Math.round(righe.reduce((a, x) => a + (x.peso === '' ? 0 : x.peso * x.n), 0) * 10) / 10;
    totali = {
      colliFoglio: totColli === '' ? null : totColli, colliLetti: colli, colliOk: totColli === '' ? null : totColli === colli,
      pesoFoglio: totPeso === '' ? null : totPeso, pesoLetto: peso, pesoOk: totPeso === '' ? null : Math.abs(peso - totPeso) <= Math.max(1, totPeso * 0.01),
    };
  }
  return { righe, totali };
}

// legge una foto con un fornitore e registra la spesa
async function leggiCon(id, tipo, dati, chi) {
  const f = FORNITORI[id];
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 120000);
  const t0 = Date.now();
  try {
    const r = await f.leggi(tipo, dati, ctrl.signal);
    const costo = await consumi.registra({ aziendaId: chi.aziendaId, utenteId: chi.utenteId, funzione: chi.funzione, fornitore: id, modello: f.modello(), tokIn: r.tokIn, tokOut: r.tokOut });
    let letto;
    try { letto = interpreta(r.testo); } catch (e) {
      console.error('Lettura misure ' + f.nome + ': risposta non valida', String(r.testo).slice(0, 300));
      throw new Error(f.nome + ' ha dato una risposta non leggibile.');
    }
    return { ...letto, fornitore: id, nome: f.nome, modello: f.modello(), secondi: Math.round((Date.now() - t0) / 100) / 10, tokIn: r.tokIn || null, tokOut: r.tokOut || null, costoUsd: costo };
  } catch (e) {
    console.error('Lettura misure ' + f.nome + ':', e.message);
    throw new Error(e.name === 'AbortError' ? f.nome + ' non ha risposto in tempo.' : (e.message || 'Non sono riuscito a leggere la foto.'));
  } finally { clearTimeout(timer); }
}
function fotoValida(req, res) {
  const tipo = String(req.body.tipo || ''), dati = String(req.body.dati || '');
  if (!/^image\/(jpeg|png|webp)$/.test(tipo)) { res.status(400).json({ errore: 'Formato non supportato: usa una foto JPG o PNG.' }); return null; }
  if (!dati || dati.length > MAX_BASE64) { res.status(400).json({ errore: 'Foto mancante o troppo grande.' }); return null; }
  return { tipo, dati };
}

// Calcolatore (utenti delle aziende): usa il fornitore predefinito. L'operatore sceglie lui se usare la lettura
// intelligente; con il sistema a credito ogni lettura riuscita scala il prezzo dal credito dell'azienda.
// I costi verso i fornitori non vengono mai mostrati ai clienti.
pc.get('/stato', async (req, res, next) => {
  try {
    if (!predefinito()) return res.json({ ai: false });
    const v = await consumi.verifica(req.utente.azienda_id);
    if (!v.ok && v.motivo === 'spenta') return res.json({ ai: false });
    res.json({ ai: true, disponibile: v.ok, avviso: v.ok ? null : v.messaggio, credito: await consumi.statoCredito(req.utente.azienda_id) });
  } catch (e) { next(e); }
});

pc.post('/leggi', async (req, res) => {
  const id = predefinito();
  if (!id) return res.status(501).json({ errore: 'La lettura intelligente non è attiva.' });
  const foto = fotoValida(req, res); if (!foto) return;
  try {
    const v = await consumi.verifica(req.utente.azienda_id);
    if (!v.ok) return res.status(402).json({ errore: v.messaggio, limite: true });
    const credito = await consumi.statoCredito(req.utente.azienda_id);
    if (credito.attivo && credito.esaurito) return res.status(402).json({ errore: 'Credito della lettura intelligente esaurito: chiedi una ricarica. Intanto puoi usare la lettura gratuita.', credito });
    const r = await leggiCon(id, foto.tipo, foto.dati, { aziendaId: req.utente.azienda_id, utenteId: req.utente.id, funzione: 'calcolatore' });
    await consumi.addebita(req.utente.azienda_id, req.utente.id, r.righe.length + ' righe');
    res.json({ righe: r.righe, totali: r.totali, credito: await consumi.statoCredito(req.utente.azienda_id) });
  } catch (e) { res.status(502).json({ errore: e.message + ' Nessun credito è stato scalato: riprova o usa la lettura gratuita.' }); }
});

// ---------- Prova e confronto dei lettori (solo super amministratore) ----------
const prova = express.Router();
prova.use(richiediLogin, richiediRuolo('superadmin'));
prova.get('/', (req, res) => {
  res.json({
    predefinito: predefinito(),
    fornitori: Object.keys(FORNITORI).map((k) => ({ id: k, nome: FORNITORI[k].nome, modello: FORNITORI[k].modello(), attivo: !!FORNITORI[k].chiave() })),
  });
});
prova.post('/', async (req, res) => {
  const id = String(req.body.fornitore || '');
  if (!FORNITORI[id] || !FORNITORI[id].chiave()) return res.status(400).json({ errore: 'Manca la chiave di questo fornitore.' });
  const foto = fotoValida(req, res); if (!foto) return;
  try {
    const v = await consumi.verifica(null);
    if (!v.ok) return res.status(402).json({ errore: v.messaggio });
    res.json(await leggiCon(id, foto.tipo, foto.dati, { aziendaId: null, utenteId: req.utente.id, funzione: 'prova' }));
  } catch (e) { res.status(502).json({ errore: e.message }); }
});
r.use('/prova', prova);

r.use('/', pc);
module.exports = r;
