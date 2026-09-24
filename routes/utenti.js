// Il titolare di un'azienda gestisce i propri dipendenti
const express = require('express');
const bcrypt = require('bcryptjs');
const { pool } = require('../db');
const { richiediLogin, richiediAzienda, richiediRuolo } = require('../auth');
const { testo, emailValida } = require('../validazione');

const r = express.Router();
r.use(richiediLogin, richiediAzienda, richiediRuolo('admin'));

r.get('/', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, nome, email, ruolo, attivo, creato_il FROM utenti WHERE azienda_id=$1 ORDER BY nome',
      [req.utente.azienda_id]);
    res.json(rows);
  } catch (e) { next(e); }
});

r.post('/', async (req, res, next) => {
  try {
    const nome = testo(req.body.nome, 100);
    const email = testo(req.body.email, 200).toLowerCase();
    const password = String(req.body.password || '');
    const ruolo = req.body.ruolo === 'admin' ? 'admin' : 'operatore';
    if (!nome) return res.status(400).json({ errore: 'Inserisci il nome.' });
    if (!emailValida(email)) return res.status(400).json({ errore: 'Email non valida.' });
    if (password.length < 8) return res.status(400).json({ errore: 'La password deve avere almeno 8 caratteri.' });
    const esiste = await pool.query('SELECT 1 FROM utenti WHERE email=$1', [email]);
    if (esiste.rowCount) return res.status(400).json({ errore: 'Questa email è già usata.' });
    await pool.query(
      'INSERT INTO utenti (azienda_id, email, nome, password_hash, ruolo) VALUES ($1,$2,$3,$4,$5)',
      [req.utente.azienda_id, email, nome, await bcrypt.hash(password, 10), ruolo]);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

r.patch('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (id === req.utente.id && req.body.attivo === false) {
      return res.status(400).json({ errore: 'Non puoi disattivare te stesso.' });
    }
    // Il filtro azienda_id impedisce di toccare utenti di altre aziende
    if (typeof req.body.attivo === 'boolean') {
      await pool.query('UPDATE utenti SET attivo=$1 WHERE id=$2 AND azienda_id=$3',
        [req.body.attivo, id, req.utente.azienda_id]);
    }
    if (req.body.password) {
      const p = String(req.body.password);
      if (p.length < 8) return res.status(400).json({ errore: 'La password deve avere almeno 8 caratteri.' });
      await pool.query('UPDATE utenti SET password_hash=$1 WHERE id=$2 AND azienda_id=$3',
        [await bcrypt.hash(p, 10), id, req.utente.azienda_id]);
    }
    res.json({ ok: true });
  } catch (e) { next(e); }
});

module.exports = r;
