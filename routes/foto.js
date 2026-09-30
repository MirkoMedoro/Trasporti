// Calcolatore: foto dal telefono.
// Il computer apre una "sessione foto" e mostra un QR code. Il telefono lo inquadra, apre la pagina
// /scatta/<codice> (senza bisogno di accedere) e invia le foto. Il computer le riceve e ne legge le misure.
// Il codice vale 30 minuti ed è legato all'utente che l'ha creato. Le foto restano solo in memoria
// finché il computer le preleva: non vengono salvate nel database.
const express = require('express');
const crypto = require('crypto');
const { richiediLogin, richiediAzienda, richiediFunzione } = require('../auth');

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

// ---------- lettura intelligente delle misure (facoltativa, con ANTHROPIC_API_KEY) ----------
const CHIAVE = () => process.env.ANTHROPIC_API_KEY;
const MODELLO = () => process.env.ANTHROPIC_MODEL || 'claude-sonnet-5';

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

pc.get('/stato', (req, res) => res.json({ ai: !!CHIAVE() }));

pc.post('/leggi', async (req, res) => {
  if (!CHIAVE()) return res.status(501).json({ errore: 'La lettura intelligente non è attiva: serve la chiave ANTHROPIC_API_KEY.' });
  const tipo = String(req.body.tipo || ''), dati = String(req.body.dati || '');
  if (!/^image\/(jpeg|png|webp)$/.test(tipo)) return res.status(400).json({ errore: 'Formato non supportato: usa una foto JPG o PNG.' });
  if (!dati || dati.length > MAX_BASE64) return res.status(400).json({ errore: 'Foto mancante o troppo grande.' });
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 90000);
  try {
    const risp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST', signal: ctrl.signal,
      headers: { 'x-api-key': CHIAVE(), 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({
        model: MODELLO(), max_tokens: 4000,
        messages: [{ role: 'user', content: [
          { type: 'image', source: { type: 'base64', media_type: tipo, data: dati } },
          { type: 'text', text: ISTRUZIONI },
        ] }],
      }),
    });
    const corpo = await risp.json().catch(() => ({}));
    if (!risp.ok) {
      console.error('Lettura misure AI:', risp.status, JSON.stringify(corpo).slice(0, 300));
      return res.status(502).json({ errore: 'Il servizio di lettura non ha risposto correttamente. Riprova o usa la lettura gratuita.' });
    }
    const testo = (corpo.content || []).filter((c) => c.type === 'text').map((c) => c.text).join('');
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
    // confronto con la riga Totale scritta sul foglio
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
    res.json({ righe, totali });
  } catch (e) {
    console.error('Lettura misure AI:', e.message);
    res.status(502).json({ errore: 'Non sono riuscito a leggere la foto. Riprova o usa la lettura gratuita.' });
  } finally { clearTimeout(timer); }
});

r.use('/', pc);
module.exports = r;
