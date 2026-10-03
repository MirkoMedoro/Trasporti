// Valori predefiniti dei costi, salvati per ogni azienda
const express = require('express');
const { pool } = require('../db');
const { richiediLogin, richiediAzienda, richiediRuolo, richiediFunzione } = require('../auth');
const avvisi = require('../avvisi');
const email = require('../email');

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

// Impostazioni del calcolo del peso tassato
const CAMPI_TASSATO = { rapporto: [1, 10000], altezzaNs: [50, 500], arrotonda: [0, 10000], tariffa: [0, 100000], minimo: [0, 100000] };

r.get('/tassato', async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT impostazioni FROM aziende WHERE id=$1', [req.utente.azienda_id]);
    res.json((rows[0] && rows[0].impostazioni && rows[0].impostazioni.tassato) || null);
  } catch (e) { next(e); }
});

r.put('/tassato', richiediRuolo('admin'), async (req, res, next) => {
  try {
    const t = {};
    Object.keys(CAMPI_TASSATO).forEach((k) => {
      const n = Number(req.body[k]), lim = CAMPI_TASSATO[k];
      if (Number.isFinite(n) && n >= lim[0] && n <= lim[1]) t[k] = n;
    });
    if (!t.rapporto) return res.status(400).json({ errore: 'Indica quanti kg vale un metro cubo (es. 250).' });
    t.modoTariffa = req.body.modoTariffa === 'ldm' ? 'ldm' : 'kg';
    await pool.query(
      "UPDATE aziende SET impostazioni = jsonb_set(impostazioni, '{tassato}', $1::jsonb, true) WHERE id=$2",
      [JSON.stringify(t), req.utente.azienda_id]);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// Impostazioni di "Ottimizza giro": deposito di partenza e abitudini
r.get('/giri', async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT impostazioni FROM aziende WHERE id=$1', [req.utente.azienda_id]);
    res.json((rows[0] && rows[0].impostazioni && rows[0].impostazioni.giri) || null);
  } catch (e) { next(e); }
});

r.put('/giri', richiediRuolo('admin'), async (req, res, next) => {
  try {
    const b = req.body || {}, d = b.deposito || {};
    const g = {
      deposito: Number.isFinite(Number(d.lat)) && Number.isFinite(Number(d.lon)) && d.nome
        ? { nome: String(d.nome).slice(0, 200), lat: Number(d.lat), lon: Number(d.lon) } : null,
      rientro: b.rientro !== false,
      consegnePrima: !!b.consegnePrima,
      sosta: Math.min(240, Math.max(0, Number(b.sosta) || 0)),
      partenza: /^\d{2}:\d{2}$/.test(String(b.partenza)) ? b.partenza : '07:30',
    };
    await pool.query(
      "UPDATE aziende SET impostazioni = jsonb_set(impostazioni, '{giri}', $1::jsonb, true) WHERE id=$2",
      [JSON.stringify(g), req.utente.azienda_id]);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// Avvisi delle revisioni per email: li vede e li cambia solo il titolare
r.get('/avvisi', richiediFunzione('scadenze'), richiediRuolo('admin'), async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT impostazioni FROM aziende WHERE id=$1', [req.utente.azienda_id]);
    const imp = rows[0] && rows[0].impostazioni;
    res.json({
      ...avvisi.leggiImpostazioni(imp),
      salvate: !!(imp && imp.avvisiRevisioni),
      servizioAttivo: email.attivo(),
      ultimi: await avvisi.ultimi(req.utente.azienda_id, 15),
    });
  } catch (e) { next(e); }
});

function leggiIndirizzi(v) {
  const lista = (Array.isArray(v) ? v : String(v || '').split(/[\s,;]+/)).map((x) => String(x).trim().toLowerCase()).filter(Boolean);
  const sbagliati = lista.filter((x) => !email.EMAIL_VALIDA.test(x));
  return { lista: [...new Set(lista)].filter((x) => email.EMAIL_VALIDA.test(x)).slice(0, 10), sbagliati };
}

r.put('/avvisi', richiediFunzione('scadenze'), richiediRuolo('admin'), async (req, res, next) => {
  try {
    const b = req.body || {};
    const { lista, sbagliati } = leggiIndirizzi(b.email);
    if (sbagliati.length) return res.status(400).json({ errore: 'Questo indirizzo email non è valido: ' + sbagliati[0] });
    const giorni = {};
    avvisi.PASSI.forEach((g) => { giorni[g] = !(b.giorni && b.giorni[g] === false); });
    const v = { email: lista, mensile: b.mensile !== false, giorni };
    await pool.query(
      "UPDATE aziende SET impostazioni = jsonb_set(impostazioni, '{avvisiRevisioni}', $1::jsonb, true) WHERE id=$2",
      [JSON.stringify(v), req.utente.azienda_id]);
    res.json({ ok: true });
    if (lista.length) avvisi.controlla().catch(() => {});   // se c'è già qualcosa da mandare, parte subito
  } catch (e) { next(e); }
});

r.post('/avvisi/prova', richiediFunzione('scadenze'), richiediRuolo('admin'), async (req, res, next) => {
  try {
    if (!email.attivo()) return res.status(400).json({ errore: 'Il servizio email non è ancora attivo: deve attivarlo l’amministratore di Stiva.' });
    const { lista, sbagliati } = leggiIndirizzi(req.body && req.body.email);
    if (sbagliati.length) return res.status(400).json({ errore: 'Questo indirizzo email non è valido: ' + sbagliati[0] });
    if (!lista.length) return res.status(400).json({ errore: 'Scrivi almeno un indirizzo email.' });
    try { await avvisi.prova(req.utente.azienda_id, lista); }
    catch (e) { return res.status(502).json({ errore: 'Email non inviata: ' + e.message }); }
    res.json({ ok: true, a: lista });
  } catch (e) { next(e); }
});

module.exports = r;
