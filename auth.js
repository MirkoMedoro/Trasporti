// Controllo accessi. Ad ogni richiesta rileggiamo l'utente dal database,
// così se un'azienda viene sospesa o un utente disattivato, l'effetto è immediato.
const jwt = require('jsonwebtoken');
const { pool } = require('./db');

const SEGRETO = process.env.JWT_SECRET || 'cambia-questo-segreto';
if (!process.env.JWT_SECRET) {
  console.warn('ATTENZIONE: JWT_SECRET non impostato. Impostalo nelle variabili di Railway.');
}
const NOME_COOKIE = 'stiva_sessione';

function creaSessione(res, utente) {
  const token = jwt.sign({ uid: utente.id }, SEGRETO, { expiresIn: '30d' });
  res.cookie(NOME_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });
}

function chiudiSessione(res) {
  res.clearCookie(NOME_COOKIE);
}

async function richiediLogin(req, res, next) {
  try {
    const token = req.cookies[NOME_COOKIE];
    if (!token) return res.status(401).json({ errore: 'Accedi per continuare.' });
    let dati;
    try { dati = jwt.verify(token, SEGRETO); }
    catch { return res.status(401).json({ errore: 'Sessione scaduta, accedi di nuovo.' }); }

    const { rows } = await pool.query(
      `SELECT u.id, u.azienda_id, u.email, u.nome, u.ruolo, u.attivo,
              a.nome AS azienda_nome, a.attiva AS azienda_attiva
         FROM utenti u LEFT JOIN aziende a ON a.id = u.azienda_id
        WHERE u.id = $1`, [dati.uid]);
    const u = rows[0];
    if (!u || !u.attivo) return res.status(401).json({ errore: 'Utente non attivo.' });
    if (u.ruolo !== 'superadmin' && !u.azienda_attiva) {
      return res.status(403).json({ errore: "L'account della tua azienda è sospeso. Contatta l'assistenza." });
    }
    req.utente = u;
    next();
  } catch (e) { next(e); }
}

// Solo utenti che appartengono a un'azienda (non il super amministratore)
function richiediAzienda(req, res, next) {
  if (!req.utente.azienda_id) return res.status(403).json({ errore: 'Funzione riservata agli utenti di un’azienda.' });
  next();
}

function richiediRuolo(...ruoli) {
  return (req, res, next) => {
    if (!ruoli.includes(req.utente.ruolo)) return res.status(403).json({ errore: 'Non hai i permessi per questa operazione.' });
    next();
  };
}

module.exports = { creaSessione, chiudiSessione, richiediLogin, richiediAzienda, richiediRuolo };
