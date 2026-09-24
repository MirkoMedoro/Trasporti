/*
 * Vista 3D del carico (three.js r128).
 * Disegna un mezzo completo in base alla lunghezza del vano:
 *   fino a 5,2 m  -> furgone
 *   fino a 9,5 m  -> motrice
 *   oltre         -> trattore + semirimorchio
 * Trascina per ruotare, rotellina o pizzico per lo zoom, doppio clic per ripristinare.
 */
(function () {
  function creaVista3D(contenitore, mezzo, piazzati, colori) {
    if (!window.THREE) {
      contenitore.innerHTML = '<p class="nota" style="padding:20px">La vista 3D non è disponibile: controlla la connessione internet.</p>';
      return { distruggi: function () {} };
    }
    var T = window.THREE;
    var L = mezzo.lunghezza, W = mezzo.larghezza, H = mezzo.altezza;
    var tipo = L <= 520 ? 'furgone' : (L <= 950 ? 'motrice' : 'bilico');
    var pianale = tipo === 'furgone' ? 58 : (tipo === 'motrice' ? 112 : 125);
    var pochiColli = piazzati.length <= 700;

    var risorse = [];
    function tieni(x) { risorse.push(x); return x; }
    function col(hex) { return new T.Color(hex).convertSRGBToLinear(); }
    function mat(hex, o) {
      return tieni(new T.MeshStandardMaterial(Object.assign({ color: col(hex), roughness: 0.75, metalness: 0.05 }, o || {})));
    }
    function scatola(l, h, w, m, x, y, z, ombra) {
      var mesh = new T.Mesh(tieni(new T.BoxGeometry(l, h, w)), m);
      mesh.position.set(x, y, z);
      if (ombra !== false) { mesh.castShadow = true; mesh.receiveShadow = true; }
      return mesh;
    }

    // ---------- scena, luci, ombre ----------
    var scena = new T.Scene();
    var camera = new T.PerspectiveCamera(32, 1, 10, 60000);
    var renderer = new T.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputEncoding = T.sRGBEncoding;
    renderer.toneMapping = T.NoToneMapping;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = T.PCFSoftShadowMap;
    contenitore.appendChild(renderer.domElement);

    var gruppo = new T.Group();
    scena.add(gruppo);

    // Materiali del mezzo
    var mVernice = mat('#f3f4f6', { roughness: 0.28, metalness: 0.35 });
    var mScuro = mat('#2a2e34', { roughness: 0.6, metalness: 0.3 });
    var mTelaio = mat('#1d2025', { roughness: 0.55, metalness: 0.45 });
    var mAllu = mat('#c9ced4', { roughness: 0.3, metalness: 0.75 });
    var mGomma = mat('#17181a', { roughness: 0.92 });
    var mCerchio = mat('#b8bec6', { roughness: 0.25, metalness: 0.85 });
    var mVetro = mat('#1c2733', { roughness: 0.08, metalness: 0.6 });
    var mGiallo = mat('#f5b800', { roughness: 0.4 });
    var mFaro = tieni(new T.MeshStandardMaterial({ color: 0xffffff, emissive: col('#fff4d6'), emissiveIntensity: 0.8 }));
    var mStop = tieni(new T.MeshStandardMaterial({ color: col('#b3261e'), emissive: col('#b3261e'), emissiveIntensity: 0.35 }));
    var mPavimento = mat('#8a6f52', { roughness: 0.85 });
    var mParete = tieni(new T.MeshStandardMaterial({ color: col('#dde5ee'), roughness: 0.1, metalness: 0.1, transparent: true, opacity: 0.13, depthWrite: false, side: T.DoubleSide }));
    var mFrontale = tieni(new T.MeshStandardMaterial({ color: col('#dde5ee'), roughness: 0.3, transparent: true, opacity: 0.45, depthWrite: false, side: T.DoubleSide }));

    // ---------- ruote ----------
    function ruota(x, zCentro, r, larg) {
      var g = new T.Group();
      var gomma = new T.Mesh(tieni(new T.CylinderGeometry(r, r, larg, 32)), mGomma);
      var cerchio = new T.Mesh(tieni(new T.CylinderGeometry(r * 0.56, r * 0.56, larg + 1.5, 24)), mCerchio);
      var mozzo = new T.Mesh(tieni(new T.CylinderGeometry(r * 0.18, r * 0.18, larg + 4, 12)), mScuro);
      [gomma, cerchio, mozzo].forEach(function (m) { m.rotation.x = Math.PI / 2; m.castShadow = true; g.add(m); });
      g.position.set(x, r, zCentro);
      gruppo.add(g);
    }
    function asse(x, r, gemellate) {
      var larg = gemellate ? 44 : 30;
      ruota(x, larg / 2 + 4, r, larg);
      ruota(x, W - larg / 2 - 4, r, larg);
      gruppo.add(scatola(14, 14, W - 60, mTelaio, x, r, W / 2, false));
    }

    // ---------- cabina (profilo estruso con angoli morbidi) ----------
    function cabina(xFronte, lung, alt, base, larg, cofano) {
      var s = new T.Shape();
      var r = 18;
      var cof = cofano || 0; // lunghezza del cofano (furgone)
      var hCof = alt * 0.42;
      var xVetroBasso = cof + lung * 0.07, yVetroBasso = cof ? hCof + 8 : alt * 0.5;
      var xVetroAlto = cof ? cof + lung * 0.32 : lung * 0.2;
      s.moveTo(0, r);
      s.lineTo(0, cof ? hCof - r : alt * 0.44);
      if (cof) { s.quadraticCurveTo(0, hCof, r, hCof); s.lineTo(cof, hCof + 2); }
      s.lineTo(xVetroBasso, yVetroBasso);
      s.lineTo(xVetroAlto - r, alt - 4);
      s.quadraticCurveTo(xVetroAlto, alt, xVetroAlto + r * 1.5, alt);
      s.lineTo(lung + cof, alt);
      s.lineTo(lung + cof, 0);
      s.lineTo(r, 0);
      s.quadraticCurveTo(0, 0, 0, r);
      var geo = tieni(new T.ExtrudeGeometry(s, { depth: larg - 16, bevelEnabled: true, bevelThickness: 8, bevelSize: 8, bevelSegments: 4, curveSegments: 10 }));
      var m = new T.Mesh(geo, mVernice);
      m.position.set(xFronte, base, (W - larg) / 2 + 8);
      m.castShadow = true; m.receiveShadow = true;
      gruppo.add(m);

      // Parabrezza
      var dx = xVetroAlto - xVetroBasso, dy = (alt - 4) - yVetroBasso;
      var lv = Math.sqrt(dx * dx + dy * dy) * 0.9;
      var vetro = new T.Mesh(tieni(new T.BoxGeometry(3, lv, larg - 30)), mVetro);
      vetro.position.set(xFronte + (xVetroBasso + xVetroAlto) / 2 - 7, base + (yVetroBasso + alt - 4) / 2, W / 2);
      vetro.rotation.z = -Math.atan2(dx, dy);
      gruppo.add(vetro);
      // Finestrini laterali
      var hf = alt * 0.3, lf = Math.min(lung * 0.45, 110);
      [-1, 1].forEach(function (lato) {
        var f = scatola(lf, hf, 2, mVetro, xFronte + xVetroAlto + lf / 2 + 6, base + alt - hf / 2 - 16, W / 2 + lato * (larg / 2 + 0.5), false);
        gruppo.add(f);
      });
      // Paraurti, griglia, fari, fascia gialla
      gruppo.add(scatola(18, 30, larg + 4, mScuro, xFronte - 4, base + 15, W / 2));
      if (!cof) gruppo.add(scatola(4, alt * 0.22, larg * 0.62, mScuro, xFronte - 7, base + alt * 0.3, W / 2, false));
      [-1, 1].forEach(function (lato) {
        gruppo.add(scatola(4, 12, 34, mFaro, xFronte - 7, base + 40, W / 2 + lato * (larg / 2 - 30), false));
      });
      gruppo.add(scatola(lung + cof - 20, 10, larg + 17, mGiallo, xFronte + (lung + cof) / 2 + 10, base + 52, W / 2, false));
      // Specchietti retrovisori
      [-1, 1].forEach(function (lato) {
        var zs = W / 2 + lato * (larg / 2 + 16);
        gruppo.add(scatola(4, 4, 20, mScuro, xFronte + xVetroAlto + 4, base + alt * 0.72, W / 2 + lato * (larg / 2 + 6), false));
        gruppo.add(scatola(8, alt * 0.22, 10, mScuro, xFronte + xVetroAlto + 4, base + alt * 0.62, zs));
      });
      // Linea della portiera
      [-1, 1].forEach(function (lato) {
        gruppo.add(scatola(2, alt * 0.8, 1, mScuro, xFronte + cof + lung * 0.78, base + alt * 0.45, W / 2 + lato * (larg / 2 + 0.6), false));
      });
    }

    // ---------- vano di carico ----------
    function vano() {
      var y0 = pianale;
      gruppo.add(scatola(L, 6, W, mPavimento, L / 2, y0 - 3, W / 2));
      // Longheroni del telaio
      [W * 0.28, W * 0.72].forEach(function (z) { gruppo.add(scatola(L, 24, 12, mTelaio, L / 2, y0 - 18, z)); });
      // Pareti trasparenti (lati, tetto) e frontale più opaco; porte posteriori aperte
      var pl = new T.Mesh(tieni(new T.PlaneGeometry(L, H)), mParete);
      pl.position.set(L / 2, y0 + H / 2, 0); gruppo.add(pl);
      var pr = pl.clone(); pr.position.z = W; gruppo.add(pr);
      var tetto = new T.Mesh(tieni(new T.PlaneGeometry(L, W)), mParete);
      tetto.rotation.x = Math.PI / 2; tetto.position.set(L / 2, y0 + H, W / 2); gruppo.add(tetto);
      var fr = new T.Mesh(tieni(new T.PlaneGeometry(W, H)), mFrontale);
      fr.rotation.y = Math.PI / 2; fr.position.set(0, y0 + H / 2, W / 2); gruppo.add(fr);
      // Telaio in alluminio: montanti e correnti
      var s = 7;
      [0, W].forEach(function (z) {
        gruppo.add(scatola(L + s, s, s, mAllu, L / 2, y0 + H, z));
        gruppo.add(scatola(L + s, 12, s, mAllu, L / 2, y0 + 2, z));
        var nMontanti = Math.max(2, Math.round(L / 330));
        for (var i = 0; i <= nMontanti; i++) {
          gruppo.add(scatola(s, H, s, mAllu, (L / nMontanti) * i, y0 + H / 2, z));
        }
      });
      [0, L].forEach(function (x) { gruppo.add(scatola(s, s, W + s, mAllu, x, y0 + H, W / 2)); });
      // Porte posteriori aperte a 270°, ripiegate contro le fiancate
      var mPorta = mat('#eceef1', { roughness: 0.35, metalness: 0.2 });
      [0, W].forEach(function (z, i) {
        var zp = z + (i ? 7 : -7);
        gruppo.add(scatola(W / 2, H - 4, 4, mPorta, L - W / 4, y0 + H / 2, zp));
        [0.25, 0.75].forEach(function (k) {
          gruppo.add(scatola(4, H - 20, 3, mAllu, L - W / 2 + (W / 2) * k, y0 + H / 2, zp + (i ? 2.5 : -2.5), false));
        });
      });
      // Paraincastro e luci posteriori
      gruppo.add(scatola(8, 14, W - 20, mScuro, L + 6, Math.max(40, y0 - 70), W / 2));
      [18, W - 18].forEach(function (z) { gruppo.add(scatola(4, 10, 24, mStop, L + 4, y0 - 20, z, false)); });
    }

    // ---------- mezzo completo ----------
    var xMin;
    if (tipo === 'bilico') {
      var rT = 52;
      // Trattore
      var cabL = 225, cabH = 285, cabBase = 95, xCab = -395;
      gruppo.add(scatola(390, 26, W * 0.45, mTelaio, -205, 70, W / 2));
      gruppo.add(scatola(90, 10, 90, mScuro, -60, pianale - 14, W / 2)); // ralla
      cabina(xCab, cabL, cabH, cabBase, W * 0.98);
      // Spoiler sul tetto
      gruppo.add(scatola(cabL * 0.8, 50, W * 0.9, mVernice, xCab + cabL * 0.55, cabBase + cabH + 20, W / 2));
      asse(xCab + 70, rT, false);
      asse(-95, rT, true);
      // Semirimorchio: tre assi posteriori
      vano();
      [L - 150, L - 281, L - 412].forEach(function (x) { asse(x, rT, false); });
      // Piedini di appoggio
      [W * 0.25, W * 0.75].forEach(function (z) { gruppo.add(scatola(10, pianale - 50, 10, mScuro, 260, (pianale - 50) / 2 + 50, z)); });
      xMin = xCab - 20;
    } else if (tipo === 'motrice') {
      var rM = 50, cl = 215, xc = -cl - 25;
      gruppo.add(scatola(L + cl + 20, 24, W * 0.45, mTelaio, (L - cl - 20) / 2, 72, W / 2));
      cabina(xc, cl, 265, 88, W * 0.98);
      vano();
      asse(xc + 65, rM, false);
      asse(L * 0.62, rM, true);
      xMin = xc - 20;
    } else {
      var rF = 34, lc = 95, cof = 70, xf = -(lc + cof) - 4;
      cabina(xf, lc, pianale + H - 10 - 32, 32, W * 0.98, cof);
      vano();
      asse(xf + 55, rF, false);
      asse(L * 0.7, rF, false);
      xMin = xf - 20;
    }

    // ---------- colli ----------
    var mLegno = mat('#c09366', { roughness: 0.9 });
    var mLegnoScuro = mat('#8f6a45', { roughness: 0.9 });
    var mFilm = tieni(new T.MeshStandardMaterial({ color: 0xffffff, roughness: 0.15, metalness: 0.1, transparent: true, opacity: 0.08, depthWrite: false }));
    var mNo = mat('#c8341e', { roughness: 0.5 });
    var matTipo = {};
    function materialeTipo(t) {
      if (!matTipo[t]) matTipo[t] = mat(colori[t % colori.length], { roughness: 0.82 });
      return matTipo[t];
    }
    var mBordi = tieni(new T.LineBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.22 }));

    var carico = new T.Group();
    carico.position.set(0, pianale, 0);
    gruppo.add(carico);

    piazzati.forEach(function (b) {
      var cx = b.x + b.l / 2, cz = b.y + b.w / 2;
      var eBancale = /bancal|pallet|epal/i.test(b.nome) && b.h > 30;
      var hb = 0;
      if (eBancale) {
        hb = 14.4;
        // Pianale del bancale: tavole superiori + tre traversi
        carico.add(scatola(b.l - 1, 2.4, b.w - 1, mLegno, cx, b.z + hb - 1.2, cz));
        carico.add(scatola(b.l - 1, 2.2, b.w - 1, mLegno, cx, b.z + 1.1, cz, false));
        var lungoX = b.l >= b.w;
        [-1, 0, 1].forEach(function (k) {
          var off = k * ((lungoX ? b.w : b.l) / 2 - 7);
          var blocco = lungoX
            ? scatola(b.l - 1, hb - 4.6, 14, mLegnoScuro, cx, b.z + hb / 2, cz + off)
            : scatola(14, hb - 4.6, b.w - 1, mLegnoScuro, cx + off, b.z + hb / 2, cz);
          carico.add(blocco);
        });
      }
      var hMerce = b.h - hb - 1;
      var merce = scatola(b.l - (eBancale ? 4 : 1.5), hMerce, b.w - (eBancale ? 4 : 1.5), materialeTipo(b.tipo), cx, b.z + hb + hMerce / 2, cz);
      carico.add(merce);
      if (pochiColli) {
        var bordi = new T.LineSegments(tieni(new T.EdgesGeometry(merce.geometry)), mBordi);
        bordi.position.copy(merce.position);
        carico.add(bordi);
      }
      if (eBancale) carico.add(scatola(b.l - 2, hMerce + 0.5, b.w - 2, mFilm, cx, b.z + hb + hMerce / 2, cz, false));
      if (!b.impilabile) {
        // Segno "non impilabile": croce rossa sul tetto del collo
        var s = Math.min(b.l, b.w) * 0.55;
        [1, -1].forEach(function (v) {
          var barra = scatola(s, 1.2, 5, mNo, cx, b.z + b.h + 0.4, cz, false);
          barra.rotation.y = v * Math.PI / 4;
          carico.add(barra);
        });
      }
    });

    // ---------- terreno con ombra ----------
    var xMax = L + W / 2 + 20;
    var lungTot = xMax - xMin;
    var terreno = new T.Mesh(tieni(new T.PlaneGeometry(lungTot * 4, lungTot * 4)), tieni(new T.ShadowMaterial({ opacity: 0.22 })));
    terreno.rotation.x = -Math.PI / 2;
    terreno.position.set((xMin + xMax) / 2, 0, W / 2);
    terreno.receiveShadow = true;
    gruppo.add(terreno);

    var altTot = pianale + H;
    gruppo.position.set(-(xMin + xMax) / 2, -altTot / 2, -W / 2);

    scena.add(new T.HemisphereLight(col('#ffffff'), col('#9aa3ad'), 0.75));
    var sole = new T.DirectionalLight(0xffffff, 1.25);
    sole.position.set(-lungTot * 0.25, altTot * 4 + 800, -lungTot * 0.45);
    sole.castShadow = true;
    sole.shadow.mapSize.set(2048, 2048);
    var sc = sole.shadow.camera;
    sc.left = -lungTot * 0.75; sc.right = lungTot * 0.75; sc.top = lungTot * 0.75; sc.bottom = -lungTot * 0.75;
    sc.near = 10; sc.far = altTot * 12 + lungTot * 3;
    sole.shadow.bias = -0.0008;
    sole.shadow.normalBias = 1.5;
    scena.add(sole);
    var riempimento = new T.DirectionalLight(0xffffff, 0.35);
    riempimento.position.set(lungTot, altTot, lungTot);
    scena.add(riempimento);

    // ---------- telecamera orbitale ----------
    var raggioBase = Math.sqrt(lungTot * lungTot + W * W + altTot * altTot) * 1.08;
    var TETA0 = -0.62, FI0 = 1.1;
    var stato = { teta: TETA0, fi: FI0, raggio: raggioBase };
    function posiziona() {
      stato.fi = Math.max(0.15, Math.min(1.52, stato.fi));
      stato.raggio = Math.max(raggioBase * 0.3, Math.min(raggioBase * 3, stato.raggio));
      camera.position.set(
        stato.raggio * Math.sin(stato.fi) * Math.cos(stato.teta),
        stato.raggio * Math.cos(stato.fi),
        stato.raggio * Math.sin(stato.fi) * Math.sin(stato.teta));
      camera.lookAt(0, -altTot * 0.12, 0);
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
    var tela = renderer.domElement;
    function giu(e) { tela.setPointerCapture(e.pointerId); puntatori[e.pointerId] = { x: e.clientX, y: e.clientY }; }
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
        var d = Math.hypot(a.x - b.x, a.y - b.y);
        if (distanzaPizzico) stato.raggio *= distanzaPizzico / d;
        distanzaPizzico = d;
      }
      posiziona();
    }
    function su(e) { delete puntatori[e.pointerId]; distanzaPizzico = null; }
    function rotella(e) { e.preventDefault(); stato.raggio *= e.deltaY > 0 ? 1.1 : 0.9; posiziona(); }
    function ripristina() { stato.teta = TETA0; stato.fi = FI0; stato.raggio = raggioBase; posiziona(); }

    tela.addEventListener('pointerdown', giu);
    tela.addEventListener('pointermove', muovi);
    tela.addEventListener('pointerup', su);
    tela.addEventListener('pointercancel', su);
    tela.addEventListener('wheel', rotella, { passive: false });
    tela.addEventListener('dblclick', ripristina);

    var osservatore = new ResizeObserver(ridimensiona);
    osservatore.observe(contenitore);
    ridimensiona();
    posiziona();

    return {
      ripristina: ripristina,
      vista: function (teta, fi, zoom) { stato.teta = teta; stato.fi = fi; if (zoom) stato.raggio = raggioBase * zoom; posiziona(); },
      distruggi: function () {
        osservatore.disconnect();
        risorse.forEach(function (r) { if (r.dispose) r.dispose(); });
        renderer.dispose();
        if (tela.parentNode) tela.parentNode.removeChild(tela);
      }
    };
  }
  window.creaVista3D = creaVista3D;
})();
