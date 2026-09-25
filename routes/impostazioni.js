// Valori predefiniti dei costi, salvati per ogni azienda
const express = require('express');
const { pool } = require('../db');
const { richiediLogin, richiediAzienda, richiediRuolo } = require('../auth');

const r = express.Router();
r.use(richiediLogin, richiediAzienda);

const CAMPI = ['gasolio', 'consumo', 'costoOra', 'velocita', 'oreSoste', 'trasferta', 'altriKm', 'margine'];

r.get('/costi', async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT impostazioni FROM aziende WHERE id=$1', [req.utente.azienda_id]);
    res.json((rows[0] && rows[0].impostazioni && rows[0].impostazioni.costi) || null);
  } catch (e) { next(e); }
});

r.put('/costi', richiediRuolo('admin'), async (req, res, next) => {
  try {
    const costi = {};
    CAMPI.forEach((k) => {
      const n = Number(req.body[k]);
      if (Number.isFinite(n) && n >= 0 && n < 100000) costi[k] = n;
    });
    await pool.query(
      "UPDATE aziende SET impostazioni = jsonb_set(impostazioni, '{costi}', $1::jsonb, true) WHERE id=$2",
      [JSON.stringify(costi), req.utente.azienda_id]);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

module.exports = r;
