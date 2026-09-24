/*
 * Vista 3D del carico (three.js).
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

    var scena = new T.Scene();
    var camera = new T.PerspectiveCamera(35, 1, 10, 50000);
    var renderer = new T.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    contenitore.appendChild(renderer.domElement);

    scena.add(new T.AmbientLight(0xffffff, 0.62));
    var sole = new T.DirectionalLight(0xffffff, 0.55);
    sole.position.set(-0.6, 1, 0.8);
    scena.add(sole);
    var controluce = new T.DirectionalLight(0xffffff, 0.2);
    controluce.position.set(0.8, 0.4, -1);
    scena.add(controluce);

    // Gruppo centrato: X = lunghezza, Y = altezza, Z = larghezza
    var gruppo = new T.Group();
    gruppo.position.set(-L / 2, -H / 2, -W / 2);
    scena.add(gruppo);

    // Pianale
    var pianale = new T.Mesh(new T.BoxGeometry(L, 4, W), new T.MeshLambertMaterial({ color: 0x9aa1ab }));
    pianale.position.set(L / 2, -2, W / 2);
    gruppo.add(pianale);

    // Sagoma del vano
    var sagoma = new T.LineSegments(
      new T.EdgesGeometry(new T.BoxGeometry(L, H, W)),
      new T.LineBasicMaterial({ color: 0x1b1f24 }));
    sagoma.position.set(L / 2, H / 2, W / 2);
    gruppo.add(sagoma);

    // Parete lato cabina (semitrasparente) e cabina stilizzata
    var parete = new T.Mesh(new T.PlaneGeometry(W, H),
      new T.MeshBasicMaterial({ color: 0x1b1f24, transparent: true, opacity: 0.08, side: T.DoubleSide }));
    parete.rotation.y = Math.PI / 2;
    parete.position.set(0, H / 2, W / 2);
    gruppo.add(parete);
    var hCab = Math.min(H * 0.85, 260), lCab = Math.min(Math.max(L * 0.12, 90), 200);
    var cabina = new T.Mesh(new T.BoxGeometry(lCab, hCab, W * 0.96), new T.MeshLambertMaterial({ color: 0x2a2e33 }));
    cabina.position.set(-lCab / 2 - 15, hCab / 2, W / 2);
    gruppo.add(cabina);
    var vetro = new T.Mesh(new T.BoxGeometry(4, hCab * 0.35, W * 0.8), new T.MeshLambertMaterial({ color: 0xf5b800 }));
    vetro.position.set(-lCab - 15, hCab * 0.68, W / 2);
    gruppo.add(vetro);

    // Colli
    var geometrie = [];
    piazzati.forEach(function (b) {
      var colore = new T.Color(colori[b.tipo % colori.length]);
      var geo = new T.BoxGeometry(b.l - 1, b.h - 1, b.w - 1);
      geometrie.push(geo);
      var m = new T.Mesh(geo, new T.MeshLambertMaterial({ color: colore }));
      m.position.set(b.x + b.l / 2, b.z + b.h / 2, b.y + b.w / 2);
      gruppo.add(m);
      var bordi = new T.LineSegments(new T.EdgesGeometry(geo),
        new T.LineBasicMaterial({ color: colore.clone().multiplyScalar(0.55) }));
      bordi.position.copy(m.position);
      gruppo.add(bordi);
      if (!b.impilabile) {
        // Segno "non impilabile": croce sul tetto del collo
        var s = Math.min(b.l, b.w) * 0.35;
        var pts = [
          new T.Vector3(-s, 0, -s), new T.Vector3(s, 0, s),
          new T.Vector3(-s, 0, s), new T.Vector3(s, 0, -s)
        ];
        var croce = new T.LineSegments(new T.BufferGeometry().setFromPoints(pts),
          new T.LineBasicMaterial({ color: 0xc8341e }));
        croce.position.set(b.x + b.l / 2, b.z + b.h + 0.6, b.y + b.w / 2);
        gruppo.add(croce);
      }
    });

    // Telecamera orbitale
    var raggioBase = Math.sqrt(L * L + W * W + H * H) * 1.25;
    var stato = { teta: -0.75, fi: 0.95, raggio: raggioBase };
    function posiziona() {
      stato.fi = Math.max(0.12, Math.min(1.5, stato.fi));
      stato.raggio = Math.max(raggioBase * 0.35, Math.min(raggioBase * 3, stato.raggio));
      camera.position.set(
        stato.raggio * Math.sin(stato.fi) * Math.cos(stato.teta),
        stato.raggio * Math.cos(stato.fi),
        stato.raggio * Math.sin(stato.fi) * Math.sin(stato.teta));
      camera.lookAt(0, -H * 0.1, 0);
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
    function ripristina() { stato.teta = -0.75; stato.fi = 0.95; stato.raggio = raggioBase; posiziona(); }

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
      vista: function (teta, fi) { stato.teta = teta; stato.fi = fi; posiziona(); },
      distruggi: function () {
        osservatore.disconnect();
        geometrie.forEach(function (g) { g.dispose(); });
        renderer.dispose();
      }
    };
  }
  window.creaVista3D = creaVista3D;
})();
