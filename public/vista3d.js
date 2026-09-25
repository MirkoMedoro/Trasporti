/*
 * Vista 3D realistica del carico (three.js r128).
 * Il mezzo viene costruito sulle misure del vano:
 *   fino a 5,2 m -> furgone | fino a 9,5 m -> motrice | oltre -> trattore + semirimorchio centinato
 * Il telone sinistro è aperto e raccolto verso la cabina, così si vede il carico.
 * Trascina per ruotare, rotellina o pizzico per lo zoom, doppio clic per ripristinare.
 */
(function () {
  'use strict';

  // ---------- texture disegnate al volo (niente file esterni) ----------
  function tela(w, h) { var c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  function rumore(ctx, w, h, n, colori) {
    for (var i = 0; i < n; i++) {
      ctx.fillStyle = colori[i % colori.length];
      ctx.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 2, 1 + Math.random() * 2);
    }
  }
  function disegnaCartone(coloreEtichetta) {
    var c = tela(256, 256), x = c.getContext('2d');
    x.fillStyle = '#c69a63'; x.fillRect(0, 0, 256, 256);
    rumore(x, 256, 256, 2600, ['rgba(95,60,25,0.10)', 'rgba(255,235,200,0.10)']);
    var g = x.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0, 'rgba(255,240,215,0.10)'); g.addColorStop(1, 'rgba(70,40,15,0.12)');
    x.fillStyle = g; x.fillRect(0, 0, 256, 256);
    x.fillStyle = '#dcbd8c'; x.fillRect(0, 108, 256, 40);                // nastro adesivo
    x.fillStyle = 'rgba(255,255,255,0.18)'; x.fillRect(0, 112, 256, 6);
    x.strokeStyle = 'rgba(80,50,20,0.45)'; x.lineWidth = 6; x.strokeRect(3, 3, 250, 250);
    x.fillStyle = coloreEtichetta; x.fillRect(6, 172, 244, 62);            // fascia del tipo
    x.fillStyle = 'rgba(0,0,0,0.12)'; x.fillRect(6, 228, 244, 6);
    x.fillStyle = '#ffffff'; x.fillRect(164, 182, 76, 40);
    x.fillStyle = '#222';
    for (var i = 0; i < 26; i++) x.fillRect(168 + i * 2.6, 187, (i % 3 === 0 ? 1.8 : 0.9), 30);
    return c;
  }
  function disegnaLegno(base, tavole) {
    var c = tela(256, 256), x = c.getContext('2d');
    x.fillStyle = base; x.fillRect(0, 0, 256, 256);
    for (var i = 0; i < 90; i++) {
      x.strokeStyle = 'rgba(90,55,25,' + (0.05 + Math.random() * 0.14) + ')';
      x.lineWidth = 0.6 + Math.random() * 1.4;
      var y = Math.random() * 256;
      x.beginPath(); x.moveTo(0, y);
      for (var k = 0; k <= 8; k++) x.lineTo(k * 32, y + Math.sin(k * 0.9 + y) * 2.5);
      x.stroke();
    }
    rumore(x, 256, 256, 900, ['rgba(60,35,15,0.12)']);
    if (tavole) {
      x.fillStyle = 'rgba(40,25,10,0.55)';
      for (var t = 0; t < 256; t += 32) x.fillRect(0, t, 256, 2);
    }
    return c;
  }
  function disegnaSfumatura(interno, esterno) {
    var c = tela(256, 256), x = c.getContext('2d');
    var g = x.createRadialGradient(128, 128, 0, 128, 128, 128);
    g.addColorStop(0, interno); g.addColorStop(1, esterno);
    x.fillStyle = g; x.fillRect(0, 0, 256, 256);
    return c;
  }

  // ---------- modelli 3D (file .glb nella cartella /modelli) ----------
  var MODELLI = {
    bilico: { file: '/modelli/iveco_hi-way.glb', crediti: '“IVECO Hi-Way” di claries', link: 'https://sketchfab.com/3d-models/iveco-hi-way-211d5e310cdb4d92ba77e0590dec2c9c' },
    motrice: { file: '/modelli/iveco_eurocargo.glb', crediti: '“1991 Iveco Euro Cargo” di zairiq', link: 'https://sketchfab.com/3d-models/1991-iveco-euro-cargo-e4ba5a534c024ed8904f0ec0218a3b8c' }
  };
  var inCaricamento = {};
  // Tipo di disegno: dal tipo di mezzo se c'è, altrimenti dalla lunghezza del vano
  function tipoMezzo(mezzo) {
    var c = { furgone: 'furgone', motrice: 'motrice', semirimorchio: 'bilico', rimorchio: 'rimorchio' }[mezzo.categoria];
    if (c) return c;
    var l = mezzo.lunghezza;
    return l <= 520 ? 'furgone' : (l <= 950 ? 'motrice' : 'bilico');
  }
  function caricaModello(tipo) {
    var m = MODELLI[tipo];
    if (!m || !window.THREE || !window.THREE.GLTFLoader) return Promise.resolve(null);
    if (!inCaricamento[tipo]) {
      inCaricamento[tipo] = new Promise(function (ok, ko) {
        new window.THREE.GLTFLoader().load(m.file, function (g) { ok(g.scene); }, undefined, ko);
      });
      inCaricamento[tipo].catch(function () { delete inCaricamento[tipo]; });
    }
    return inCaricamento[tipo].then(function (sc) { return sc.clone(true); }, function () { return null; });
  }
  // Testo dei crediti richiesto dalla licenza CC BY 4.0
  window.creditiModello3D = function (mezzo) {
    var m = MODELLI[tipoMezzo(mezzo)];
    return m ? 'Modello 3D ' + m.crediti + ', <a href="' + m.link + '" target="_blank" rel="noopener">Sketchfab</a>, licenza <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener">CC BY 4.0</a>, adattato.' : '';
  };

  function creaVista3D(contenitore, mezzo, piazzati, colori) {
    if (!window.THREE) {
      contenitore.innerHTML = '<p class="nota" style="padding:20px">La vista 3D non è disponibile: controlla la connessione internet.</p>';
      return { distruggi: function () {} };
    }
    var T = window.THREE;
    var L = mezzo.lunghezza, W = mezzo.larghezza, H = mezzo.altezza;
    var tipo = tipoMezzo(mezzo);
    var pianale = tipo === 'furgone' ? 62 : (tipo === 'bilico' ? 125 : 112);
    var pronto = false, distrutto = false, raggioBase = 1000, lungTot = 1000, altTot = 400, pianoTaglio = null;
    var ZC = W / 2;

    var risorse = [];
    function tieni(x) { risorse.push(x); return x; }
    function col(hex) { return new T.Color(hex).convertSRGBToLinear(); }
    function mat(hex, o) {
      return tieni(new T.MeshStandardMaterial(Object.assign({ color: col(hex), roughness: 0.7, metalness: 0.05 }, o || {})));
    }
    function texture(canvas, rx, ry) {
      var t = tieni(new T.CanvasTexture(canvas));
      t.encoding = T.sRGBEncoding;
      t.wrapS = t.wrapT = T.RepeatWrapping;
      t.repeat.set(rx || 1, ry || 1);
      t.anisotropy = 4;
      return t;
    }

    // ---------- renderer e scena ----------
    var scena = new T.Scene();
    var camera = new T.PerspectiveCamera(30, 1, 10, 80000);
    var renderer = new T.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputEncoding = T.sRGBEncoding;
    renderer.toneMapping = T.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = T.PCFSoftShadowMap;
    renderer.localClippingEnabled = true;
    contenitore.appendChild(renderer.domElement);

    // Ambiente per i riflessi: cielo sfumato con due "pannelli luminosi"
    (function () {
      var env = new T.Scene();
      var geo = new T.SphereGeometry(100, 32, 16);
      var c = [], pos = geo.attributes.position;
      var alto = new T.Color(0xffffff), orizzonte = new T.Color(0xc9d3de), basso = new T.Color(0x4b4f55);
      for (var i = 0; i < pos.count; i++) {
        var y = pos.getY(i) / 100;
        var cc = y > 0 ? orizzonte.clone().lerp(alto, Math.pow(y, 0.6)) : orizzonte.clone().lerp(basso, Math.min(1, -y * 3));
        c.push(cc.r, cc.g, cc.b);
      }
      geo.setAttribute('color', new T.Float32BufferAttribute(c, 3));
      var mCielo = new T.MeshBasicMaterial({ vertexColors: true, side: T.BackSide });
      env.add(new T.Mesh(geo, mCielo));
      var mPan = new T.MeshBasicMaterial({ color: new T.Color(4, 4, 4) });
      var gPan = new T.PlaneGeometry(60, 25);
      [[-40, 70, -30], [50, 55, 40]].forEach(function (p) {
        var pan = new T.Mesh(gPan, mPan);
        pan.position.set(p[0], p[1], p[2]); pan.lookAt(0, 0, 0);
        env.add(pan);
      });
      var pm = new T.PMREMGenerator(renderer);
      var rt = pm.fromScene(env, 0.02);
      scena.environment = rt.texture;
      tieni(rt); pm.dispose(); geo.dispose(); gPan.dispose(); mCielo.dispose(); mPan.dispose();
    })();

    var gruppo = new T.Group();
    scena.add(gruppo);

    // ---------- materiali ----------
    var M = {
      vernice: mat('#f2f3f5', { roughness: 0.22, metalness: 0.15 }),
      plastica: mat('#2c2f34', { roughness: 0.65 }),
      telaio: mat('#1e2125', { roughness: 0.5, metalness: 0.5 }),
      allu: mat('#cdd2d8', { roughness: 0.3, metalness: 0.9 }),
      cromo: mat('#eef1f4', { roughness: 0.1, metalness: 1 }),
      vetro: mat('#0d151e', { roughness: 0.04, metalness: 0.9 }),
      gomma: mat('#1c1d1f', { roughness: 0.9, side: T.DoubleSide }),
      cerchio: mat('#d4d8dd', { roughness: 0.2, metalness: 0.95 }),
      disco: mat('#8d949c', { roughness: 0.45, metalness: 0.8 }),
      faro: tieni(new T.MeshStandardMaterial({ color: col('#f4f7fa'), emissive: col('#e3edf8'), emissiveIntensity: 0.6, roughness: 0.05, metalness: 0.4 })),
      arancio: tieni(new T.MeshStandardMaterial({ color: col('#ff9a1f'), emissive: col('#ff8a00'), emissiveIntensity: 0.6, roughness: 0.3 })),
      stop: tieni(new T.MeshStandardMaterial({ color: col('#c0271c'), emissive: col('#a3160c'), emissiveIntensity: 0.5, roughness: 0.25 })),
      giallo: mat('#f5b800', { roughness: 0.3, metalness: 0.1 }),
      fuga: mat('#15171a', { roughness: 0.8 }),
      targa: mat('#f7f7f2', { roughness: 0.4 }),
      telo: mat('#e6e9ec', { roughness: 0.93 }),
      pavimento: tieni(new T.MeshStandardMaterial({ map: texture(disegnaLegno('#8b6a48', true), Math.max(1, L / 120), Math.max(1, W / 60)), roughness: 0.85 })),
      legno: tieni(new T.MeshStandardMaterial({ map: texture(disegnaLegno('#cfab7f', false)), roughness: 0.9 })),
      legnoScuro: tieni(new T.MeshStandardMaterial({ map: texture(disegnaLegno('#a98359', false)), roughness: 0.95 })),
      film: tieni(new T.MeshStandardMaterial({ color: 0xffffff, roughness: 0.12, metalness: 0.2, transparent: true, opacity: 0.12, depthWrite: false })),
      no: mat('#c8341e', { roughness: 0.5 })
    };
    // Materiali che diventano trasparenti quando coprono il carico
    var M_TETTO = mat('#e6e9ec', { roughness: 0.93, transparent: true });
    var M_TELO_DX = mat('#e6e9ec', { roughness: 0.93, transparent: true, side: T.DoubleSide });
    var M_CINGHIA_DX = mat('#3a3f46', { roughness: 0.8, transparent: true });
    var M_FIANCO_DX = mat('#f2f3f5', { roughness: 0.22, metalness: 0.15, transparent: true, side: T.DoubleSide });
    var M_PORTA_SX = mat('#f2f3f5', { roughness: 0.22, metalness: 0.15, transparent: true, side: T.DoubleSide });
    var M_PORTA_SX_ALLU = mat('#cdd2d8', { roughness: 0.3, metalness: 0.9, transparent: true });
    var dissolvenzaTetto = [M_TETTO], dissolvenzaDestra = [M_TELO_DX, M_CINGHIA_DX, M_FIANCO_DX], dissolvenzaSinistra = [M_PORTA_SX, M_PORTA_SX_ALLU];

    // ---------- geometrie di base ----------
    var cache = {};
    function arrotondato(w, h, r) {
      var s = new T.Shape(), x = -w / 2, y = -h / 2;
      r = Math.max(0.01, Math.min(r, w / 2, h / 2));
      s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
      s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
      s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
      return s;
    }
    // Parallelepipedo con spigoli arrotondati (l lungo x, h lungo y, w lungo z)
    function rbox(l, h, w, r) {
      var k = 'rb' + [l, h, w, r].map(function (v) { return Math.round(v * 10); }).join('_');
      if (cache[k]) return cache[k];
      r = Math.max(0.4, Math.min(r, l / 2 - 0.05, h / 2 - 0.05, w / 2 - 0.05));
      var b = r * 0.55;
      var g = new T.ExtrudeGeometry(arrotondato(l - 2 * b, h - 2 * b, r * 0.6), {
        depth: Math.max(0.05, w - 2 * b), bevelEnabled: true, bevelThickness: b, bevelSize: b, bevelSegments: 3, curveSegments: 6
      });
      g.center();
      return (cache[k] = tieni(g));
    }
    function box(l, h, w) {
      var k = 'b' + [l, h, w].join('_');
      return cache[k] || (cache[k] = tieni(new T.BoxGeometry(l, h, w)));
    }
    function pezzo(geo, m, x, y, z, ombra, dove) {
      var mesh = new T.Mesh(geo, m);
      mesh.position.set(x, y, z);
      if (ombra !== false) { mesh.castShadow = true; mesh.receiveShadow = true; }
      (dove || gruppo).add(mesh);
      return mesh;
    }
    function cilindroX(r, lung, m, x, y, z, seg) {
      var mesh = pezzo(tieni(new T.CylinderGeometry(r, r, lung, seg || 28)), m, x, y, z);
      mesh.rotation.z = Math.PI / 2;
      return mesh;
    }

    // ---------- ruote ----------
    function geoPneumatico(r, w) {
      var k = 'pn' + r + '_' + w;
      if (cache[k]) return cache[k];
      var ri = r * 0.63, p = [];
      p.push(new T.Vector2(ri, -w / 2), new T.Vector2(r * 0.88, -w / 2), new T.Vector2(r * 0.97, -w / 2 + w * 0.07),
        new T.Vector2(r, -w / 2 + w * 0.2), new T.Vector2(r, w / 2 - w * 0.2), new T.Vector2(r * 0.97, w / 2 - w * 0.07),
        new T.Vector2(r * 0.88, w / 2), new T.Vector2(ri, w / 2));
      return (cache[k] = tieni(new T.LatheGeometry(p, 48)));
    }
    function geoCil(r1, r2, h, seg) {
      var k = 'cy' + [r1, r2, h, seg].join('_');
      return cache[k] || (cache[k] = tieni(new T.CylinderGeometry(r1, r2, h, seg)));
    }
    function ruota(x, zc, r, w, lato, bulloni) {
      var g = new T.Group();
      g.position.set(x, r, zc);
      var gomma = new T.Mesh(geoPneumatico(r, w), M.gomma);
      gomma.rotation.x = Math.PI / 2; gomma.castShadow = true; g.add(gomma);
      var ri = r * 0.63;
      var cer = new T.Mesh(geoCil(ri, ri, w * 0.9, 36), M.cerchio);
      cer.rotation.x = Math.PI / 2; g.add(cer);
      var fz = lato * (w * 0.45 + 0.3);
      var disco = new T.Mesh(geoCil(ri * 0.78, ri * 0.82, 1.5, 36), M.disco);
      disco.rotation.x = Math.PI / 2; disco.position.z = fz; g.add(disco);
      if (bulloni) {
        var mozzo = new T.Mesh(geoCil(ri * 0.28, ri * 0.32, 5, 20), M.cromo);
        mozzo.rotation.x = Math.PI / 2; mozzo.position.z = fz + lato * 2.5; g.add(mozzo);
        for (var i = 0; i < 10; i++) {
          var a = i / 10 * Math.PI * 2;
          var bu = new T.Mesh(box(2.2, 2.2, 2.5), M.cromo);
          bu.position.set(Math.cos(a) * ri * 0.45, Math.sin(a) * ri * 0.45, fz + lato * 1.4);
          g.add(bu);
        }
      }
      gruppo.add(g);
    }
    function asse(x, r, gemellate, larg) {
      var w = larg || 32;
      if (gemellate) {
        ruota(x, w * 1.5 + 6, r, w, -1, false); ruota(x, w / 2 + 5, r, w, -1, true);
        ruota(x, W - w * 1.5 - 6, r, w, 1, false); ruota(x, W - w / 2 - 5, r, w, 1, true);
      } else {
        ruota(x, w / 2 + 5, r, w, -1, true); ruota(x, W - w / 2 - 5, r, w, 1, true);
      }
      var ponte = pezzo(geoCil(7, 7, W - 40, 16), M.telaio, x, r, ZC);
      ponte.rotation.x = Math.PI / 2;
    }
    function parafangoArco(x, zc, r, larg) {
      var R = r + 9, s = new T.Shape(), a0 = Math.PI * 0.08, a1 = Math.PI * 0.92;
      s.absarc(0, 0, R, a0, a1, false);
      s.absarc(0, 0, R - 4, a1, a0, true);
      var g = tieni(new T.ExtrudeGeometry(s, { depth: larg, bevelEnabled: false, curveSegments: 28 }));
      pezzo(g, M.plastica, x, r, zc - larg / 2);
    }

    // ---------- cabina di un camion moderno ----------
    function cabinaCamion(xF, cabL, cabH, base, cabW, spoiler) {
      pezzo(rbox(cabL, cabH, cabW, 24), M.vernice, xF + cabL / 2, base + cabH / 2, ZC);
      // Parabrezza e visiera
      pezzo(rbox(5, cabH * 0.34, cabW * 0.88, 7), M.vetro, xF - 0.8, base + cabH * 0.66, ZC);
      pezzo(rbox(30, 7, cabW * 0.92, 3), M.vernice, xF - 9, base + cabH * 0.86, ZC);
      // Griglia con barre cromate e stemma
      pezzo(rbox(5, cabH * 0.26, cabW * 0.62, 9), M.fuga, xF - 0.8, base + cabH * 0.31, ZC);
      for (var i = 0; i < 5; i++) {
        pezzo(rbox(3, 3.2, cabW * 0.58, 1.5), M.cromo, xF - 2.8, base + cabH * 0.21 + i * cabH * 0.05, ZC, false);
      }
      pezzo(rbox(3, 9, 46, 3), M.cromo, xF - 3, base + cabH * 0.47, ZC, false);
      // Paraurti, fari, frecce, fendinebbia
      pezzo(rbox(30, 46, cabW + 6, 10), M.plastica, xF + 11, base - 14, ZC);
      [-1, 1].forEach(function (s) {
        pezzo(rbox(6, 15, 46, 6), M.faro, xF - 4.5, base + 1, ZC + s * (cabW / 2 - 36), false);
        pezzo(rbox(6, 7, 14, 3), M.arancio, xF - 4.5, base + 1, ZC + s * (cabW / 2 - 7), false);
        pezzo(rbox(5, 8, 18, 4), M.faro, xF - 4.5, base - 26, ZC + s * (cabW / 2 - 30), false);
      });
      // Finestrini, portiere, maniglie, fascia, gradini, specchietti, deflettori
      [-1, 1].forEach(function (s) {
        var zf = ZC + s * (cabW / 2 + 0.2);
        pezzo(rbox(cabL * 0.44, cabH * 0.28, 3, 6), M.vetro, xF + cabL * 0.3, base + cabH * 0.68, zf, false);
        pezzo(box(1.4, cabH * 0.8, 1.2), M.fuga, xF + cabL * 0.56, base + cabH * 0.45, ZC + s * (cabW / 2 + 0.5), false);
        pezzo(box(cabL * 0.54, 1.4, 1.2), M.fuga, xF + cabL * 0.29, base + cabH * 0.06, ZC + s * (cabW / 2 + 0.5), false);
        pezzo(rbox(14, 3, 3, 1.4), M.cromo, xF + cabL * 0.48, base + cabH * 0.47, ZC + s * (cabW / 2 + 1.6), false);
        pezzo(box(cabL * 0.6, 4, 1), M.giallo, xF + cabL * 0.62, base + cabH * 0.16, ZC + s * (cabW / 2 + 0.6), false);
        pezzo(rbox(44, 64, 6, 3), M.plastica, xF + cabL * 0.8, base - 32, ZC + s * (cabW / 2 - 4));
        pezzo(rbox(40, 4, 22, 1.5), M.allu, xF + cabL * 0.8, base - 26, ZC + s * (cabW / 2 - 10), false);
        pezzo(rbox(40, 4, 22, 1.5), M.allu, xF + cabL * 0.8, base - 54, ZC + s * (cabW / 2 - 10), false);
        pezzo(rbox(5, 5, 26, 2), M.plastica, xF + 12, base + cabH * 0.8, ZC + s * (cabW / 2 + 12), false);
        pezzo(rbox(12, 48, 14, 5), M.vernice, xF + 12, base + cabH * 0.66, ZC + s * (cabW / 2 + 27));
        pezzo(rbox(10, 16, 12, 4), M.vernice, xF + 12, base + cabH * 0.44, ZC + s * (cabW / 2 + 25));
        pezzo(rbox(40, cabH * 0.8, 5, 3), M.vernice, xF + cabL + 18, base + cabH * 0.55, ZC + s * (cabW / 2 - 6));
      });
      if (spoiler) {
        var sp = new T.Shape(), sl = cabL * 0.92;
        sp.moveTo(0, 0); sp.lineTo(sl, 0); sp.lineTo(sl, spoiler);
        sp.quadraticCurveTo(sl * 0.45, spoiler * 0.98, 0, 6); sp.lineTo(0, 0);
        var gs = tieni(new T.ExtrudeGeometry(sp, { depth: cabW * 0.9, bevelEnabled: true, bevelThickness: 5, bevelSize: 5, bevelSegments: 3, curveSegments: 16 }));
        pezzo(gs, M.vernice, xF + cabL * 0.05, base + cabH - 3, ZC - cabW * 0.45);
        pezzo(rbox(4, 6, cabW * 0.5, 2), M.arancio, xF + cabL * 0.07, base + cabH + 4, ZC, false);
      }
    }

    // ---------- cassone centinato ----------
    function cassone(opz) {
      var y0 = pianale;
      pezzo(box(L, 8, W), M.pavimento, L / 2, y0 - 4, ZC);
      [ZC - 48, ZC + 48].forEach(function (z) { pezzo(box(L, 14, 10), M.telaio, L / 2, y0 - 15, z); });
      // Longheroni laterali con striscia rifrangente e luci di posizione
      [-1, 1].forEach(function (s) {
        var z = s < 0 ? -4 : W + 4;
        pezzo(rbox(L + 8, 22, 8, 2), M.plastica, L / 2, y0 - 7, z);
        pezzo(box(L, 4, 1), M.giallo, L / 2, y0 - 7, z + s * 4.3, false);
        for (var x = 60; x < L - 40; x += 180) pezzo(rbox(9, 5, 2, 1), M.arancio, x, y0 - 16, z + s * 4.2, false);
      });
      // Parete anteriore, tetto, correnti, montanti
      pezzo(rbox(8, H + 10, W + 12, 3), M.vernice, -4, y0 + H / 2, ZC);
      pezzo(rbox(L + 10, 5, W + 12, 2), M_TETTO, L / 2, y0 + H + 3, ZC);
      [-1, 1].forEach(function (s) {
        pezzo(rbox(L + 8, 10, 6, 2), M.allu, L / 2, y0 + H - 2, s < 0 ? -3 : W + 3);
      });
      var n = Math.max(2, Math.round(L / 300));
      for (var i = 1; i < n; i++) pezzo(rbox(6, H - 4, 6, 1.5), M.allu, (L / n) * i, y0 + H / 2, -1);
      // Portale posteriore
      [-2, W + 2].forEach(function (z) { pezzo(rbox(10, H + 8, 10, 2), M.allu, L + 1, y0 + H / 2, z); });
      pezzo(rbox(10, 16, W + 12, 2), M.allu, L + 1, y0 + H - 4, ZC);
      // Telone sinistro aperto: pieghe raccolte verso la parete anteriore
      for (var k = 0; k < 11; k++) {
        pezzo(rbox(7, H - 10, 5, 2.4), M.telo, 8 + k * 6.2, y0 + H / 2 - 1, -4 + (k % 2 ? -3.5 : 0.5));
      }
      // Telone destro chiuso, con cinghie di tensione
      pezzo(box(L - 6, H - 4, 1.4), M_TELO_DX, L / 2, y0 + H / 2, W + 3.5, false);
      for (var xc = 55; xc < L - 20; xc += 62) {
        pezzo(box(3.4, H - 14, 1), M_CINGHIA_DX, xc, y0 + H / 2, W + 4.7, false);
      }
      // Porte posteriori aperte e ripiegate contro le fiancate
      [-1, 1].forEach(function (s) {
        var z = s < 0 ? -9 : W + 9;
        var mp = s < 0 ? M_PORTA_SX : M_FIANCO_DX;
        pezzo(rbox(W / 2, H + 2, 4, 2), mp, L - W / 4, y0 + H / 2, z, false);
        [0.2, 0.8].forEach(function (f) { pezzo(rbox(4, H - 20, 3, 1.4), s < 0 ? M_PORTA_SX_ALLU : M_FIANCO_DX, L - W / 2 + (W / 2) * f, y0 + H / 2, z + s * 2.5, false); });
      });
      // Luci posteriori, targa, barra paraincastro
      pezzo(rbox(10, 18, W + 4, 3), M.plastica, L + 2, y0 - 26, ZC);
      [26, W - 26].forEach(function (z) { pezzo(rbox(3, 12, 36, 3), M.stop, L + 7.5, y0 - 26, z, false); });
      pezzo(rbox(2, 11, 52, 1.5), M.targa, L + 7.5, y0 - 26, ZC, false);
      var yb = Math.max(42, y0 - 72);
      pezzo(rbox(12, 12, W - 30, 3), M.plastica, L - 8, yb, ZC);
      [ZC - 60, ZC + 60].forEach(function (z) { pezzo(box(8, Math.max(4, y0 - 30 - yb), 8), M.telaio, L - 8, (y0 - 30 + yb) / 2, z); });

      if (opz.piedini) {
        [ZC - 62, ZC + 62].forEach(function (z) {
          pezzo(box(10, y0 - 60, 10), M.telaio, opz.piedini, (y0 - 60) / 2 + 52, z);
          pezzo(box(8, 50, 8), M.allu, opz.piedini, 30, z);
          pezzo(rbox(28, 4, 22, 1.5), M.telaio, opz.piedini, 3, z);
        });
        pezzo(box(6, 6, 124), M.telaio, opz.piedini, 60, ZC);
      }
      if (opz.protezioni && opz.protezioni[1] - opz.protezioni[0] > 60) {
        var a = opz.protezioni[0], b = opz.protezioni[1];
        [-1, 1].forEach(function (s) {
          var z = s < 0 ? 0 : W;
          [44, 70].forEach(function (y) { pezzo(rbox(b - a, 8, 4, 1.5), M.allu, (a + b) / 2, y, z); });
          [a + 10, (a + b) / 2, b - 10].forEach(function (xp) { pezzo(box(5, y0 - 70, 4), M.telaio, xp, (y0 + 30) / 2 + 5, z - s * 2); });
        });
      }
    }

    // ---------- furgone ----------
    function furgone() {
      var y0 = pianale, top = y0 + H + 12, lc = 175, xF = -lc - 2;
      var p = new T.Shape();
      p.moveTo(0, 40); p.lineTo(0, 92); p.quadraticCurveTo(0, 106, 20, 108);
      p.lineTo(64, 118); p.lineTo(126, top - 10); p.quadraticCurveTo(134, top, 150, top);
      p.lineTo(lc, top); p.lineTo(lc, 40); p.lineTo(0, 40);
      var g = tieni(new T.ExtrudeGeometry(p, { depth: W - 4, bevelEnabled: true, bevelThickness: 8, bevelSize: 6, bevelSegments: 4, curveSegments: 12 }));
      pezzo(g, M.vernice, xF, 0, 2);
      var dx = 126 - 64, dy = (top - 10) - 118, lv = Math.sqrt(dx * dx + dy * dy);
      var v = pezzo(rbox(4, lv * 0.92, W * 0.86, 6), M.vetro, xF + (64 + 126) / 2 - 5, (118 + top - 10) / 2 + 3, ZC, false);
      v.rotation.z = -Math.atan2(dx, dy);
      [-1, 1].forEach(function (s) {
        var zf = ZC + s * (W / 2 + 4.5);
        pezzo(rbox(46, (top - 118) * 0.55, 3, 5), M.vetro, xF + 150, 118 + (top - 118) * 0.45, zf, false);
        pezzo(box(1.2, top - 60, 1), M.fuga, xF + lc - 2, (top + 44) / 2, ZC + s * (W / 2 + 4.6), false);
        pezzo(rbox(12, 3, 3, 1.4), M.cromo, xF + lc - 16, 100, ZC + s * (W / 2 + 5.5), false);
        pezzo(rbox(8, 26, 12, 4), M.plastica, xF + 128, 118, ZC + s * (W / 2 + 14));
        pezzo(rbox(6, 12, 34, 5), M.faro, xF - 5, 96, ZC + s * (W / 2 - 30), false);
      });
      pezzo(rbox(4, 20, W * 0.5, 6), M.fuga, xF - 5, 76, ZC, false);
      pezzo(rbox(24, 28, W + 12, 8), M.plastica, xF + 8, 50, ZC);
      // Vano: tetto, fianco destro, fianco sinistro aperto a vista
      pezzo(box(L, 8, W), M.pavimento, L / 2, y0 - 4, ZC);
      pezzo(rbox(L + 6, 8, W + 10, 3), M_TETTO, L / 2, top - 4, ZC);
      pezzo(box(L, top - 44, 3), M_FIANCO_DX, L / 2, (top + 44) / 2 - 4, W + 3.5, false);
      [-1, 1].forEach(function (s) { pezzo(rbox(L + 6, y0 - 38, 6, 3), s < 0 ? M.vernice : M_FIANCO_DX, L / 2, (y0 + 38) / 2, s < 0 ? -3 : W + 3); });
      pezzo(rbox(8, top - y0, 8, 3), M.vernice, L, (top + y0) / 2 - 4, -3);
      pezzo(rbox(8, top - y0, 8, 3), M.vernice, 0, (top + y0) / 2 - 4, -3);
      [-1, 1].forEach(function (s) {
        var z = s < 0 ? -9 : W + 9;
        pezzo(rbox(W / 2, top - 50, 4, 3), s < 0 ? M_PORTA_SX : M_FIANCO_DX, L - W / 4, (top + 50) / 2 - 4, z, false);
        pezzo(rbox(84, 20, 28, 8), M.plastica, L * 0.72, y0 + 6, s < 0 ? 14 : W - 14);
        pezzo(rbox(4, 40, 12, 3), M.stop, L + 3, y0 + 40, s < 0 ? 4 : W - 4, false);
      });
      pezzo(rbox(14, 16, W + 8, 5), M.plastica, L + 4, 46, ZC);
      pezzo(rbox(2, 11, 52, 1.5), M.targa, L + 11.5, 46, ZC, false);
      asse(xF + 45, 34, false, 22);
      asse(L * 0.72, 34, false, 22);
      return xF;
    }

    // ---------- modelli 3D reali (GLB) ----------
    function preparaModello(m, taglia) {
      m.traverse(function (o) {
        if (!o.isMesh) return;
        o.castShadow = true; o.receiveShadow = true;
        o.material = o.material.clone();
        tieni(o.material);
        if (taglia && taglia(o)) { o.material.clippingPlanes = [pianoTaglio]; o.material.clipShadows = true; }
      });
    }
    // Iveco Hi-Way: il modello guarda verso -z, unità in metri
    function montaTrattore(m) {
      m.rotation.y = Math.PI / 2; m.scale.setScalar(100);
      m.position.set(5, 0, ZC);            // ralla sotto il perno del semirimorchio
      preparaModello(m);
      gruppo.add(m);
    }
    // Iveco EuroCargo: teniamo cabina e ruote, il cassone originale viene tagliato via
    function montaMotrice(m, xPosteriore) {
      var off = 28;
      m.rotation.y = -Math.PI / 2; m.scale.setScalar(100);
      m.position.set(off, 0, ZC);
      ['Elevator01', 'Elevator02', 'DoorL', 'DoorR'].forEach(function (n) { var o = m.getObjectByName(n); if (o) o.visible = false; });
      pianoTaglio = new T.Plane(new T.Vector3(-1, 0, 0), 0);
      pianoTaglio.userData = { x: -100 * 0.40 + off };
      preparaModello(m, function (o) { return /MediumTruck01_1/.test(o.name) || /MediumTruck01_1/.test(o.parent && o.parent.name); });
      gruppo.add(m);
      m.updateMatrixWorld(true);
      ['WheelBL', 'WheelBR'].forEach(function (n) {
        var o = m.getObjectByName(n);
        if (!o) return;
        var bb = new T.Box3().setFromObject(o), c = bb.getCenter(new T.Vector3());
        var wp = o.getWorldPosition(new T.Vector3());
        wp.x += xPosteriore - c.x;
        o.position.copy(o.parent.worldToLocal(wp));
      });
    }

    function costruisci(mod) {
    if (distrutto) return;
    if (mod && tipo === 'bilico') pianale = 138;
    if (mod && tipo === 'motrice') pianale = 98;
    var xMin;
    if (tipo === 'bilico') {
      var r = mod ? 46 : 52;
      if (mod) {
        montaTrattore(mod);
        xMin = -345;
      } else {
        var cabL = 232, cabH = 270, base = 108, xF = -cabL - 70;
        [ZC - 42, ZC + 42].forEach(function (z) { pezzo(box(520, 28, 11), M.telaio, xF + 260, 80, z); });
        pezzo(geoCil(46, 46, 9, 32), M.telaio, 120, pianale - 14, ZC);
        cilindroX(30, 130, M.allu, xF + cabL + 80, 64, 30, 32);
        [xF + cabL + 30, xF + cabL + 130].forEach(function (x) { cilindroX(31.5, 4, M.telaio, x, 64, 30, 32); });
        pezzo(rbox(70, 50, 44, 4), M.plastica, xF + cabL + 80, 66, W - 30);
        cabinaCamion(xF, cabL, cabH, base, W + 4, 62);
        asse(xF + 68, r, false, 34);
        parafangoArco(xF + 68, 22, r, 38); parafangoArco(xF + 68, W - 22, r, 38);
        asse(128, r, true, 30);
        [-1, 1].forEach(function (s) { pezzo(box(4, 52, 60), M.plastica, 128 + r + 14, 48, s < 0 ? 40 : W - 40); });
        xMin = xF - 20;
      }
      var assi = [L - 175, L - 306, L - 437];
      cassone({ piedini: 340, protezioni: [400, assi[2] - 75] });
      assi.forEach(function (x) { asse(x, r, false, 40); });
      [-1, 1].forEach(function (s) {
        pezzo(rbox(assi[0] - assi[2] + 130, 5, 56, 2), M.plastica, (assi[0] + assi[2]) / 2, 2 * r + 16, s < 0 ? 26 : W - 26);
        pezzo(box(4, 56, 50), M.plastica, assi[0] + r + 18, 48, s < 0 ? 26 : W - 26);
      });
    } else if (tipo === 'motrice') {
      var xr = L * 0.62, rm = mod ? 37 : 50, inizioProtezioni;
      if (mod) {
        [ZC - 42, ZC + 42].forEach(function (z) { pezzo(box(L + 30, 18, 11), M.telaio, L / 2 - 15, pianale - 31, z); });
        cilindroX(26, 100, M.allu, 95, 52, 30, 32);
        [50, 140].forEach(function (x) { cilindroX(27.5, 4, M.telaio, x, 52, 30, 32); });
        montaMotrice(mod, xr);
        inizioProtezioni = 165;
        xMin = -215;
      } else {
        var cl = 212, ch = 245, cb = 100, xc = -cl - 30;
        [ZC - 42, ZC + 42].forEach(function (z) { pezzo(box(L + cl + 40, 26, 11), M.telaio, (L - cl - 30) / 2, 78, z); });
        cilindroX(28, 110, M.allu, xc + cl + 90, 64, 30, 32);
        cabinaCamion(xc, cl, ch, cb, W + 4, 34);
        asse(xc + 62, rm, false, 32);
        parafangoArco(xc + 62, 22, rm, 36); parafangoArco(xc + 62, W - 22, rm, 36);
        asse(xr, rm, true, 30);
        inizioProtezioni = xc + cl + 160;
        xMin = xc - 20;
      }
      cassone({ protezioni: [inizioProtezioni, xr - rm - 25] });
      [-1, 1].forEach(function (s) {
        pezzo(rbox(rm * 3, 5, 76, 2), M.plastica, xr, 2 * rm + 14, s < 0 ? 36 : W - 36);
        pezzo(box(4, rm + 4, 64), M.plastica, xr + rm + 16, rm - 4 + (rm + 4) / 2 - rm / 2 + 6, s < 0 ? 36 : W - 36);
      });
    } else if (tipo === 'rimorchio') {
      // Rimorchio con timone: due assi, nessuna cabina
      var rr = 46;
      [ZC - 42, ZC + 42].forEach(function (z) { pezzo(box(L - 40, 18, 11), M.telaio, L / 2, pianale - 31, z); });
      var t1 = Math.min(150, L * 0.22), t2 = Math.max(L - 150, L * 0.78);
      cassone({ protezioni: [t1 + rr + 25, t2 - rr - 25] });
      [t1, t2].forEach(function (x) {
        asse(x, rr, true, 28);
        [-1, 1].forEach(function (s) { pezzo(rbox(rr * 3, 5, 66, 2), M.plastica, x, 2 * rr + 14, s < 0 ? 34 : W - 34); });
      });
      // ralla girevole anteriore e timone
      pezzo(geoCil(W * 0.3, W * 0.3, 8, 32), M.telaio, t1, pianale - 20, ZC);
      var lt = 170;
      [-1, 1].forEach(function (s) {
        var braccio = pezzo(box(lt, 9, 9), M.telaio, t1 - lt / 2, 58, ZC + s * 22);
        braccio.rotation.y = s * 0.12;
      });
      pezzo(rbox(22, 16, 24, 3), M.telaio, t1 - lt - 4, 58, ZC);
      pezzo(tieni(new T.TorusGeometry(9, 2.4, 10, 24)), M.cromo, t1 - lt - 18, 58, ZC).rotation.x = Math.PI / 2;
      xMin = t1 - lt - 40;
    } else {
      xMin = furgone() - 20;
    }

    // ---------- carico (istanze: veloce anche con migliaia di colli) ----------
    var carico = new T.Group();
    carico.position.set(0, pianale, 0);
    gruppo.add(carico);

    var geoUnita = tieni(new T.BoxGeometry(1, 1, 1));
    var istanze = {};
    var d = new T.Object3D();
    function istanza(chiave, m, x, y, z, sx, sy, sz, ry) {
      if (!istanze[chiave]) istanze[chiave] = { m: m, e: [] };
      istanze[chiave].e.push([x, y, z, sx, sy, sz, ry || 0]);
    }
    var matCartone = {};
    function cartoneTipo(t) {
      if (!matCartone[t]) matCartone[t] = tieni(new T.MeshStandardMaterial({ map: texture(disegnaCartone(colori[t % colori.length])), roughness: 0.95 }));
      return matCartone[t];
    }

    function bancale(b) {
      var lx = b.l >= b.w, A = lx ? b.l : b.w, B = lx ? b.w : b.l;
      var ox = b.x, oz = b.y, y = b.z;
      // a = posizione lungo il lato lungo, c = lungo il lato corto
      function parte(m, a, yy, c, da, dy, dc) {
        var k = m === M.legno ? 'legno' : 'legnoS';
        if (lx) istanza(k, m, ox + a, y + yy, oz + c, da, dy, dc);
        else istanza(k, m, ox + c, y + yy, oz + a, dc, dy, da);
      }
      var posC = [5, B / 2, B - 5], posA = [7.25, A / 2, A - 7.25];
      posC.forEach(function (c) { parte(M.legno, A / 2, 1.1, c, A - 0.5, 2.2, 9.6); });
      posA.forEach(function (a) { posC.forEach(function (c) { parte(M.legnoScuro, a, 6.1, c, 14.2, 7.8, c === B / 2 ? 14 : 9.6); }); });
      posA.forEach(function (a) { parte(M.legno, a, 11.1, B / 2, 14.2, 2.2, B - 0.5); });
      for (var i = 0; i < 5; i++) {
        var c = 5 + i * (B - 10) / 4;
        parte(M.legno, A / 2, 13.3, c, A - 0.5, 2.2, i === 0 || i === 4 ? 9.6 : 13.6);
      }
      // Cartoni impilati sul bancale + film estensibile
      var hMerce = b.h - 14.4 - 0.6;
      if (hMerce < 5) return;
      var nx = Math.max(1, Math.round((b.l - 2) / 40)), nz = Math.max(1, Math.round((b.w - 2) / 30)), ny = Math.max(1, Math.round(hMerce / 28));
      while (nx * ny * nz > 80) { if (ny > 1) ny--; else if (nx > 1) nx--; else nz--; }
      var cx = (b.l - 2) / nx, cz = (b.w - 2) / nz, cy = hMerce / ny;
      for (var ix = 0; ix < nx; ix++) for (var iy = 0; iy < ny; iy++) for (var iz = 0; iz < nz; iz++) {
        istanza('c' + b.tipo, cartoneTipo(b.tipo), b.x + 1 + cx * (ix + 0.5), y + 14.4 + cy * (iy + 0.5), b.y + 1 + cz * (iz + 0.5), cx - 0.5, cy - 0.5, cz - 0.5);
      }
      istanza('film', M.film, b.x + b.l / 2, y + 14.4 + hMerce / 2, b.y + b.w / 2, b.l - 0.8, hMerce + 0.4, b.w - 0.8);
    }

    piazzati.forEach(function (b) {
      var eBancale = /bancal|pallet|epal/i.test(b.nome) && b.h > 30 && Math.min(b.l, b.w) >= 60;
      if (eBancale) bancale(b);
      else istanza('c' + b.tipo, cartoneTipo(b.tipo), b.x + b.l / 2, b.z + b.h / 2, b.y + b.w / 2, b.l - 1, b.h - 1, b.w - 1);
      if (!b.impilabile) {
        var s = Math.min(b.l, b.w) * 0.5;
        istanza('no', M.no, b.x + b.l / 2, b.z + b.h + 0.4, b.y + b.w / 2, s, 1.2, 5, Math.PI / 4);
        istanza('no', M.no, b.x + b.l / 2, b.z + b.h + 0.4, b.y + b.w / 2, s, 1.2, 5, -Math.PI / 4);
      }
    });
    Object.keys(istanze).forEach(function (k) {
      var it = istanze[k];
      var im = new T.InstancedMesh(geoUnita, it.m, it.e.length);
      it.e.forEach(function (e, i) {
        d.position.set(e[0], e[1], e[2]); d.scale.set(e[3], e[4], e[5]); d.rotation.set(0, e[6], 0);
        d.updateMatrix(); im.setMatrixAt(i, d.matrix);
      });
      im.castShadow = k !== 'film'; im.receiveShadow = true;
      carico.add(im);
    });

    // ---------- terreno, ombre, luci ----------
    var xMax = L + 30;
    lungTot = xMax - xMin; altTot = pianale + H + (tipo === 'bilico' ? 60 : 30);
    var cx0 = (xMin + xMax) / 2;
    var terreno = pezzo(tieni(new T.CircleGeometry(lungTot * 1.1, 64)),
      tieni(new T.MeshStandardMaterial({ color: col('#c9ced4'), roughness: 0.95, transparent: true, alphaMap: texture(disegnaSfumatura('#ffffff', '#000000')), depthWrite: false })),
      cx0, 0, ZC, false);
    terreno.rotation.x = -Math.PI / 2; terreno.receiveShadow = true;
    var contatto = pezzo(tieni(new T.PlaneGeometry(lungTot * 1.08, W * 1.7)),
      tieni(new T.MeshBasicMaterial({ map: texture(disegnaSfumatura('rgba(0,0,0,0.55)', 'rgba(0,0,0,0)')), transparent: true, depthWrite: false })),
      cx0, 0.4, ZC, false);
    contatto.rotation.x = -Math.PI / 2;

    gruppo.position.set(-cx0, -altTot * 0.42, -ZC);

    scena.add(new T.HemisphereLight(col('#ffffff'), col('#7d848c'), 0.35));
    var sole = new T.DirectionalLight(0xfff6ea, 1.9);
    sole.position.set(-lungTot * 0.3, altTot * 5 + 900, -lungTot * 0.5);
    sole.castShadow = true;
    sole.shadow.mapSize.set(2048, 2048);
    var sc = sole.shadow.camera, ext = lungTot * 0.7;
    sc.left = -ext; sc.right = ext; sc.top = ext; sc.bottom = -ext;
    sc.near = 10; sc.far = altTot * 14 + lungTot * 3;
    sole.shadow.bias = -0.0005; sole.shadow.normalBias = 1.2; sole.shadow.radius = 3;
    scena.add(sole);

    raggioBase = Math.sqrt(lungTot * lungTot + W * W + altTot * altTot) * (tipo === 'furgone' ? 1.55 : (tipo === 'rimorchio' ? 1.45 : 1.3));
    if (pianoTaglio) pianoTaglio.constant = pianoTaglio.userData.x + gruppo.position.x;
    pronto = true;
    var attesa = contenitore.querySelector('.attesa3d');
    if (attesa) attesa.remove();
    ripristina();
    }

    // ---------- telecamera orbitale ----------
    var TETA0 = -2.3, FI0 = 1.17;
    var stato = { teta: TETA0, fi: FI0, raggio: raggioBase };
    function dissolvi(materiali, op) {
      materiali.forEach(function (m) { m.opacity = op; m.depthWrite = op > 0.97; });
    }
    function posiziona() {
      if (!pronto) return;
      stato.fi = Math.max(0.12, Math.min(1.5, stato.fi));
      stato.raggio = Math.max(raggioBase * 0.25, Math.min(raggioBase * 3, stato.raggio));
      camera.position.set(
        stato.raggio * Math.sin(stato.fi) * Math.cos(stato.teta),
        stato.raggio * Math.cos(stato.fi),
        stato.raggio * Math.sin(stato.fi) * Math.sin(stato.teta));
      camera.lookAt(0, 0, 0);
      // Tetto e fiancata destra diventano trasparenti quando nascondono il carico
      dissolvi(dissolvenzaTetto, Math.max(0.1, Math.min(1, (stato.fi - 0.5) / 0.45)));
      var lato = Math.sin(stato.teta) * Math.sin(stato.fi);
      dissolvi(dissolvenzaDestra, Math.max(0.12, Math.min(1, 1 - lato * 2.2)));
      dissolvi(dissolvenzaSinistra, Math.max(0.2, Math.min(1, 1 + lato * 1.6)));
      disegna();
    }
    var inAttesa = false;
    function disegna() {
      if (inAttesa) return;
      inAttesa = true;
      requestAnimationFrame(function () { inAttesa = false; renderer.render(scena, camera); });
    }
    function ridimensiona() {
      var w = contenitore.clientWidth, h = contenitore.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      disegna();
    }

    var puntatori = {}, distanzaPizzico = null;
    var cv = renderer.domElement;
    function giu(e) { cv.setPointerCapture(e.pointerId); puntatori[e.pointerId] = { x: e.clientX, y: e.clientY }; }
    function muovi(e) {
      var p = puntatori[e.pointerId];
      if (!p) return;
      var ids = Object.keys(puntatori);
      if (ids.length === 1) {
        stato.teta += (e.clientX - p.x) * 0.008;
        stato.fi -= (e.clientY - p.y) * 0.008;
      }
      p.x = e.clientX; p.y = e.clientY;
      if (ids.length === 2) {
        var a = puntatori[ids[0]], b = puntatori[ids[1]];
        var dd = Math.hypot(a.x - b.x, a.y - b.y);
        if (distanzaPizzico) stato.raggio *= distanzaPizzico / dd;
        distanzaPizzico = dd;
      }
      posiziona();
    }
    function su(e) { delete puntatori[e.pointerId]; distanzaPizzico = null; }
    function rotella(e) { e.preventDefault(); stato.raggio *= e.deltaY > 0 ? 1.1 : 0.9; posiziona(); }
    function ripristina() { stato.teta = TETA0; stato.fi = FI0; stato.raggio = raggioBase; posiziona(); }

    cv.addEventListener('pointerdown', giu);
    cv.addEventListener('pointermove', muovi);
    cv.addEventListener('pointerup', su);
    cv.addEventListener('pointercancel', su);
    cv.addEventListener('wheel', rotella, { passive: false });
    cv.addEventListener('dblclick', ripristina);

    var osservatore = new ResizeObserver(ridimensiona);
    osservatore.observe(contenitore);
    ridimensiona();
    var avviso = document.createElement('div');
    avviso.className = 'attesa3d';
    avviso.textContent = 'Preparo il mezzo…';
    contenitore.appendChild(avviso);
    caricaModello(tipo).then(costruisci);

    return {
      ripristina: ripristina,
      vista: function (teta, fi, zoom) { stato.teta = teta; stato.fi = fi; stato.raggio = raggioBase * (zoom || 1); posiziona(); },
      distruggi: function () {
        distrutto = true;
        osservatore.disconnect();
        risorse.forEach(function (x) { if (x && x.dispose) x.dispose(); });
        renderer.dispose();
        if (cv.parentNode) cv.parentNode.removeChild(cv);
      }
    };
  }
  window.creaVista3D = creaVista3D;
})();
