// Viaggi salvati (tappe, costi e risultato)
const express = require('express');
const { pool } = require('../db');
const { richiediLogin, richiediAzienda, richiediFunzione } = require('../auth');
const { testo } = require('../validazione');

const r = express.Router();
r.use(richiediLogin, richiediAzienda, richiediFunzione('viaggi'));

r.get('/', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT v.id, v.nome, v.creato_il, v.dati->'riepilogo' AS riepilogo, u.nome AS autore
         FROM viaggi v LEFT JOIN utenti u ON u.id = v.creato_da
        WHERE v.azienda_id=$1 ORDER BY v.creato_il DESC LIMIT 300`, [req.utente.azienda_id]);
    res.json(rows);
  } catch (e) { next(e); }
});

r.get('/:id', async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT * FROM viaggi WHERE id=$1 AND azienda_id=$2', [Number(req.params.id), req.utente.azienda_id]);
    if (!rows[0]) return res.status(404).json({ errore: 'Viaggio non trovato.' });
    res.json(rows[0]);
  } catch (e) { next(e); }
});

r.post('/', async (req, res, next) => {
  try {
    const nome = testo(req.body.nome, 150);
    if (!nome) return res.status(400).json({ errore: 'Dai un nome al viaggio.' });
    if (!req.body.dati || typeof req.body.dati !== 'object') return res.status(400).json({ errore: 'Dati del viaggio mancanti.' });
    const { rows } = await pool.query(
      'INSERT INTO viaggi (azienda_id, nome, dati, creato_da) VALUES ($1,$2,$3,$4) RETURNING id',
      [req.utente.azienda_id, nome, JSON.stringify(req.body.dati), req.utente.id]);
    res.json({ ok: true, id: rows[0].id });
  } catch (e) { next(e); }
});

r.delete('/:id', async (req, res, next) => {
  try {
    await pool.query('DELETE FROM viaggi WHERE id=$1 AND azienda_id=$2', [Number(req.params.id), req.utente.azienda_id]);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

module.exports = r;
