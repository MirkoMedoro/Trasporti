// Statistiche di utilizzo: solo per il super amministratore.
const express = require('express');
const { pool } = require('../db');
const { richiediLogin, richiediRuolo } = require('../auth');
const { EVENTI, CONSERVAZIONE_MESI } = require('../attivita');
const { FUNZIONI, funzioniAttive } = require('../funzioni');

const r = express.Router();
r.use(richiediLogin, richiediRuolo('superadmin'));

const TZ = 'Europe/Rome';
const ACCESSI = ['accesso', 'sessione'];
const AZIONI = Object.keys(EVENTI).filter((k) => EVENTI[k].tipo === 'azione');
const NOMI_FUNZIONI = Object.assign({ mezzi: 'Mezzi' }, Object.fromEntries(FUNZIONI.map((f) => [f.id, f.nome])));

function giorni(req) {
  const g = Math.round(Number(req.query.giorni) || 30);
  return Math.min(365, Math.max(7, g));
}

// Serie giorno per giorno (ora italiana), con i giorni vuoti a zero
async function serie(g, aziendaId) {
  const { rows } = await pool.query(`
    WITH giorni AS (
      SELECT generate_series((now() AT TIME ZONE '${TZ}')::date - ($1::int - 1), (now() AT TIME ZONE '${TZ}')::date, interval '1 day')::date AS giorno
    ), eventi AS (
      SELECT (creato_il AT TIME ZONE '${TZ}')::date AS giorno, evento, utente_id, azienda_id
        FROM attivita
       WHERE creato_il >= ((now() AT TIME ZONE '${TZ}')::date - ($1::int - 1)) AT TIME ZONE '${TZ}'
         AND ($2::int IS NULL OR azienda_id = $2)
    )
    SELECT to_char(g.giorno, 'YYYY-MM-DD') AS giorno,
           COUNT(e.evento) FILTER (WHERE e.evento = ANY($3)) AS azioni,
           COUNT(e.evento) FILTER (WHERE e.evento = ANY($4)) AS accessi,
           COUNT(DISTINCT e.utente_id) AS utenti,
           COUNT(DISTINCT e.azienda_id) AS aziende
      FROM giorni g LEFT JOIN eventi e ON e.giorno = g.giorno
     GROUP BY g.giorno ORDER BY g.giorno`, [g, aziendaId || null, AZIONI, ACCESSI]);
  return rows.map((x) => ({ giorno: x.giorno, azioni: +x.azioni, accessi: +x.accessi, utenti: +x.utenti, aziende: +x.aziende }));
}

async function perEvento(g, aziendaId) {
  const { rows } = await pool.query(
    `SELECT evento, COUNT(*)::int AS n FROM attivita
      WHERE creato_il > now() - make_interval(days => $1) AND ($2::int IS NULL OR azienda_id = $2)
      GROUP BY evento`, [g, aziendaId || null]);
  return Object.fromEntries(rows.map((x) => [x.evento, x.n]));
}

function perFunzione(eventi) {
  const out = {};
  Object.keys(NOMI_FUNZIONI).forEach((f) => { out[f] = { aperture: 0, azioni: 0 }; });
  Object.keys(eventi).forEach((ev) => {
    const d = EVENTI[ev];
    if (!d || !d.funzione || !out[d.funzione]) return;
    if (d.tipo === 'pagina') out[d.funzione].aperture += eventi[ev]; else out[d.funzione].azioni += eventi[ev];
  });
  return out;
}

// Semaforo: attiva / in calo / ferma
function semaforo(a) {
  if (!a.ultimo) return { stato: 'ferma', motivo: 'Nessun utilizzo registrato' };
  const giorniFa = Math.floor((Date.now() - new Date(a.ultimo).getTime()) / 86400000);
  if (giorniFa >= 14) return { stato: 'ferma', motivo: `Nessun utilizzo da ${giorniFa} giorni` };
  if (giorniFa >= 7) return { stato: 'calo', motivo: `Ultimo utilizzo ${giorniFa} giorni fa` };
  if (a.prec30 >= 10 && a.ult30 < a.prec30 * 0.5) {
    return { stato: 'calo', motivo: `Uso dimezzato: ${a.ult30} operazioni negli ultimi 30 giorni contro ${a.prec30} nei 30 precedenti` };
  }
  return { stato: 'attiva', motivo: giorniFa === 0 ? 'Usata oggi' : `Usata ${giorniFa === 1 ? 'ieri' : giorniFa + ' giorni fa'}` };
}

async function aziendeConStatistiche(g) {
  const { rows } = await pool.query(`
    SELECT a.id, a.nome, a.attiva, a.funzioni, a.creata_il,
      (SELECT COUNT(*)::int FROM utenti u WHERE u.azienda_id = a.id) AS utenti,
      (SELECT COUNT(*)::int FROM utenti u WHERE u.azienda_id = a.id AND u.ultimo_accesso IS NULL) AS mai_entrati,
      (SELECT COUNT(*)::int FROM mezzi m WHERE m.azienda_id = a.id) AS mezzi,
      s.ultimo, COALESCE(s.utenti_attivi, 0) AS utenti_attivi, COALESCE(s.accessi, 0) AS accessi,
      COALESCE(s.azioni, 0) AS azioni, COALESCE(s.ult30, 0) AS ult30, COALESCE(s.prec30, 0) AS prec30, COALESCE(s.ult7, 0) AS ult7
    FROM aziende a
    LEFT JOIN (
      SELECT azienda_id, MAX(creato_il) AS ultimo,
        COUNT(DISTINCT utente_id) FILTER (WHERE creato_il > now() - make_interval(days => $1))::int AS utenti_attivi,
        COUNT(*) FILTER (WHERE evento = ANY($2) AND creato_il > now() - make_interval(days => $1))::int AS accessi,
        COUNT(*) FILTER (WHERE evento = ANY($3) AND creato_il > now() - make_interval(days => $1))::int AS azioni,
        COUNT(*) FILTER (WHERE evento = ANY($3) AND creato_il > now() - interval '30 days')::int AS ult30,
        COUNT(*) FILTER (WHERE evento = ANY($3) AND creato_il <= now() - interval '30 days' AND creato_il > now() - interval '60 days')::int AS prec30,
        COUNT(*) FILTER (WHERE creato_il > now() - interval '7 days')::int AS ult7
      FROM attivita GROUP BY azienda_id
    ) s ON s.azienda_id = a.id
    ORDER BY a.nome`, [g, ACCESSI, AZIONI]);
  // Funzioni usate nel periodo, per azienda
  const f = await pool.query(
    `SELECT azienda_id, evento, COUNT(*)::int AS n FROM attivita
      WHERE creato_il > now() - make_interval(days => $1) GROUP BY azienda_id, evento`, [g]);
  const usate = {};
  f.rows.forEach((x) => {
    const d = EVENTI[x.evento];
    if (!d || !d.funzione) return;
    usate[x.azienda_id] = usate[x.azienda_id] || {};
    usate[x.azienda_id][d.funzione] = (usate[x.azienda_id][d.funzione] || 0) + x.n;
  });
  return rows.map((a) => Object.assign(a, {
    funzioni: funzioniAttive(a.funzioni),
    usoFunzioni: usate[a.id] || {},
    semaforo: a.attiva ? semaforo(a) : { stato: 'sospesa', motivo: 'Azienda sospesa' },
  }));
}

r.get('/', async (req, res, next) => {
  try {
    const g = giorni(req);
    const aziende = await aziendeConStatistiche(g);
    const tot = (await pool.query(`
      SELECT
        (SELECT COUNT(*)::int FROM utenti WHERE azienda_id IS NOT NULL) AS utenti,
        (SELECT COUNT(DISTINCT utente_id)::int FROM attivita WHERE creato_il > now() - interval '7 days') AS utenti7,
        (SELECT COUNT(DISTINCT utente_id)::int FROM attivita WHERE creato_il > now() - make_interval(days => $1)) AS utentiP,
        (SELECT COUNT(DISTINCT azienda_id)::int FROM attivita WHERE (creato_il AT TIME ZONE '${TZ}')::date = (now() AT TIME ZONE '${TZ}')::date) AS aziendeOggi,
        (SELECT COUNT(DISTINCT azienda_id)::int FROM attivita WHERE creato_il > now() - interval '7 days') AS aziende7,
        (SELECT COUNT(DISTINCT azienda_id)::int FROM attivita WHERE creato_il > now() - make_interval(days => $1)) AS aziendeP,
        (SELECT MIN(creato_il) FROM attivita) AS primo_evento`, [g])).rows[0];
    const disp = (await pool.query(
      `SELECT dispositivo, COUNT(*)::int AS n FROM attivita
        WHERE creato_il > now() - make_interval(days => $1) AND dispositivo IS NOT NULL GROUP BY dispositivo`, [g])).rows;
    const orari = (await pool.query(
      `SELECT EXTRACT(ISODOW FROM creato_il AT TIME ZONE '${TZ}')::int AS dow, EXTRACT(HOUR FROM creato_il AT TIME ZONE '${TZ}')::int AS ora, COUNT(*)::int AS n
         FROM attivita WHERE creato_il > now() - make_interval(days => $1)
        GROUP BY 1, 2`, [g])).rows;
    const eventi = await perEvento(g);
    res.json({
      giorni: g, totali: tot, aziende, serie: await serie(g), perEvento: eventi, perFunzione: perFunzione(eventi),
      dispositivi: Object.fromEntries(disp.map((x) => [x.dispositivo, x.n])), orari,
      eventi: EVENTI, nomiFunzioni: NOMI_FUNZIONI, conservazioneMesi: CONSERVAZIONE_MESI,
    });
  } catch (e) { next(e); }
});

r.get('/azienda/:id', async (req, res, next) => {
  try {
    const g = giorni(req), id = Number(req.params.id);
    const tutte = await aziendeConStatistiche(g);
    const azienda = tutte.find((a) => a.id === id);
    if (!azienda) return res.status(404).json({ errore: 'Azienda non trovata.' });
    const { rows: utenti } = await pool.query(`
      SELECT u.id, u.nome, u.email, u.ruolo, u.attivo, u.creato_il, u.ultimo_accesso,
        COUNT(t.id) FILTER (WHERE t.evento = ANY($3))::int AS accessi,
        COUNT(t.id) FILTER (WHERE t.evento = ANY($4))::int AS azioni,
        COUNT(DISTINCT (t.creato_il AT TIME ZONE '${TZ}')::date)::int AS giorni_attivi,
        COUNT(t.id) FILTER (WHERE t.dispositivo = 'telefono')::int AS da_telefono,
        COUNT(t.id)::int AS eventi
      FROM utenti u
      LEFT JOIN attivita t ON t.utente_id = u.id AND t.creato_il > now() - make_interval(days => $2)
      WHERE u.azienda_id = $1
      GROUP BY u.id ORDER BY u.nome`, [id, g, ACCESSI, AZIONI]);
    const perUtente = (await pool.query(
      `SELECT utente_id, evento, COUNT(*)::int AS n FROM attivita
        WHERE azienda_id = $1 AND creato_il > now() - make_interval(days => $2) GROUP BY utente_id, evento`, [id, g])).rows;
    utenti.forEach((u) => {
      const f = {};
      perUtente.filter((x) => x.utente_id === u.id).forEach((x) => {
        const d = EVENTI[x.evento];
        if (d && d.funzione) f[d.funzione] = (f[d.funzione] || 0) + x.n;
      });
      const top = Object.keys(f).sort((a, b) => f[b] - f[a])[0];
      u.funzionePreferita = top ? NOMI_FUNZIONI[top] : null;
    });
    const eventi = await perEvento(g, id);
    res.json({ giorni: g, azienda, utenti, serie: await serie(g, id), perEvento: eventi, perFunzione: perFunzione(eventi), eventi: EVENTI, nomiFunzioni: NOMI_FUNZIONI });
  } catch (e) { next(e); }
});

// Cronologia delle ultime attività di un utente
r.get('/utente/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const u = (await pool.query(
      `SELECT u.id, u.nome, u.email, u.ruolo, u.ultimo_accesso, a.nome AS azienda
         FROM utenti u JOIN aziende a ON a.id = u.azienda_id WHERE u.id = $1`, [id])).rows[0];
    if (!u) return res.status(404).json({ errore: 'Utente non trovato.' });
    const { rows } = await pool.query(
      'SELECT evento, dispositivo, creato_il FROM attivita WHERE utente_id=$1 ORDER BY creato_il DESC LIMIT 150', [id]);
    res.json({ utente: u, attivita: rows, eventi: EVENTI });
  } catch (e) { next(e); }
});

// Esportazione per Excel: una riga per utente
r.get('/esporta', async (req, res, next) => {
  try {
    const g = giorni(req);
    const { rows } = await pool.query(`
      SELECT a.nome AS azienda, a.attiva, u.nome, u.email, u.ruolo, u.attivo, u.ultimo_accesso, t.evento, COUNT(t.id)::int AS n
        FROM utenti u JOIN aziende a ON a.id = u.azienda_id
        LEFT JOIN attivita t ON t.utente_id = u.id AND t.creato_il > now() - make_interval(days => $1)
       GROUP BY a.nome, a.attiva, u.id, t.evento ORDER BY a.nome, u.nome`, [g]);
    const utenti = new Map();
    rows.forEach((x) => {
      const k = x.azienda + '|' + x.email;
      if (!utenti.has(k)) utenti.set(k, { x, f: {}, accessi: 0, azioni: 0 });
      const u = utenti.get(k);
      if (!x.evento) return;
      if (ACCESSI.includes(x.evento)) u.accessi += x.n;
      if (AZIONI.includes(x.evento)) u.azioni += x.n;
      const d = EVENTI[x.evento];
      if (d && d.funzione) u.f[d.funzione] = (u.f[d.funzione] || 0) + x.n;
    });
    const fun = Object.keys(NOMI_FUNZIONI);
    const cella = (v) => { const s = String(v == null ? '' : v); return /[;"\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
    const dataIt = (d) => (d ? new Date(d).toLocaleString('it-IT', { timeZone: TZ }) : 'mai');
    const righe = [['Azienda', 'Azienda attiva', 'Utente', 'Email', 'Ruolo', 'Utente attivo', 'Ultimo accesso', `Accessi (${g} gg)`, `Operazioni (${g} gg)`]
      .concat(fun.map((f) => `${NOMI_FUNZIONI[f]} (${g} gg)`))];
    utenti.forEach(({ x, f, accessi, azioni }) => {
      righe.push([x.azienda, x.attiva ? 'sì' : 'no', x.nome, x.email, x.ruolo === 'admin' ? 'Titolare' : 'Operatore', x.attivo ? 'sì' : 'no',
        dataIt(x.ultimo_accesso), accessi, azioni].concat(fun.map((k) => f[k] || 0)));
    });
    const csv = '﻿' + righe.map((rr) => rr.map(cella).join(';')).join('\r\n');
    const oggi = new Intl.DateTimeFormat('sv-SE', { timeZone: TZ }).format(new Date());
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="stiva-statistiche-${oggi}.csv"`);
    res.send(csv);
  } catch (e) { next(e); }
});

module.exports = r;
