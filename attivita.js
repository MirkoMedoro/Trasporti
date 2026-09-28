// Registro delle attività: chi usa il programma, quali funzioni e quando.
// Si registra il FATTO (es. "ha calcolato un piano di carico"), mai il contenuto dei dati.
// Serve solo al super amministratore per capire se il programma viene usato.
const { pool } = require('./db');

// Eventi riconosciuti. "funzione" collega l'evento a una funzione del programma.
// tipo: accesso = entrate nel programma, pagina = apertura di una sezione, azione = operazione vera
const EVENTI = {
  accesso: { nome: 'Accesso con password', tipo: 'accesso', funzione: null },
  sessione: { nome: 'Rientro nel programma', tipo: 'accesso', funzione: null },
  'pagina:carico': { nome: 'Apre Piano di carico', tipo: 'pagina', funzione: 'carico' },
  'pagina:piani': { nome: 'Apre Piani salvati', tipo: 'pagina', funzione: 'carico' },
  'pagina:tassato': { nome: 'Apre il Calcolatore', tipo: 'pagina', funzione: 'tassato' },
  'pagina:viaggi': { nome: 'Apre Viaggi e costi', tipo: 'pagina', funzione: 'viaggi' },
  'pagina:mezzi': { nome: 'Apre Mezzi', tipo: 'pagina', funzione: 'mezzi' },
  'pagina:scadenze': { nome: 'Apre Scadenze', tipo: 'pagina', funzione: 'scadenze' },
  'pagina:giri': { nome: 'Apre Ottimizza giro', tipo: 'pagina', funzione: 'giri' },
  giro_letto: { nome: 'Legge una distinta per il giro', tipo: 'azione', funzione: 'giri' },
  giro_ottimizzato: { nome: 'Ottimizza un giro', tipo: 'azione', funzione: 'giri' },
  carico_calcolo: { nome: 'Calcola un piano di carico', tipo: 'azione', funzione: 'carico' },
  carico_quale_mezzo: { nome: 'Usa "Quale mezzo basta?"', tipo: 'azione', funzione: 'carico' },
  piano_salvato: { nome: 'Salva un piano di carico', tipo: 'azione', funzione: 'carico' },
  calcolatore_calcolo: { nome: 'Fa un calcolo nel Calcolatore', tipo: 'azione', funzione: 'tassato' },
  calcolatore_copia: { nome: 'Copia il riepilogo del Calcolatore', tipo: 'azione', funzione: 'tassato' },
  calcolatore_carico: { nome: 'Passa dal Calcolatore al piano di carico', tipo: 'azione', funzione: 'tassato' },
  viaggio_percorso: { nome: 'Calcola un percorso', tipo: 'azione', funzione: 'viaggi' },
  viaggio_salvato: { nome: 'Salva un viaggio', tipo: 'azione', funzione: 'viaggi' },
  mezzo_aggiunto: { nome: 'Aggiunge un mezzo', tipo: 'azione', funzione: 'mezzi' },
  revisione_registrata: { nome: 'Registra una revisione', tipo: 'azione', funzione: 'scadenze' },
};

// Eventi che può inviare il browser (gli altri li registra il server da solo)
const DAL_BROWSER = new Set(['sessione', 'pagina:carico', 'pagina:piani', 'pagina:tassato', 'pagina:viaggi', 'pagina:mezzi',
  'pagina:scadenze', 'pagina:giri', 'giro_letto', 'giro_ottimizzato', 'carico_calcolo', 'carico_quale_mezzo', 'calcolatore_calcolo', 'calcolatore_copia', 'calcolatore_carico']);

const CONSERVAZIONE_MESI = 13;

function dispositivo(req) {
  const ua = String((req && req.headers && req.headers['user-agent']) || '');
  return /Mobi|Android|iPhone|iPad|iPod/i.test(ua) ? 'telefono' : 'computer';
}

// Evita di contare più volte lo stesso gesto (doppio clic, pagina ricaricata)
const recenti = new Map();
function troppoRecente(chiave, secondi) {
  const ora = Date.now(), prima = recenti.get(chiave);
  if (prima && ora - prima < secondi * 1000) return true;
  recenti.set(chiave, ora);
  if (recenti.size > 5000) recenti.clear();
  return false;
}

// Registra un evento. Non blocca mai l'operazione dell'utente: se fallisce, lo scrive solo nei log.
async function registra(req, utente, evento) {
  try {
    if (!utente || !utente.azienda_id || !EVENTI[evento]) return;
    const pausa = evento === 'sessione' ? 1800 : (EVENTI[evento].tipo === 'pagina' ? 60 : 5);
    if (troppoRecente(utente.id + '|' + evento, pausa)) return;
    if (evento === 'sessione') {
      // Un rientro conta solo se non c'è stato un accesso negli ultimi 30 minuti
      const { rowCount } = await pool.query(
        "SELECT 1 FROM attivita WHERE utente_id=$1 AND evento IN ('accesso','sessione') AND creato_il > now() - interval '30 minutes' LIMIT 1",
        [utente.id]);
      if (rowCount) return;
    }
    await pool.query('INSERT INTO attivita (azienda_id, utente_id, evento, dispositivo) VALUES ($1,$2,$3,$4)',
      [utente.azienda_id, utente.id, evento, dispositivo(req)]);
    await pool.query('UPDATE utenti SET ultimo_accesso = now() WHERE id=$1', [utente.id]);
  } catch (e) {
    console.error('Registro attività:', e.message);
  }
}

// Cancella le attività più vecchie del periodo di conservazione
async function pulisci() {
  try {
    const { rowCount } = await pool.query(`DELETE FROM attivita WHERE creato_il < now() - interval '${CONSERVAZIONE_MESI} months'`);
    if (rowCount) console.log(`Registro attività: eliminate ${rowCount} righe più vecchie di ${CONSERVAZIONE_MESI} mesi`);
  } catch (e) { console.error('Pulizia registro attività:', e.message); }
}

module.exports = { EVENTI, DAL_BROWSER, CONSERVAZIONE_MESI, registra, pulisci };
