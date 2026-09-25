// Complessi veicolari: motrice + rimorchio (autotreno), trattore + semirimorchio (autoarticolato)
const express = require('express');
const { pool } = require('../db');
const { richiediLogin, richiediAzienda } = require('../auth');
const { testo } = require('../validazione');

const r = express.Router();
r.use(richiediLogin, richiediAzienda);

const ABBINAMENTI = { motrice: 'rimorchio', trattore: 'semirimorchio' };

r.get('/', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, nome, trainante_id, rimorchio_id FROM complessi WHERE azienda_id=$1 ORDER BY id', [req.utente.azienda_id]);
    res.json(rows);
  } catch (e) { next(e); }
});

r.post('/', async (req, res, next) => {
  try {
    const t = Number(req.body.trainante_id), rm = Number(req.body.rimorchio_id);
    const { rows } = await pool.query('SELECT id, categoria FROM mezzi WHERE id = ANY($1) AND azienda_id=$2', [[t, rm], req.utente.azienda_id]);
    const tr = rows.find((x) => x.id === t), ri = rows.find((x) => x.id === rm);
    if (!tr || !ri) return res.status(400).json({ errore: 'Scegli il mezzo trainante e il rimorchio.' });
    if (ABBINAMENTI[tr.categoria] !== ri.categoria) {
      return res.status(400).json({ errore: 'Abbinamento non valido: la motrice va con un rimorchio, il trattore con un semirimorchio.' });
    }
    const doppio = await pool.query('SELECT 1 FROM complessi WHERE trainante_id=$1 AND rimorchio_id=$2', [t, rm]);
    if (doppio.rowCount) return res.status(400).json({ errore: 'Questo complesso esiste già.' });
    await pool.query('INSERT INTO complessi (azienda_id, nome, trainante_id, rimorchio_id) VALUES ($1,$2,$3,$4)',
      [req.utente.azienda_id, testo(req.body.nome, 100) || null, t, rm]);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

r.delete('/:id', async (req, res, next) => {
  try {
    await pool.query('DELETE FROM complessi WHERE id=$1 AND azienda_id=$2', [Number(req.params.id), req.utente.azienda_id]);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

module.exports = r;
