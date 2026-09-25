// Elenco delle funzioni che si possono attivare o disattivare per ogni azienda.
// In futuro i piani (Base, Pro, ...) diranno quali accendere.
const FUNZIONI = [
  { id: 'carico', nome: 'Piano di carico' },
  { id: 'viaggi', nome: 'Viaggi e costi' },
  { id: 'scadenze', nome: 'Scadenze' },
];

// Una funzione è attiva se non è stata spenta esplicitamente
function funzioniAttive(salvate) {
  const s = salvate || {};
  const out = {};
  FUNZIONI.forEach((f) => { out[f.id] = s[f.id] !== false; });
  return out;
}

module.exports = { FUNZIONI, funzioniAttive };
