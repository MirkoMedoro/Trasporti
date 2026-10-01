// Pannello del super amministratore: gestione delle aziende clienti
const express = require('express');
const bcrypt = require('bcryptjs');
const { pool } = require('../db');
const { richiediLogin, richiediRuolo } = require('../auth');
const { testo, emailValida } = require('../validazione');
const { FUNZIONI, funzioniAttive } = require('../funzioni');
const consumi = require('../consumiAi');

const r = express.Router();
r.use(richiediLogin, richiediRuolo('superadmin'));

r.get('/', async (req, res, next) => {
  try {
    const { rows } = await pool.query(`
      SELECT a.id, a.nome, a.attiva, a.creata_il, a.funzioni, a.limite_ai_mese::float AS limite_ai_mese,
        (SELECT COUNT(*)::int FROM utenti u WHERE u.azienda_id=a.id) AS utenti,
        (SELECT COUNT(*)::int FROM mezzi m WHERE m.azienda_id=a.id) AS mezzi,
        (SELECT COUNT(*)::int FROM piani p WHERE p.azienda_id=a.id) AS piani,
        (SELECT u.email FROM utenti u WHERE u.azienda_id=a.id AND u.ruolo='admin' ORDER BY u.id LIMIT 1) AS email_titolare
      FROM aziende a ORDER BY a.nome`);
    const spese = await consumi.riepilogoAziende();
    const saldi = await consumi.saldiAziende();
    rows.forEach((r) => {
      r.funzioni = funzioniAttive(r.funzioni);
      const c = spese.perAzienda[r.id] || {};
      r.ai = {
        mese: c.mese || 0, lettureMese: c.letture_mese || 0, meseScorso: c.mese_scorso || 0, lettureMeseScorso: c.letture_mese_scorso || 0,
        limite: r.limite_ai_mese === null ? spese.limitePredefinito : r.limite_ai_mese, predefinito: r.limite_ai_mese === null,
      };
      const k = saldi[r.id] || {};
      r.credito = { saldo: k.saldo || 0, lettureMese: k.letture_mese || 0, incassoMese: k.incasso_mese || 0, ultimaRicarica: k.ultima_ricarica || null };
    });
    res.json({ aziende: rows, funzioni: FUNZIONI, ai: { totaleMese: spese.totaleMese, limiteTotale: spese.limiteTotale, limitePredefinito: spese.limitePredefinito, credito: consumi.creditoAttivo(), prezzo: consumi.prezzoLettura() } });
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
    // tetto mensile della lettura intelligente: '' = valore predefinito, 0 = spenta
    if (req.body.limiteAi !== undefined) {
      const v = String(req.body.limiteAi).trim().replace(',', '.');
      if (v === '') await pool.query('UPDATE aziende SET limite_ai_mese=NULL WHERE id=$1', [id]);
      else {
        const n = Number(v);
        if (!Number.isFinite(n) || n < 0 || n > 100000) return res.status(400).json({ errore: 'Limite non valido: scrivi un importo in dollari, per esempio 20.' });
        await pool.query('UPDATE aziende SET limite_ai_mese=$1 WHERE id=$2', [Math.round(n * 100) / 100, id]);
      }
    }
    if (req.body.funzioni && typeof req.body.funzioni === 'object') {
      const f = {};
      FUNZIONI.forEach((x) => { if (typeof req.body.funzioni[x.id] === 'boolean') f[x.id] = req.body.funzioni[x.id]; });
      await pool.query('UPDATE aziende SET funzioni = funzioni || $1::jsonb WHERE id=$2', [JSON.stringify(f), id]);
    }
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// ---------- Credito della lettura intelligente ----------
r.get('/:id/credito', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    res.json({ saldo: await consumi.saldo(id), prezzo: consumi.prezzoLettura(), movimenti: await consumi.movimenti(id, 20) });
  } catch (e) { next(e); }
});
// Ricarica (importo positivo, es. 50 dopo il pagamento del pacchetto) o correzione (importo negativo)
r.post('/:id/credito', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const { rows } = await pool.query('SELECT 1 FROM aziende WHERE id=$1', [id]);
    if (!rows.length) return res.status(404).json({ errore: 'Azienda non trovata.' });
    const importo = Number(String(req.body.importo || '').trim().replace(',', '.'));
    if (!Number.isFinite(importo) || importo === 0 || Math.abs(importo) > 100000) return res.status(400).json({ errore: 'Importo non valido: scrivi quanti euro caricare, per esempio 50.' });
    await consumi.ricarica(id, Math.round(importo * 100) / 100, testo(req.body.nota, 200), req.utente.id);
    res.json({ ok: true, saldo: await consumi.saldo(id) });
  } catch (e) { next(e); }
});

// ---------- Utenti delle aziende clienti ----------
// Chiave richiesta per le eliminazioni: serve a evitare cancellazioni accidentali.
// Si può cambiare su Railway con la variabile CHIAVE_CONFERMA.
const CHIAVE = () => String(process.env.CHIAVE_CONFERMA || '1234');
function chiaveValida(req) { return String((req.body && req.body.chiave) || '') === CHIAVE(); }

async function aziendaEsiste(id) {
  const { rows } = await pool.query('SELECT id, nome, attiva FROM aziende WHERE id=$1', [id]);
  return rows[0] || null;
}
async function utenteDellAzienda(uid, aid) {
  const { rows } = await pool.query('SELECT id, nome, ruolo, attivo FROM utenti WHERE id=$1 AND azienda_id=$2', [uid, aid]);
  return rows[0] || null;
}
// L'azienda deve avere sempre almeno un titolare attivo
async function altriTitolariAttivi(aid, esclusoId) {
  const { rows } = await pool.query(
    "SELECT COUNT(*)::int AS n FROM utenti WHERE azienda_id=$1 AND ruolo='admin' AND attivo AND id<>$2", [aid, esclusoId]);
  return rows[0].n;
}
const MSG_ULTIMO = "È l'unico titolare attivo dell'azienda: nomina prima un altro titolare.";

r.get('/:id/utenti', async (req, res, next) => {
  try {
    const az = await aziendaEsiste(Number(req.params.id));
    if (!az) return res.status(404).json({ errore: 'Azienda non trovata.' });
    const { rows } = await pool.query(
      `SELECT u.id, u.nome, u.email, u.ruolo, u.attivo, u.creato_il,
         (SELECT COUNT(*)::int FROM piani p WHERE p.creato_da=u.id) AS piani,
         (SELECT COUNT(*)::int FROM viaggi v WHERE v.creato_da=u.id) AS viaggi
       FROM utenti u WHERE u.azienda_id=$1 ORDER BY u.ruolo, u.nome`, [az.id]);
    res.json({ azienda: az, utenti: rows });
  } catch (e) { next(e); }
});

r.post('/:id/utenti', async (req, res, next) => {
  try {
    const az = await aziendaEsiste(Number(req.params.id));
    if (!az) return res.status(404).json({ errore: 'Azienda non trovata.' });
    const nome = testo(req.body.nome, 100);
    const email = testo(req.body.email, 200).toLowerCase();
    const password = String(req.body.password || '');
    const ruolo = req.body.ruolo === 'admin' ? 'admin' : 'operatore';
    if (!nome) return res.status(400).json({ errore: 'Inserisci il nome.' });
    if (!emailValida(email)) return res.status(400).json({ errore: 'Email non valida.' });
    if (password.length < 8) return res.status(400).json({ errore: 'La password deve avere almeno 8 caratteri.' });
    const esiste = await pool.query('SELECT 1 FROM utenti WHERE email=$1', [email]);
    if (esiste.rowCount) return res.status(400).json({ errore: 'Questa email è già usata da un altro utente.' });
    await pool.query(
      'INSERT INTO utenti (azienda_id, email, nome, password_hash, ruolo) VALUES ($1,$2,$3,$4,$5)',
      [az.id, email, nome, await bcrypt.hash(password, 10), ruolo]);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// Sospensione/riattivazione, cambio ruolo, nuova password
r.patch('/:id/utenti/:uid', async (req, res, next) => {
  try {
    const aid = Number(req.params.id), uid = Number(req.params.uid);
    const u = await utenteDellAzienda(uid, aid);
    if (!u) return res.status(404).json({ errore: 'Utente non trovato in questa azienda.' });
    const b = req.body || {};
    const perdeTitolare = u.ruolo === 'admin' && u.attivo &&
      (b.attivo === false || (b.ruolo && b.ruolo !== 'admin'));
    if (perdeTitolare && !(await altriTitolariAttivi(aid, uid))) return res.status(400).json({ errore: MSG_ULTIMO });
    if (typeof b.attivo === 'boolean') await pool.query('UPDATE utenti SET attivo=$1 WHERE id=$2', [b.attivo, uid]);
    if (b.ruolo === 'admin' || b.ruolo === 'operatore') await pool.query('UPDATE utenti SET ruolo=$1 WHERE id=$2', [b.ruolo, uid]);
    if (b.password) {
      const p = String(b.password);
      if (p.length < 8) return res.status(400).json({ errore: 'La password deve avere almeno 8 caratteri.' });
      await pool.query('UPDATE utenti SET password_hash=$1 WHERE id=$2', [await bcrypt.hash(p, 10), uid]);
    }
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// Eliminazione definitiva: richiede la chiave di conferma
r.delete('/:id/utenti/:uid', async (req, res, next) => {
  try {
    if (!chiaveValida(req)) return res.status(403).json({ errore: 'Chiave di conferma errata: utente non eliminato.' });
    const aid = Number(req.params.id), uid = Number(req.params.uid);
    const u = await utenteDellAzienda(uid, aid);
    if (!u) return res.status(404).json({ errore: 'Utente non trovato in questa azienda.' });
    if (u.ruolo === 'admin' && u.attivo && !(await altriTitolariAttivi(aid, uid))) return res.status(400).json({ errore: MSG_ULTIMO });
    // Piani e viaggi creati dall'utente restano all'azienda (l'autore diventa vuoto)
    await pool.query('DELETE FROM utenti WHERE id=$1 AND azienda_id=$2', [uid, aid]);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

module.exports = r;
