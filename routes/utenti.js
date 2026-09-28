// Il titolare vede gli utenti della propria azienda (sola lettura).
// Creazione, modifica, sospensione ed eliminazione le fa solo il super amministratore.
const express = require('express');
const { pool } = require('../db');
const { richiediLogin, richiediAzienda, richiediRuolo } = require('../auth');

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

module.exports = r;
