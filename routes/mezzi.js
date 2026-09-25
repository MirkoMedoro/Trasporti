// Flotta dell'azienda: furgoni, motrici, trattori, semirimorchi, rimorchi
const express = require('express');
const { pool } = require('../db');
const { richiediLogin, richiediAzienda } = require('../auth');
const { intero, testo } = require('../validazione');

const r = express.Router();
r.use(richiediLogin, richiediAzienda);

const CATEGORIE = ['furgone', 'motrice', 'trattore', 'semirimorchio', 'rimorchio'];
const CON_VANO = ['furgone', 'motrice', 'semirimorchio', 'rimorchio'];
const A_MOTORE = ['furgone', 'motrice', 'trattore'];

function data(v) {
  if (!v) return null;
  const s = String(v).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s) || isNaN(new Date(s + 'T00:00:00Z'))) return undefined;
  return s;
}

function leggiMezzo(b) {
  const categoria = CATEGORIE.includes(b.categoria) ? b.categoria : null;
  if (!categoria) return { errore: 'Scegli il tipo di mezzo.' };
  const padroncino = b.proprieta === 'padroncino';
  const m = {
    categoria,
    proprieta: padroncino ? 'padroncino' : 'proprio',
    ditta: padroncino ? (testo(b.ditta, 150) || null) : null,
    nome: testo(b.nome, 100),
    targa: testo(b.targa, 20).toUpperCase(),
    lunghezza: null, larghezza: null, altezza: null, portata: null, consumo: null,
    ultima_revisione: data(b.ultima_revisione),
    scadenza_revisione: data(b.scadenza_revisione),
    officina_revisione: testo(b.officina_revisione, 150) || null,
  };
  if (!m.nome && !m.targa) return { errore: 'Inserisci almeno il nome o la targa del mezzo.' };
  if (!m.nome) m.nome = m.targa;
  if (CON_VANO.includes(categoria)) {
    m.lunghezza = intero(b.lunghezza, 50, 5000);
    m.larghezza = intero(b.larghezza, 50, 400);
    m.altezza = intero(b.altezza, 50, 500);
    m.portata = intero(b.portata, 1, 100000);
    if (!m.lunghezza || !m.larghezza || !m.altezza) return { errore: 'Controlla le misure del vano di carico (in cm).' };
    if (!m.portata) return { errore: 'Inserisci il peso massimo caricabile in kg.' };
  }
  if (A_MOTORE.includes(categoria) && b.consumo !== '' && b.consumo != null) {
    m.consumo = Math.round(Number(String(b.consumo).replace(',', '.')) * 10) / 10;
    if (!(m.consumo > 0 && m.consumo < 150)) return { errore: 'Il consumo va indicato in litri ogni 100 km (es. 32).' };
  }
  // I mezzi dei padroncini non entrano nello scadenziario: la revisione non si registra
  if (padroncino) { m.ultima_revisione = null; m.scadenza_revisione = null; m.officina_revisione = null; }
  if (m.ultima_revisione === undefined || m.scadenza_revisione === undefined) return { errore: 'Controlla le date della revisione.' };
  return { m };
}

const COLONNE = 'categoria,nome,targa,lunghezza,larghezza,altezza,portata,consumo,ultima_revisione,scadenza_revisione,officina_revisione,proprieta,ditta';
const valori = (m) => [m.categoria, m.nome, m.targa, m.lunghezza, m.larghezza, m.altezza, m.portata, m.consumo, m.ultima_revisione, m.scadenza_revisione, m.officina_revisione, m.proprieta, m.ditta];
const SELEZIONE = `id, azienda_id, ${COLONNE.replace('ultima_revisione,scadenza_revisione', "to_char(ultima_revisione,'YYYY-MM-DD') AS ultima_revisione,to_char(scadenza_revisione,'YYYY-MM-DD') AS scadenza_revisione")}`;

r.get('/', async (req, res, next) => {
  try {
    const { rows } = await pool.query(`SELECT ${SELEZIONE} FROM mezzi WHERE azienda_id=$1 ORDER BY nome`, [req.utente.azienda_id]);
    rows.forEach((x) => { if (x.consumo !== null) x.consumo = Number(x.consumo); });
    res.json(rows);
  } catch (e) { next(e); }
});

r.post('/', async (req, res, next) => {
  try {
    const { m, errore } = leggiMezzo(req.body);
    if (errore) return res.status(400).json({ errore });
    const { rows } = await pool.query(
      `INSERT INTO mezzi (azienda_id,${COLONNE}) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING id`,
      [req.utente.azienda_id, ...valori(m)]);
    res.json({ ok: true, id: rows[0].id });
  } catch (e) { next(e); }
});

r.put('/:id', async (req, res, next) => {
  try {
    const { m, errore } = leggiMezzo(req.body);
    if (errore) return res.status(400).json({ errore });
    const id = Number(req.params.id);
    // Un mezzo usato in un complesso non può cambiare in un tipo incompatibile
    const uso = await pool.query('SELECT 1 FROM complessi WHERE (trainante_id=$1 OR rimorchio_id=$1) AND azienda_id=$2', [id, req.utente.azienda_id]);
    const prima = await pool.query('SELECT categoria FROM mezzi WHERE id=$1 AND azienda_id=$2', [id, req.utente.azienda_id]);
    if (!prima.rowCount) return res.status(404).json({ errore: 'Mezzo non trovato.' });
    if (uso.rowCount && prima.rows[0].categoria !== m.categoria) {
      return res.status(400).json({ errore: 'Questo mezzo fa parte di un complesso veicolare: elimina prima il complesso per cambiarne il tipo.' });
    }
    await pool.query(
      `UPDATE mezzi SET categoria=$1,nome=$2,targa=$3,lunghezza=$4,larghezza=$5,altezza=$6,portata=$7,consumo=$8,
         ultima_revisione=$9,scadenza_revisione=$10,officina_revisione=$11,proprieta=$12,ditta=$13
       WHERE id=$14 AND azienda_id=$15`,
      [...valori(m), id, req.utente.azienda_id]);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// Registrazione rapida di una revisione appena fatta (dallo scadenziario)
r.patch('/:id/revisione', async (req, res, next) => {
  try {
    const fatta = data(req.body.ultima_revisione), scad = data(req.body.scadenza_revisione);
    if (!fatta || !scad) return res.status(400).json({ errore: 'Inserisci la data della revisione e la nuova scadenza.' });
    if (scad <= fatta) return res.status(400).json({ errore: 'La nuova scadenza deve essere successiva alla data della revisione.' });
    const { rowCount } = await pool.query(
      "UPDATE mezzi SET ultima_revisione=$1, scadenza_revisione=$2, officina_revisione=$3 WHERE id=$4 AND azienda_id=$5 AND proprieta='proprio'",
      [fatta, scad, testo(req.body.officina_revisione, 150) || null, Number(req.params.id), req.utente.azienda_id]);
    if (!rowCount) return res.status(404).json({ errore: 'Mezzo non trovato.' });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

r.delete('/:id', async (req, res, next) => {
  try {
    await pool.query('DELETE FROM mezzi WHERE id=$1 AND azienda_id=$2', [Number(req.params.id), req.utente.azienda_id]);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

module.exports = r;
