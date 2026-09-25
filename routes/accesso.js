// Primo avvio, login, logout, profilo
const express = require('express');
const bcrypt = require('bcryptjs');
const { pool } = require('../db');
const { creaSessione, chiudiSessione, richiediLogin } = require('../auth');
const { testo, emailValida } = require('../validazione');

const r = express.Router();

r.get('/setup', async (req, res, next) => {
  try {
    const { rows } = await pool.query("SELECT COUNT(*)::int AS n FROM utenti WHERE ruolo='superadmin'");
    res.json({ serveSetup: rows[0].n === 0 });
  } catch (e) { next(e); }
});

// Crea il super amministratore (tu). Funziona solo la prima volta.
r.post('/setup', async (req, res, next) => {
  try {
    const { rows } = await pool.query("SELECT COUNT(*)::int AS n FROM utenti WHERE ruolo='superadmin'");
    if (rows[0].n > 0) return res.status(400).json({ errore: 'Il programma è già stato configurato.' });
    const nome = testo(req.body.nome, 100);
    const email = testo(req.body.email, 200).toLowerCase();
    const password = String(req.body.password || '');
    if (!nome) return res.status(400).json({ errore: 'Inserisci il tuo nome.' });
    if (!emailValida(email)) return res.status(400).json({ errore: 'Email non valida.' });
    if (password.length < 8) return res.status(400).json({ errore: 'La password deve avere almeno 8 caratteri.' });
    const hash = await bcrypt.hash(password, 10);
    const ins = await pool.query(
      "INSERT INTO utenti (azienda_id, email, nome, password_hash, ruolo) VALUES (NULL,$1,$2,$3,'superadmin') RETURNING id",
      [email, nome, hash]);
    creaSessione(res, ins.rows[0]);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

r.post('/login', async (req, res, next) => {
  try {
    const email = testo(req.body.email, 200).toLowerCase();
    const password = String(req.body.password || '');
    const { rows } = await pool.query(
      `SELECT u.*, a.attiva AS azienda_attiva FROM utenti u
         LEFT JOIN aziende a ON a.id = u.azienda_id WHERE u.email = $1`, [email]);
    const u = rows[0];
    if (!u || !(await bcrypt.compare(password, u.password_hash))) {
      return res.status(401).json({ errore: 'Email o password errate.' });
    }
    if (!u.attivo) return res.status(403).json({ errore: 'Il tuo utente è stato disattivato.' });
    if (u.ruolo !== 'superadmin' && !u.azienda_attiva) {
      return res.status(403).json({ errore: "L'account della tua azienda è sospeso. Contatta l'assistenza." });
    }
    creaSessione(res, u);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

r.post('/logout', (req, res) => { chiudiSessione(res); res.json({ ok: true }); });

r.get('/me', richiediLogin, (req, res) => {
  const u = req.utente;
  res.json({ id: u.id, nome: u.nome, email: u.email, ruolo: u.ruolo, azienda: u.azienda_nome || null, funzioni: u.funzioni });
});

r.post('/me/password', richiediLogin, async (req, res, next) => {
  try {
    const attuale = String(req.body.attuale || '');
    const nuova = String(req.body.nuova || '');
    if (nuova.length < 8) return res.status(400).json({ errore: 'La nuova password deve avere almeno 8 caratteri.' });
    const { rows } = await pool.query('SELECT password_hash FROM utenti WHERE id=$1', [req.utente.id]);
    if (!(await bcrypt.compare(attuale, rows[0].password_hash))) {
      return res.status(400).json({ errore: 'La password attuale non è corretta.' });
    }
    await pool.query('UPDATE utenti SET password_hash=$1 WHERE id=$2', [await bcrypt.hash(nuova, 10), req.utente.id]);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

module.exports = r;
