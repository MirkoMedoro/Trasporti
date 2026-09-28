// Ricerca indirizzi e calcolo percorsi.
// Con la variabile ORS_API_KEY usa OpenRouteService con il profilo CAMION (driving-hgv),
// che rispetta altezza, larghezza, lunghezza e peso del mezzo.
// Senza chiave usa servizi pubblici gratuiti (Nominatim + OSRM, profilo auto): vanno bene per le prove.
const express = require('express');
const { richiediLogin, richiediAzienda, richiediFunzione } = require('../auth');
const { registra } = require('../attivita');

const r = express.Router();
// Servono sia a "Viaggi e costi" sia a "Ottimizza giro"
r.use(richiediLogin, richiediAzienda, (req, res, next) => {
  const f = req.utente.funzioni || {};
  if (f.viaggi === false && f.giri === false) return res.status(403).json({ errore: 'Questa funzione non è inclusa nel tuo piano.' });
  next();
});
const MAX_PUNTI = 50;

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

// ---------- Ricerca di una tappa con verifica del comune ----------
// Usata da "Ottimizza giro": cerca l'indirizzo DENTRO il comune e la provincia della distinta.
// Un risultato in un altro comune (es. una via con lo stesso nome a Padova) viene scartato:
// in quel caso si prende il centro del comune giusto e la tappa è segnata "solo comune".
function normalizza(t) {
  return String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
}
function stessoPosto(nomi, localita) {
  const l = normalizza(localita);
  if (!l) return true;
  return nomi.some((n) => { const x = normalizza(n); return x && (x === l || x.includes(l) || l.includes(x) && x.length >= 4); });
}
function viaPerRicerca(via) {
  // "VIA STROZZI, 83 - OSTE DI MONTEMURLO" -> "VIA STROZZI 83"
  return String(via || '').split(/\s[-–]\s/)[0].replace(/,/g, ' ').replace(/\s+/g, ' ').trim();
}

async function trovaNominatim(p) {
  const prova = async (parametri) => {
    await attendiTurno();
    const u = new URL('https://nominatim.openstreetmap.org/search');
    u.searchParams.set('format', 'jsonv2');
    u.searchParams.set('addressdetails', '1');
    u.searchParams.set('limit', '8');
    u.searchParams.set('accept-language', 'it');
    u.searchParams.set('countrycodes', 'it');
    u.searchParams.set('layer', 'address');
    Object.entries(parametri).forEach(([k, v]) => { if (v) u.searchParams.set(k, v); });
    const d = await chiedi(u, { headers: { 'User-Agent': AGENTE } });
    return (d || []).find((x) => {
      const a = x.address || {};
      const provOk = !p.prov || !a['ISO3166-2-lvl6'] || a['ISO3166-2-lvl6'].toUpperCase() === 'IT-' + p.prov;
      const nomi = [a.city, a.town, a.village, a.municipality, a.hamlet, a.suburb, a.quarter, a.neighbourhood, a.isolated_dwelling, a.county];
      const capOk = !p.cap || !a.postcode || String(a.postcode).slice(0, 3) === p.cap.slice(0, 3);
      return provOk && capOk && stessoPosto(nomi, p.localita);
    });
  };
  const comune = p.localita || '';
  const via = viaPerRicerca(p.via);
  const senzaNumero = via.replace(/\s\d+\S*$/, '').trim();
  let x = null;
  if (via && (comune || p.cap)) x = await prova({ street: via, city: comune, postalcode: p.cap });
  if (!x && senzaNumero && senzaNumero !== via && (comune || p.cap)) {
    x = await prova({ street: senzaNumero, city: comune, postalcode: p.cap });
    if (x) return { lat: Number(x.lat), lon: Number(x.lon), nome: x.display_name, precisione: 'via' };
  }
  if (x) return { lat: Number(x.lat), lon: Number(x.lon), nome: x.display_name, precisione: 'indirizzo' };
  if (!comune && !p.cap) return null;
  x = await prova(comune ? { city: comune, postalcode: p.cap } : { postalcode: p.cap });
  if (!x && comune) x = await prova({ q: comune + (p.prov ? ' ' + p.prov : '') });
  return x ? { lat: Number(x.lat), lon: Number(x.lon), nome: x.display_name, precisione: 'comune' } : null;
}

async function trovaOrs(p) {
  const prova = async (parametri, livelli) => {
    const u = new URL('https://api.openrouteservice.org/geocode/search/structured');
    u.searchParams.set('api_key', ORS());
    u.searchParams.set('country', 'IT');
    u.searchParams.set('size', '8');
    u.searchParams.set('layers', livelli);
    Object.entries(parametri).forEach(([k, v]) => { if (v) u.searchParams.set(k, v); });
    const d = await chiedi(u);
    return (d.features || []).find((f) => {
      const q = f.properties || {};
      const sigle = [q.region_a, q.county_a, q.macrocounty_a].filter(Boolean).map((s) => String(s).toUpperCase());
      const provOk = !p.prov || !sigle.length || sigle.includes(p.prov);
      return provOk && stessoPosto([q.locality, q.localadmin, q.county, q.borough, q.neighbourhood, q.name], p.localita);
    });
  };
  const via = viaPerRicerca(p.via);
  let f = null;
  if (via && (p.localita || p.cap)) f = await prova({ address: via, locality: p.localita, postalcode: p.cap }, 'address,street');
  const risultato = (x, precisione) => ({ lat: x.geometry.coordinates[1], lon: x.geometry.coordinates[0], nome: x.properties.label, precisione });
  if (f) return risultato(f, f.properties.layer === 'street' ? 'via' : 'indirizzo');
  if (!p.localita && !p.cap) return null;
  f = await prova({ locality: p.localita, postalcode: p.cap }, 'locality,localadmin,neighbourhood,postalcode');
  return f ? risultato(f, 'comune') : null;
}

r.get('/trova', async (req, res) => {
  const pulito = (v, n) => String(v || '').replace(/\s+/g, ' ').trim().slice(0, n);
  const p = {
    via: pulito(req.query.via, 200), localita: pulito(req.query.localita, 100),
    prov: /^[A-Za-z]{2}$/.test(pulito(req.query.prov, 2)) ? pulito(req.query.prov, 2).toUpperCase() : '',
    cap: /^\d{5}$/.test(pulito(req.query.cap, 5)) ? pulito(req.query.cap, 5) : '',
  };
  if (!p.via && !p.localita && !p.cap) return res.status(400).json({ errore: 'Indirizzo mancante.' });
  const chiave = 't:' + (ORS() ? 'o:' : 'n:') + JSON.stringify(p).toLowerCase();
  if (memoria.has(chiave)) return res.json(memoria.get(chiave));
  try {
    res.json(ricorda(chiave, (ORS() ? await trovaOrs(p) : await trovaNominatim(p)) || null));
  } catch (e) {
    console.error('Ricerca tappa:', e.message);
    res.status(502).json({ errore: 'Ricerca indirizzi non disponibile in questo momento. Riprova tra poco.' });
  }
});

r.get('/stato', (req, res) => {
  res.json({ camion: !!ORS(), autocompletamento: !!ORS() });
});

r.get('/cerca', async (req, res) => {
  const q = String(req.query.q || '').trim().slice(0, 200);
  if (q.length < 3) return res.json([]);
  // paese=it limita la ricerca all'Italia (usato da Ottimizza giro: le distinte spesso non hanno il CAP)
  const paese = /^[a-z]{2}$/i.test(String(req.query.paese || '')) ? String(req.query.paese).toLowerCase() : '';
  // solo=indirizzo: cerca solo vie, numeri civici e località, mai nomi di ditte o negozi (Ottimizza giro)
  const soloIndirizzi = req.query.solo === 'indirizzo';
  const chiave = (ORS() ? 'o:' : 'n:') + paese + ':' + (soloIndirizzi ? 'i:' : '') + q.toLowerCase();
  if (memoria.has(chiave)) return res.json(memoria.get(chiave));
  try {
    let risultati;
    if (ORS()) {
      const u = new URL('https://api.openrouteservice.org/geocode/autocomplete');
      u.searchParams.set('api_key', ORS());
      u.searchParams.set('text', q);
      u.searchParams.set('size', '6');
      u.searchParams.set('lang', 'it');
      if (paese) u.searchParams.set('boundary.country', paese.toUpperCase());
      if (soloIndirizzi) u.searchParams.set('layers', 'address,street,locality,localadmin,neighbourhood');
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
      if (paese) u.searchParams.set('countrycodes', paese);
      if (soloIndirizzi) u.searchParams.set('layer', 'address');
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
  const cat = { furgone: 'furgone', motrice: 'motrice', trattore: 'bilico', semirimorchio: 'bilico' }[m.categoria];
  const tipo = cat || (L <= 520 ? 'furgone' : (L <= 950 ? 'motrice' : 'bilico'));
  const pianale = tipo === 'furgone' ? 0.65 : (tipo === 'motrice' ? 1.1 : 1.3);
  return {
    height: Math.min(4.5, Math.round(((Number(m.altezza) || (tipo === 'bilico' ? 270 : 250)) / 100 + pianale + 0.1) * 100) / 100),
    width: 2.55,
    length: tipo === 'bilico' ? 16.5 : Math.round((L / 100 + (tipo === 'motrice' ? 2.5 : 1.8)) * 10) / 10,
    weight: tipo === 'bilico' ? 40 : (tipo === 'motrice' ? 18 : 3.5),
  };
}

r.post('/calcola', async (req, res) => {
  const punti = Array.isArray(req.body.punti) ? req.body.punti : [];
  const coord = punti.map((p) => [Number(p.lon), Number(p.lat)]);
  if (coord.length < 2) return res.status(400).json({ errore: 'Servono almeno partenza e arrivo.' });
  if (coord.length > MAX_PUNTI) return res.status(400).json({ errore: `Massimo ${MAX_PUNTI} tappe per percorso.` });
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
    registra(req, req.utente, 'viaggio_percorso');
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

// Distanze e tempi stradali tra tutti i punti (per ottimizzare l'ordine delle tappe)
r.post('/matrice', async (req, res) => {
  const punti = Array.isArray(req.body.punti) ? req.body.punti : [];
  const coord = punti.map((p) => [Number(p.lon), Number(p.lat)]);
  if (coord.length < 2) return res.status(400).json({ errore: 'Servono almeno due punti.' });
  if (coord.length > MAX_PUNTI) return res.status(400).json({ errore: `Massimo ${MAX_PUNTI - 1} tappe per giro.` });
  if (coord.some((c) => !Number.isFinite(c[0]) || !Number.isFinite(c[1]))) return res.status(400).json({ errore: 'Un punto non ha una posizione valida.' });
  try {
    let km, minuti, fonte;
    if (ORS()) {
      const corpo = { locations: coord, metrics: ['distance', 'duration'], units: 'km' };
      const d = await chiedi('https://api.openrouteservice.org/v2/matrix/driving-hgv', {
        method: 'POST', headers: { Authorization: ORS(), 'Content-Type': 'application/json' }, body: JSON.stringify(corpo),
      });
      km = d.distances; minuti = d.durations.map((r2) => r2.map((s) => (s == null ? null : s / 60))); fonte = 'camion';
    } else {
      const u = 'https://router.project-osrm.org/table/v1/driving/' + coord.map((c) => c[0] + ',' + c[1]).join(';') + '?annotations=distance,duration';
      const d = await chiedi(u, { headers: { 'User-Agent': AGENTE } });
      if (d.code && d.code !== 'Ok') throw new Error(d.message || d.code);
      km = d.distances.map((r2) => r2.map((m) => (m == null ? null : m / 1000)));
      minuti = d.durations.map((r2) => r2.map((s) => (s == null ? null : s / 60))); fonte = 'auto';
    }
    // Un punto non raggiungibile su strada rende inutilizzabile il calcolo: lo segnaliamo
    const irraggiungibili = [];
    km.forEach((riga, i) => { if (riga.some((v, j) => v == null && i !== j) && !irraggiungibili.includes(i)) irraggiungibili.push(i); });
    if (irraggiungibili.length) return res.status(422).json({ errore: 'Alcune tappe non sono raggiungibili su strada: controlla gli indirizzi.', irraggiungibili });
    res.json({ km, minuti, fonte });
  } catch (e) {
    console.error('Matrice distanze:', e.message);
    res.status(502).json({ errore: 'Calcolo delle distanze non disponibile in questo momento. Riprova tra poco.' });
  }
});

module.exports = r;
