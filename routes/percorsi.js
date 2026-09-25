// Ricerca indirizzi e calcolo percorsi.
// Con la variabile ORS_API_KEY usa OpenRouteService con il profilo CAMION (driving-hgv),
// che rispetta altezza, larghezza, lunghezza e peso del mezzo.
// Senza chiave usa servizi pubblici gratuiti (Nominatim + OSRM, profilo auto): vanno bene per le prove.
const express = require('express');
const { richiediLogin, richiediAzienda, richiediFunzione } = require('../auth');

const r = express.Router();
r.use(richiediLogin, richiediAzienda, richiediFunzione('viaggi'));

const ORS = () => process.env.ORS_API_KEY;
const AGENTE = 'Stiva-gestionale-trasporti/1.0';

// Piccola memoria per non ripetere le stesse ricerche
const memoria = new Map();
function ricorda(chiave, valore) {
  memoria.set(chiave, valore);
  if (memoria.size > 800) memoria.delete(memoria.keys().next().value);
  return valore;
}

// Nominatim chiede al massimo una richiesta al secondo
let ultimaNominatim = 0;
async function attendiTurno() {
  const attesa = ultimaNominatim + 1100 - Date.now();
  ultimaNominatim = Math.max(Date.now(), ultimaNominatim + 1100);
  if (attesa > 0) await new Promise((ok) => setTimeout(ok, attesa));
}

async function chiedi(url, opzioni) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 15000);
  try {
    const risp = await fetch(url, Object.assign({ signal: ctrl.signal }, opzioni));
    const testo = await risp.text();
    let dati = null;
    try { dati = JSON.parse(testo); } catch { /* risposta non JSON */ }
    if (!risp.ok) {
      const msg = (dati && (dati.error && (dati.error.message || dati.error))) || testo.slice(0, 200);
      const e = new Error(typeof msg === 'string' ? msg : 'Servizio mappe non disponibile');
      e.stato = risp.status;
      throw e;
    }
    return dati;
  } finally { clearTimeout(timer); }
}

r.get('/stato', (req, res) => {
  res.json({ camion: !!ORS(), autocompletamento: !!ORS() });
});

r.get('/cerca', async (req, res) => {
  const q = String(req.query.q || '').trim().slice(0, 200);
  if (q.length < 3) return res.json([]);
  const chiave = (ORS() ? 'o:' : 'n:') + q.toLowerCase();
  if (memoria.has(chiave)) return res.json(memoria.get(chiave));
  try {
    let risultati;
    if (ORS()) {
      const u = new URL('https://api.openrouteservice.org/geocode/autocomplete');
      u.searchParams.set('api_key', ORS());
      u.searchParams.set('text', q);
      u.searchParams.set('size', '6');
      u.searchParams.set('lang', 'it');
      const d = await chiedi(u);
      risultati = (d.features || []).map((f) => ({
        nome: f.properties.label, lat: f.geometry.coordinates[1], lon: f.geometry.coordinates[0],
      }));
    } else {
      await attendiTurno();
      const u = new URL('https://nominatim.openstreetmap.org/search');
      u.searchParams.set('format', 'jsonv2');
      u.searchParams.set('q', q);
      u.searchParams.set('limit', '6');
      u.searchParams.set('accept-language', 'it');
      const d = await chiedi(u, { headers: { 'User-Agent': AGENTE } });
      risultati = (d || []).map((x) => ({ nome: x.display_name, lat: Number(x.lat), lon: Number(x.lon) }));
    }
    res.json(ricorda(chiave, risultati));
  } catch (e) {
    console.error('Ricerca indirizzo:', e.message);
    res.status(502).json({ errore: 'Ricerca indirizzi non disponibile in questo momento. Riprova tra poco.' });
  }
});

// Riduce i punti della linea sulla mappa (bastano ~1500 punti)
function sfoltisci(coord, max) {
  if (coord.length <= max) return coord;
  const passo = coord.length / max, out = [];
  for (let i = 0; i < max; i++) out.push(coord[Math.floor(i * passo)]);
  out.push(coord[coord.length - 1]);
  return out;
}

// Ingombro esterno stimato del mezzo, per i divieti stradali dei camion
function ingombro(m) {
  if (!m) return null;
  const L = Number(m.lunghezza) || 0;
  const tipo = L <= 520 ? 'furgone' : (L <= 950 ? 'motrice' : 'bilico');
  const pianale = tipo === 'furgone' ? 0.65 : (tipo === 'motrice' ? 1.1 : 1.3);
  return {
    height: Math.min(4.5, Math.round(((Number(m.altezza) || 250) / 100 + pianale + 0.1) * 100) / 100),
    width: 2.55,
    length: tipo === 'bilico' ? 16.5 : Math.round((L / 100 + (tipo === 'motrice' ? 2.5 : 1.8)) * 10) / 10,
    weight: tipo === 'bilico' ? 40 : (tipo === 'motrice' ? 18 : 3.5),
  };
}

r.post('/calcola', async (req, res) => {
  const punti = Array.isArray(req.body.punti) ? req.body.punti : [];
  const coord = punti.map((p) => [Number(p.lon), Number(p.lat)]);
  if (coord.length < 2) return res.status(400).json({ errore: 'Servono almeno partenza e arrivo.' });
  if (coord.length > 25) return res.status(400).json({ errore: 'Massimo 25 tappe per viaggio.' });
  if (coord.some((c) => !Number.isFinite(c[0]) || !Number.isFinite(c[1]))) {
    return res.status(400).json({ errore: 'Una delle tappe non ha una posizione valida: selezionala dall’elenco dei risultati.' });
  }
  try {
    let km, minuti, tratte, linea, fonte;
    if (ORS()) {
      const corpo = { coordinates: coord, units: 'km', language: 'it', instructions: false };
      const ing = ingombro(req.body.mezzo);
      if (ing) corpo.options = { profile_params: { restrictions: ing } };
      const d = await chiedi('https://api.openrouteservice.org/v2/directions/driving-hgv/geojson', {
        method: 'POST',
        headers: { Authorization: ORS(), 'Content-Type': 'application/json', Accept: 'application/geo+json' },
        body: JSON.stringify(corpo),
      });
      const f = d.features[0];
      km = f.properties.summary.distance;
      minuti = f.properties.summary.duration / 60;
      tratte = (f.properties.segments || []).map((s) => ({ km: s.distance, minuti: s.duration / 60 }));
      linea = f.geometry.coordinates;
      fonte = 'camion';
    } else {
      const u = 'https://router.project-osrm.org/route/v1/driving/' + coord.map((c) => c[0] + ',' + c[1]).join(';') +
        '?overview=full&geometries=geojson';
      const d = await chiedi(u, { headers: { 'User-Agent': AGENTE } });
      if (!d.routes || !d.routes.length) throw new Error('Nessun percorso trovato');
      const rt = d.routes[0];
      km = rt.distance / 1000;
      minuti = rt.duration / 60;
      tratte = rt.legs.map((l) => ({ km: l.distance / 1000, minuti: l.duration / 60 }));
      linea = rt.geometry.coordinates;
      fonte = 'auto';
    }
    res.json({
      km: Math.round(km * 10) / 10,
      minuti: Math.round(minuti),
      tratte: tratte.map((t) => ({ km: Math.round(t.km * 10) / 10, minuti: Math.round(t.minuti) })),
      linea: sfoltisci(linea, 1500).map((c) => [Math.round(c[1] * 1e5) / 1e5, Math.round(c[0] * 1e5) / 1e5]),
      fonte,
    });
  } catch (e) {
    console.error('Calcolo percorso:', e.message);
    const msg = /routable|not found|Could not find/i.test(e.message)
      ? 'Una delle tappe non è raggiungibile su strada: controlla gli indirizzi.'
      : 'Calcolo del percorso non disponibile in questo momento. Riprova tra poco.';
    res.status(502).json({ errore: msg });
  }
});

module.exports = r;
