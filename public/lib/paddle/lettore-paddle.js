/* Stiva - lettore di testo PaddleOCR (modelli PP-OCRv4) per browser e Node, con onnxruntime.
 * Riproduce le impostazioni di RapidOCR: foto ridotta a 2000 px al massimo, rilevamento delle righe di testo
 * (DB, soglia 0.3, allargamento 1.6), ritaglio, riconoscimento dei caratteri (CTC).
 * Uso: const L = await LettorePaddle.crea({ ort, det: bytes|url, rec: bytes|url, dizionario: testo });
 *      const pezzi = await L.leggi({ data: RGBA, width, height });   // [{ testo, conf (0-100), x0, y0, x1, y1 }]
 * Modelli: PaddleOCR (Apache 2.0). Nessun dato esce dal computer.
 */
(function (globale) {
  'use strict';

  // ---------- ridimensionamento bilineare (come cv2.INTER_LINEAR) di un'immagine RGBA ----------
  function ridimensiona(src, sw, sh, dw, dh) {
    var out = new Uint8ClampedArray(dw * dh * 4), fx = sw / dw, fy = sh / dh;
    for (var y = 0; y < dh; y++) {
      var syf = (y + 0.5) * fy - 0.5, sy = Math.floor(syf), wy = syf - sy;
      if (sy < 0) { sy = 0; wy = 0; } if (sy >= sh - 1) { sy = sh - 1; wy = 0; }
      var sy2 = Math.min(sh - 1, sy + 1);
      for (var x = 0; x < dw; x++) {
        var sxf = (x + 0.5) * fx - 0.5, sx = Math.floor(sxf), wx = sxf - sx;
        if (sx < 0) { sx = 0; wx = 0; } if (sx >= sw - 1) { sx = sw - 1; wx = 0; }
        var sx2 = Math.min(sw - 1, sx + 1);
        var i00 = (sy * sw + sx) * 4, i01 = (sy * sw + sx2) * 4, i10 = (sy2 * sw + sx) * 4, i11 = (sy2 * sw + sx2) * 4, o = (y * dw + x) * 4;
        for (var c = 0; c < 3; c++) {
          out[o + c] = (src[i00 + c] * (1 - wx) + src[i01 + c] * wx) * (1 - wy) + (src[i10 + c] * (1 - wx) + src[i11 + c] * wx) * wy;
        }
        out[o + 3] = 255;
      }
    }
    return out;
  }
  // ritaglio di un rettangolo
  function ritaglia(src, sw, x0, y0, w, h) {
    var out = new Uint8ClampedArray(w * h * 4);
    for (var y = 0; y < h; y++) out.set(src.subarray(((y0 + y) * sw + x0) * 4, ((y0 + y) * sw + x0 + w) * 4), y * w * 4);
    return out;
  }
  // ritaglio di un rettangolo inclinato, raddrizzato (campionamento bilineare)
  function ritagliaInclinato(src, sw, sh, r, w, h) {
    var out = new Uint8ClampedArray(w * h * 4);
    for (var j = 0; j < h; j++) for (var i = 0; i < w; i++) {
      var x = r.ox + (i + 0.5) * r.ux * r.lu / w + (j + 0.5) * r.vx * r.lv / h - 0.5;
      var y = r.oy + (i + 0.5) * r.uy * r.lu / w + (j + 0.5) * r.vy * r.lv / h - 0.5;
      var x0 = Math.floor(x), y0 = Math.floor(y), fx = x - x0, fy = y - y0, o = (j * w + i) * 4;
      for (var c = 0; c < 3; c++) {
        var v = 0;
        for (var dy = 0; dy <= 1; dy++) for (var dx = 0; dx <= 1; dx++) {
          var xx = Math.min(sw - 1, Math.max(0, x0 + dx)), yy = Math.min(sh - 1, Math.max(0, y0 + dy));
          v += src[(yy * sw + xx) * 4 + c] * (dx ? fx : 1 - fx) * (dy ? fy : 1 - fy);
        }
        out[o + c] = v;
      }
      out[o + 3] = 255;
    }
    return out;
  }
  // rotazione di 90° (testo verticale)
  function ruota90(src, w, h) {
    var out = new Uint8ClampedArray(w * h * 4);
    for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) {
      var i = (y * w + x) * 4, o = ((w - 1 - x) * h + y) * 4;
      out[o] = src[i]; out[o + 1] = src[i + 1]; out[o + 2] = src[i + 2]; out[o + 3] = 255;
    }
    return out;
  }
  // RGBA → tensore BGR normalizzato (v/255 - 0.5) / 0.5, come fa OpenCV in Python
  function tensore(rgba, w, h, larghezzaTot) {
    var W = larghezzaTot || w, t = new Float32Array(3 * h * W), piano = h * W;
    for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) {
      var i = (y * w + x) * 4, o = y * W + x;
      t[o] = rgba[i + 2] / 127.5 - 1;            // B
      t[piano + o] = rgba[i + 1] / 127.5 - 1;    // G
      t[2 * piano + o] = rgba[i] / 127.5 - 1;    // R
    }
    return t;
  }

  // ---------- rilevamento delle righe di testo ----------
  function scatole(prob, w, h, opz) {
    var soglia = opz.soglia, n = w * h, mappa = new Uint8Array(n), i, x, y;
    for (i = 0; i < n; i++) mappa[i] = prob[i] > soglia ? 1 : 0;
    // dilatazione 2x2 (come cv2.dilate con kernel [[1,1],[1,1]])
    var dil = new Uint8Array(n);
    for (y = 0; y < h; y++) for (x = 0; x < w; x++) {
      if (mappa[y * w + x] || (x > 0 && mappa[y * w + x - 1]) || (y > 0 && mappa[(y - 1) * w + x]) || (x > 0 && y > 0 && mappa[(y - 1) * w + x - 1])) dil[y * w + x] = 1;
    }
    // componenti connesse (8 vicini)
    var etichetta = new Int32Array(n), coda = new Int32Array(n), risultati = [], num = 0;
    for (i = 0; i < n; i++) {
      if (!dil[i] || etichetta[i]) continue;
      num++;
      var testa = 0, fine = 0, minx = w, miny = h, maxx = 0, maxy = 0, somma = 0, conta = 0;
      coda[fine++] = i; etichetta[i] = num;
      while (testa < fine) {
        var p = coda[testa++], px = p % w, py = (p - px) / w;
        if (px < minx) minx = px; if (px > maxx) maxx = px; if (py < miny) miny = py; if (py > maxy) maxy = py;
        somma += prob[p]; conta++;
        for (var dy = -1; dy <= 1; dy++) for (var dx = -1; dx <= 1; dx++) {
          var qx = px + dx, qy = py + dy;
          if (qx < 0 || qy < 0 || qx >= w || qy >= h) continue;
          var q = qy * w + qx;
          if (dil[q] && !etichetta[q]) { etichetta[q] = num; coda[fine++] = q; }
        }
      }
      var bw = maxx - minx + 1, bh = maxy - miny + 1;
      if (Math.min(bw, bh) < 3) continue;
      var punteggio = somma / conta;
      if (punteggio < opz.sogliaScatola) continue;
      // rettangolo inclinato come il testo (asse principale dei pixel), come minAreaRect di OpenCV
      var mx = 0, my = 0, j;
      for (j = 0; j < fine; j++) { mx += coda[j] % w; my += (coda[j] - coda[j] % w) / w; }
      mx /= fine; my /= fine;
      var sxx = 0, syy = 0, sxy = 0;
      for (j = 0; j < fine; j++) { var ax = coda[j] % w - mx, ay = (coda[j] - coda[j] % w) / w - my; sxx += ax * ax; syy += ay * ay; sxy += ax * ay; }
      var ang = 0.5 * Math.atan2(2 * sxy, sxx - syy);
      if (Math.abs(ang) > Math.PI / 12) ang = 0;          // oltre 15° si lascia dritto (testo verticale o macchie)
      var ux = Math.cos(ang), uy = Math.sin(ang), vx = -uy, vy = ux, umin = Infinity, umax = -Infinity, vmin = Infinity, vmax = -Infinity;
      for (j = 0; j < fine; j++) {
        var qx2 = coda[j] % w - mx, qy2 = (coda[j] - coda[j] % w) / w - my, pu = qx2 * ux + qy2 * uy, pv = qx2 * vx + qy2 * vy;
        if (pu < umin) umin = pu; if (pu > umax) umax = pu; if (pv < vmin) vmin = pv; if (pv > vmax) vmax = pv;
      }
      var lu = umax - umin + 1, lv = vmax - vmin + 1;
      // allargamento del riquadro (unclip): distanza = area × rapporto / perimetro
      var d = lu * lv * opz.allarga / (2 * (lu + lv));
      umin -= d + 0.5; umax += d + 0.5; vmin -= d + 0.5; vmax += d + 0.5;
      var ox = mx + umin * ux + vmin * vx, oy = my + umin * uy + vmin * vy;   // angolo in alto a sinistra
      risultati.push({ ox: ox, oy: oy, ux: ux, uy: uy, vx: vx, vy: vy, lu: umax - umin, lv: vmax - vmin, punteggio: punteggio,
        x0: minx - d, y0: miny - d, x1: maxx + 1 + d, y1: maxy + 1 + d });
      if (risultati.length >= 1000) break;
    }
    return risultati;
  }

  // ---------- decodifica CTC ----------
  function decodifica(dati, T, C, caratteri) {
    var testo = '', confs = [], prec = -1;
    for (var t = 0; t < T; t++) {
      var base = t * C, max = -Infinity, idx = 0;
      for (var c = 0; c < C; c++) if (dati[base + c] > max) { max = dati[base + c]; idx = c; }
      if (idx !== 0 && idx !== prec) { testo += caratteri[idx] || ''; confs.push(max); }
      prec = idx;
    }
    var conf = confs.length ? confs.reduce(function (a, b) { return a + b; }, 0) / confs.length : 0;
    return { testo: testo, conf: conf };
  }

  async function caricaModello(ort, sorgente) {
    if (typeof sorgente === 'string') {
      var r = await fetch(sorgente);
      if (!r.ok) throw new Error('Impossibile scaricare il modello di lettura (' + sorgente + ').');
      sorgente = new Uint8Array(await r.arrayBuffer());
    }
    return ort.InferenceSession.create(sorgente, { executionProviders: ['wasm'], graphOptimizationLevel: 'all' });
  }

  async function crea(opz) {
    var ort = opz.ort;
    var det = await caricaModello(ort, opz.det), rec = await caricaModello(ort, opz.rec);
    // come RapidOCR: 'blank' + caratteri del dizionario + spazio
    var righeDiz = String(opz.dizionario || '').split(/\r?\n/);
    if (righeDiz.length && righeDiz[righeDiz.length - 1] === '') righeDiz.pop();
    var caratteri = ['blank'].concat(righeDiz, [' ']);
    var impostazioni = { soglia: 0.3, sogliaScatola: 0.5, allarga: 1.6, latoMax: 2000, latoMinDet: 736, lotto: 6, altezzaRec: 48, largRec: 320 };

    async function leggi(img, avanzamento) {
      var W = img.width, H = img.height, src = img.data;
      // 1) foto ridotta a 2000 px al massimo (come RapidOCR)
      var k = Math.min(1, impostazioni.latoMax / Math.max(W, H));
      if (k < 1) { var nw = Math.round(W * k), nh = Math.round(H * k); src = ridimensiona(src, W, H, nw, nh); W = nw; H = nh; }
      // 2) rilevamento: lato corto almeno 736, dimensioni multiple di 32
      var rk = Math.min(W, H) < impostazioni.latoMinDet ? impostazioni.latoMinDet / Math.min(W, H) : 1;
      var dw = Math.max(32, Math.round(W * rk / 32) * 32), dh = Math.max(32, Math.round(H * rk / 32) * 32);
      var imgDet = ridimensiona(src, W, H, dw, dh);
      var inDet = {}; inDet[det.inputNames[0]] = new ort.Tensor('float32', tensore(imgDet, dw, dh), [1, 3, dh, dw]);
      if (avanzamento) avanzamento(0.1);
      var outDet = (await det.run(inDet))[det.outputNames[0]];
      var ph = outDet.dims[2], pw = outDet.dims[3];
      var fx = W / pw, fy = H / ph;
      var trovate = scatole(outDet.data, pw, ph, impostazioni).map(function (s) {
        // rettangolo inclinato riportato sulla foto (la mappa ha le stesse proporzioni della foto)
        return { ox: s.ox * fx, oy: s.oy * fy, ux: s.ux, uy: s.uy, vx: s.vx, vy: s.vy, lu: s.lu * fx, lv: s.lv * fy,
          x0: Math.max(0, Math.round(s.x0 * fx)), y0: Math.max(0, Math.round(s.y0 * fy)), x1: Math.min(W, Math.round(s.x1 * fx)), y1: Math.min(H, Math.round(s.y1 * fy)) };
      }).filter(function (s) { return s.lu > 3 && s.lv > 3; });
      // 3) ritagli raddrizzati (il testo verticale viene girato)
      var ritagli = trovate.map(function (s) {
        var w = Math.max(1, Math.round(s.lu)), h = Math.max(1, Math.round(s.lv)), px = ritagliaInclinato(src, W, H, s, w, h);
        if (h / w >= 1.5) { px = ruota90(px, w, h); var t = w; w = h; h = t; }
        return { s: s, px: px, w: w, h: h, rapporto: w / h };
      });
      // 4) riconoscimento a gruppi, ordinati per forma (come RapidOCR)
      var ordine = ritagli.map(function (_, i) { return i; }).sort(function (a, b) { return ritagli[a].rapporto - ritagli[b].rapporto; });
      var risultati = new Array(ritagli.length), H48 = impostazioni.altezzaRec;
      for (var b = 0; b < ordine.length; b += impostazioni.lotto) {
        var gruppo = ordine.slice(b, b + impostazioni.lotto);
        var maxR = impostazioni.largRec / H48;
        gruppo.forEach(function (i) { maxR = Math.max(maxR, ritagli[i].rapporto); });
        var Wt = Math.ceil(H48 * maxR), dati = new Float32Array(gruppo.length * 3 * H48 * Wt);
        gruppo.forEach(function (i, j) {
          var r = ritagli[i], rw = Math.min(Wt, Math.ceil(H48 * r.rapporto));
          var t = tensore(ridimensiona(r.px, r.w, r.h, rw, H48), rw, H48, Wt);
          dati.set(t, j * 3 * H48 * Wt);
        });
        var inRec = {}; inRec[rec.inputNames[0]] = new ort.Tensor('float32', dati, [gruppo.length, 3, H48, Wt]);
        var outRec = (await rec.run(inRec))[rec.outputNames[0]], T = outRec.dims[1], C = outRec.dims[2];
        gruppo.forEach(function (i, j) { risultati[i] = decodifica(outRec.data.subarray(j * T * C, (j + 1) * T * C), T, C, caratteri); });
        if (avanzamento) avanzamento(0.1 + 0.9 * Math.min(1, (b + impostazioni.lotto) / Math.max(1, ordine.length)));
      }
      // coordinate riportate alla foto originale
      var ks = img.width / W;
      return ritagli.map(function (r, i) {
        return { testo: risultati[i].testo, conf: risultati[i].conf * 100, x0: r.s.x0 * ks, y0: r.s.y0 * ks, x1: r.s.x1 * ks, y1: r.s.y1 * ks };
      }).filter(function (p) { return p.testo.trim() && p.conf >= 50; });
    }
    return { leggi: leggi };
  }

  var api = { crea: crea, _ridimensiona: ridimensiona };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else globale.LettorePaddle = api;
})(this);
