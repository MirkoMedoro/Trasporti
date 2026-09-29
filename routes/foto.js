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

const ISTRUZIONI = `Questa foto mostra un foglio, un documento o una tabella con le misure dei colli di una spedizione (azienda di trasporti italiana). Può essere scritto a mano.
Estrai TUTTE le righe di colli. Rispondi SOLO con un oggetto JSON valido, senza altro testo:
{"righe": [{"descrizione": "tipo di collo se indicato (bancale, cassa, cartone...), altrimenti stringa vuota",
            "colli": numero di colli uguali in questa riga (1 se non indicato),
            "lunghezza_cm": numero, "larghezza_cm": numero, "altezza_cm": numero,
            "peso_collo_kg": peso di UN collo se indicato, altrimenti null,
            "peso_totale_riga_kg": peso di tutti i colli della riga se indicato così, altrimenti null,
            "non_sovrapponibile": true se è scritto non sovrapponibile / non impilabile / NS, altrimenti false}]}
Regole: misure sempre in centimetri (converti da metri o millimetri). Non inventare numeri: se una misura non si legge metti null.
Se c'è solo un peso totale della spedizione e più righe, mettilo in peso_totale_riga_kg della prima riga e scrivi "peso totale spedizione" nella descrizione.`;

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
    const righe = (Array.isArray(json.righe) ? json.righe : []).slice(0, 100).map((x) => {
      const n = numero(x.colli) || 1;
      let peso = numero(x.peso_collo_kg);
      if (peso === '' && numero(x.peso_totale_riga_kg) !== '') peso = Math.round(numero(x.peso_totale_riga_kg) / n * 10) / 10;
      return {
        nome: String(x.descrizione || '').slice(0, 60), n,
        l: numero(x.lunghezza_cm), p: numero(x.larghezza_cm), h: numero(x.altezza_cm),
        peso, impilabile: !x.non_sovrapponibile,
      };
    }).filter((x) => x.l !== '' || x.p !== '' || x.h !== '' || x.peso !== '');
    res.json({ righe });
  } catch (e) {
    console.error('Lettura misure AI:', e.message);
    res.status(502).json({ errore: 'Non sono riuscito a leggere la foto. Riprova o usa la lettura gratuita.' });
  } finally { clearTimeout(timer); }
});

r.use('/', pc);
module.exports = r;
