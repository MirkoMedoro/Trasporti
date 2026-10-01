// Lettura intelligente (a pagamento a consumo).
// 1) CREDITO DEI CLIENTI (euro): ogni azienda compra un pacchetto (es. 50 €) che il super amministratore carica
//    dalla lista clienti; ogni lettura intelligente riuscita scala PREZZO_LETTURA_AI (predefinito 0,03 €).
//    Credito finito = resta la lettura gratuita. PREZZO_LETTURA_AI=0 spegne il sistema a credito.
// 2) TUA SPESA VERSO I FORNITORI (dollari): ogni lettura viene registrata con il suo costo stimato.
//    Tetti mensili di protezione:
//     - per azienda: impostabile dalla lista clienti (vuoto = LIMITE_AI_AZIENDA, predefinito nessun tetto;
//       0 = lettura intelligente spenta per quell'azienda);
//     - totale di tutto il programma: variabile LIMITE_AI_TOTALE su Railway (predefinito 100 $).
//    Raggiunto un tetto, la lettura intelligente si ferma fino al primo del mese e resta quella gratuita.
const { pool } = require('./db');

const limitePredefinito = () => numeroValido(process.env.LIMITE_AI_AZIENDA, null);   // null = nessun tetto
const limiteTotale = () => numeroValido(process.env.LIMITE_AI_TOTALE, 100);
function numeroValido(v, base) { const n = Number(v); return v !== undefined && v !== '' && Number.isFinite(n) && n >= 0 ? n : base; }

// prezzi indicativi in dollari per milione di token (entrata, uscita)
const PREZZI = [
  [/^claude-sonnet/, 2, 10], [/^claude-opus/, 4, 20], [/^claude-haiku/, 1, 5], [/^claude-fable/, 10, 50],
  [/^gemini-[\d.]+-flash-lite/, 0.3, 2.5], [/^gemini-[\d.]+-flash/, 0.75, 3.75], [/^gemini-[\d.]+-pro/, 2.5, 15],
  [/^mistral-large/, 0.5, 1.5], [/^mistral-medium/, 1.5, 7.5], [/^mistral-small/, 0.15, 0.6],
  [/^qwen3-vl-plus/, 0.2, 1.6],
];
// Per un modello sconosciuto si usa un prezzo alto: meglio sovrastimare che sforare il tetto
function stimaCosto(modello, tokIn, tokOut) {
  const p = PREZZI.find(([re]) => re.test(String(modello || ''))) || [null, 5, 25];
  return ((Number(tokIn) || 0) * p[1] + (Number(tokOut) || 0) * p[2]) / 1e6;
}

const INIZIO_MESE = "date_trunc('month', now() AT TIME ZONE 'Europe/Rome') AT TIME ZONE 'Europe/Rome'";

async function spesaAzienda(aziendaId) {
  const { rows } = await pool.query(
    `SELECT COALESCE(SUM(costo_usd), 0)::float AS spesa FROM consumi_ai WHERE azienda_id = $1 AND creato_il >= ${INIZIO_MESE}`, [aziendaId]);
  return rows[0].spesa;
}
async function spesaTotale() {
  const { rows } = await pool.query(`SELECT COALESCE(SUM(costo_usd), 0)::float AS spesa FROM consumi_ai WHERE creato_il >= ${INIZIO_MESE}`);
  return rows[0].spesa;
}
async function limiteAzienda(aziendaId) {
  const { rows } = await pool.query('SELECT limite_ai_mese FROM aziende WHERE id = $1', [aziendaId]);
  const v = rows[0] && rows[0].limite_ai_mese;
  return v === null || v === undefined ? limitePredefinito() : Number(v);   // null = nessun tetto
}

// Si può usare la lettura intelligente adesso? aziendaId null = prova del super amministratore (conta solo il tetto totale)
async function verifica(aziendaId) {
  const totale = await spesaTotale(), tetto = limiteTotale();
  if (totale >= tetto) return { ok: false, motivo: 'totale', messaggio: 'La lettura intelligente è in pausa fino al primo del mese (raggiunto il tetto di spesa del programma). Uso la lettura gratuita.' };
  if (aziendaId) {
    const limite = await limiteAzienda(aziendaId);
    if (limite === null) return { ok: true };
    if (limite <= 0) return { ok: false, motivo: 'spenta', messaggio: 'La lettura intelligente non è inclusa nel tuo piano. Uso la lettura gratuita.' };
    if (await spesaAzienda(aziendaId) >= limite) return { ok: false, motivo: 'azienda', messaggio: 'Hai raggiunto il limite mensile della lettura intelligente: fino al primo del mese uso la lettura gratuita.' };
  }
  return { ok: true };
}

async function registra({ aziendaId, utenteId, funzione, fornitore, modello, tokIn, tokOut }) {
  const costo = stimaCosto(modello, tokIn, tokOut);
  try {
    await pool.query(
      'INSERT INTO consumi_ai (azienda_id, utente_id, funzione, fornitore, modello, tok_in, tok_out, costo_usd) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)',
      [aziendaId || null, utenteId || null, funzione, fornitore, modello || null, Number(tokIn) || null, Number(tokOut) || null, costo]);
  } catch (e) { console.error('Registro consumi AI:', e.message); }
  return costo;
}

// Per la lista clienti del super amministratore: spesa di questo mese e del mese scorso per ogni azienda
async function riepilogoAziende() {
  const { rows } = await pool.query(`
    SELECT azienda_id,
      COALESCE(SUM(costo_usd) FILTER (WHERE creato_il >= ${INIZIO_MESE}), 0)::float AS mese,
      COUNT(*) FILTER (WHERE creato_il >= ${INIZIO_MESE})::int AS letture_mese,
      COALESCE(SUM(costo_usd) FILTER (WHERE creato_il < ${INIZIO_MESE}), 0)::float AS mese_scorso,
      COUNT(*) FILTER (WHERE creato_il < ${INIZIO_MESE})::int AS letture_mese_scorso
    FROM consumi_ai
    WHERE azienda_id IS NOT NULL AND creato_il >= (${INIZIO_MESE}) - interval '1 month'
    GROUP BY azienda_id`);
  const mappa = {};
  rows.forEach((r) => { mappa[r.azienda_id] = r; });
  return { perAzienda: mappa, totaleMese: await spesaTotale(), limiteTotale: limiteTotale(), limitePredefinito: limitePredefinito() };
}

// ---------- credito prepagato dei clienti (euro) ----------
const prezzoLettura = () => numeroValido(process.env.PREZZO_LETTURA_AI, 0.03);
const creditoAttivo = () => prezzoLettura() > 0;

async function saldo(aziendaId) {
  const { rows } = await pool.query('SELECT COALESCE(SUM(importo), 0)::float AS saldo FROM crediti_ai WHERE azienda_id = $1', [aziendaId]);
  return Math.round(rows[0].saldo * 10000) / 10000;
}
// stato del credito da mostrare nel Calcolatore
async function statoCredito(aziendaId) {
  if (!creditoAttivo()) return { attivo: false };
  const s = await saldo(aziendaId), prezzo = prezzoLettura();
  return { attivo: true, saldo: s, prezzo, letture: Math.max(0, Math.floor((s + 1e-9) / prezzo)), esaurito: s + 1e-9 < prezzo };
}
// scala una lettura (solo dopo una lettura riuscita)
async function addebita(aziendaId, utenteId, nota) {
  if (!creditoAttivo() || !aziendaId) return;
  await pool.query("INSERT INTO crediti_ai (azienda_id, utente_id, tipo, importo, nota) VALUES ($1,$2,'lettura',$3,$4)",
    [aziendaId, utenteId || null, -prezzoLettura(), nota || null]);
}
// ricarica (importo positivo) o rettifica (negativo), fatta dal super amministratore
async function ricarica(aziendaId, importo, nota, utenteId) {
  await pool.query('INSERT INTO crediti_ai (azienda_id, utente_id, tipo, importo, nota) VALUES ($1,$2,$3,$4,$5)',
    [aziendaId, utenteId || null, importo >= 0 ? 'ricarica' : 'rettifica', importo, nota || null]);
}
async function saldiAziende() {
  const { rows } = await pool.query(`
    SELECT azienda_id, COALESCE(SUM(importo), 0)::float AS saldo,
      COUNT(*) FILTER (WHERE tipo = 'lettura' AND creato_il >= ${INIZIO_MESE})::int AS letture_mese,
      COALESCE(-SUM(importo) FILTER (WHERE tipo = 'lettura' AND creato_il >= ${INIZIO_MESE}), 0)::float AS incasso_mese,
      MAX(creato_il) FILTER (WHERE tipo = 'ricarica') AS ultima_ricarica
    FROM crediti_ai GROUP BY azienda_id`);
  const m = {};
  rows.forEach((r) => { m[r.azienda_id] = r; });
  return m;
}
async function movimenti(aziendaId, quanti) {
  const { rows } = await pool.query(
    `SELECT c.tipo, c.importo::float AS importo, c.nota, c.creato_il, u.nome AS utente
       FROM crediti_ai c LEFT JOIN utenti u ON u.id = c.utente_id
      WHERE c.azienda_id = $1 AND c.tipo <> 'lettura' ORDER BY c.creato_il DESC LIMIT $2`, [aziendaId, quanti || 20]);
  return rows;
}

module.exports = { stimaCosto, verifica, registra, riepilogoAziende, limitePredefinito,
  prezzoLettura, creditoAttivo, saldo, statoCredito, addebita, ricarica, saldiAziende, movimenti };
