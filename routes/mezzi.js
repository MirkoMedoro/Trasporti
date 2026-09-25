// Mezzi dell'azienda (ognuno vede solo i propri)
const express = require('express');
const { pool } = require('../db');
const { richiediLogin, richiediAzienda } = require('../auth');
const { intero, testo } = require('../validazione');

const r = express.Router();
r.use(richiediLogin, richiediAzienda);

function leggiMezzo(b) {
  const m = {
    nome: testo(b.nome, 100),
    targa: testo(b.targa, 20).toUpperCase(),
    lunghezza: intero(b.lunghezza, 50, 5000),
    larghezza: intero(b.larghezza, 50, 400),
    altezza: intero(b.altezza, 50, 500),
    portata: intero(b.portata, 1, 100000),
    consumo: b.consumo === '' || b.consumo == null ? null : Math.round(Number(String(b.consumo).replace(',', '.')) * 10) / 10,
  };
  if (m.consumo !== null && !(m.consumo > 0 && m.consumo < 150)) return { errore: 'Il consumo va indicato in litri ogni 100 km (es. 32).' };
  if (!m.nome) return { errore: 'Dai un nome al mezzo.' };
  if (!m.lunghezza || !m.larghezza || !m.altezza) return { errore: 'Controlla le misure del vano di carico (in cm).' };
  if (!m.portata) return { errore: 'Inserisci la portata in kg.' };
  return { m };
}

r.get('/', async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT * FROM mezzi WHERE azienda_id=$1 ORDER BY nome', [req.utente.azienda_id]);
    res.json(rows);
  } catch (e) { next(e); }
});

r.post('/', async (req, res, next) => {
  try {
    const { m, errore } = leggiMezzo(req.body);
    if (errore) return res.status(400).json({ errore });
    const { rows } = await pool.query(
      `INSERT INTO mezzi (azienda_id,nome,targa,lunghezza,larghezza,altezza,portata,consumo)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [req.utente.azienda_id, m.nome, m.targa, m.lunghezza, m.larghezza, m.altezza, m.portata, m.consumo]);
    res.json(rows[0]);
  } catch (e) { next(e); }
});

r.put('/:id', async (req, res, next) => {
  try {
    const { m, errore } = leggiMezzo(req.body);
    if (errore) return res.status(400).json({ errore });
    const { rows } = await pool.query(
      `UPDATE mezzi SET nome=$1,targa=$2,lunghezza=$3,larghezza=$4,altezza=$5,portata=$6,consumo=$7
       WHERE id=$8 AND azienda_id=$9 RETURNING *`,
      [m.nome, m.targa, m.lunghezza, m.larghezza, m.altezza, m.portata, m.consumo, Number(req.params.id), req.utente.azienda_id]);
    if (!rows[0]) return res.status(404).json({ errore: 'Mezzo non trovato.' });
    res.json(rows[0]);
  } catch (e) { next(e); }
});

r.delete('/:id', async (req, res, next) => {
  try {
    await pool.query('DELETE FROM mezzi WHERE id=$1 AND azienda_id=$2', [Number(req.params.id), req.utente.azienda_id]);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

module.exports = r;
