// Ottimizza giro: lettura "intelligente" di PDF e foto con l'API di Anthropic (Claude).
// Si attiva aggiungendo su Railway la variabile ANTHROPIC_API_KEY. Senza chiave, il programma
// legge il testo dei PDF direttamente nel browser.
const express = require('express');
const { richiediLogin, richiediAzienda, richiediFunzione } = require('../auth');
const consumi = require('../consumiAi');

const r = express.Router();
r.use(richiediLogin, richiediAzienda, richiediFunzione('giri'));

const CHIAVE = () => process.env.ANTHROPIC_API_KEY;
const MODELLO = () => process.env.ANTHROPIC_MODEL || 'claude-sonnet-5-5';
const OPZIONI = (m) => (/sonnet-5|opus-5|fable-5/.test(m) ? { output_config: { effort: 'low' }, thinking: { type: 'between_tools' } } : {});
const TIPI = { 'application/pdf': 'document', 'image/jpeg': 'image', 'image/png': 'image', 'image/webp': 'image' };

const ISTRUZIONI = `Questo documento è una distinta di ritiri e consegne di un autista di un'azienda di trasporti italiana.
Estrai TUTTE le tappe, nell'ordine in cui compaiono. Rispondi SOLO con un oggetto JSON valido, senza altro testo, in questo formato:
{"deposito": "indirizzo di partenza se indicato, altrimenti null",
 "tappe": [{"tipo": "ritiro" | "consegna" | "", "nome": "cliente o ragione sociale", "indirizzo": "via e numero civico, CAP località sigla provincia",
            "colli": numero o null, "peso": numero in kg o null, "note": "orari, avvertenze o altre indicazioni utili, altrimenti stringa vuota"}]}
Regole: non inventare dati; se un'informazione manca lascia null o stringa vuota. L'indirizzo deve essere completo e utilizzabile su una mappa.
"ritiro" se la merce va presa dal cliente (ritiro, presa, mittente), "consegna" se va portata al cliente (consegna, scarico, destinatario).`;

r.get('/stato', async (req, res, next) => {
  try {
    if (!CHIAVE()) return res.json({ ai: false });
    const v = await consumi.verifica(req.utente.azienda_id);
    res.json({ ai: v.ok });
  } catch (e) { next(e); }
});

r.post('/leggi', async (req, res) => {
  if (!CHIAVE()) return res.status(501).json({ errore: 'La lettura intelligente non è attiva: serve la chiave ANTHROPIC_API_KEY.' });
  const tipo = String(req.body.tipo || ''), dati = String(req.body.dati || '');
  if (!TIPI[tipo]) return res.status(400).json({ errore: 'Formato non supportato: carica un PDF o una foto (JPG o PNG).' });
  if (!dati || dati.length > 28 * 1024 * 1024) return res.status(400).json({ errore: 'File mancante o troppo grande (massimo circa 20 MB).' });
  const v = await consumi.verifica(req.utente.azienda_id).catch(() => ({ ok: false, messaggio: 'Lettura intelligente non disponibile.' }));
  if (!v.ok) return res.status(402).json({ errore: v.messaggio, limite: true });
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 120000);
  try {
    const risp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST', signal: ctrl.signal,
      headers: { 'x-api-key': CHIAVE(), 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({
        model: MODELLO(), max_tokens: 8000, ...OPZIONI(MODELLO()),
        messages: [{ role: 'user', content: [
          { type: TIPI[tipo], source: { type: 'base64', media_type: tipo, data: dati } },
          { type: 'text', text: ISTRUZIONI },
        ] }],
      }),
    });
    const corpo = await risp.json().catch(() => ({}));
    if (!risp.ok) {
      console.error('Lettura AI:', risp.status, JSON.stringify(corpo).slice(0, 300));
      return res.status(502).json({ errore: 'Il servizio di lettura non ha risposto correttamente. Riprova o usa la lettura normale.' });
    }
    const u = corpo.usage || {};
    await consumi.registra({ aziendaId: req.utente.azienda_id, utenteId: req.utente.id, funzione: 'giri', fornitore: 'anthropic', modello: MODELLO(), tokIn: u.input_tokens, tokOut: u.output_tokens });
    const testo = (corpo.content || []).filter((c) => c.type === 'text').map((c) => c.text).join('');
    const inizio = testo.indexOf('{'), fine = testo.lastIndexOf('}');
    const json = JSON.parse(testo.slice(inizio, fine + 1));
    const tappe = (Array.isArray(json.tappe) ? json.tappe : []).slice(0, 200).map((t) => ({
      tipo: t.tipo === 'ritiro' || t.tipo === 'consegna' ? t.tipo : '',
      nome: String(t.nome || '').slice(0, 150),
      indirizzo: String(t.indirizzo || '').slice(0, 250),
      colli: Number.isFinite(Number(t.colli)) && t.colli !== null ? Number(t.colli) : '',
      peso: Number.isFinite(Number(t.peso)) && t.peso !== null ? Number(t.peso) : '',
      note: String(t.note || '').slice(0, 250),
    })).filter((t) => t.indirizzo);
    res.json({ tappe, deposito: json.deposito ? String(json.deposito).slice(0, 250) : null });
  } catch (e) {
    console.error('Lettura AI:', e.message);
    res.status(502).json({ errore: 'Non sono riuscito a leggere il documento. Riprova o usa la lettura normale.' });
  } finally { clearTimeout(timer); }
});

module.exports = r;
