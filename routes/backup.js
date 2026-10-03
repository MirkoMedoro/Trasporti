// Backup completo del database (solo super amministratore).
// Il file è un JSON con tutte le tabelle: si scarica e si può ricaricare per ripristinare tutto.
const express = require('express');
const { pool } = require('../db');
const { richiediLogin, richiediRuolo } = require('../auth');

const r = express.Router();

// Tabelle in ordine di dipendenza (chi viene prima è richiamato da chi viene dopo).
// Se in futuro si aggiunge una tabella, va inserita qui.
const TABELLE = ['aziende', 'utenti', 'mezzi', 'complessi', 'colli_salvati', 'piani', 'viaggi', 'attivita', 'consumi_ai', 'crediti_ai', 'avvisi_inviati'];
const FORMATO = 'stiva-backup';
const VERSIONE = 1;
const CHIAVE = () => String(process.env.CHIAVE_CONFERMA || '1234');

async function colonne(client, tabella) {
  const { rows } = await client.query(
    "SELECT column_name FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = $1", [tabella]);
  return rows.map((x) => x.column_name);
}

// Numeri per la pagina del backup
r.get('/riepilogo', richiediLogin, richiediRuolo('superadmin'), async (req, res, next) => {
  try {
    const conta = {};
    for (const t of TABELLE) {
      const { rows } = await pool.query(`SELECT COUNT(*)::int AS n FROM ${t}`);
      conta[t] = rows[0].n;
    }
    const { rows } = await pool.query('SELECT pg_size_pretty(pg_database_size(current_database())) AS dimensione');
    res.json({ conta, dimensione: rows[0].dimensione });
  } catch (e) { next(e); }
});

// Scarica il backup completo
r.get('/', richiediLogin, richiediRuolo('superadmin'), async (req, res, next) => {
  const client = await pool.connect();
  try {
    // Lettura coerente: tutte le tabelle fotografate nello stesso istante
    await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
    const tabelle = {};
    for (const t of TABELLE) {
      // È PostgreSQL a produrre il JSON: date, numeri e campi JSON restano esatti
      const { rows } = await client.query(`SELECT COALESCE(json_agg(x ORDER BY x.id), '[]'::json) AS dati FROM ${t} x`);
      tabelle[t] = rows[0].dati;
    }
    await client.query('COMMIT');
    const ora = new Date();
    const backup = {
      formato: FORMATO,
      versione: VERSIONE,
      creato_il: ora.toISOString(),
      creato_da: req.utente.email,
      conta: Object.fromEntries(TABELLE.map((t) => [t, tabelle[t].length])),
      tabelle,
    };
    // Data e ora italiane nel nome del file (il server lavora in UTC)
    const parti = Object.fromEntries(new Intl.DateTimeFormat('it-IT', {
      timeZone: 'Europe/Rome', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    }).formatToParts(ora).map((x) => [x.type, x.value]));
    const nome = `stiva-backup-${parti.year}-${parti.month}-${parti.day}-${parti.hour}${parti.minute}.json`;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${nome}"`);
    res.setHeader('Cache-Control', 'no-store');
    res.send(JSON.stringify(backup));
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    next(e);
  } finally { client.release(); }
});

// Ripristino: sostituisce TUTTI i dati con quelli del file. Tutto o niente.
r.post('/ripristina',
  express.json({ limit: '300mb' }),
  richiediLogin, richiediRuolo('superadmin'),
  async (req, res, next) => {
    const { chiave, backup } = req.body || {};
    if (String(chiave || '') !== CHIAVE()) return res.status(403).json({ errore: 'Chiave di conferma errata: nessun dato è stato modificato.' });
    if (!backup || backup.formato !== FORMATO || !backup.tabelle || typeof backup.tabelle !== 'object') {
      return res.status(400).json({ errore: 'Il file non è un backup di Stiva.' });
    }
    if (backup.versione > VERSIONE) {
      return res.status(400).json({ errore: 'Il backup è stato creato da una versione più recente del programma: aggiorna prima il programma.' });
    }
    for (const t of TABELLE) {
      if (backup.tabelle[t] !== undefined && !Array.isArray(backup.tabelle[t])) return res.status(400).json({ errore: `Il backup è danneggiato (tabella ${t}).` });
    }
    const utenti = backup.tabelle.utenti || [];
    if (!utenti.some((u) => u.ruolo === 'superadmin' && u.attivo !== false)) {
      return res.status(400).json({ errore: 'Il backup non contiene un super amministratore attivo: ripristinandolo non potresti più accedere.' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(`TRUNCATE ${TABELLE.join(', ')} RESTART IDENTITY CASCADE`);
      for (const t of TABELLE) {
        const righe = backup.tabelle[t] || [];
        if (!righe.length) continue;
        // Solo le colonne presenti sia nel file sia nel database attuale:
        // un backup di una versione precedente si ripristina lo stesso, le colonne nuove prendono il valore predefinito
        const attuali = await colonne(client, t);
        const nelFile = new Set();
        righe.forEach((x) => Object.keys(x).forEach((k) => nelFile.add(k)));
        const usate = attuali.filter((c) => nelFile.has(c)).map((c) => `"${c}"`).join(', ');
        await client.query(
          `INSERT INTO ${t} (${usate}) SELECT ${usate} FROM jsonb_populate_recordset(NULL::${t}, $1::jsonb)`,
          [JSON.stringify(righe)]);
        await client.query(
          `SELECT setval(pg_get_serial_sequence('${t}', 'id'), COALESCE((SELECT MAX(id) FROM ${t}), 0) + 1, false)`);
      }
      await client.query('COMMIT');
      const conta = {};
      for (const t of TABELLE) conta[t] = (backup.tabelle[t] || []).length;
      console.log(`Ripristino backup del ${backup.creato_il} eseguito da ${req.utente.email}`, conta);
      res.json({ ok: true, conta });
    } catch (e) {
      await client.query('ROLLBACK').catch(() => {});
      console.error('Ripristino fallito:', e);
      res.status(400).json({ errore: 'Ripristino non riuscito, i dati attuali non sono stati toccati. Dettaglio: ' + e.message });
    } finally { client.release(); }
  });

module.exports = r;
