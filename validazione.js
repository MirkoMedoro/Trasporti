// Piccole funzioni per controllare i dati in arrivo dal browser.
function intero(v, min, max) {
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  const r = Math.round(n);
  if (r < min || r > max) return null;
  return r;
}
function testo(v, max = 200) {
  if (typeof v !== 'string') return '';
  return v.trim().slice(0, max);
}
function emailValida(v) {
  return typeof v === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}
module.exports = { intero, testo, emailValida };
