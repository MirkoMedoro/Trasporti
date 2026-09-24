// Colli ricorrenti salvati dall'azienda (es. "Bancale acqua", "Scatola 60x40")
const express = require('express');
const { pool } = require('../db');
const { richiediLogin, richiediAzienda } = require('../auth');
const { intero, testo } = require('../validazione');

const r = express.Router();
r.use(richiediLogin, richiediAzienda);

r.get('/', async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT * FROM colli_salvati WHERE azienda_id=$1 ORDER BY nome', [req.utente.azienda_id]);
    res.json(rows);
  } catch (e) { next(e); }
});

r.post('/', async (req, res, next) => {
  try {
    const b = req.body;
    const c = {
      nome: testo(b.nome, 100),
      lunghezza: intero(b.lunghezza, 1, 5000),
      larghezza: intero(b.larghezza, 1, 400),
      altezza: intero(b.altezza, 1, 500),
      peso: intero(b.peso, 0, 100000),
    };
    if (!c.nome || !c.lunghezza || !c.larghezza || !c.altezza || c.peso === null) {
      return res.status(400).json({ errore: 'Compila nome, misure e peso del collo.' });
    }
    const { rows } = await pool.query(
      `INSERT INTO colli_salvati (azienda_id,nome,lunghezza,larghezza,altezza,peso,impilabile,ruotabile)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [req.utente.azienda_id, c.nome, c.lunghezza, c.larghezza, c.altezza, c.peso, b.impilabile !== false, b.ruotabile !== false]);
    res.json(rows[0]);
  } catch (e) { next(e); }
});

r.delete('/:id', async (req, res, next) => {
  try {
    await pool.query('DELETE FROM colli_salvati WHERE id=$1 AND azienda_id=$2', [Number(req.params.id), req.utente.azienda_id]);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

module.exports = r;
