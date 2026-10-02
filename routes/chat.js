// Messaggi: chat interna tra gli utenti della stessa azienda.
// - Canale "Tutti" dell'azienda e messaggi privati tra due persone.
// - Privacy: un messaggio privato lo leggono solo mittente e destinatario. Il titolare non ha accesso alle
//   conversazioni degli altri e il super amministratore non ha nessuna pagina per leggerle (questa route
//   richiede un utente di un'azienda). Le tabelle della chat non entrano nel backup.
// - Sono messaggi di servizio: dopo 2 giorni si cancellano da soli.
const express = require('express');
const { pool } = require('../db');
const { richiediLogin, richiediAzienda, richiediFunzione } = require('../auth');

const r = express.Router();
r.use(richiediLogin, richiediAzienda, richiediFunzione('chat'));

const DURATA = "interval '2 days'";
const MAX_TESTO = 2000;
const MAX_FOTO = 3 * 1024 * 1024; // base64, circa 2 MB di foto (il browser la riduce prima di mandarla)

async function pulisci() {
  try { await pool.query(`DELETE FROM chat_messaggi WHERE creato_il < now() - ${DURATA}`); }
  catch (e) { if (!/does not exist/.test(e.message)) console.error('Pulizia chat:', e.message); }
}
setTimeout(pulisci, 15000).unref();
setInterval(pulisci, 60 * 60 * 1000).unref();

// 'tutti' oppure l'id di un collega attivo della stessa azienda
async function conversazione(req) {
  const chi = String(req.params.chi || '');
  if (chi === 'tutti') return { chiave: 'tutti', altro: null };
  const id = Number(chi);
  if (!Number.isInteger(id) || id <= 0 || id === req.utente.id) return null;
  const { rows } = await pool.query('SELECT id FROM utenti WHERE id=$1 AND azienda_id=$2 AND attivo', [id, req.utente.azienda_id]);
  return rows.length ? { chiave: 'u:' + id, altro: id } : null;
}
// condizione SQL: i messaggi di quella conversazione, visti da questo utente
function filtro(conv, me, az) {
  if (!conv.altro) return { sql: 'm.azienda_id=$1 AND m.destinatario_id IS NULL', par: [az] };
  return { sql: 'm.azienda_id=$1 AND ((m.mittente_id=$2 AND m.destinatario_id=$3) OR (m.mittente_id=$3 AND m.destinatario_id=$2))', par: [az, me, conv.altro] };
}

// Colleghi e messaggi non letti per ogni conversazione
r.get('/contatti', async (req, res, next) => {
  try {
    const me = req.utente.id, az = req.utente.azienda_id;
    const colleghi = await pool.query(
      "SELECT id, nome, ruolo FROM utenti WHERE azienda_id=$1 AND attivo AND id<>$2 ORDER BY nome", [az, me]);
    const letture = await pool.query('SELECT conversazione, ultimo_id FROM chat_letture WHERE utente_id=$1', [me]);
    const letto = {}; letture.rows.forEach((x) => { letto[x.conversazione] = Number(x.ultimo_id); });
    const nonLettiTutti = await pool.query(
      'SELECT COUNT(*)::int AS n, MAX(id) AS ultimo FROM chat_messaggi WHERE azienda_id=$1 AND destinatario_id IS NULL AND mittente_id<>$2 AND id>$3',
      [az, me, letto.tutti || 0]);
    const privati = await pool.query(
      `SELECT mittente_id AS da, COUNT(*)::int AS n FROM chat_messaggi m
        WHERE azienda_id=$1 AND destinatario_id=$2
          AND id > COALESCE((SELECT ultimo_id FROM chat_letture WHERE utente_id=$2 AND conversazione='u:' || m.mittente_id), 0)
        GROUP BY mittente_id`, [az, me]);
    const ultimi = await pool.query(
      `SELECT CASE WHEN mittente_id=$2 THEN destinatario_id ELSE mittente_id END AS altro, MAX(creato_il) AS quando
         FROM chat_messaggi WHERE azienda_id=$1 AND destinatario_id IS NOT NULL AND (mittente_id=$2 OR destinatario_id=$2)
        GROUP BY 1`, [az, me]);
    const np = {}; privati.rows.forEach((x) => { np[x.da] = x.n; });
    const uq = {}; ultimi.rows.forEach((x) => { uq[x.altro] = x.quando; });
    res.json({
      io: me,
      tutti: { nonLetti: nonLettiTutti.rows[0].n },
      colleghi: colleghi.rows.map((c) => ({ id: c.id, nome: c.nome, ruolo: c.ruolo, nonLetti: np[c.id] || 0, ultimo: uq[c.id] || null })),
    });
  } catch (e) { next(e); }
});

// Solo il numero totale di non letti: per il pallino nel menu
r.get('/non-letti', async (req, res, next) => {
  try {
    const me = req.utente.id, az = req.utente.azienda_id;
    const { rows } = await pool.query(
      `SELECT COUNT(*)::int AS n FROM chat_messaggi m
        WHERE m.azienda_id=$1 AND m.mittente_id<>$2
          AND (m.destinatario_id=$2 OR m.destinatario_id IS NULL)
          AND m.id > COALESCE((SELECT ultimo_id FROM chat_letture WHERE utente_id=$2
                                AND conversazione = CASE WHEN m.destinatario_id IS NULL THEN 'tutti' ELSE 'u:' || m.mittente_id END), 0)`,
      [az, me]);
    res.json({ n: rows[0].n });
  } catch (e) { next(e); }
});

// Messaggi di una conversazione (dopo un certo id, per gli aggiornamenti); li segna come letti
r.get('/conversazione/:chi', async (req, res, next) => {
  try {
    const conv = await conversazione(req);
    if (!conv) return res.status(404).json({ errore: 'Conversazione non trovata.' });
    const me = req.utente.id, az = req.utente.azienda_id;
    const dopo = Math.max(0, Number(req.query.dopo) || 0);
    const f = filtro(conv, me, az);
    const { rows } = await pool.query(
      `SELECT m.id, m.mittente_id, u.nome AS mittente, m.testo, m.allegato, (m.foto IS NOT NULL) AS ha_foto, m.creato_il
         FROM chat_messaggi m JOIN utenti u ON u.id = m.mittente_id
        WHERE ${f.sql} AND m.id > $${f.par.length + 1} AND m.creato_il >= now() - ${DURATA}
        ORDER BY m.id DESC LIMIT 300`, [...f.par, dopo]);
    rows.reverse();
    if (rows.length) {
      await pool.query(
        `INSERT INTO chat_letture (utente_id, conversazione, ultimo_id) VALUES ($1,$2,$3)
         ON CONFLICT (utente_id, conversazione) DO UPDATE SET ultimo_id = GREATEST(chat_letture.ultimo_id, EXCLUDED.ultimo_id)`,
        [me, conv.chiave, rows[rows.length - 1].id]);
    }
    res.json({ messaggi: rows });
  } catch (e) { next(e); }
});

// La foto di un messaggio (solo se l'utente può vedere quel messaggio)
r.get('/foto/:id', async (req, res, next) => {
  try {
    const me = req.utente.id, az = req.utente.azienda_id;
    const { rows } = await pool.query(
      `SELECT foto FROM chat_messaggi WHERE id=$1 AND azienda_id=$2 AND foto IS NOT NULL
         AND (destinatario_id IS NULL OR mittente_id=$3 OR destinatario_id=$3)`, [Number(req.params.id) || 0, az, me]);
    if (!rows.length) return res.status(404).end();
    res.set('Cache-Control', 'private, max-age=86400');
    res.type('image/jpeg').send(Buffer.from(rows[0].foto, 'base64'));
  } catch (e) { next(e); }
});

// Scrive un messaggio
r.post('/conversazione/:chi', async (req, res, next) => {
  try {
    const conv = await conversazione(req);
    if (!conv) return res.status(404).json({ errore: 'Questo collega non è più tra gli utenti attivi.' });
    const me = req.utente.id, az = req.utente.azienda_id;
    const testo = String(req.body.testo || '').trim().slice(0, MAX_TESTO);
    let foto = req.body.foto ? String(req.body.foto) : null;
    if (foto) {
      foto = foto.replace(/^data:image\/jpeg;base64,/, '');
      if (foto.length > MAX_FOTO || !/^[A-Za-z0-9+/=]+$/.test(foto.slice(0, 300))) return res.status(400).json({ errore: 'Foto non valida o troppo grande.' });
    }
    // allegato: un piano di carico o un viaggio della stessa azienda
    let allegato = null;
    const a = req.body.allegato;
    if (a && (a.tipo === 'piano' || a.tipo === 'viaggio')) {
      const tab = a.tipo === 'piano' ? 'piani' : 'viaggi';
      const { rows } = await pool.query(`SELECT id, nome FROM ${tab} WHERE id=$1 AND azienda_id=$2`, [Number(a.id) || 0, az]);
      if (!rows.length) return res.status(400).json({ errore: 'Elemento da allegare non trovato.' });
      allegato = { tipo: a.tipo, id: rows[0].id, nome: rows[0].nome };
    }
    if (!testo && !foto && !allegato) return res.status(400).json({ errore: 'Scrivi un messaggio.' });
    const { rows } = await pool.query(
      'INSERT INTO chat_messaggi (azienda_id, mittente_id, destinatario_id, testo, allegato, foto) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id',
      [az, me, conv.altro, testo, allegato ? JSON.stringify(allegato) : null, foto]);
    await pool.query(
      `INSERT INTO chat_letture (utente_id, conversazione, ultimo_id) VALUES ($1,$2,$3)
       ON CONFLICT (utente_id, conversazione) DO UPDATE SET ultimo_id = GREATEST(chat_letture.ultimo_id, EXCLUDED.ultimo_id)`,
      [me, conv.chiave, rows[0].id]);
    res.json({ ok: true, id: rows[0].id });
  } catch (e) { next(e); }
});

// Cosa si può allegare: gli ultimi piani di carico e viaggi salvati dell'azienda
r.get('/allegabili', async (req, res, next) => {
  try {
    const az = req.utente.azienda_id, f = req.utente.funzioni || {};
    const piani = f.carico === false ? { rows: [] } : await pool.query('SELECT id, nome, creato_il FROM piani WHERE azienda_id=$1 ORDER BY creato_il DESC LIMIT 30', [az]);
    const viaggi = f.viaggi === false ? { rows: [] } : await pool.query('SELECT id, nome, creato_il FROM viaggi WHERE azienda_id=$1 ORDER BY creato_il DESC LIMIT 30', [az]);
    res.json({ piani: piani.rows, viaggi: viaggi.rows });
  } catch (e) { next(e); }
});

module.exports = r;
