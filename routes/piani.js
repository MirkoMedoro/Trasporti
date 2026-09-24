// Piani di carico salvati
const express = require('express');
const { pool } = require('../db');
const { richiediLogin, richiediAzienda } = require('../auth');
const { testo } = require('../validazione');

const r = express.Router();
r.use(richiediLogin, richiediAzienda);

r.get('/', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT p.id, p.nome, p.creato_il, p.mezzo->>'nome' AS mezzo_nome,
              (p.risultato->'statistiche') AS statistiche, u.nome AS autore
         FROM piani p LEFT JOIN utenti u ON u.id = p.creato_da
        WHERE p.azienda_id=$1 ORDER BY p.creato_il DESC LIMIT 300`, [req.utente.azienda_id]);
    res.json(rows);
  } catch (e) { next(e); }
});

r.get('/:id', async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT * FROM piani WHERE id=$1 AND azienda_id=$2',
      [Number(req.params.id), req.utente.azienda_id]);
    if (!rows[0]) return res.status(404).json({ errore: 'Piano non trovato.' });
    res.json(rows[0]);
  } catch (e) { next(e); }
});

r.post('/', async (req, res, next) => {
  try {
    const nome = testo(req.body.nome, 150);
    const { mezzo, colli, risultato } = req.body;
    if (!nome) return res.status(400).json({ errore: 'Dai un nome al piano di carico.' });
    if (!mezzo || !Array.isArray(colli) || !risultato) return res.status(400).json({ errore: 'Dati del piano incompleti.' });
    const { rows } = await pool.query(
      `INSERT INTO piani (azienda_id,nome,mezzo,colli,risultato,creato_da)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
      [req.utente.azienda_id, nome, JSON.stringify(mezzo), JSON.stringify(colli), JSON.stringify(risultato), req.utente.id]);
    res.json({ ok: true, id: rows[0].id });
  } catch (e) { next(e); }
});

r.delete('/:id', async (req, res, next) => {
  try {
    await pool.query('DELETE FROM piani WHERE id=$1 AND azienda_id=$2', [Number(req.params.id), req.utente.azienda_id]);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

module.exports = r;
