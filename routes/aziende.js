// Pannello del super amministratore: gestione delle aziende clienti
const express = require('express');
const bcrypt = require('bcryptjs');
const { pool } = require('../db');
const { richiediLogin, richiediRuolo } = require('../auth');
const { testo, emailValida } = require('../validazione');

const r = express.Router();
r.use(richiediLogin, richiediRuolo('superadmin'));

r.get('/', async (req, res, next) => {
  try {
    const { rows } = await pool.query(`
      SELECT a.id, a.nome, a.attiva, a.creata_il,
        (SELECT COUNT(*)::int FROM utenti u WHERE u.azienda_id=a.id) AS utenti,
        (SELECT COUNT(*)::int FROM mezzi m WHERE m.azienda_id=a.id) AS mezzi,
        (SELECT COUNT(*)::int FROM piani p WHERE p.azienda_id=a.id) AS piani,
        (SELECT u.email FROM utenti u WHERE u.azienda_id=a.id AND u.ruolo='admin' ORDER BY u.id LIMIT 1) AS email_titolare
      FROM aziende a ORDER BY a.nome`);
    res.json(rows);
  } catch (e) { next(e); }
});

// Crea un'azienda cliente insieme al suo primo utente titolare
r.post('/', async (req, res, next) => {
  const client = await pool.connect();
  try {
    const nome = testo(req.body.nome, 150);
    const titolareNome = testo(req.body.titolareNome, 100);
    const email = testo(req.body.titolareEmail, 200).toLowerCase();
    const password = String(req.body.titolarePassword || '');
    if (!nome) return res.status(400).json({ errore: "Inserisci il nome dell'azienda." });
    if (!titolareNome) return res.status(400).json({ errore: 'Inserisci il nome del titolare.' });
    if (!emailValida(email)) return res.status(400).json({ errore: 'Email del titolare non valida.' });
    if (password.length < 8) return res.status(400).json({ errore: 'La password deve avere almeno 8 caratteri.' });
    const esiste = await client.query('SELECT 1 FROM utenti WHERE email=$1', [email]);
    if (esiste.rowCount) return res.status(400).json({ errore: 'Questa email è già usata da un altro utente.' });

    await client.query('BEGIN');
    const a = await client.query('INSERT INTO aziende (nome) VALUES ($1) RETURNING id', [nome]);
    await client.query(
      "INSERT INTO utenti (azienda_id, email, nome, password_hash, ruolo) VALUES ($1,$2,$3,$4,'admin')",
      [a.rows[0].id, email, titolareNome, await bcrypt.hash(password, 10)]);
    await client.query('COMMIT');
    res.json({ ok: true, id: a.rows[0].id });
  } catch (e) { await client.query('ROLLBACK').catch(() => {}); next(e); }
  finally { client.release(); }
});

r.patch('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (typeof req.body.attiva === 'boolean') {
      await pool.query('UPDATE aziende SET attiva=$1 WHERE id=$2', [req.body.attiva, id]);
    }
    const nome = testo(req.body.nome, 150);
    if (nome) await pool.query('UPDATE aziende SET nome=$1 WHERE id=$2', [nome, id]);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

module.exports = r;
