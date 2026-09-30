/* Stiva — interfaccia */
(function () {
  'use strict';

  var COLORI = ['#f5b800', '#2f6fdf', '#1f9d6b', '#d9542b', '#8a5cd6', '#0fa3b1', '#b5832a', '#e0588f', '#5a7d2a', '#6b7a8f'];

  var MODELLI_COLLO = {
    eur: { nome: 'Bancale EUR', lunghezza: 120, larghezza: 80, altezza: 120, peso: 300, quantita: 1, impilabile: true, ruotabile: true },
    ind: { nome: 'Bancale industriale', lunghezza: 120, larghezza: 100, altezza: 120, peso: 400, quantita: 1, impilabile: true, ruotabile: true },
    libero: { nome: 'Collo', lunghezza: 60, larghezza: 40, altezza: 40, peso: 15, quantita: 1, impilabile: true, ruotabile: true }
  };

  var ICONE = {
    home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/></svg>',
    carico: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="2" y="6" width="14" height="11"/><path d="M16 10h3.5l2.5 3v4h-6"/><circle cx="6" cy="18.5" r="1.8"/><circle cx="18" cy="18.5" r="1.8"/><path d="M5 9h4v4H5zM9 9h4v4H9z"/></svg>',
    mezzi: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 17V7h12v10M15 10h4l2 3v4h-2"/><circle cx="7" cy="17.5" r="2"/><circle cx="17" cy="17.5" r="2"/><path d="M9 17.5h6"/></svg>',
    piani: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5M9 12h7M9 16h7"/></svg>',
    utenti: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.5 3.3-5.5 6.5-5.5s5.7 2 6.5 5.5"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14.8c1.8.7 3 2.5 3.5 5.2"/></svg>',
    aziende: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 21V8l6-4v17M9 21V10l12 3v8M3 21h18M13 16h4"/></svg>',
    viaggi: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="6" cy="18" r="2.2"/><circle cx="18" cy="6" r="2.2"/><path d="M8 18h7a3.5 3.5 0 0 0 0-7H9a3.5 3.5 0 0 1 0-7h7"/></svg>',
    scadenze: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="5" width="18" height="16" rx="1"/><path d="M3 10h18M8 3v4M16 3v4M9 15l2 2 4-4"/></svg>',
    backup: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><ellipse cx="12" cy="5.5" rx="7.5" ry="2.8"/><path d="M4.5 5.5v6c0 1.5 3.4 2.8 7.5 2.8s7.5-1.3 7.5-2.8v-6M4.5 11.5v6c0 1.5 3.4 2.8 7.5 2.8s7.5-1.3 7.5-2.8v-6"/></svg>',
    tassato: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M7 8h10l2.5 12h-15z"/><path d="M9.5 8a2.5 2.5 0 0 1 5 0"/><path d="M9 14h6M12 11.5v5"/></svg>',
    strumenti: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M14.5 5.5a4 4 0 0 0 5 5L12 18a2.1 2.1 0 0 1-3-3z"/><path d="M14.5 5.5 17 3l1 3 3 1-2.5 2.5"/><path d="M4 20l3-3"/></svg>',
    statistiche: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 20V4M4 20h16"/><path d="M8 16v-4M12 16V8M16 16v-6M20 16v-9"/></svg>',
    giri: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="5" cy="6" r="2"/><circle cx="19" cy="6" r="2"/><circle cx="12" cy="18" r="2"/><path d="M7 6h10M17.8 7.6l-4.6 8.8M6.2 7.6l4.6 8.8"/></svg>',
    account: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="8" r="4"/><path d="M4 21c1-4.5 4.2-7 8-7s7 2.5 8 7"/></svg>'
  };

  var stato = {
    utente: null,
    mezzi: [],
    colliSalvati: [],
    piano: { unita: null, righe: [], risultato: null },
    viste3d: [],
    menuAperti: {},
    viaggio: null,
    mappa: null
  };

  // ---------- utilità ----------
  var app = document.getElementById('app');
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function num(n, dec) {
    var s = Number(n).toLocaleString('it-IT', { minimumFractionDigits: dec || 0, maximumFractionDigits: dec || 0 });
    return /^-0([,.]0+)?$/.test(s) ? s.slice(1) : s; // niente "-0"
  }
  function data(d) { return new Date(d).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' }); }
  var timerToast;
  function avvisa(msg) {
    var t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.add('visibile');
    clearTimeout(timerToast);
    timerToast = setTimeout(function () { t.classList.remove('visibile'); }, 2800);
  }
  function api(metodo, url, corpo) {
    return fetch(url, {
      method: metodo,
      headers: corpo ? { 'Content-Type': 'application/json' } : {},
      body: corpo ? JSON.stringify(corpo) : undefined,
      credentials: 'same-origin'
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (d) {
        if (r.status === 401 && stato.utente) { stato.utente = null; mostraAccesso(); }
        if (!r.ok) throw new Error(d.errore || 'Operazione non riuscita.');
        return d;
      });
    });
  }
  function valoriForm(form) {
    var o = {};
    new FormData(form).forEach(function (v, k) { o[k] = v; });
    return o;
  }
  function chiudi3D() {
    stato.viste3d.forEach(function (v) { v.distruggi(); });
    stato.viste3d = [];
    if (stato.mappa) { stato.mappa.remove(); stato.mappa = null; }
  }
  // Segnala al server l'uso di una funzione (solo per le statistiche del super amministratore)
  function traccia(evento) {
    if (!stato.utente || stato.utente.ruolo === 'superadmin') return;
    try {
      fetch('/api/attivita', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ evento: evento }), credentials: 'same-origin', keepalive: true })
        .catch(function () {});
    } catch (e) { /* le statistiche non devono mai bloccare il lavoro */ }
  }
  function haFunzione(id) { return !stato.utente || !stato.utente.funzioni || stato.utente.funzioni[id] !== false; }

  // ---------- accesso ----------
  function paginaAccesso(titolo, sottotitolo, campiHtml, pulsante, invio) {
    var cassoni = '';
    for (var i = 0; i < 36; i++) cassoni += '<i class="' + ([0, 1, 2, 6, 7, 8, 12, 13, 18].indexOf(i) >= 0 ? 'p' : '') + '"></i>';
    app.innerHTML =
      '<div class="accesso">' +
        '<div class="accesso-lato">' +
          '<div class="marchio"><div class="marchio-segno"></div><span>Stiva</span></div>' +
          '<div><h1>Ogni collo al suo posto.</h1><p>Piani di carico calcolati sulle misure reali dei tuoi mezzi, con peso e sovrapponibilità sotto controllo.</p></div>' +
          '<div class="cassoni" aria-hidden="true">' + cassoni + '</div>' +
        '</div>' +
        '<div class="accesso-form"><form novalidate>' +
          '<div><h2>' + esc(titolo) + '</h2><p class="nota" style="margin-top:6px">' + esc(sottotitolo) + '</p></div>' +
          campiHtml +
          '<p class="errore" id="err"></p>' +
          '<button class="btn btn-scuro" type="submit" style="justify-content:center">' + esc(pulsante) + '</button>' +
        '</form></div>' +
      '</div>';
    var form = app.querySelector('form');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var btn = form.querySelector('button');
      btn.disabled = true;
      invio(valoriForm(form)).catch(function (err) {
        document.getElementById('err').textContent = err.message;
        btn.disabled = false;
      });
    });
    var primo = form.querySelector('input');
    if (primo) primo.focus();
  }

  function mostraAccesso() {
    chiudi3D();
    api('GET', '/api/setup').then(function (s) {
      if (s.serveSetup) {
        paginaAccesso('Primo avvio', 'Crea il tuo account da amministratore. Da qui gestirai le aziende clienti.',
          '<label class="campo">Il tuo nome<input type="text" name="nome" autocomplete="name" required></label>' +
          '<label class="campo">Email<input type="email" name="email" autocomplete="email" required></label>' +
          '<label class="campo">Password (almeno 8 caratteri)<input type="password" name="password" autocomplete="new-password" required></label>',
          'Crea account', function (v) { return api('POST', '/api/setup', v).then(function () { return avvia(true); }); });
      } else {
        paginaAccesso('Accedi', 'Inserisci le credenziali ricevute dalla tua azienda.',
          '<label class="campo">Email<input type="email" name="email" autocomplete="username" required></label>' +
          '<label class="campo">Password<input type="password" name="password" autocomplete="current-password" required></label>',
          'Accedi', function (v) { return api('POST', '/api/login', v).then(function () { return avvia(true); }); });
      }
    }).catch(function () {
      app.innerHTML = '<div class="contenuto"><p class="errore">Il server non risponde. Riprova tra qualche istante.</p></div>';
    });
  }

  // ---------- struttura con menu ----------
  function vociMenu() {
    var r = stato.utente.ruolo;
    if (r === 'superadmin') return [['aziende', 'Aziende clienti'], ['statistiche', 'Statistiche'], ['backup', 'Backup'], ['account', 'Il mio account']];
    var v = [['home', 'Home']];
    var strumenti = [];
    if (haFunzione('carico')) strumenti.push(['carico', 'Piano di carico']);
    if (haFunzione('tassato')) strumenti.push(['tassato', 'Calcolatore']);
    if (haFunzione('giri')) strumenti.push(['giri', 'Ottimizza giro']);
    if (strumenti.length) v.push({ gruppo: 'strumenti', nome: 'Strumenti', voci: strumenti });
    if (haFunzione('viaggi')) v.push(['viaggi', 'Viaggi e costi']);
    v.push(['mezzi', 'Mezzi']);
    if (haFunzione('scadenze')) v.push(['scadenze', 'Scadenze']);
    if (haFunzione('carico')) v.push(['piani', 'Piani salvati']);
    if (r === 'admin') v.push(['utenti', 'Utenti']);
    v.push(['account', 'Il mio account']);
    return v;
  }

  function guscio(sezione, html) {
    chiudi3D();
    var u = stato.utente;
    function voce(v, figlia) {
      return '<a href="#/' + v[0] + '" class="' + (v[0] === sezione ? 'attivo' : '') + (figlia ? ' figlia' : '') + '">' + ICONE[v[0]] + '<span>' + v[1] + '</span></a>';
    }
    var menu = vociMenu().map(function (v) {
      if (!v.gruppo) return voce(v);
      // Gruppo apribile: resta aperto se contiene la pagina attuale o se l'utente l'ha aperto
      var dentro = v.voci.some(function (x) { return x[0] === sezione; });
      var aperto = dentro || !!stato.menuAperti[v.gruppo];
      return '<div class="menu-gruppo' + (aperto ? ' aperto' : '') + (dentro ? ' contiene-attivo' : '') + '">' +
        '<button type="button" class="menu-titolo" data-gruppo="' + v.gruppo + '" aria-expanded="' + aperto + '">' + ICONE[v.gruppo] + '<span>' + v.nome + '</span><i class="freccia" aria-hidden="true"></i></button>' +
        '<div class="menu-figli">' + v.voci.map(function (x) { return voce(x, true); }).join('') + '</div></div>';
    }).join('');
    app.innerHTML =
      '<div class="guscio">' +
        '<aside class="barra">' +
          '<a class="marchio" href="#/"><div class="marchio-segno"></div><span>Stiva</span></a>' +
          '<div class="azienda-nome">' + esc(u.azienda || 'Amministrazione') + '</div>' +
          '<nav class="menu">' + menu + '</nav>' +
          '<div class="barra-fondo"><div class="chi">' + esc(u.nome) + '</div><div>' + esc(u.email) + '</div>' +
          '<button type="button" id="esci">Esci</button></div>' +
        '</aside>' +
        '<main class="contenuto">' + html + '</main>' +
      '</div>';
    app.querySelectorAll('[data-gruppo]').forEach(function (b) {
      b.onclick = function () {
        var g = b.closest('.menu-gruppo'), aperto = !g.classList.contains('aperto');
        g.classList.toggle('aperto', aperto);
        b.setAttribute('aria-expanded', aperto);
        stato.menuAperti[b.dataset.gruppo] = aperto;
      };
    });
    document.getElementById('esci').onclick = function () {
      api('POST', '/api/logout').then(function () { stato.utente = null; location.hash = '#/'; mostraAccesso(); });
    };
    return app.querySelector('.contenuto');
  }

  // ---------- Home ----------
  function vistaHome() {
    var tessere = [];
    if (haFunzione('carico')) tessere.push(['carico', 'Piano di carico', 'Inserisci i colli e ottieni la disposizione migliore.']);
    if (haFunzione('giri')) tessere.push(['giri', 'Ottimizza giro', 'Carica la distinta di ritiri e consegne e trova l’ordine con meno km.']);
    if (haFunzione('tassato')) tessere.push(['tassato', 'Calcolatore', 'Calcolo del volume reale, del peso tassato e del prezzo di una spedizione.']);
    if (haFunzione('viaggi')) tessere.push(['viaggi', 'Viaggi e costi', 'Km del percorso, costo del viaggio e prezzo di pareggio.']);
    tessere.push(['mezzi', 'Mezzi', 'La flotta con misure, portata, revisione e complessi veicolari.']);
    if (haFunzione('scadenze')) tessere.push(['scadenze', 'Scadenze', 'Le revisioni in arrivo di tutti i mezzi.']);
    if (haFunzione('carico')) tessere.push(['piani', 'Piani salvati', 'Riapri, stampa o elimina i carichi già calcolati.']);
    if (stato.utente.ruolo === 'admin') tessere.push(['utenti', 'Utenti', 'Chi del tuo personale può accedere.']);
    var main = guscio('home',
      '<div class="testata"><div><h1>Buongiorno, ' + esc(stato.utente.nome.split(' ')[0]) + '</h1>' +
      '<p>' + esc(stato.utente.azienda) + '</p></div></div>' +
      '<div id="avvisi-home"></div>' +
      '<div class="scorciatoie">' + tessere.map(function (t) {
        return '<a class="scorciatoia" href="#/' + t[0] + '">' + ICONE[t[0]] + '<strong>' + t[1] + '</strong><span>' + t[2] + '</span></a>';
      }).join('') + '</div>');
    // Avviso delle revisioni scadute o in scadenza
    if (haFunzione('scadenze')) caricaMezzi().then(function (mezzi) {
      var scadute = 0, vicine = 0;
      mezzi.forEach(function (m) { var c = statoRevisione(m).cls; if (c === 'scaduta') scadute++; if (c === 'vicina') vicine++; });
      if (!scadute && !vicine) return;
      var box = main.querySelector('#avvisi-home');
      if (!box) return;
      box.innerHTML = '<a class="avviso-home ' + (scadute ? 'rosso' : '') + '" href="#/scadenze">' + ICONE.scadenze +
        '<span>' + (scadute ? '<b>' + scadute + (scadute === 1 ? ' revisione scaduta' : ' revisioni scadute') + '</b>' : '') +
        (scadute && vicine ? ' e ' : '') + (vicine ? '<b>' + vicine + '</b> in scadenza entro 30 giorni' : '') + '</span><span class="vai">Vai alle scadenze →</span></a>';
    }).catch(function () {});
  }

  // ---------- Mezzi (flotta) ----------
  var CATEGORIE = {
    furgone: { nome: 'Furgone', vano: true, motore: true, anni: 2 },
    motrice: { nome: 'Motrice', vano: true, motore: true, anni: 1 },
    trattore: { nome: 'Trattore stradale', vano: false, motore: true, anni: 1 },
    semirimorchio: { nome: 'Semirimorchio', vano: true, motore: false, anni: 1 },
    rimorchio: { nome: 'Rimorchio', vano: true, motore: false, anni: 1 }
  };
  function due(n) { return (n < 10 ? '0' : '') + n; }
  function isoData(d) { return d.getFullYear() + '-' + due(d.getMonth() + 1) + '-' + due(d.getDate()); }
  function oggiIso() { return isoData(new Date()); }
  function dataIt(iso) { return iso ? new Date(iso + 'T00:00:00').toLocaleDateString('it-IT') : '–'; }
  function aggiungiAnni(iso, anni) { var d = new Date(iso + 'T00:00:00'); d.setFullYear(d.getFullYear() + anni); return isoData(d); }
  function giorniA(iso) {
    if (!iso) return null;
    var oggi = new Date(); oggi.setHours(0, 0, 0, 0);
    return Math.round((new Date(iso + 'T00:00:00') - oggi) / 86400000);
  }
  function statoRevisione(m) {
    if (m.proprieta === 'padroncino') return { cls: 'padroncino', testo: 'Non gestita', g: null };
    var g = giorniA(m.scadenza_revisione);
    if (g === null) return { cls: 'nd', testo: 'Da inserire', g: null };
    if (g < 0) return { cls: 'scaduta', testo: 'Scaduta da ' + (-g) + (g === -1 ? ' giorno' : ' giorni'), g: g };
    if (g === 0) return { cls: 'vicina', testo: 'Scade oggi', g: g };
    if (g <= 30) return { cls: 'vicina', testo: 'Tra ' + g + (g === 1 ? ' giorno' : ' giorni'), g: g };
    return { cls: 'ok', testo: 'In regola', g: g };
  }
  function nomeMezzo(m) { return m.nome + (m.targa && m.targa !== m.nome ? ' (' + m.targa + ')' : ''); }
  function perVano(m) {
    return { nome: m.nome, targa: m.targa, categoria: m.categoria, lunghezza: m.lunghezza, larghezza: m.larghezza, altezza: m.altezza, portata: m.portata };
  }

  function caricaMezzi() { return api('GET', '/api/mezzi').then(function (m) { stato.mezzi = m; return m; }); }
  function caricaFlotta() {
    return Promise.all([caricaMezzi(), api('GET', '/api/complessi')]).then(function (r) { return { mezzi: r[0], complessi: r[1] }; });
  }

  // Unità che si possono caricare: furgoni, motrici, semirimorchi e complessi veicolari
  function unitaDiCarico(flotta) {
    var perId = {};
    flotta.mezzi.forEach(function (m) { perId[m.id] = m; });
    var trainati = {}, complessi = [], singoli = [];
    flotta.complessi.forEach(function (c) {
      var t = perId[c.trainante_id], r = perId[c.rimorchio_id];
      if (!t || !r) return;
      if (t.categoria === 'trattore') trainati[r.id] = true;
      complessi.push({
        chiave: 'c' + c.id, complesso: true,
        nome: c.nome || (nomeMezzo(t) + ' + ' + nomeMezzo(r)),
        mezzi: [t, r], scomparti: t.categoria === 'motrice' ? [t, r] : [r]
      });
    });
    flotta.mezzi.forEach(function (m) {
      if (['furgone', 'motrice', 'semirimorchio'].indexOf(m.categoria) < 0 || !m.lunghezza) return;
      if (m.categoria === 'semirimorchio' && trainati[m.id]) return;
      singoli.push({ chiave: 'm' + m.id, complesso: false, nome: nomeMezzo(m), mezzi: [m], scomparti: [m] });
    });
    var tutte = singoli.concat(complessi);
    tutte.forEach(function (u) {
      u.volume = 0; u.portata = 0;
      u.scomparti.forEach(function (s) { u.volume += s.lunghezza * s.larghezza * s.altezza; u.portata += s.portata; });
      u.scadute = u.mezzi.filter(function (m) { return statoRevisione(m).cls === 'scaduta'; });
      u.padroncino = u.mezzi.some(function (m) { return m.proprieta === 'padroncino'; });
    });
    return tutte;
  }

  var MODELLI_MEZZO = [
    { categoria: 'furgone', nome: 'Furgone 3,5 t', lunghezza: 420, larghezza: 200, altezza: 210, portata: 1200, consumo: 11 },
    { categoria: 'motrice', nome: 'Motrice 7,50 m', lunghezza: 750, larghezza: 245, altezza: 260, portata: 9500, consumo: 22 },
    { categoria: 'motrice', nome: 'Motrice per autotreno 7,70 m', lunghezza: 770, larghezza: 248, altezza: 270, portata: 12000, consumo: 30 },
    { categoria: 'trattore', nome: 'Trattore stradale', consumo: 31 },
    { categoria: 'semirimorchio', nome: 'Semirimorchio 13,60 m', lunghezza: 1360, larghezza: 248, altezza: 270, portata: 24000 },
    { categoria: 'semirimorchio', nome: 'Mega trailer 13,60 m', lunghezza: 1360, larghezza: 248, altezza: 300, portata: 24000 },
    { categoria: 'rimorchio', nome: 'Rimorchio 7,70 m', lunghezza: 770, larghezza: 248, altezza: 270, portata: 13000 }
  ];

  function badgeRevisione(m) {
    if (m.proprieta === 'padroncino') return '<span class="nota">Non gestita</span>';
    var s = statoRevisione(m);
    return '<span class="etichetta rev-' + s.cls + '">' + s.testo + '</span>' + (m.scadenza_revisione ? '<div class="nota">' + dataIt(m.scadenza_revisione) + '</div>' : '');
  }

  function vistaMezzi(inModifica) {
    caricaFlotta().then(function (flotta) {
      var mezzi = flotta.mezzi;
      var m = inModifica ? mezzi.filter(function (x) { return x.id === inModifica; })[0] : null;
      var ordine = ['furgone', 'motrice', 'trattore', 'semirimorchio', 'rimorchio'];
      var ordinati = mezzi.slice().sort(function (a, b) { return (ordine.indexOf(a.categoria) - ordine.indexOf(b.categoria)) || a.nome.localeCompare(b.nome); });
      var perId = {}; mezzi.forEach(function (x) { perId[x.id] = x; });

      var righe = ordinati.map(function (x) {
        var c = CATEGORIE[x.categoria] || { nome: '–' };
        return '<tr><td><span class="tipo-mezzo">' + c.nome + '</span></td><td><b>' + esc(x.nome) + '</b>' +
          (x.proprieta === 'padroncino' ? ' <span class="etichetta etichetta-padroncino">Padroncino</span>' + (x.ditta ? '<div class="nota">' + esc(x.ditta) + '</div>' : '') : '') +
          '</td><td>' + esc(x.targa || '') + '</td>' +
          '<td class="num">' + (x.lunghezza ? x.lunghezza + ' × ' + x.larghezza + ' × ' + x.altezza : '–') + '</td>' +
          '<td class="num">' + (x.portata ? num(x.portata) : '–') + '</td>' +
          '<td class="num">' + (x.consumo ? num(x.consumo, 1) : '–') + '</td>' +
          '<td>' + badgeRevisione(x) + '</td>' +
          '<td class="num" style="white-space:nowrap"><button class="btn-testo" data-mod="' + x.id + '">Modifica</button>' +
          '<button class="btn-testo pericolo" data-del="' + x.id + '">Elimina</button></td></tr>';
      }).join('');

      var trainanti = mezzi.filter(function (x) { return x.categoria === 'motrice' || x.categoria === 'trattore'; });
      var rimorchiati = mezzi.filter(function (x) { return x.categoria === 'rimorchio' || x.categoria === 'semirimorchio'; });
      var elencoComplessi = flotta.complessi.map(function (c) {
        var t = perId[c.trainante_id], r = perId[c.rimorchio_id];
        if (!t || !r) return '';
        var tipo = t.categoria === 'motrice' ? 'Autotreno' : 'Autoarticolato';
        return '<tr><td><span class="tipo-mezzo">' + tipo + '</span></td><td><b>' + esc(c.nome || '') + '</b></td>' +
          '<td>' + esc(nomeMezzo(t)) + '</td><td>' + esc(nomeMezzo(r)) + '</td>' +
          '<td class="num"><button class="btn-testo pericolo" data-delc="' + c.id + '">Elimina</button></td></tr>';
      }).join('');

      var cat = m ? m.categoria : 'motrice';
      var main = guscio('mezzi',
        '<div class="testata"><div><h1>Mezzi</h1><p>Tutta la flotta: furgoni, motrici, trattori, semirimorchi e rimorchi, con misure, portata e revisione.</p></div></div>' +
        (mezzi.length ?
          '<div class="pannello tabella-scroll"><table><thead><tr><th>Tipo</th><th>Nome</th><th>Targa</th><th class="num">Vano L × P × H (cm)</th><th class="num">Peso max (kg)</th><th class="num">Consumo (l/100 km)</th><th>Revisione</th><th></th></tr></thead><tbody>' + righe + '</tbody></table></div>'
          : '') +
        '<form class="pannello" id="form-mezzo" novalidate>' +
          '<div class="testata" style="margin-bottom:16px"><h2>' + (m ? 'Modifica ' + esc(m.nome) : 'Nuovo mezzo') + '</h2>' +
          '<label class="campo" style="min-width:240px">Parti da un modello<select id="modello"><option value="">Scegli…</option></select></label></div>' +
          '<div class="griglia-form">' +
            '<label class="campo">Tipo di mezzo<select name="categoria" id="categoria">' +
              Object.keys(CATEGORIE).map(function (k) { return '<option value="' + k + '"' + (k === cat ? ' selected' : '') + '>' + CATEGORIE[k].nome + '</option>'; }).join('') +
            '</select></label>' +
            '<label class="campo">Nome<input type="text" name="nome" placeholder="Es. Iveco di Mario" value="' + esc(m ? m.nome : '') + '"></label>' +
            '<label class="campo">Targa<input type="text" name="targa" value="' + esc(m ? m.targa : '') + '"></label>' +
          '</div>' +
          '<div class="scelta-proprieta">' +
            '<span class="campo-titolo">Proprietà</span>' +
            '<label class="spunta"><input type="radio" name="proprieta" value="proprio"' + (!m || m.proprieta !== 'padroncino' ? ' checked' : '') + '> Mezzo proprio dell’azienda</label>' +
            '<label class="spunta"><input type="radio" name="proprieta" value="padroncino"' + (m && m.proprieta === 'padroncino' ? ' checked' : '') + '> Padroncino (mezzo a disposizione, non di proprietà)</label>' +
            '<label class="campo" id="campo-ditta"><span>Padroncino o ditta (facoltativo)</span><input type="text" name="ditta" value="' + esc(m && m.ditta ? m.ditta : '') + '"></label>' +
          '</div>' +
          '<fieldset class="gruppo-campi" id="campi-vano"><legend>Vano di carico</legend><div class="griglia-form">' +
            '<label class="campo">Lunghezza (cm)<input type="number" name="lunghezza" min="50" value="' + (m && m.lunghezza ? m.lunghezza : '') + '"></label>' +
            '<label class="campo">Larghezza (cm)<input type="number" name="larghezza" min="50" value="' + (m && m.larghezza ? m.larghezza : '') + '"></label>' +
            '<label class="campo">Altezza (cm)<input type="number" name="altezza" min="50" value="' + (m && m.altezza ? m.altezza : '') + '"></label>' +
            '<label class="campo">Peso massimo caricabile (kg)<input type="number" name="portata" min="1" value="' + (m && m.portata ? m.portata : '') + '"></label>' +
          '</div></fieldset>' +
          '<fieldset class="gruppo-campi" id="campi-motore"><legend>Consumi</legend><div class="griglia-form">' +
            '<label class="campo">Consumo medio (l/100 km)<input type="number" name="consumo" min="1" step="0.1" placeholder="facoltativo" value="' + (m && m.consumo ? m.consumo : '') + '"></label>' +
          '</div></fieldset>' +
          '<fieldset class="gruppo-campi" id="campi-revisione"><legend>Revisione</legend><div class="griglia-form">' +
            '<label class="campo">Data ultima revisione<input type="date" name="ultima_revisione" value="' + (m && m.ultima_revisione ? m.ultima_revisione : '') + '"></label>' +
            '<label class="campo" style="grid-column:span 2">Officina o centro dell’ultima revisione<input type="text" name="officina_revisione" value="' + esc(m && m.officina_revisione ? m.officina_revisione : '') + '"></label>' +
            '<label class="campo">Scadenza revisione<input type="date" name="scadenza_revisione" value="' + (m && m.scadenza_revisione ? m.scadenza_revisione : '') + '"></label>' +
          '</div><p class="nota" id="nota-revisione" style="margin-top:8px"></p></fieldset>' +
          '<p class="errore" id="err"></p>' +
          '<div class="riga-azioni"><button class="btn btn-primario" type="submit">' + (m ? 'Salva modifiche' : 'Aggiungi mezzo') + '</button>' +
          (m ? '<a class="btn" href="#/mezzi">Annulla</a>' : '') + '</div>' +
        '</form>' +
        '<section class="pannello" id="complessi"><h2>Complessi veicolari</h2>' +
          '<p class="nota" style="margin:6px 0 16px">Abbina una motrice a un rimorchio (autotreno) o un trattore a un semirimorchio. Nel piano di carico potrai usare la motrice da sola oppure l’intero complesso.</p>' +
          (elencoComplessi ? '<div class="tabella-scroll"><table><thead><tr><th>Tipo</th><th>Nome</th><th>Trainante</th><th>Rimorchio</th><th></th></tr></thead><tbody>' + elencoComplessi + '</tbody></table></div>' : '') +
          (trainanti.length && rimorchiati.length ?
            '<form id="form-complesso" class="griglia-form" style="margin-top:16px" novalidate>' +
              '<label class="campo">Mezzo trainante<select name="trainante_id" id="c-trainante">' +
                trainanti.map(function (x) { return '<option value="' + x.id + '">' + CATEGORIE[x.categoria].nome + ': ' + esc(nomeMezzo(x)) + '</option>'; }).join('') +
              '</select></label>' +
              '<label class="campo">Rimorchio o semirimorchio<select name="rimorchio_id" id="c-rimorchio"></select></label>' +
              '<label class="campo">Nome (facoltativo)<input type="text" name="nome" placeholder="Es. Autotreno 1"></label>' +
              '<div class="campo" style="justify-content:flex-end"><button class="btn btn-scuro" type="submit">Crea complesso</button></div>' +
            '</form><p class="errore" id="err-c"></p>'
            : '<p class="nota">Per creare un complesso inserisci prima una motrice e un rimorchio, oppure un trattore e un semirimorchio.</p>') +
        '</section>');

      var form = main.querySelector('#form-mezzo');
      var selCat = main.querySelector('#categoria');
      var selMod = main.querySelector('#modello');
      function aggiornaCampi() {
        var c = CATEGORIE[selCat.value];
        main.querySelector('#campi-vano').hidden = !c.vano;
        main.querySelector('#campi-motore').hidden = !c.motore;
        selMod.innerHTML = '<option value="">Scegli…</option>' + MODELLI_MEZZO.map(function (x, i) {
          return x.categoria === selCat.value ? '<option value="' + i + '">' + x.nome + '</option>' : '';
        }).join('');
        main.querySelector('#nota-revisione').textContent = c.anni === 2
          ? 'Fino a 3,5 t: prima revisione dopo 4 anni dall’immatricolazione, poi ogni 2 anni. La scadenza proposta è indicativa: fa fede la carta di circolazione.'
          : 'Mezzi pesanti e rimorchi oltre 3,5 t: revisione ogni anno. La scadenza proposta è indicativa: fa fede la carta di circolazione.';
      }
      selCat.onchange = aggiornaCampi;
      aggiornaCampi();
      function aggiornaProprieta() {
        var padr = form.elements.proprieta.value === 'padroncino';
        main.querySelector('#campi-revisione').hidden = padr;
        main.querySelector('#campo-ditta').hidden = padr ? false : true;
      }
      Array.prototype.forEach.call(form.querySelectorAll('[name=proprieta]'), function (r) { r.onchange = aggiornaProprieta; });
      aggiornaProprieta();
      selMod.onchange = function () {
        var x = MODELLI_MEZZO[selMod.value];
        if (!x) return;
        ['lunghezza', 'larghezza', 'altezza', 'portata', 'consumo'].forEach(function (k) { if (x[k]) form.elements[k].value = x[k]; });
        if (!form.elements.nome.value) form.elements.nome.value = x.nome;
      };
      // Scadenza proposta dalla data dell'ultima revisione
      var scadAuto = !(m && m.scadenza_revisione);
      form.elements.scadenza_revisione.oninput = function () { scadAuto = false; };
      form.elements.ultima_revisione.onchange = function () {
        var v = form.elements.ultima_revisione.value;
        if (v && (scadAuto || !form.elements.scadenza_revisione.value)) {
          form.elements.scadenza_revisione.value = aggiungiAnni(v, CATEGORIE[selCat.value].anni);
          scadAuto = true;
        }
      };
      if (m) form.scrollIntoView({ block: 'start' });
      form.onsubmit = function (e) {
        e.preventDefault();
        var v = valoriForm(form);
        (m ? api('PUT', '/api/mezzi/' + m.id, v) : api('POST', '/api/mezzi', v)).then(function () {
          avvisa(m ? 'Mezzo aggiornato' : 'Mezzo aggiunto');
          if (m) location.hash = '#/mezzi'; else vistaMezzi();
        }).catch(function (err) { main.querySelector('#err').textContent = err.message; });
      };
      main.querySelectorAll('[data-mod]').forEach(function (b) {
        b.onclick = function () { vistaMezzi(Number(b.dataset.mod)); };
      });
      main.querySelectorAll('[data-del]').forEach(function (b) {
        b.onclick = function () {
          if (!confirm('Eliminare questo mezzo? Verranno eliminati anche i complessi di cui fa parte. I piani già salvati restano consultabili.')) return;
          api('DELETE', '/api/mezzi/' + b.dataset.del).then(function () { avvisa('Mezzo eliminato'); vistaMezzi(); });
        };
      });

      // Complessi
      var selT = main.querySelector('#c-trainante'), selR = main.querySelector('#c-rimorchio');
      if (selT) {
        var aggiornaR = function () {
          var t = perId[Number(selT.value)];
          var serve = t.categoria === 'motrice' ? 'rimorchio' : 'semirimorchio';
          var ok = rimorchiati.filter(function (x) { return x.categoria === serve; });
          selR.innerHTML = ok.length
            ? ok.map(function (x) { return '<option value="' + x.id + '">' + CATEGORIE[x.categoria].nome + ': ' + esc(nomeMezzo(x)) + '</option>'; }).join('')
            : '<option value="">Nessun ' + serve + ' inserito</option>';
        };
        selT.onchange = aggiornaR;
        aggiornaR();
        main.querySelector('#form-complesso').onsubmit = function (e) {
          e.preventDefault();
          api('POST', '/api/complessi', valoriForm(this)).then(function () { avvisa('Complesso creato'); vistaMezzi(); })
            .catch(function (err) { main.querySelector('#err-c').textContent = err.message; });
        };
      }
      main.querySelectorAll('[data-delc]').forEach(function (b) {
        b.onclick = function () {
          if (!confirm('Eliminare questo complesso? I mezzi restano in archivio.')) return;
          api('DELETE', '/api/complessi/' + b.dataset.delc).then(function () { avvisa('Complesso eliminato'); vistaMezzi(); });
        };
      });
    }).catch(errorePagina);
  }

  // ---------- Piano di carico ----------
  // Carica i colli nei vani dell'unità, uno dopo l'altro (motrice, poi rimorchio)
  function pianificaUnita(scomparti, righe) {
    var restanti = righe.map(function (r) { return Object.assign({}, r); });
    var esiti = scomparti.map(function (m) {
      var mezzo = perVano(m);
      var ris = window.Stiva.pianificaCarico(mezzo, restanti);
      var conta = restanti.map(function () { return 0; });
      ris.nonCaricati.forEach(function (n) { conta[n.tipo]++; });
      restanti = restanti.map(function (r, i) { return Object.assign({}, r, { quantita: conta[i] }); });
      return { mezzo: mezzo, risultato: ris };
    });
    var ultimo = esiti[esiti.length - 1].risultato;
    var st = { colliTotali: 0, colliCaricati: 0, pesoTotale: 0, portata: 0, volumeUsato: 0, volume: 0, metriLineari: 0, lunghezza: 0 };
    righe.forEach(function (r) { st.colliTotali += Number(r.quantita) || 0; });
    esiti.forEach(function (e) {
      var m = e.mezzo, s = e.risultato.statistiche;
      st.colliCaricati += s.colliCaricati;
      st.pesoTotale += s.pesoTotale;
      st.portata += m.portata || 0;
      st.volume += m.lunghezza * m.larghezza * m.altezza;
      st.volumeUsato += s.percentualeVolume / 100 * m.lunghezza * m.larghezza * m.altezza;
      st.metriLineari += s.metriLineari;
      st.lunghezza += m.lunghezza;
    });
    st.percentualePeso = st.portata ? Math.round(st.pesoTotale / st.portata * 1000) / 10 : null;
    st.percentualeVolume = Math.round(st.volumeUsato / st.volume * 1000) / 10;
    st.metriLineari = Math.round(st.metriLineari * 100) / 100;
    st.baricentro = esiti.length === 1 ? esiti[0].risultato.statistiche.baricentro : null;
    var riepilogo = righe.map(function (r, i) {
      var c = 0;
      esiti.forEach(function (e) { e.risultato.piazzati.forEach(function (b) { if (b.tipo === i) c++; }); });
      return { nome: r.nome, richiesti: Number(r.quantita) || 0, caricati: c };
    });
    return { scomparti: esiti, statistiche: st, riepilogo: riepilogo, nonCaricati: ultimo.nonCaricati };
  }

  function righePulite(righe) {
    return righe.filter(function (r) { return Number(r.quantita) > 0; }).map(function (r) {
      return { nome: r.nome || 'Collo', lunghezza: Number(r.lunghezza), larghezza: Number(r.larghezza), altezza: Number(r.altezza), peso: Number(r.peso) || 0, quantita: Math.floor(Number(r.quantita)), impilabile: !!r.impilabile, ruotabile: !!r.ruotabile };
    });
  }

  function descriviUnita(u) {
    return u.scomparti.map(function (s) {
      return (u.scomparti.length > 1 ? CATEGORIE[s.categoria].nome + ' ' : 'Vano ') + '<b>' + s.lunghezza + ' × ' + s.larghezza + ' × ' + s.altezza + ' cm</b>, <b>' + num(s.portata) + ' kg</b>';
    }).join('<br>');
  }

  function vistaCarico() {
    Promise.all([caricaFlotta(), api('GET', '/api/colli')]).then(function (res) {
      stato.colliSalvati = res[1];
      var unita = unitaDiCarico(res[0]);
      if (!unita.length) {
        guscio('carico', '<div class="testata"><div><h1>Piano di carico</h1></div></div>' +
          '<div class="vuoto"><h2>Nessun mezzo con vano di carico</h2><p>Per calcolare un carico serve almeno un furgone, una motrice o un semirimorchio con le misure del vano.</p>' +
          '<a class="btn btn-primario" href="#/mezzi">Aggiungi un mezzo</a></div>');
        return;
      }
      var p = stato.piano;
      if (!unita.some(function (u) { return u.chiave === p.unita; })) p.unita = unita[0].chiave;
      if (!p.righe.length) p.righe.push(Object.assign({}, MODELLI_COLLO.eur, { quantita: 10 }));
      function opzione(u) { return '<option value="' + u.chiave + '"' + (u.chiave === p.unita ? ' selected' : '') + '>' + esc(u.nome) + (u.padroncino ? ' – padroncino' : '') + (u.scadute.length ? ' – revisione scaduta' : '') + '</option>'; }
      var singoli = unita.filter(function (u) { return !u.complesso; }), complessi = unita.filter(function (u) { return u.complesso; });

      var main = guscio('carico',
        '<div class="testata"><div><h1>Piano di carico</h1><p>Scegli il mezzo, inserisci i colli e il programma li dispone dal fondo del vano verso le porte. Non sai quale mezzo usare? Chiedi al programma qual è il più piccolo che basta.</p></div></div>' +
        '<div class="pannello">' +
          '<div class="scelta-mezzo"><label class="campo">Mezzo<select id="mezzo">' +
            '<optgroup label="Mezzi">' + singoli.map(opzione).join('') + '</optgroup>' +
            (complessi.length ? '<optgroup label="Complessi veicolari">' + complessi.map(opzione).join('') + '</optgroup>' : '') +
          '</select></label><div class="misure-mezzo" id="misure"></div></div>' +
          '<div id="avviso-revisione"></div>' +
        '</div>' +
        '<div class="pannello">' +
          '<h2 style="margin-bottom:14px">Colli da caricare</h2>' +
          '<div class="tabella-scroll"><table class="tab-colli"><thead><tr>' +
            '<th></th><th>Descrizione</th><th class="num">Lungh. cm</th><th class="num">Largh. cm</th><th class="num">Alt. cm</th><th class="num">Peso kg</th><th class="num">Quantità</th>' +
            '<th title="Spunta se sopra questo collo non si può appoggiare nulla">Non sovrapp.</th><th title="Si può girare di 90° sul pianale">Ruotabile</th><th></th>' +
          '</tr></thead><tbody id="righe"></tbody></table></div>' +
          '<div class="aggiungi-colli">' +
            '<button class="btn btn-piccolo" data-agg="eur">Aggiungi bancale EUR 120×80</button>' +
            '<button class="btn btn-piccolo" data-agg="ind">Aggiungi bancale 120×100</button>' +
            '<button class="btn btn-piccolo" data-agg="libero">Aggiungi collo libero</button>' +
            (stato.colliSalvati.length ? '<select id="da-salvati" class="btn-piccolo"><option value="">Aggiungi un collo salvato…</option>' +
              stato.colliSalvati.map(function (c) { return '<option value="' + c.id + '">' + esc(c.nome) + ' (' + c.lunghezza + '×' + c.larghezza + '×' + c.altezza + ')</option>'; }).join('') +
              '</select>' : '') +
          '</div>' +
          '<div class="barra-calcolo"><div class="totali-colli" id="totali"></div>' +
          '<div class="riga-azioni"><button class="btn" id="quale-mezzo">Quale mezzo basta?</button>' +
          '<button class="btn btn-primario" id="calcola">Calcola carico</button></div></div>' +
          '<p class="errore" id="err"></p>' +
        '</div>' +
        '<div id="consiglio"></div>' +
        '<div id="risultato"></div>');

      var selMezzo = main.querySelector('#mezzo');
      function unitaScelta() { return unita.filter(function (u) { return u.chiave === selMezzo.value; })[0]; }
      function aggiornaMisure() {
        var u = unitaScelta();
        p.unita = u.chiave;
        main.querySelector('#misure').innerHTML = descriviUnita(u);
        main.querySelector('#avviso-revisione').innerHTML = u.scadute.length
          ? '<div class="avviso" style="margin:14px 0 0">Revisione scaduta: ' + u.scadute.map(function (m) { return esc(nomeMezzo(m)) + ' (' + dataIt(m.scadenza_revisione) + ')'; }).join(', ') + '. Il mezzo non può circolare finché non viene revisionato.</div>'
          : '';
      }
      selMezzo.onchange = function () { aggiornaMisure(); p.risultato = null; main.querySelector('#risultato').innerHTML = ''; chiudi3D(); };
      aggiornaMisure();

      var tbody = main.querySelector('#righe');
      function disegnaRighe() {
        tbody.innerHTML = p.righe.map(function (r, i) {
          return '<tr data-i="' + i + '">' +
            '<td><span class="pallino" style="background:' + COLORI[i % COLORI.length] + '"></span></td>' +
            '<td><input type="text" data-k="nome" value="' + esc(r.nome) + '" aria-label="Descrizione"></td>' +
            ['lunghezza', 'larghezza', 'altezza', 'peso', 'quantita'].map(function (k) {
              return '<td class="num"><input type="number" min="' + (k === 'peso' ? 0 : 1) + '" data-k="' + k + '" value="' + esc(r[k]) + '" aria-label="' + k + '"></td>';
            }).join('') +
            '<td class="centro"><input type="checkbox" data-k="nonSovrapp"' + (r.impilabile === false ? ' checked' : '') + ' aria-label="Non sovrapponibile"></td>' +
            '<td class="centro"><input type="checkbox" data-k="ruotabile"' + (r.ruotabile ? ' checked' : '') + ' aria-label="Ruotabile"></td>' +
            '<td style="white-space:nowrap"><button class="btn-testo" data-salva="' + i + '" title="Salva per riutilizzarlo">Salva</button>' +
            '<button class="btn-testo pericolo" data-togli="' + i + '">Togli</button></td></tr>';
        }).join('');
        aggiornaTotali();
      }
      function aggiornaTotali() {
        var n = 0, kg = 0;
        p.righe.forEach(function (r) { var q = Number(r.quantita) || 0; n += q; kg += q * (Number(r.peso) || 0); });
        main.querySelector('#totali').innerHTML = '<b>' + num(n) + '</b> colli, <b>' + num(kg) + ' kg</b> in totale';
      }
      tbody.addEventListener('input', function (e) {
        var k = e.target.dataset.k; if (!k) return;
        var r = p.righe[Number(e.target.closest('tr').dataset.i)];
        if (k === 'nonSovrapp') r.impilabile = !e.target.checked;
        else r[k] = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
        aggiornaTotali();
        main.querySelector('#consiglio').innerHTML = '';
      });
      tbody.addEventListener('click', function (e) {
        var t = e.target;
        if (t.dataset.togli !== undefined) { p.righe.splice(Number(t.dataset.togli), 1); disegnaRighe(); }
        if (t.dataset.salva !== undefined) {
          var r = p.righe[Number(t.dataset.salva)];
          api('POST', '/api/colli', r).then(function (c) {
            stato.colliSalvati.push(c);
            avvisa('"' + c.nome + '" salvato tra i colli ricorrenti');
            vistaCarico();
          }).catch(function (err) { main.querySelector('#err').textContent = err.message; });
        }
      });
      main.querySelectorAll('[data-agg]').forEach(function (b) {
        b.onclick = function () { p.righe.push(Object.assign({}, MODELLI_COLLO[b.dataset.agg])); disegnaRighe(); };
      });
      var selSalvati = main.querySelector('#da-salvati');
      if (selSalvati) selSalvati.onchange = function () {
        var c = stato.colliSalvati.filter(function (x) { return x.id === Number(selSalvati.value); })[0];
        if (c) p.righe.push({ nome: c.nome, lunghezza: c.lunghezza, larghezza: c.larghezza, altezza: c.altezza, peso: c.peso, quantita: 1, impilabile: c.impilabile, ruotabile: c.ruotabile });
        selSalvati.value = '';
        disegnaRighe();
      };
      disegnaRighe();

      function controllaRighe() {
        var err = main.querySelector('#err');
        err.textContent = '';
        var righe = righePulite(p.righe);
        for (var i = 0; i < righe.length; i++) {
          var r = righe[i];
          if (!(r.lunghezza > 0 && r.larghezza > 0 && r.altezza > 0)) { err.textContent = 'Controlla le misure di "' + r.nome + '": devono essere maggiori di zero.'; return null; }
        }
        if (!righe.length) { err.textContent = 'Inserisci almeno un collo con quantità maggiore di zero.'; return null; }
        return righe;
      }

      function calcola() {
        var righe = controllaRighe(); if (!righe) return;
        var btn = main.querySelector('#calcola'); btn.disabled = true; btn.textContent = 'Calcolo in corso…';
        setTimeout(function () {
          try {
            var u = unitaScelta();
            var esito = pianificaUnita(u.scomparti, righe);
            p.risultato = esito;
            traccia('carico_calcolo');
            mostraRisultato(main.querySelector('#risultato'), u.nome, righe, esito, true);
            main.querySelector('#risultato').scrollIntoView({ behavior: 'smooth', block: 'start' });
          } catch (ex) { main.querySelector('#err').textContent = ex.message; }
          btn.disabled = false; btn.textContent = 'Calcola carico';
        }, 30);
      }
      main.querySelector('#calcola').onclick = calcola;

      // "Quale mezzo basta?": prova il carico su tutta la flotta
      main.querySelector('#quale-mezzo').onclick = function () {
        var automatico = !!stato.piano.automatico;
        stato.piano.automatico = false;
        var righe = controllaRighe(); if (!righe) return;
        traccia('carico_quale_mezzo');
        var btn = this, box = main.querySelector('#consiglio');
        btn.disabled = true; btn.textContent = 'Provo tutti i mezzi…';
        var ordinate = unita.slice().sort(function (a, b) { return (a.volume - b.volume) || (a.portata - b.portata); });
        var prove = [], i = 0;
        (function prossima() {
          if (i >= ordinate.length) { mostraConsiglio(prove); btn.disabled = false; btn.textContent = 'Quale mezzo basta?'; return; }
          var u = ordinate[i++];
          try {
            var e = pianificaUnita(u.scomparti, righe);
            prove.push({ u: u, st: e.statistiche, resto: e.nonCaricati });
          } catch (ex) { prove.push({ u: u, errore: ex.message }); }
          setTimeout(prossima, 0);
        })();

        function mostraConsiglio(prove) {
          var buone = prove.filter(function (x) { return !x.errore && !x.resto.length; });
          var migliore = buone.filter(function (x) { return !x.u.scadute.length; })[0];
          var scartata = buone[0] && buone[0].u.scadute.length && buone[0] !== migliore ? buone[0] : null;
          var testa;
          if (migliore) {
            testa = '<div class="consiglio-testa"><div><span class="etichetta-consiglio">Mezzo consigliato</span><h2>' + esc(migliore.u.nome) + '</h2>' +
              '<p>È il più piccolo della flotta in cui entra tutto il carico: occupa il ' + num(migliore.st.percentualeVolume, 0) + '% del volume e il ' + num(migliore.st.percentualePeso || 0, 0) + '% della portata.' +
              (scartata ? ' Ho scartato ' + esc(scartata.u.nome) + ', più piccolo, perché ha la revisione scaduta.' : '') + '</p></div>' +
              '<button class="btn btn-primario" data-usa="' + migliore.u.chiave + '">Usa questo mezzo</button></div>';
          } else if (buone.length) {
            testa = '<div class="avviso">Il carico entra solo in mezzi con la revisione scaduta. Revisionali prima di partire.</div>';
          } else {
            var max = prove.filter(function (x) { return !x.errore; }).sort(function (a, b) { return b.st.colliCaricati - a.st.colliCaricati; })[0];
            testa = '<div class="avviso">Nessun mezzo della flotta contiene tutto il carico.' + (max ? ' Quello che ne porta di più è ' + esc(max.u.nome) + ', con ' + max.st.colliCaricati + ' colli su ' + max.st.colliTotali + '. Valuta un complesso veicolare o più viaggi.' : '') + '</div>';
          }
          box.innerHTML = '<div class="pannello consiglio">' + testa +
            '<div class="tabella-scroll" style="margin-top:16px"><table><thead><tr><th>Mezzo</th><th class="num">Volume vano</th><th>Esito</th><th class="num">Volume occupato</th><th class="num">Portata usata</th><th>Revisione</th><th></th></tr></thead><tbody>' +
            prove.map(function (x) {
              var esitoTesto = x.errore ? '<span class="etichetta no">' + esc(x.errore) + '</span>'
                : (!x.resto.length ? '<span class="etichetta ok">Entra tutto</span>'
                  : '<span class="etichetta no">Restano ' + x.resto.length + ' colli' + (x.resto.some(function (n) { return n.motivo === 'peso'; }) ? ' (peso)' : '') + '</span>');
              return '<tr class="' + (migliore && x === migliore ? 'riga-scelta' : '') + '"><td><b>' + esc(x.u.nome) + '</b></td>' +
                '<td class="num">' + num(x.u.volume / 1e6, 1) + ' m³</td><td>' + esitoTesto + '</td>' +
                '<td class="num">' + (x.st ? num(x.st.percentualeVolume, 0) + '%' : '–') + '</td>' +
                '<td class="num">' + (x.st && x.st.percentualePeso !== null ? num(x.st.percentualePeso, 0) + '%' : '–') + '</td>' +
                '<td>' + (x.u.scadute.length ? '<span class="etichetta rev-scaduta">Scaduta</span>' : '<span class="nota">ok</span>') + '</td>' +
                '<td class="num"><button class="btn-testo" data-usa="' + x.u.chiave + '">Usa</button></td></tr>';
            }).join('') + '</tbody></table></div></div>';
          box.querySelectorAll('[data-usa]').forEach(function (b) {
            b.onclick = function () { selMezzo.value = b.dataset.usa; aggiornaMisure(); calcola(); };
          });
          // Arrivando dal calcolatore: si calcola subito il carico sul mezzo consigliato
          if (automatico && migliore) { selMezzo.value = migliore.u.chiave; aggiornaMisure(); calcola(); return; }
          box.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      };
      if (p.automatico) main.querySelector('#quale-mezzo').click();
    }).catch(errorePagina);
  }

  // Converte i piani salvati con la versione precedente (un solo vano)
  function esitoDaSalvato(p) {
    if (p.risultato && p.risultato.scomparti) return { nome: p.mezzo.nome, esito: p.risultato };
    var r = p.risultato;
    var st = Object.assign({ lunghezza: p.mezzo.lunghezza }, r.statistiche);
    return { nome: p.mezzo.nome, esito: { scomparti: [{ mezzo: p.mezzo, risultato: r }], statistiche: st, riepilogo: r.riepilogo, nonCaricati: r.nonCaricati } };
  }

  // Risultato: usato sia dopo il calcolo sia per i piani salvati
  function mostraRisultato(box, nomeUnita, righe, esito, salvabile, titolo) {
    chiudi3D();
    var s = esito.statistiche, piu = esito.scomparti.length > 1;
    function barra(pct, allarme) { return '<div class="barretta"><i class="' + (allarme && pct >= 100 ? 'pieno' : '') + '" style="width:' + Math.min(100, pct) + '%"></i></div>'; }

    var gruppi = {};
    esito.nonCaricati.forEach(function (n) {
      var k = n.nome + '|' + n.motivo;
      gruppi[k] = gruppi[k] || { nome: n.nome, motivo: n.motivo, q: 0 };
      gruppi[k].q++;
    });
    var elencoNon = Object.keys(gruppi).map(function (k) {
      var g = gruppi[k];
      return '<li>' + g.q + ' × ' + esc(g.nome) + (g.motivo === 'peso' ? ': supererebbero la portata' : ': non c’è più spazio') + '</li>';
    }).join('');
    var avvisi = esito.nonCaricati.length ? '<div class="avviso"><b>' + esito.nonCaricati.length + ' colli restano a terra</b><ul>' + elencoNon + '</ul></div>' : '';

    var sezioni = esito.scomparti.map(function (sc, k) {
      var m = sc.mezzo, r = sc.risultato, st = r.statistiche;
      var conteggi = righe.map(function () { return 0; });
      r.piazzati.forEach(function (b) { conteggi[b.tipo]++; });
      var legenda = righe.map(function (rg, i) {
        if (!conteggi[i] && piu) return '';
        return '<span><i class="pallino" style="background:' + COLORI[i % COLORI.length] + '"></i>' + esc(rg.nome) + ' ' + conteggi[i] + (piu ? '' : '/' + esito.riepilogo[i].richiesti) + '</span>';
      }).join('');
      var avvisoBar = '';
      if (st.baricentro !== null && st.metriLineari > 0) {
        var rel = st.baricentro / m.lunghezza;
        if (rel < 0.25 || rel > 0.65) avvisoBar = '<div class="avviso giallo">Il peso è concentrato ' + (rel < 0.25 ? 'verso la parte anteriore' : 'verso le porte') + ': verifica la ripartizione del carico sugli assi prima di partire.</div>';
      }
      var etich = m.categoria && CATEGORIE[m.categoria] ? CATEGORIE[m.categoria].nome : 'Vano';
      return '<div class="sezione-vano" data-k="' + k + '">' +
        (piu ? '<div class="testa-vano"><h2>' + etich + ': ' + esc(m.nome) + (m.targa && m.targa !== m.nome ? ' (' + esc(m.targa) + ')' : '') + '</h2>' +
          '<p class="nota">Vano ' + m.lunghezza + ' × ' + m.larghezza + ' × ' + m.altezza + ' cm. ' + st.colliCaricati + ' colli, ' + num(st.pesoTotale) + ' kg (' + num(st.percentualePeso || 0, 0) + '% della portata), ' + num(st.metriLineari, 2) + ' m occupati' +
          (st.baricentro !== null ? ', baricentro a ' + num(st.baricentro / 100, 2) + ' m dal fronte' : '') + '.</p></div>' : '') +
        avvisoBar +
        '<div class="viste">' +
          '<section class="vista"><div class="vista-testa"><h3>Vista 3D</h3><div class="riga-azioni no-stampa">' +
            '<span class="nota">Trascina per ruotare, rotellina per lo zoom</span>' +
            '<button class="btn btn-piccolo" data-cam="lato">Di lato</button><button class="btn btn-piccolo" data-cam="porte">Dalle porte</button><button class="btn btn-piccolo" data-cam="reset">Prospettiva</button>' +
          '</div></div><div class="tela3d"></div><div class="legenda">' + legenda + '</div>' +
          (window.creditiModello3D && window.creditiModello3D(m) ? '<div class="crediti">' + window.creditiModello3D(m) + '</div>' : '') + '</section>' +
          '<section class="vista"><div class="vista-testa"><h3>Vista dall’alto, strato per strato</h3><div class="strati"></div></div>' +
          '<div class="pianta"><div class="pianta-svg"></div><div class="orientamento"><span>◀ ' + (m.categoria === 'semirimorchio' || m.categoria === 'rimorchio' ? 'Fronte' : 'Cabina') + '</span><span>Porte ▶</span></div></div>' +
          '<div class="legenda legenda-strato"></div></section>' +
        '</div></div>';
    }).join('');

    box.innerHTML =
      '<div class="risultato">' +
        '<div class="testata" style="margin-bottom:0"><div><h1>' + esc(titolo || 'Risultato') + '</h1>' +
        '<p>' + esc(nomeUnita) + (piu ? '' : ', vano ' + esito.scomparti[0].mezzo.lunghezza + ' × ' + esito.scomparti[0].mezzo.larghezza + ' × ' + esito.scomparti[0].mezzo.altezza + ' cm') + '</p></div>' +
        '<div class="riga-azioni"><button class="btn" id="stampa">Stampa</button></div></div>' +
        '<div class="cruscotto">' +
          '<div><div class="valore">' + s.colliCaricati + '<span style="font-size:18px;color:var(--grigio)"> / ' + s.colliTotali + '</span></div><div class="desc">colli caricati</div>' + barra(s.colliCaricati / Math.max(1, s.colliTotali) * 100) + '</div>' +
          '<div><div class="valore">' + num(s.pesoTotale) + ' kg</div><div class="desc">' + (s.percentualePeso !== null ? num(s.percentualePeso, 1) + '% della portata' : 'peso totale') + '</div>' + barra(s.percentualePeso || 0, true) + '</div>' +
          '<div><div class="valore">' + num(s.percentualeVolume, 1) + '%</div><div class="desc">volume ' + (piu ? 'dei vani' : 'del vano') + ' occupato</div>' + barra(s.percentualeVolume) + '</div>' +
          '<div><div class="valore">' + num(s.metriLineari, 2) + ' m</div><div class="desc">metri lineari occupati su ' + num(s.lunghezza / 100, 2) + '</div>' + barra(s.metriLineari * 100 / s.lunghezza * 100) + '</div>' +
          '<div><div class="valore">' + (piu ? esito.scomparti.length + ' vani' : (s.baricentro !== null ? num(s.baricentro / 100, 2) + ' m' : '–')) + '</div><div class="desc">' + (piu ? 'motrice e rimorchio' : 'baricentro, dal fronte del vano') + '</div></div>' +
        '</div>' +
        avvisi + sezioni +
        (salvabile ?
          '<div class="pannello salva-piano" style="margin-top:22px"><input type="text" id="nome-piano" placeholder="Nome del piano, es. Consegna Rossi 14/10">' +
          '<button class="btn btn-scuro" id="salva-piano">Salva piano</button><span class="errore" id="err-salva"></span></div>' : '') +
      '</div>';

    box.querySelectorAll('.sezione-vano').forEach(function (sez) {
      var sc = esito.scomparti[Number(sez.dataset.k)];
      var v = window.creaVista3D(sez.querySelector('.tela3d'), sc.mezzo, sc.risultato.piazzati, COLORI);
      stato.viste3d.push(v);
      sez.querySelectorAll('[data-cam]').forEach(function (b) {
        b.onclick = function () {
          if (!v.vista) return;
          if (b.dataset.cam === 'lato') v.vista(-Math.PI / 2, 1.45, 0.78);
          else if (b.dataset.cam === 'porte') v.vista(0.04, 1.4, 0.95);
          else v.ripristina();
        };
      });
      disegnaStrati(sez, sc.mezzo, sc.risultato.piazzati);
    });
    box.querySelector('#stampa').onclick = function () { window.print(); };

    if (salvabile) {
      box.querySelector('#salva-piano').onclick = function () {
        var nome = box.querySelector('#nome-piano').value.trim();
        var mezzo = { nome: nomeUnita, scomparti: esito.scomparti.map(function (x) { return x.mezzo; }) };
        api('POST', '/api/piani', { nome: nome, mezzo: mezzo, colli: righe, risultato: esito }).then(function () {
          avvisa('Piano salvato');
          box.querySelector('#nome-piano').value = '';
        }).catch(function (err) { box.querySelector('#err-salva').textContent = err.message; });
      };
    }
  }

  function disegnaStrati(sez, mezzo, piazzati) {
    var quote = [];
    piazzati.forEach(function (b) { if (quote.indexOf(b.z) < 0) quote.push(b.z); });
    quote.sort(function (a, b) { return a - b; });
    var ctrl = sez.querySelector('.strati');
    var L = mezzo.lunghezza, W = mezzo.larghezza;
    if (!quote.length) { sez.querySelector('.pianta-svg').innerHTML = '<p class="nota">Nessun collo caricato in questo vano.</p>'; return; }
    ctrl.innerHTML = quote.length > 1
      ? '<input type="range" min="0" max="' + (quote.length - 1) + '" value="0" class="cursore-strato" aria-label="Strato"><span class="strato-nome"></span>'
      : '<span class="strato-nome"></span>';

    function disegna(i) {
      var q = quote[i];
      var sopra = [], sotto = [];
      piazzati.forEach(function (b) {
        if (b.z <= q && b.z + b.h > q) sopra.push(b);
        else if (b.z + b.h <= q) sotto.push(b);
      });
      var testo = Math.max(10, Math.min(W / 10, 22));
      var svg = '<svg viewBox="-4 -4 ' + (L + 8) + ' ' + (W + 8) + '" role="img" aria-label="Pianta del vano, strato ' + (i + 1) + '">' +
        '<rect x="0" y="0" width="' + L + '" height="' + W + '" fill="#f6f7f8" stroke="#1b1f24" stroke-width="2"/>' +
        '<rect x="-4" y="0" width="4" height="' + W + '" fill="#1b1f24"/>' +
        sotto.map(function (b) {
          return '<rect x="' + b.x + '" y="' + b.y + '" width="' + b.l + '" height="' + b.w + '" fill="#e3e6ea" stroke="#fff" stroke-width="1.5"/>';
        }).join('') +
        sopra.map(function (b) {
          var c = COLORI[b.tipo % COLORI.length];
          var etich = Math.min(b.l, b.w) >= testo * 1.6
            ? '<text x="' + (b.x + b.l / 2) + '" y="' + (b.y + b.w / 2) + '" font-size="' + testo + '" text-anchor="middle" dominant-baseline="central" fill="#000" font-family="Barlow Condensed, Arial Narrow, sans-serif" font-weight="600">' + b.n + '</text>' : '';
          var x = !b.impilabile ? '<path d="M' + (b.x + 6) + ' ' + (b.y + 6) + 'l' + Math.min(14, b.l / 4) + ' ' + Math.min(14, b.w / 4) + 'M' + (b.x + 6 + Math.min(14, b.l / 4)) + ' ' + (b.y + 6) + 'l-' + Math.min(14, b.l / 4) + ' ' + Math.min(14, b.w / 4) + '" stroke="#c8341e" stroke-width="2.5"/>' : '';
          return '<g><title>n. ' + b.n + ', ' + esc(b.nome) + ', ' + b.l + '×' + b.w + '×' + b.h + ' cm, ' + b.peso + ' kg' + (b.impilabile ? '' : ', non sovrapponibile') + '</title>' +
            '<rect x="' + b.x + '" y="' + b.y + '" width="' + b.l + '" height="' + b.w + '" fill="' + c + '" stroke="#fff" stroke-width="2"/>' + etich + x + '</g>';
        }).join('') +
        '</svg>';
      sez.querySelector('.pianta-svg').innerHTML = svg;
      sez.querySelector('.strato-nome').textContent = 'Strato ' + (i + 1) + ' di ' + quote.length + ', da ' + q + ' cm di altezza';
      var peso = sopra.reduce(function (a, b) { return a + b.peso; }, 0);
      sez.querySelector('.legenda-strato').innerHTML =
        '<span>' + sopra.length + ' colli in questo strato, ' + num(peso) + ' kg</span>' +
        (sotto.length ? '<span><i class="pallino" style="background:#e3e6ea"></i>colli degli strati sotto</span>' : '') +
        (sopra.some(function (b) { return !b.impilabile; }) ? '<span style="color:var(--rosso)">✕ non sovrapponibile</span>' : '');
    }
    var cursore = sez.querySelector('.cursore-strato');
    if (cursore) cursore.oninput = function () { disegna(Number(cursore.value)); };
    disegna(0);
  }

  // ---------- Piani salvati ----------
  function vistaPiani() {
    api('GET', '/api/piani').then(function (piani) {
      var main = guscio('piani',
        '<div class="testata"><div><h1>Piani salvati</h1><p>I carichi calcolati e salvati dal tuo team.</p></div>' +
        '<div class="riga-azioni"><a class="btn btn-primario" href="#/carico">Nuovo piano</a></div></div>' +
        (piani.length ?
          '<div class="pannello tabella-scroll"><table><thead><tr><th>Nome</th><th>Mezzo</th><th class="num">Colli</th><th class="num">Peso</th><th class="num">Metri</th><th>Creato</th><th></th></tr></thead><tbody>' +
          piani.map(function (p) {
            var s = p.statistiche || {};
            return '<tr><td><a href="#/piani/' + p.id + '"><b>' + esc(p.nome) + '</b></a></td><td>' + esc(p.mezzo_nome) + '</td>' +
              '<td class="num">' + (s.colliCaricati || 0) + '/' + (s.colliTotali || 0) + '</td><td class="num">' + num(s.pesoTotale || 0) + ' kg</td>' +
              '<td class="num">' + num(s.metriLineari || 0, 2) + '</td><td>' + data(p.creato_il) + (p.autore ? '<div class="nota">' + esc(p.autore) + '</div>' : '') + '</td>' +
              '<td class="num"><a class="btn-testo" href="#/piani/' + p.id + '">Apri</a><button class="btn-testo pericolo" data-del="' + p.id + '">Elimina</button></td></tr>';
          }).join('') + '</tbody></table></div>'
          : '<div class="vuoto"><h2>Nessun piano salvato</h2><p>Dopo aver calcolato un carico, dagli un nome e salvalo: lo ritroverai qui.</p><a class="btn btn-primario" href="#/carico">Calcola un carico</a></div>'));
      main.querySelectorAll('[data-del]').forEach(function (b) {
        b.onclick = function () {
          if (!confirm('Eliminare definitivamente questo piano?')) return;
          api('DELETE', '/api/piani/' + b.dataset.del).then(function () { avvisa('Piano eliminato'); vistaPiani(); });
        };
      });
    }).catch(errorePagina);
  }

  function vistaPiano(id) {
    api('GET', '/api/piani/' + id).then(function (p) {
      var main = guscio('piani', '<div class="riga-azioni no-stampa" style="margin-bottom:8px"><a class="btn-testo" href="#/piani">Torna ai piani salvati</a>' +
        '<button class="btn btn-piccolo" id="riusa">Usa questi colli per un nuovo calcolo</button></div><div id="risultato"></div>');
      var sv = esitoDaSalvato(p);
      mostraRisultato(main.querySelector('#risultato'), sv.nome, p.colli, sv.esito, false, p.nome);
      main.querySelector('#risultato .risultato').style.marginTop = '8px';
      main.querySelector('#riusa').onclick = function () {
        stato.piano.righe = p.colli.map(function (c) { return Object.assign({}, c); });
        stato.piano.risultato = null;
        location.hash = '#/carico';
      };
    }).catch(errorePagina);
  }

  // ---------- Viaggi e costi ----------
  var CAMPI_COSTI = [
    ['gasolio', 'Gasolio (€/litro)', '0.01'],
    ['consumo', 'Consumo (litri ogni 100 km)', '0.1'],
    ['costoOra', 'Costo autista (€/ora)', '0.5'],
    ['velocita', 'Velocità media (km/h)', '1'],
    ['oreSoste', 'Carico, scarico e attese (ore)', '0.25'],
    ['trasferta', 'Trasferta autista (€ per notte fuori)', '1'],
    ['altriKm', 'Altri costi del mezzo (€/km)', '0.01'],
    ['pedaggi', 'Pedaggi del viaggio (€)', '1'],
    ['margine', 'Ricarico desiderato (%)', '1'],
    ['prezzo', 'Prezzo proposto al cliente (€)', '1']
  ];
  var NOTE_COSTI = {
    altriKm: 'Gomme, manutenzione, ammortamento, assicurazione, AdBlue.',
    pedaggi: 'Stima dal sito di Autostrade o dal Telepass.',
    prezzo: 'Facoltativo, per vedere il margine.'
  };

  function euro(n) { return Number(n || 0).toLocaleString('it-IT', { style: 'currency', currency: 'EUR' }); }
  function durata(ore) {
    var m = Math.round(ore * 60), h = Math.floor(m / 60);
    return h ? h + ' h' + (m % 60 ? ' ' + (m % 60) + ' min' : '') : (m % 60) + ' min';
  }
  function numero(v) { var x = Number(String(v == null ? '' : v).replace(',', '.')); return isFinite(x) ? x : 0; }
  function consumoTipico(m) {
    if (m && m.consumo) return Number(m.consumo);
    if (m && m.categoria) return { furgone: 11, motrice: 22, trattore: 31 }[m.categoria] || 31;
    var L = m ? m.lunghezza : 1360;
    return L <= 520 ? 11 : (L <= 950 ? 22 : 31);
  }
  function costiIniziali(salvati, m) {
    var c = Object.assign({ gasolio: 1.65, costoOra: 22, velocita: 65, oreSoste: 2, trasferta: 50, altriKm: 0.18, margine: 15 }, salvati || {});
    c.consumo = (m && m.consumo) ? Number(m.consumo) : (salvati && salvati.consumo) || consumoTipico(m);
    c.pedaggi = 0;
    c.prezzo = '';
    return c;
  }

  // Calcolo dei costi: tutto qui, così è facile da controllare e modificare
  function calcolaCosti(percorso, c) {
    var km = percorso.km;
    var kmVuoto = percorso.ritorno && percorso.tratte.length ? percorso.tratte[percorso.tratte.length - 1].km : 0;
    var oreGuida = km / (numero(c.velocita) || 60);
    var pause = Math.floor(oreGuida / 4.5) * 0.75;            // 45 minuti ogni 4 ore e mezza di guida
    var giorni = Math.max(1, Math.ceil(oreGuida / 9));        // massimo 9 ore di guida al giorno
    var notti = giorni - 1;
    var oreLavoro = oreGuida + pause + numero(c.oreSoste);
    var litri = km * numero(c.consumo) / 100;
    var voci = {
      carburante: litri * numero(c.gasolio),
      autista: oreLavoro * numero(c.costoOra),
      trasferte: notti * numero(c.trasferta),
      altri: km * numero(c.altriKm),
      pedaggi: numero(c.pedaggi)
    };
    var totale = voci.carburante + voci.autista + voci.trasferte + voci.altri + voci.pedaggi;
    var prezzo = numero(c.prezzo);
    return {
      km: km, kmVuoto: kmVuoto, kmCarico: km - kmVuoto, oreGuida: oreGuida, pause: pause, giorni: giorni, notti: notti,
      oreLavoro: oreLavoro, litri: litri, voci: voci, totale: totale,
      costoKm: km ? totale / km : 0,
      costoKmCarico: (km - kmVuoto) > 0 ? totale / (km - kmVuoto) : 0,
      prezzoConsigliato: totale * (1 + numero(c.margine) / 100),
      prezzo: prezzo, utile: prezzo ? prezzo - totale : null
    };
  }

  function nuovoViaggio(mezzi) {
    return {
      mezzoId: (mezzi.filter(function (m) { return !m.categoria || (CATEGORIE[m.categoria] && CATEGORIE[m.categoria].motore); })[0] || {}).id || null, mezzo: null,
      tappe: [{ nome: '', lat: null, lon: null }, { nome: '', lat: null, lon: null }],
      ritorno: false, costi: null, percorso: null
    };
  }

  function vistaViaggi(idSalvato) {
    var richieste = [caricaMezzi(), api('GET', '/api/impostazioni/costi'), api('GET', '/api/percorsi/stato'), api('GET', '/api/viaggi')];
    if (idSalvato) richieste.push(api('GET', '/api/viaggi/' + idSalvato));
    Promise.all(richieste).then(function (r) {
      var mezzi = r[0], costiSalvati = r[1], servizio = r[2], salvati = r[3], aperto = r[4];
      if (aperto) {
        var d = aperto.dati;
        stato.viaggio = { mezzoId: null, mezzo: d.mezzo || null, tappe: d.tappe, ritorno: !!d.ritorno, costi: d.costi, percorso: d.percorso, nome: aperto.nome };
      }
      if (stato.viaggioDaGiro) {
        var dg = stato.viaggioDaGiro;
        stato.viaggioDaGiro = null;
        stato.viaggio = nuovoViaggio(mezzi);
        stato.viaggio.tappe = dg.tappe;
        stato.viaggio.ritorno = dg.ritorno;
        if (dg.mezzoId) stato.viaggio.mezzoId = dg.mezzoId;
      }
      if (!stato.viaggio) stato.viaggio = nuovoViaggio(mezzi);
      var v = stato.viaggio;
      function mezzoScelto() { return mezzi.filter(function (m) { return m.id === v.mezzoId; })[0] || null; }
      if (!v.costi) v.costi = costiIniziali(costiSalvati, mezzoScelto());
      var admin = stato.utente.ruolo === 'admin';

      var main = guscio('viaggi',
        '<div class="testata"><div><h1>' + (v.nome ? esc(v.nome) : 'Viaggi e costi') + '</h1>' +
        '<p>Inserisci partenza e tappe: il programma calcola i km, quanto ti costa il viaggio e il prezzo al km per andare in pareggio.</p></div>' +
        '<div class="riga-azioni"><button class="btn" id="nuovo-viaggio">Nuovo viaggio</button></div></div>' +
        '<div class="viaggio-griglia">' +
          '<div class="viaggio-lato">' +
            '<section class="pannello"><h2>Percorso</h2>' +
              '<label class="campo" style="margin-top:14px">Mezzo<select id="v-mezzo"><option value="">Nessun mezzo in particolare</option>' +
                mezzi.filter(function (m) { return !m.categoria || (CATEGORIE[m.categoria] && CATEGORIE[m.categoria].motore); }).map(function (m) { return '<option value="' + m.id + '"' + (m.id === v.mezzoId ? ' selected' : '') + '>' + (m.categoria ? CATEGORIE[m.categoria].nome + ': ' : '') + esc(nomeMezzo(m)) + '</option>'; }).join('') +
              '</select></label>' +
              '<ol class="tappe" id="tappe"></ol>' +
              '<div class="riga-azioni"><button class="btn btn-piccolo" id="agg-tappa">Aggiungi tappa</button></div>' +
              '<label class="spunta" style="margin-top:14px"><input type="checkbox" id="v-ritorno"' + (v.ritorno ? ' checked' : '') + '> Rientro alla partenza (ritorno a vuoto)</label>' +
              '<p class="nota" style="margin-top:10px">' + (servizio.autocompletamento ? 'Scrivi un indirizzo e scegli dall’elenco.' : 'Scrivi città o indirizzo e premi Invio per cercare.') + ' Puoi anche cliccare sulla mappa per aggiungere un punto.</p>' +
              '<button class="btn btn-primario" id="calcola-percorso" style="margin-top:16px;width:100%;justify-content:center">Calcola percorso</button>' +
              '<p class="errore" id="err-percorso"></p>' +
            '</section>' +
            '<section class="pannello"><h2>Costi</h2><div class="griglia-costi">' +
              CAMPI_COSTI.map(function (c) {
                return '<label class="campo">' + c[1] + '<input type="number" min="0" step="' + c[2] + '" data-costo="' + c[0] + '" value="' + esc(v.costi[c[0]]) + '">' +
                  (NOTE_COSTI[c[0]] ? '<span class="nota-campo">' + NOTE_COSTI[c[0]] + '</span>' : '') + '</label>';
              }).join('') +
            '</div>' +
            '<p class="nota" style="margin-top:12px">I valori iniziali sono solo esempi: inserisci i tuoi.</p>' +
            (admin ? '<button class="btn btn-piccolo" id="salva-predefiniti" style="margin-top:12px">Usa questi valori come predefiniti</button>' : '') +
            '</section>' +
          '</div>' +
          '<div class="viaggio-destra"><div class="mappa" id="mappa"></div><div id="esito"></div></div>' +
        '</div>' +
        '<section class="blocco" id="salvati" style="margin-top:34px"></section>');

      // --- mappa ---
      var livelloTappe = null, livelloLinea = null;
      if (window.L) {
        stato.mappa = L.map(main.querySelector('#mappa'), { zoomControl: true }).setView([42.6, 12.5], 6);
        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        }).addTo(stato.mappa);
        livelloLinea = L.layerGroup().addTo(stato.mappa);
        livelloTappe = L.layerGroup().addTo(stato.mappa);
        stato.mappa.on('click', function (e) {
          var t = { nome: 'Punto sulla mappa (' + e.latlng.lat.toFixed(4) + ', ' + e.latlng.lng.toFixed(4) + ')', lat: e.latlng.lat, lon: e.latlng.lng };
          var libera = v.tappe.filter(function (x) { return x.lat == null && !x.nome; })[0];
          if (libera) Object.assign(libera, t); else v.tappe.push(t);
          percorsoCambiato();
          disegnaTappe();
        });
      } else {
        main.querySelector('#mappa').innerHTML = '<p class="nota" style="padding:20px">La mappa non è disponibile: controlla la connessione internet.</p>';
      }

      function aggiornaMappa(adatta) {
        if (!stato.mappa) return;
        livelloTappe.clearLayers(); livelloLinea.clearLayers();
        var punti = [];
        v.tappe.forEach(function (t, i) {
          if (t.lat == null) return;
          punti.push([t.lat, t.lon]);
          L.marker([t.lat, t.lon], {
            icon: L.divIcon({ className: 'pin-mappa', html: '<span>' + (i + 1) + '</span>', iconSize: [30, 30], iconAnchor: [15, 15] })
          }).bindTooltip(esc(t.nome)).addTo(livelloTappe);
        });
        if (v.percorso && v.percorso.linea) {
          L.polyline(v.percorso.linea, { color: '#f5b800', weight: 9, opacity: 0.9 }).addTo(livelloLinea);
          L.polyline(v.percorso.linea, { color: '#1b1f24', weight: 4 }).addTo(livelloLinea);
          if (adatta) stato.mappa.fitBounds(L.latLngBounds(v.percorso.linea), { padding: [30, 30] });
        } else if (adatta && punti.length) {
          if (punti.length === 1) stato.mappa.setView(punti[0], 10);
          else stato.mappa.fitBounds(L.latLngBounds(punti), { padding: [40, 40] });
        }
      }

      // --- tappe ---
      var elTappe = main.querySelector('#tappe');
      function etichetta(i) { return i === 0 ? 'Partenza' : (i === v.tappe.length - 1 ? 'Arrivo' : 'Tappa ' + i); }
      function disegnaTappe() {
        elTappe.innerHTML = v.tappe.map(function (t, i) {
          return '<li class="tappa' + (t.lat != null ? ' confermata' : '') + '" data-i="' + i + '">' +
            '<span class="tappa-num">' + (i + 1) + '</span>' +
            '<div class="tappa-campo"><input type="text" data-cerca="' + i + '" value="' + esc(t.nome) + '" placeholder="' + etichetta(i) + ': città o indirizzo" aria-label="' + etichetta(i) + '" autocomplete="off">' +
            '<ul class="suggerimenti" hidden></ul></div>' +
            '<div class="tappa-azioni">' +
              '<button class="btn-icona" data-su="' + i + '" title="Sposta su"' + (i === 0 ? ' disabled' : '') + '>↑</button>' +
              '<button class="btn-icona" data-giu="' + i + '" title="Sposta giù"' + (i === v.tappe.length - 1 ? ' disabled' : '') + '>↓</button>' +
              '<button class="btn-icona pericolo" data-togli="' + i + '" title="Togli"' + (v.tappe.length <= 2 ? ' disabled' : '') + '>×</button>' +
            '</div></li>';
        }).join('');
        aggiornaMappa(true);
      }
      function percorsoCambiato() {
        v.percorso = null;
        mostraEsito();
      }

      var timerCerca = null;
      function cerca(input) {
        var i = Number(input.dataset.cerca), q = input.value.trim();
        var lista = input.parentNode.querySelector('.suggerimenti');
        if (q.length < 3) { lista.hidden = true; return; }
        lista.hidden = false;
        lista.innerHTML = '<li class="info">Cerco…</li>';
        api('GET', '/api/percorsi/cerca?q=' + encodeURIComponent(q)).then(function (ris) {
          if (input.value.trim() !== q) return;
          if (!ris.length) { lista.innerHTML = '<li class="info">Nessun risultato. Prova ad aggiungere la provincia o il CAP.</li>'; return; }
          lista.innerHTML = ris.map(function (x, k) { return '<li><button type="button" data-scegli="' + k + '">' + esc(x.nome) + '</button></li>'; }).join('');
          lista.querySelectorAll('[data-scegli]').forEach(function (b) {
            b.onmousedown = function (e) { e.preventDefault(); };
            b.onclick = function () {
              var x = ris[Number(b.dataset.scegli)];
              v.tappe[i] = { nome: x.nome, lat: x.lat, lon: x.lon };
              percorsoCambiato();
              disegnaTappe();
              var prossimo = elTappe.querySelector('[data-cerca="' + (i + 1) + '"]');
              if (prossimo && !prossimo.value) prossimo.focus();
            };
          });
        }).catch(function (err) { lista.innerHTML = '<li class="info">' + esc(err.message) + '</li>'; });
      }
      elTappe.addEventListener('input', function (e) {
        var inp = e.target; if (!inp.dataset.cerca) return;
        var t = v.tappe[Number(inp.dataset.cerca)];
        t.nome = inp.value; t.lat = null; t.lon = null;
        inp.closest('.tappa').classList.remove('confermata');
        if (v.percorso) percorsoCambiato();
        if (servizio.autocompletamento) { clearTimeout(timerCerca); timerCerca = setTimeout(function () { cerca(inp); }, 350); }
      });
      elTappe.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && e.target.dataset.cerca) { e.preventDefault(); cerca(e.target); }
        if (e.key === 'Escape' && e.target.dataset.cerca) e.target.parentNode.querySelector('.suggerimenti').hidden = true;
      });
      elTappe.addEventListener('focusout', function (e) {
        if (!e.target.dataset.cerca) return;
        var lista = e.target.parentNode.querySelector('.suggerimenti');
        setTimeout(function () { lista.hidden = true; }, 150);
      });
      elTappe.addEventListener('click', function (e) {
        var b = e.target.closest('button'); if (!b) return;
        var i;
        if (b.dataset.su) { i = Number(b.dataset.su); v.tappe.splice(i - 1, 0, v.tappe.splice(i, 1)[0]); }
        else if (b.dataset.giu) { i = Number(b.dataset.giu); v.tappe.splice(i + 1, 0, v.tappe.splice(i, 1)[0]); }
        else if (b.dataset.togli) { v.tappe.splice(Number(b.dataset.togli), 1); }
        else return;
        percorsoCambiato();
        disegnaTappe();
      });
      main.querySelector('#agg-tappa').onclick = function () {
        v.tappe.push({ nome: '', lat: null, lon: null });
        disegnaTappe();
        elTappe.querySelector('[data-cerca="' + (v.tappe.length - 1) + '"]').focus();
      };
      main.querySelector('#v-ritorno').onchange = function () { v.ritorno = this.checked; percorsoCambiato(); };
      main.querySelector('#v-mezzo').onchange = function () {
        v.mezzoId = this.value ? Number(this.value) : null;
        var m = mezzoScelto();
        v.mezzo = null;
        v.costi.consumo = consumoTipico(m);
        main.querySelector('[data-costo="consumo"]').value = v.costi.consumo;
        if (servizio.camion) percorsoCambiato(); else mostraEsito();
      };
      main.querySelector('#nuovo-viaggio').onclick = function () {
        stato.viaggio = null;
        if (location.hash === '#/viaggi') vistaViaggi(); else location.hash = '#/viaggi';
      };

      // --- costi ---
      main.querySelectorAll('[data-costo]').forEach(function (inp) {
        inp.oninput = function () { v.costi[inp.dataset.costo] = inp.value; mostraEsito(); };
      });
      var btnPred = main.querySelector('#salva-predefiniti');
      if (btnPred) btnPred.onclick = function () {
        api('PUT', '/api/impostazioni/costi', v.costi).then(function () { avvisa('Valori predefiniti salvati per tutta l’azienda'); })
          .catch(function (err) { avvisa(err.message); });
      };

      // --- calcolo del percorso ---
      main.querySelector('#calcola-percorso').onclick = function () {
        var err = main.querySelector('#err-percorso');
        err.textContent = '';
        v.tappe = v.tappe.filter(function (t, i) { return t.lat != null || t.nome.trim() || i < 2; });
        var manca = v.tappe.filter(function (t) { return t.lat == null; })[0];
        if (manca) {
          disegnaTappe();
          err.textContent = manca.nome.trim()
            ? 'Scegli "' + manca.nome.trim() + '" dall’elenco dei risultati (premi Invio per cercare).'
            : 'Compila partenza e arrivo.';
          return;
        }
        var punti = v.tappe.map(function (t) { return { lat: t.lat, lon: t.lon }; });
        if (v.ritorno) punti.push(punti[0]);
        var m = mezzoScelto();
        var btn = this; btn.disabled = true; btn.textContent = 'Calcolo in corso…';
        api('POST', '/api/percorsi/calcola', { punti: punti, mezzo: m ? { categoria: m.categoria, lunghezza: m.lunghezza, larghezza: m.larghezza, altezza: m.altezza } : null })
          .then(function (p) {
            p.ritorno = v.ritorno;
            v.percorso = p;
            if (m) v.mezzo = { nome: m.nome, targa: m.targa };
            disegnaTappe();
            mostraEsito();
          })
          .catch(function (e) { err.textContent = e.message; })
          .then(function () { btn.disabled = false; btn.textContent = 'Calcola percorso'; });
      };

      // --- risultato ---
      function mostraEsito() {
        var box = main.querySelector('#esito');
        if (!v.percorso) {
          box.innerHTML = '<div class="esito-vuoto">Inserisci le tappe e premi <b>Calcola percorso</b>: qui vedrai km, tempi e costi.</div>';
          aggiornaMappa(false);
          return;
        }
        var c = calcolaCosti(v.percorso, v.costi), p = v.percorso;
        var nomi = v.tappe.map(function (t) { return t.nome.split(',')[0]; });
        if (p.ritorno) nomi.push(nomi[0]);
        var margineHtml = '';
        if (c.utile !== null) {
          var pct = c.prezzo ? c.utile / c.prezzo * 100 : 0;
          margineHtml = '<div class="avviso ' + (c.utile >= 0 ? 'verde' : '') + '">' +
            (c.utile >= 0
              ? 'Al prezzo di <b>' + euro(c.prezzo) + '</b> guadagni <b>' + euro(c.utile) + '</b> (' + num(pct, 1) + '% del prezzo).'
              : 'Al prezzo di <b>' + euro(c.prezzo) + '</b> perdi <b>' + euro(-c.utile) + '</b>: il minimo per non rimetterci è ' + euro(c.totale) + '.') + '</div>';
        }
        var note = [];
        if (c.giorni > 1) note.push('Il viaggio supera le 9 ore di guida al giorno: ho calcolato ' + c.giorni + ' giorni e ' + c.notti + (c.notti === 1 ? ' notte' : ' notti') + ' fuori.');
        if (p.fonte === 'auto') note.push('Percorso calcolato con il profilo auto: non esclude le strade vietate ai camion. Con la chiave OpenRouteService il calcolo usa il profilo camion.');
        note.push('Tempi di guida e pause sono stime: verifica sempre il rispetto del Regolamento CE 561/2006.');

        box.innerHTML =
          '<div class="cruscotto cruscotto-viaggio">' +
            '<div><div class="valore">' + num(c.km, 0) + ' km</div><div class="desc">' + (c.kmVuoto ? 'di cui ' + num(c.kmVuoto, 0) + ' km a vuoto' : 'percorso totale') + '</div></div>' +
            '<div><div class="valore">' + durata(c.oreGuida) + '</div><div class="desc">di guida stimata' + (c.giorni > 1 ? ', ' + c.giorni + ' giorni' : '') + '</div></div>' +
            '<div><div class="valore">' + euro(c.totale) + '</div><div class="desc">costo del viaggio</div></div>' +
            '<div class="evidenza"><div class="valore">' + euro(c.costoKm) + '</div><div class="desc">al km per andare in pareggio' + (c.kmVuoto ? '<br>' + euro(c.costoKmCarico) + ' sui soli km a carico' : '') + '</div></div>' +
            '<div><div class="valore">' + euro(c.prezzoConsigliato) + '</div><div class="desc">prezzo consigliato (+' + num(numero(v.costi.margine), 0) + '%)</div></div>' +
          '</div>' +
          margineHtml +
          '<div class="pannello tabella-scroll"><h3 style="margin-bottom:10px">Dettaglio dei costi</h3><table><tbody>' +
            '<tr><td>Carburante</td><td class="nota">' + num(c.km, 0) + ' km × ' + num(numero(v.costi.consumo), 1) + ' l/100 km = ' + num(c.litri, 0) + ' litri × ' + euro(numero(v.costi.gasolio)) + '</td><td class="num">' + euro(c.voci.carburante) + '</td></tr>' +
            '<tr><td>Autista</td><td class="nota">' + durata(c.oreLavoro) + ' di lavoro (guida ' + durata(c.oreGuida) + (c.pause ? ', pause ' + durata(c.pause) : '') + (numero(v.costi.oreSoste) ? ', carico e attese ' + durata(numero(v.costi.oreSoste)) : '') + ') × ' + euro(numero(v.costi.costoOra)) + '/ora</td><td class="num">' + euro(c.voci.autista) + '</td></tr>' +
            (c.notti ? '<tr><td>Trasferte</td><td class="nota">' + c.notti + (c.notti === 1 ? ' notte' : ' notti') + ' × ' + euro(numero(v.costi.trasferta)) + '</td><td class="num">' + euro(c.voci.trasferte) + '</td></tr>' : '') +
            '<tr><td>Altri costi del mezzo</td><td class="nota">' + num(c.km, 0) + ' km × ' + euro(numero(v.costi.altriKm)) + '/km</td><td class="num">' + euro(c.voci.altri) + '</td></tr>' +
            '<tr><td>Pedaggi</td><td class="nota">valore inserito</td><td class="num">' + euro(c.voci.pedaggi) + '</td></tr>' +
            '<tr class="totale"><td>Totale</td><td></td><td class="num">' + euro(c.totale) + '</td></tr>' +
          '</tbody></table></div>' +
          '<div class="pannello tabella-scroll"><h3 style="margin-bottom:10px">Tratte</h3><table><thead><tr><th>Da</th><th>A</th><th class="num">Km</th><th class="num">Tempo stimato</th></tr></thead><tbody>' +
            p.tratte.map(function (t, i) {
              return '<tr><td>' + esc(nomi[i] || '') + '</td><td>' + esc(nomi[i + 1] || '') + (p.ritorno && i === p.tratte.length - 1 ? ' <span class="etichetta">a vuoto</span>' : '') + '</td><td class="num">' + num(t.km, 0) + '</td><td class="num">' + durata(t.km / (numero(v.costi.velocita) || 60)) + '</td></tr>';
            }).join('') +
          '</tbody></table></div>' +
          '<div class="note-viaggio">' + note.map(function (n) { return '<p class="nota">' + n + '</p>'; }).join('') + '</div>' +
          '<div class="pannello salva-piano"><input type="text" id="nome-viaggio" placeholder="Nome del viaggio, es. Arezzo – Milano – Torino" value="' + esc(v.nome || '') + '">' +
            '<button class="btn btn-scuro" id="salva-viaggio">Salva viaggio</button><span class="errore" id="err-salva"></span></div>';

        box.querySelector('#salva-viaggio').onclick = function () {
          var nome = box.querySelector('#nome-viaggio').value.trim();
          var dati = {
            mezzo: v.mezzo, tappe: v.tappe, ritorno: v.ritorno, costi: v.costi, percorso: v.percorso,
            riepilogo: { km: c.km, totale: Math.round(c.totale * 100) / 100, costoKm: Math.round(c.costoKm * 1000) / 1000 }
          };
          api('POST', '/api/viaggi', { nome: nome, dati: dati }).then(function () {
            avvisa('Viaggio salvato');
            v.nome = nome;
            caricaSalvati();
          }).catch(function (e) { box.querySelector('#err-salva').textContent = e.message; });
        };
        aggiornaMappa(false);
      }

      // --- viaggi salvati ---
      function disegnaSalvati(lista) {
        var el = main.querySelector('#salvati');
        if (!lista.length) { el.innerHTML = ''; return; }
        el.innerHTML = '<h2 style="margin-bottom:12px">Viaggi salvati</h2><div class="pannello tabella-scroll"><table><thead><tr><th>Nome</th><th class="num">Km</th><th class="num">Costo</th><th class="num">Costo/km</th><th>Creato</th><th></th></tr></thead><tbody>' +
          lista.map(function (x) {
            var rp = x.riepilogo || {};
            return '<tr><td><a href="#/viaggi/' + x.id + '"><b>' + esc(x.nome) + '</b></a></td><td class="num">' + num(rp.km || 0, 0) + '</td><td class="num">' + euro(rp.totale) + '</td><td class="num">' + euro(rp.costoKm) + '</td>' +
              '<td>' + data(x.creato_il) + (x.autore ? '<div class="nota">' + esc(x.autore) + '</div>' : '') + '</td>' +
              '<td class="num"><a class="btn-testo" href="#/viaggi/' + x.id + '">Apri</a><button class="btn-testo pericolo" data-elimina="' + x.id + '">Elimina</button></td></tr>';
          }).join('') + '</tbody></table></div>';
        el.querySelectorAll('[data-elimina]').forEach(function (b) {
          b.onclick = function () {
            if (!confirm('Eliminare questo viaggio salvato?')) return;
            api('DELETE', '/api/viaggi/' + b.dataset.elimina).then(function () { avvisa('Viaggio eliminato'); caricaSalvati(); });
          };
        });
      }
      function caricaSalvati() { api('GET', '/api/viaggi').then(disegnaSalvati); }

      disegnaTappe();
      mostraEsito();
      if (v.percorso) aggiornaMappa(true);
      disegnaSalvati(salvati);
      setTimeout(function () { if (stato.mappa) stato.mappa.invalidateSize(); }, 100);
    }).catch(errorePagina);
  }

  // ---------- Calcolatore: volume reale, peso tassato, prezzo ----------
  // Semirimorchio standard su cui si misurano i metri lineari
  var VANO_LDM = { nome: 'Semirimorchio standard', lunghezza: 1360, larghezza: 248, altezza: 270, portata: Infinity };
  var RIGHE_RAPIDE = {
    eur: { nome: 'Bancale EUR', l: 120, p: 80, h: '', peso: '', n: 1, impilabile: true },
    ind: { nome: 'Bancale 120×100', l: 120, p: 100, h: '', peso: '', n: 1, impilabile: true },
    collo: { nome: 'Collo', l: '', p: '', h: '', peso: '', n: 1, impilabile: true }
  };

  function nuovoTassato(salvate) {
    var s = salvate || {};
    return {
      righe: [Object.assign({}, RIGHE_RAPIDE.eur)],
      modoPeso: 'collo',
      rapporto: s.rapporto || 250,
      altezzaNs: s.altezzaNs || 240,
      modoTariffa: s.modoTariffa || 'kg',
      arrotonda: s.arrotonda != null ? s.arrotonda : 100,
      tariffa: s.tariffa != null ? s.tariffa : '',
      minimo: s.minimo != null ? s.minimo : ''
    };
  }

  // Tutti i calcoli del modulo, in un posto solo
  function calcolaTassato(t) {
    var rapporto = numero(t.rapporto) || 250;
    var altezzaNs = numero(t.altezzaNs) || 240;
    var tot = { colli: 0, reale: 0, volume: 0, incomplete: 0, nonSovrapp: 0 };
    var righe = t.righe.map(function (r) {
      var n = Math.floor(numero(r.n)), l = numero(r.l), p = numero(r.p), h = numero(r.h), peso = numero(r.peso);
      var completa = n > 0 && l > 0 && p > 0 && h > 0 && peso >= 0 && String(r.peso).trim() !== '';
      // Non sovrapponibile: si tassa come se occupasse l'altezza indicata (di norma 240 cm)
      var ns = r.impilabile === false;
      var hTassata = ns ? Math.max(h, numero(r.hNs) || altezzaNs) : h;
      if (ns && n > 0) tot.nonSovrapp += n;
      var vol = n > 0 && l > 0 && p > 0 && h > 0 ? n * l * p * hTassata / 1e6 : 0;
      var reale = n > 0 ? (t.modoPeso === 'totale' ? peso : peso * n) : 0;
      var pesoCollo = n > 0 ? (t.modoPeso === 'totale' ? peso / n : peso) : 0;
      if (!completa && (r.l !== '' || r.p !== '' || r.h !== '' || r.peso !== '')) tot.incomplete++;
      if (n > 0) tot.colli += n;
      tot.reale += reale; tot.volume += vol;
      return { completa: completa, volume: vol, reale: reale, volumetrico: vol * rapporto, pesoCollo: pesoCollo, n: n, l: l, p: p, h: h, ns: ns, hTassata: hTassata };
    });
    var volumetrico = tot.volume * rapporto;
    var tassato = Math.ceil(Math.max(tot.reale, volumetrico) - 1e-6);
    // Arrotondamento per eccesso del peso tassato (di norma ai 100 kg superiori)
    var passo = Math.max(0, Math.floor(numero(t.arrotonda)));
    var arrotondato = passo > 0 ? Math.ceil(tassato / passo) * passo : tassato;
    return {
      righe: righe, colli: tot.colli, incomplete: tot.incomplete, rapporto: rapporto, altezzaNs: altezzaNs, nonSovrapp: tot.nonSovrapp,
      reale: tot.reale, volume: tot.volume, volumetrico: volumetrico, tassato: tassato,
      sulVolume: volumetrico > tot.reale,
      passo: passo, arrotondato: arrotondato
    };
  }

  // Testo delle altezze tassate usate dai non sovrapponibili ("a 240 cm" o "a 200 e 240 cm")
  function altezzeNs(c) {
    var h = [];
    c.righe.forEach(function (x) { if (x.ns && x.n > 0 && h.indexOf(x.hTassata) < 0) h.push(x.hTassata); });
    h.sort(function (a, b) { return a - b; });
    if (!h.length) return '';
    return 'a ' + (h.length === 1 ? num(h[0]) : h.slice(0, -1).map(function (v) { return num(v); }).join(', ') + ' e ' + num(h[h.length - 1])) + ' cm';
  }

  // Righe nel formato del piano di carico
  function righePerCarico(t, c) {
    var out = [];
    t.righe.forEach(function (r, i) {
      var x = c.righe[i];
      if (!x.completa) return;
      out.push({
        nome: r.nome || 'Collo', lunghezza: x.l, larghezza: x.p, altezza: x.h,
        peso: Math.round(x.pesoCollo * 10) / 10, quantita: x.n, impilabile: !!r.impilabile, ruotabile: true
      });
    });
    return out;
  }

  function vistaTassato() {
    var admin = stato.utente.ruolo === 'admin';
    api('GET', '/api/impostazioni/tassato').catch(function () { return null; }).then(function (salvate) {
      if (!stato.tassato) stato.tassato = nuovoTassato(salvate);
      var t = stato.tassato;

      var main = guscio('tassato',
        '<div class="testata"><div><h1>Calcolatore</h1><p>Calcolo del volume reale, del peso tassato e dei metri lineari di una spedizione, con il prezzo da proporre al cliente. Inserisci i colli e i totali si aggiornano mentre scrivi.</p></div>' +
        '<div class="riga-azioni"><button class="btn btn-primario" id="t-foto">Leggi da foto</button><button class="btn" id="t-nuovo">Nuovo calcolo</button></div></div>' +
        '<section class="pannello foto-misure" id="t-foto-box" hidden></section>' +
        '<section class="pannello" id="t-tabella">' +
          '<div class="tassato-regole">' +
            '<label class="campo">1 m³ equivale a<span class="con-unita"><input type="number" min="1" step="1" id="t-rapporto" value="' + esc(t.rapporto) + '"><span>kg</span></span></label>' +
            '<label class="campo">Altezza tassata dei non sovrapponibili<span class="con-unita"><input type="number" min="50" step="1" id="t-altezzans" value="' + esc(t.altezzaNs) + '"><span>cm</span></span></label>' +
            '<label class="campo">Il peso che inserisci è<select id="t-modopeso"><option value="collo"' + (t.modoPeso === 'collo' ? ' selected' : '') + '>per singolo collo</option><option value="totale"' + (t.modoPeso === 'totale' ? ' selected' : '') + '>totale della riga</option></select></label>' +
          '</div>' +
          '<div class="tabella-scroll"><table class="tab-colli tab-tassato"><thead><tr>' +
            '<th>Descrizione</th><th class="num">Colli</th><th class="num">Lungh. cm</th><th class="num">Largh. cm</th><th class="num">Alt. cm</th>' +
            '<th class="num" id="t-intest-peso"></th><th title="Spunta se sopra questo collo non si può appoggiare nulla">Non sovrapp.</th><th class="num" title="Altezza usata per il volume dei colli non sovrapponibili">Alt. tassata</th>' +
            '<th class="num calcolato">Vol. tassabile m³</th><th class="num calcolato">Peso reale</th><th class="num calcolato">Peso volum.</th><th></th>' +
          '</tr></thead><tbody id="t-righe"></tbody></table></div>' +
          '<div class="aggiungi-colli">' +
            '<button class="btn btn-piccolo" data-rapida="eur">Aggiungi bancale EUR 120×80</button>' +
            '<button class="btn btn-piccolo" data-rapida="ind">Aggiungi bancale 120×100</button>' +
            '<button class="btn btn-piccolo" data-rapida="collo">Aggiungi collo</button>' +
            '<span class="nota">Invio sull’ultimo campo aggiunge una riga.</span>' +
          '</div>' +
        '</section>' +
        '<div class="tassato-cruscotto" id="t-cruscotto"></div>' +
        '<section class="pannello">' +
          '<h2>Prezzo</h2>' +
          '<div class="griglia-form" style="margin-top:14px">' +
            '<label class="campo">Tariffa<select id="t-modotariffa"><option value="kg"' + (t.modoTariffa === 'kg' ? ' selected' : '') + '>€ ogni 100 kg tassati</option><option value="ldm"' + (t.modoTariffa === 'ldm' ? ' selected' : '') + '>€ per metro lineare</option></select></label>' +
            '<label class="campo" id="campo-arrotonda">Arrotondamento peso<select id="t-arrotonda">' +
              [[100, 'ai 100 kg superiori'], [50, 'ai 50 kg superiori'], [10, 'ai 10 kg superiori'], [0, 'nessun arrotondamento']].map(function (o) {
                return '<option value="' + o[0] + '"' + (Number(t.arrotonda) === o[0] ? ' selected' : '') + '>' + o[1] + '</option>';
              }).join('') + '</select></label>' +
            '<label class="campo">Importo tariffa (€)<input type="number" min="0" step="0.01" id="t-tariffa" value="' + esc(t.tariffa) + '"></label>' +
            '<label class="campo">Prezzo minimo (€)<input type="number" min="0" step="0.01" id="t-minimo" value="' + esc(t.minimo) + '"></label>' +
          '</div>' +
          '<div id="t-prezzo" class="t-prezzo"></div>' +
          (admin ? '<button class="btn btn-piccolo" id="t-predefiniti" style="margin-top:14px">Usa questi valori come predefiniti</button>' : '') +
        '</section>' +
        '<div class="barra-calcolo tassato-azioni">' +
          '<button class="btn" id="t-copia">Copia riepilogo</button>' +
          (haFunzione('carico') ? '<button class="btn btn-primario" id="t-carico">Mostra sul piano di carico</button>' : '') +
        '</div>' +
        '<p class="errore" id="t-err"></p>');

      var tbody = main.querySelector('#t-righe');
      var ultimo = null, timerLdm = null, ldm = null, calcoloSegnalato = false;

      function disegnaRighe() {
        main.querySelector('#t-intest-peso').textContent = t.modoPeso === 'totale' ? 'Peso riga kg' : 'Peso collo kg';
        tbody.innerHTML = t.righe.map(function (r, i) {
          function cella(k, min, passo) {
            return '<td class="num"><input type="number" min="' + min + '" step="' + (passo || 1) + '" data-k="' + k + '" value="' + esc(r[k]) + '"></td>';
          }
          return '<tr data-i="' + i + '"' + (r.controlla ? ' class="da-controllare" title="Letta con difficoltà dalla foto: controlla i numeri"' : '') + '>' +
            '<td><input type="text" data-k="nome" value="' + esc(r.nome) + '" aria-label="Descrizione"></td>' +
            cella('n', 1) + cella('l', 1) + cella('p', 1) + cella('h', 1) + cella('peso', 0, 0.1) +
            '<td class="centro"><input type="checkbox" data-k="nonSovrapp"' + (r.impilabile === false ? ' checked' : '') + ' aria-label="Non sovrapponibile"></td>' +
            (r.impilabile === false
              ? '<td class="num"><input type="number" min="1" step="1" data-k="hNs" value="' + esc(r.hNs || '') + '" placeholder="' + esc(t.altezzaNs) + '" title="Lascia vuoto per usare ' + esc(t.altezzaNs) + ' cm"></td>'
              : '<td class="num nota">–</td>') +
            '<td class="num calcolato" data-c="volume"></td><td class="num calcolato" data-c="reale"></td><td class="num calcolato" data-c="volumetrico"></td>' +
            '<td><button class="btn-testo pericolo" data-togli="' + i + '"' + (t.righe.length === 1 ? ' disabled' : '') + '>Togli</button></td></tr>';
        }).join('');
        aggiorna();
      }

      function aggiorna() {
        var c = calcolaTassato(t);
        ultimo = c;
        if (!calcoloSegnalato && c.righe.some(function (x) { return x.completa; })) { calcoloSegnalato = true; traccia('calcolatore_calcolo'); }
        // valori per riga
        Array.prototype.forEach.call(tbody.children, function (tr, i) {
          var x = c.righe[i];
          tr.classList.toggle('incompleta', !x.completa && (t.righe[i].l !== '' || t.righe[i].peso !== ''));
          tr.querySelector('[data-c=volume]').textContent = x.volume ? num(x.volume, 3) : '–';
          tr.querySelector('[data-c=reale]').textContent = x.reale ? num(x.reale, 1) + ' kg' : '–';
          var v = tr.querySelector('[data-c=volumetrico]');
          v.textContent = x.volume ? num(x.volumetrico, 1) + ' kg' : '–';
          v.classList.toggle('prevale', x.volume > 0 && x.volumetrico > x.reale);
        });
        // cruscotto in cima
        main.querySelector('#t-cruscotto').innerHTML =
          '<div><span class="desc">Colli</span><b>' + num(c.colli) + '</b></div>' +
          '<div' + (!c.sulVolume && c.reale ? ' class="determina"' : '') + '><span class="desc">Peso reale</span><b>' + num(c.reale, 1) + ' kg</b></div>' +
          '<div><span class="desc">Volume tassabile</span><b>' + num(c.volume, 3) + ' m³</b>' + (c.nonSovrapp ? '<small>' + c.nonSovrapp + (c.nonSovrapp === 1 ? ' collo non sovrapponibile' : ' colli non sovrapponibili') + ' ' + altezzeNs(c) + '</small>' : '') + '</div>' +
          '<div' + (c.sulVolume ? ' class="determina"' : '') + '><span class="desc">Peso volumetrico <small>(×' + num(c.rapporto) + ')</small></span><b>' + num(c.volumetrico, 1) + ' kg</b></div>' +
          '<div class="principale"><span class="desc">Peso tassato</span><b>' + num(c.tassato) + ' kg</b><small>' + (c.colli ? (c.sulVolume ? 'calcolato sul volume' : 'calcolato sul peso reale') : '') + '</small>' +
            (c.colli && t.modoTariffa !== 'ldm' && c.passo && c.arrotondato !== c.tassato ? '<small class="arrotondato">Arrotondato: <b>' + num(c.arrotondato) + ' kg</b></small>' : '') + '</div>' +
          '<div id="t-ldm"><span class="desc">Metri lineari</span><b>' + (ldm ? ldm.testo : '–') + '</b><small>' + (ldm && ldm.nota ? ldm.nota : '') + '</small></div>';
        aggiornaPrezzo();
        pianificaLdm();
      }

      // I metri lineari si calcolano col vero algoritmo di carico: dopo una breve pausa di scrittura
      function pianificaLdm() {
        clearTimeout(timerLdm);
        var box = main.querySelector('#t-ldm b');
        if (box && ultimo.colli) box.classList.add('in-calcolo');
        timerLdm = setTimeout(calcolaLdm, 450);
      }
      function calcolaLdm() {
        var righe = righePerCarico(t, ultimo);
        if (!righe.length) { ldm = null; mostraLdm(); return; }
        try {
          var r = window.Stiva.pianificaCarico(VANO_LDM, righe);
          var st = r.statistiche;
          ldm = st.colliCaricati < st.colliTotali
            ? { metri: null, testo: 'oltre 13,60 m', nota: st.colliTotali - st.colliCaricati + ' colli non entrano in un bilico' }
            : { metri: st.metriLineari, testo: num(st.metriLineari, 2) + ' m', nota: 'su un bilico da 2,48 m di larghezza' };
        } catch (e) { ldm = { metri: null, testo: '–', nota: e.message }; }
        mostraLdm();
      }
      function mostraLdm() {
        var el = main.querySelector('#t-ldm');
        if (!el) return;
        el.innerHTML = '<span class="desc">Metri lineari</span><b>' + (ldm ? ldm.testo : '–') + '</b><small>' + (ldm && ldm.nota ? esc(ldm.nota) : '') + '</small>';
        aggiornaPrezzo();
      }

      function aggiornaPrezzo() {
        var box = main.querySelector('#t-prezzo'), c = ultimo;
        var tariffa = numero(t.tariffa), minimo = numero(t.minimo);
        if (!tariffa || !c.colli) { box.innerHTML = '<p class="nota">Inserisci la tariffa per vedere il prezzo.</p>'; t.prezzo = null; return; }
        var base, spiega;
        if (t.modoTariffa === 'ldm') {
          if (!ldm || ldm.metri == null) { box.innerHTML = '<p class="nota">In attesa dei metri lineari…</p>'; t.prezzo = null; return; }
          base = ldm.metri * tariffa;
          spiega = num(ldm.metri, 2) + ' m × ' + euro(tariffa) + ' al metro';
        } else {
          base = c.arrotondato / 100 * tariffa;
          spiega = (c.passo && c.arrotondato !== c.tassato
            ? num(c.tassato) + ' kg tassati, arrotondati a <b>' + num(c.arrotondato) + ' kg</b> (ai ' + num(c.passo) + ' kg superiori)<br>' + num(c.arrotondato) + ' kg'
            : num(c.arrotondato) + ' kg tassati') + ' × ' + euro(tariffa) + ' ogni 100 kg';
        }
        var prezzo = Math.max(base, minimo);
        t.prezzo = prezzo;
        box.innerHTML = '<div class="t-prezzo-riga"><span>' + spiega + ' = ' + euro(base) + (minimo && base < minimo ? '<br>Sotto il minimo: si applica il prezzo minimo di ' + euro(minimo) : '') + '</span>' +
          '<b>' + euro(prezzo) + '</b></div>' +
          '<p class="nota">Prezzo IVA esclusa. Pedaggi, supplementi e servizi accessori non sono compresi.</p>';
      }

      // --- eventi tabella ---
      tbody.addEventListener('input', function (e) {
        var k = e.target.dataset.k; if (!k) return;
        var r = t.righe[Number(e.target.closest('tr').dataset.i)];
        if (r.controlla) { r.controlla = false; e.target.closest('tr').classList.remove('da-controllare'); e.target.closest('tr').removeAttribute('title'); }
        if (k === 'nonSovrapp') { r.impilabile = !e.target.checked; disegnaRighe(); return; }
        r[k] = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
        aggiorna();
      });
      tbody.addEventListener('keydown', function (e) {
        if (e.key !== 'Enter' || !e.target.dataset.k) return;
        e.preventDefault();
        var tr = e.target.closest('tr'), campi = tr.querySelectorAll('input:not([type=checkbox])');
        var pos = Array.prototype.indexOf.call(campi, e.target);
        if (pos < campi.length - 1) { campi[pos + 1].focus(); campi[pos + 1].select(); return; }
        // ultimo campo: nuova riga con le stesse caratteristiche
        var r = t.righe[Number(tr.dataset.i)];
        t.righe.push({ nome: r.nome, n: 1, l: '', p: '', h: '', peso: '', impilabile: r.impilabile });
        disegnaRighe();
        tbody.lastElementChild.querySelector('[data-k=n]').select();
      });
      tbody.addEventListener('click', function (e) {
        var b = e.target.closest('[data-togli]'); if (!b) return;
        t.righe.splice(Number(b.dataset.togli), 1);
        disegnaRighe();
      });
      main.querySelectorAll('[data-rapida]').forEach(function (b) {
        b.onclick = function () {
          t.righe.push(Object.assign({}, RIGHE_RAPIDE[b.dataset.rapida]));
          disegnaRighe();
          var tr = tbody.lastElementChild;
          (tr.querySelector('[data-k=' + (b.dataset.rapida === 'collo' ? 'n' : 'h') + ']')).focus();
        };
      });

      // --- regole e prezzo ---
      main.querySelector('#t-rapporto').oninput = function () { t.rapporto = this.value; aggiorna(); };
      main.querySelector('#t-altezzans').oninput = function () {
        t.altezzaNs = this.value;
        tbody.querySelectorAll('[data-k=hNs]').forEach(function (i) { i.placeholder = t.altezzaNs; });
        aggiorna();
      };
      main.querySelector('#t-modopeso').onchange = function () { t.modoPeso = this.value; disegnaRighe(); };
      function mostraArrotonda() { main.querySelector('#campo-arrotonda').hidden = t.modoTariffa === 'ldm'; }
      main.querySelector('#t-modotariffa').onchange = function () { t.modoTariffa = this.value; mostraArrotonda(); aggiorna(); };
      main.querySelector('#t-arrotonda').onchange = function () { t.arrotonda = Number(this.value); aggiorna(); };
      mostraArrotonda();
      main.querySelector('#t-tariffa').oninput = function () { t.tariffa = this.value; aggiornaPrezzo(); };
      main.querySelector('#t-minimo').oninput = function () { t.minimo = this.value; aggiornaPrezzo(); };
      var pred = main.querySelector('#t-predefiniti');
      if (pred) pred.onclick = function () {
        api('PUT', '/api/impostazioni/tassato', { rapporto: numero(t.rapporto), altezzaNs: numero(t.altezzaNs), arrotonda: numero(t.arrotonda), modoTariffa: t.modoTariffa, tariffa: numero(t.tariffa), minimo: numero(t.minimo) })
          .then(function () { avvisa('Valori predefiniti salvati per tutta l’azienda'); })
          .catch(function (err) { avvisa(err.message); });
      };
      // --- misure da foto: dal telefono (QR code) o da un file sul computer ---
      var fotoBox = main.querySelector('#t-foto-box'), fotoCodice = null, fotoTimer = null, fotoAi = false, fotoLettura = false;
      function chiudiFoto() {
        clearInterval(fotoTimer); fotoTimer = null;
        if (fotoCodice) api('DELETE', '/api/foto/sessione/' + fotoCodice).catch(function () {});
        fotoCodice = null; fotoBox.hidden = true; fotoBox.innerHTML = '';
      }
      function statoTelefono(testo, classe) {
        var el = fotoBox.querySelector('#tf-stato');
        if (el) { el.textContent = testo; el.className = 'stato-telefono ' + (classe || ''); }
      }
      function nuovoCollegamento() {
        var qr = fotoBox.querySelector('#tf-qr');
        qr.innerHTML = '<span class="nota">Preparo il collegamento…</span>';
        statoTelefono('In attesa del telefono…');
        clearInterval(fotoTimer);
        return api('POST', '/api/foto/sessione').then(function (sess) {
          fotoCodice = sess.codice;
          var q = window.qrcode(0, 'M'); q.addData(sess.indirizzo); q.make();
          qr.innerHTML = q.createSvgTag({ cellSize: 5, margin: 2, scalable: true, alt: 'QR code per collegare il telefono' });
          fotoBox.querySelector('#tf-link').onclick = function (e) {
            e.preventDefault();
            if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(sess.indirizzo).then(function () { avvisa('Link copiato: mandalo al telefono'); }, function () { window.prompt('Copia questo link:', sess.indirizzo); });
            else window.prompt('Copia questo link:', sess.indirizzo);
          };
          fotoTimer = setInterval(controllaTelefono, 2000);
        }).catch(function (e) { qr.innerHTML = '<span class="errore">' + esc(e.message) + '</span>'; });
      }
      function controllaTelefono() {
        if (!document.body.contains(fotoBox) || !fotoCodice) { clearInterval(fotoTimer); return; }
        api('GET', '/api/foto/sessione/' + fotoCodice).then(function (r) {
          if (r.foto && r.foto.length) {
            var f = r.foto[r.foto.length - 1];
            statoTelefono('✓ Foto ricevuta dal telefono', 'ok');
            leggiFotoMisure(f.tipo, f.dati);
          } else if (r.telefono && !fotoLettura) statoTelefono('✓ Telefono collegato: scatta la foto e premi “Invia al computer”', 'ok');
        }).catch(function () {
          clearInterval(fotoTimer);
          statoTelefono('Collegamento scaduto.', 'errore');
          fotoBox.querySelector('#tf-qr').innerHTML = '<button class="btn" id="tf-rinnova">Nuovo QR code</button>';
          fotoBox.querySelector('#tf-rinnova').onclick = nuovoCollegamento;
        });
      }
      function immagineDaUrl(url) {
        return new Promise(function (ok, ko) {
          var img = new Image();
          img.onload = function () { ok(img); };
          img.onerror = function () { ko(new Error('Foto non leggibile.')); };
          img.src = url;
        });
      }
      function leggiFotoMisure(tipo, dati) {
        var box = fotoBox.querySelector('#tf-risultato'), url = 'data:' + tipo + ';base64,' + dati;
        var usaAi = fotoAi && fotoBox.querySelector('#tf-ai') && fotoBox.querySelector('#tf-ai').checked;
        fotoLettura = true;
        box.innerHTML = '<div class="foto-letta"><img src="' + url + '" alt="Foto del foglio misure"><div><h3>Leggo le misure…</h3><p class="nota" id="tf-avanz">' +
          (usaAi ? 'Lettura intelligente in corso, qualche secondo…' : 'Preparo la lettura…') + '</p></div></div>';
        box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        var avanza = function (testo) { var el = box.querySelector('#tf-avanz'); if (el) el.textContent = testo; };
        var lettura = usaAi
          ? api('POST', '/api/foto/leggi', { tipo: tipo, dati: dati }).then(function (r) { return { righe: r.righe }; })
          : immagineDaUrl(url).then(function (img) {
              // due letture: soglia unica (tabelle pulite) e soglia zona per zona (fondi grigi, luce storta)
              return leggiScansione(paginaFoto(img), avanza, { perLinea: true, cosa: 'foto', varianti: [{}, { adattiva: true }] });
            }).then(function (letture) { return window.Misure.migliore(letture); });
        lettura.then(function (ris) { fotoLettura = false; mostraMisureLette(url, ris.righe, usaAi, ris.totali); })
          .catch(function (e) {
            fotoLettura = false;
            box.innerHTML = '<p class="errore">Non sono riuscito a leggere la foto: ' + esc(e.message) + '</p>';
          });
      }
      function mostraMisureLette(url, righe, daAi, totali) {
        var box = fotoBox.querySelector('#tf-risultato');
        if (!righe.length) {
          box.innerHTML = '<div class="foto-letta"><img src="' + url + '" alt="Foto del foglio misure"><div><h3>Non ho trovato misure</h3>' +
            '<p>Cerco righe come “3 bancali 120x80x150 450 kg” oppure una tabella con le colonne Colli, Lunghezza, Larghezza, Altezza, Peso.</p>' +
            '<p class="nota">Rifai la foto più da vicino, dritta e con buona luce.' + (fotoAi ? ' Oppure prova la lettura intelligente.' : ' I fogli scritti a mano si leggono solo con la lettura intelligente.') + '</p></div></div>';
          return;
        }
        var colli = righe.reduce(function (a, r) { return a + (Number(r.n) || 0); }, 0);
        box.innerHTML = '<div class="foto-letta"><img src="' + url + '" alt="Foto del foglio misure"><div>' +
          '<h3>Trovate ' + righe.length + (righe.length === 1 ? ' riga' : ' righe') + ', ' + colli + ' colli</h3>' +
          (totali ? '<p class="controllo-totali">Confronto con la riga Totale del foglio: ' +
            (totali.colliOk == null ? '' : (totali.colliOk ? '<span class="ok">✓ colli ' + num(totali.colliLetti) + ' su ' + num(totali.colliFoglio) + '</span>' : '<span class="no">⚠ colli letti ' + num(totali.colliLetti) + ', sul foglio ' + num(totali.colliFoglio) + '</span>')) +
            (totali.pesoOk == null ? '' : ' · ' + (totali.pesoOk ? '<span class="ok">✓ peso ' + num(totali.pesoLetto, 1) + ' kg</span>' : '<span class="no">⚠ peso letto ' + num(totali.pesoLetto, 1) + ' kg, sul foglio ' + num(totali.pesoFoglio, 1) + ' kg</span>')) + '</p>' : '') +
          (daAi ? '' : '<p class="avviso-ocr">⚠ Controlla i numeri confrontandoli con la foto prima di usarli.' +
            (righe.filter(function (r) { return r.incompleta; }).length ? ' Le righe evidenziate sono state lette con difficoltà: guardale bene.' : '') + '</p>') +
          '<div class="tabella-scroll"><table class="tab-colli"><thead><tr><th>Descrizione</th><th class="num">Colli</th><th class="num">Lungh.</th><th class="num">Largh.</th><th class="num">Alt.</th><th class="num">Peso collo</th><th>Non sovrapp.</th></tr></thead><tbody>' +
          righe.map(function (r) {
            return '<tr' + (r.incompleta && !daAi ? ' class="da-controllare"' : '') + '><td>' + (r.incompleta && !daAi ? '⚠ ' : '') + esc(r.nome || '–') + '</td><td class="num">' + esc(r.n) + '</td><td class="num">' + esc(r.l) + '</td><td class="num">' + esc(r.p) + '</td><td class="num">' + esc(r.h) + '</td>' +
              '<td class="num">' + (r.peso !== '' ? esc(r.peso) + ' kg' : '–') + '</td><td>' + (r.impilabile === false ? 'Sì' : '') + '</td></tr>';
          }).join('') + '</tbody></table></div>' +
          '<div class="riga-azioni"><button class="btn btn-primario" id="tf-sostituisci">Usa queste righe</button><button class="btn" id="tf-aggiungi">Aggiungi alle righe già inserite</button><button class="btn-testo" id="tf-scarta">Scarta</button></div>' +
          '</div></div>';
        function inserisci(sostituisci) {
          var nuove = righe.map(function (r) {
            var n = Number(r.n) || 1, peso = r.peso === '' ? '' : Number(r.peso);
            if (peso !== '' && t.modoPeso === 'totale') peso = Math.round(peso * n * 10) / 10;
            return { nome: r.nome || 'Collo', n: n, l: r.l, p: r.p, h: r.h, peso: peso, impilabile: r.impilabile !== false, controlla: !!r.incompleta && !daAi };
          });
          var vuote = t.righe.every(function (r) { return r.h === '' && r.peso === ''; });
          t.righe = sostituisci || vuote ? nuove : t.righe.concat(nuove);
          traccia('calcolatore_foto');
          disegnaRighe();
          box.innerHTML = '<p class="esito-ok">✓ ' + nuove.length + (nuove.length === 1 ? ' riga inserita' : ' righe inserite') + ' nel calcolo. Controllale nella tabella qui sotto.</p>';
          main.querySelector('#t-tabella').scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        box.querySelector('#tf-sostituisci').onclick = function () { inserisci(true); };
        box.querySelector('#tf-aggiungi').onclick = function () { inserisci(false); };
        box.querySelector('#tf-scarta').onclick = function () { box.innerHTML = ''; };
      }
      main.querySelector('#t-foto').onclick = function () {
        if (!fotoBox.hidden) { chiudiFoto(); return; }
        fotoBox.hidden = false;
        fotoBox.innerHTML = '<p class="nota">Preparo il collegamento…</p>';
        api('GET', '/api/foto/stato').catch(function () { return { ai: false }; }).then(function (st) {
          fotoAi = !!st.ai;
          fotoBox.innerHTML =
            '<div class="testata-pannello"><h2>Leggi le misure da una foto</h2><button class="btn-testo" id="tf-chiudi">Chiudi</button></div>' +
            '<div class="foto-collega">' +
              '<div class="foto-qr" id="tf-qr"></div>' +
              '<div class="foto-istruzioni"><h3>Con il telefono</h3>' +
                '<ol class="passi"><li>Apri la fotocamera del telefono e inquadra questo codice.</li><li>Tocca il link che compare e fotografa il foglio delle misure.</li><li>Premi “Invia al computer”: le misure arrivano qui da sole.</li></ol>' +
                '<p class="stato-telefono" id="tf-stato">In attesa del telefono…</p>' +
                '<p class="nota">Dal telefono non serve accedere. Il codice vale 30 minuti. <a href="#" id="tf-link">Copia il link</a> per mandarlo con un messaggio.</p>' +
                '<h3 style="margin-top:18px">Oppure da questo computer</h3>' +
                '<label class="btn" style="cursor:pointer">Scegli una foto<input type="file" id="tf-file" accept="image/jpeg,image/png,image/webp" hidden></label>' +
                (fotoAi ? '<label class="spunta" style="margin-top:12px"><input type="checkbox" id="tf-ai" checked> Lettura intelligente (legge anche i fogli scritti a mano)</label>'
                  : '<p class="nota" style="margin-top:10px">Lettura gratuita: legge fogli stampati. Per i fogli scritti a mano serve la lettura intelligente.</p>') +
              '</div>' +
            '</div>' +
            '<div id="tf-risultato"></div>';
          fotoBox.querySelector('#tf-chiudi').onclick = chiudiFoto;
          fotoBox.querySelector('#tf-file').onchange = function () {
            var file = this.files[0]; this.value = '';
            if (!file) return;
            leggiFile(file, true).then(function (u) {
              var parti = String(u).split(',');
              leggiFotoMisure(file.type || 'image/jpeg', parti[1]);
            });
          };
          nuovoCollegamento();
        });
      };

      main.querySelector('#t-nuovo').onclick = function () {
        var vecchio = t;
        stato.tassato = nuovoTassato({ rapporto: vecchio.rapporto, altezzaNs: vecchio.altezzaNs, arrotonda: vecchio.arrotonda, modoTariffa: vecchio.modoTariffa, tariffa: vecchio.tariffa, minimo: vecchio.minimo });
        ldm = null;
        vistaTassato();
      };

      // --- riepilogo da incollare in un'email o in un messaggio ---
      main.querySelector('#t-copia').onclick = function () {
        var c = ultimo;
        if (!c.colli) { main.querySelector('#t-err').textContent = 'Inserisci almeno un collo.'; return; }
        var righe = t.righe.map(function (r, i) {
          var x = c.righe[i];
          if (!x.completa) return null;
          return '- ' + x.n + ' × ' + (r.nome || 'collo') + ' ' + x.l + '×' + x.p + '×' + x.h + ' cm, ' + num(x.reale, 1) + ' kg' +
            (x.ns ? ', non sovrapponibile (tassato a ' + num(x.hTassata) + ' cm)' : '');
        }).filter(Boolean);
        var testo = 'Spedizione: ' + num(c.colli) + ' colli\n' + righe.join('\n') + '\n' +
          'Peso reale: ' + num(c.reale, 1) + ' kg\nVolume tassabile: ' + num(c.volume, 3) + ' m³\n' +
          'Peso tassato: ' + num(c.tassato) + ' kg (1 m³ = ' + num(c.rapporto) + ' kg)\n' +
          (t.modoTariffa !== 'ldm' && c.passo && c.arrotondato !== c.tassato ? 'Peso tassato arrotondato: ' + num(c.arrotondato) + ' kg (ai ' + num(c.passo) + ' kg superiori)\n' : '') +
          (ldm && ldm.metri != null ? 'Metri lineari: ' + num(ldm.metri, 2) + ' m\n' : '') +
          (t.prezzo ? 'Prezzo: ' + euro(t.prezzo) + ' + IVA\n' : '');
        traccia('calcolatore_copia');
        var fatto = function () { avvisa('Riepilogo copiato: incollalo dove vuoi'); };
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(testo).then(fatto, function () { mostraTesto(testo); });
        else mostraTesto(testo);
      };
      function mostraTesto(testo) {
        dialogo({ titolo: 'Riepilogo', pulsante: 'Chiudi', testo: '<textarea class="testo-copia" rows="9" readonly>' + esc(testo) + '</textarea><p>Seleziona il testo e copialo.</p>' });
      }

      // --- porta i colli sul piano di carico ---
      var btnCarico = main.querySelector('#t-carico');
      if (btnCarico) btnCarico.onclick = function () {
        var err = main.querySelector('#t-err');
        err.textContent = '';
        var righe = righePerCarico(t, ultimo);
        if (!righe.length) { err.textContent = 'Completa almeno una riga con colli, misure e peso.'; return; }
        if (ultimo.incomplete) { err.textContent = 'Alcune righe sono incomplete (evidenziate): completale o toglile prima di proseguire.'; return; }
        stato.piano.righe = righe;
        stato.piano.risultato = null;
        stato.piano.automatico = true;
        traccia('calcolatore_carico');
        location.hash = '#/carico';
      };

      disegnaRighe();
    });
  }

  // ---------- Ottimizza giro (ritiri e consegne) ----------
  var pdfJsPronto = null;
  function caricaPdfJs() {
    if (window.pdfjsLib) return Promise.resolve(window.pdfjsLib);
    if (!pdfJsPronto) {
      pdfJsPronto = new Promise(function (ok, ko) {
        var s = document.createElement('script');
        s.src = '/lib/pdf.min.js';
        s.onload = function () { window.pdfjsLib.GlobalWorkerOptions.workerSrc = '/lib/pdf.worker.min.js'; ok(window.pdfjsLib); };
        s.onerror = function () { pdfJsPronto = null; ko(new Error('Impossibile caricare il lettore PDF.')); };
        document.head.appendChild(s);
      });
    }
    return pdfJsPronto;
  }
  // Lettura gratuita di scansioni e foto, fatta nel browser (nessun servizio esterno)
  var ocrPronto = null;
  function caricaOcr() {
    if (window.Tesseract) return Promise.resolve(window.Tesseract);
    if (!ocrPronto) {
      ocrPronto = new Promise(function (ok, ko) {
        var s = document.createElement('script');
        s.src = '/lib/ocr/tesseract.min.js';
        s.onload = function () { ok(window.Tesseract); };
        s.onerror = function () { ocrPronto = null; ko(new Error('Impossibile caricare il lettore delle scansioni.')); };
        document.head.appendChild(s);
      });
    }
    return ocrPronto;
  }
  function immagineDaFile(file) {
    return new Promise(function (ok, ko) {
      var url = URL.createObjectURL(file), img = new Image();
      img.onload = function () { ok(img); };
      img.onerror = function () { URL.revokeObjectURL(url); ko(new Error('Formato immagine non leggibile: usa una foto JPG o PNG.')); };
      img.src = url;
    });
  }
  // pagine: [{ disegna(canvas) -> Promise, larghezzaPt }]; avanzamento(testo)
  // opzioni.varianti: più modi di preparare l'immagine (es. [{}, { adattiva: true }]); ogni variante viene
  // letta e si restituisce un elenco di letture, una per variante. Senza varianti: una sola lettura.
  function leggiScansione(pagine, avanzamento, opzioni) {
    opzioni = opzioni || {};
    var varianti = opzioni.varianti || [{}], worker = null, letture = varianti.map(function () { return []; }), passo = 0;
    return caricaOcr().then(function (T) {
      avanzamento('Preparo il lettore (la prima volta scarica circa 5 MB)…');
      return T.createWorker('ita', 1, {
        workerPath: '/lib/ocr/worker.min.js', corePath: '/lib/ocr/', langPath: '/lib/ocr',
        logger: function (m) {
          if (m.status === 'recognizing text') avanzamento('Leggo la ' + (opzioni.cosa || 'scansione') +
            (pagine.length > 1 ? ', pagina ' + (paginaCorrente + 1) + ' di ' + pagine.length : '') +
            (varianti.length > 1 ? ' (lettura ' + (passo + 1) + ' di ' + varianti.length + ')' : '') + '… ' + Math.round(m.progress * 100) + '%');
        }
      });
    }).then(function (w) {
      worker = w;
      return w.setParameters({ tessedit_pageseg_mode: '6', preserve_interword_spaces: '1' });
    }).then(function () {
      return pagine.reduce(function (catena, pg, n) {
        return catena.then(function () {
          paginaCorrente = n;
          var canvas = document.createElement('canvas'), grigio, w, h;
          return pg.disegna(canvas).then(function () {
            var ctx = canvas.getContext('2d'); w = canvas.width; h = canvas.height;
            var px = ctx.getImageData(0, 0, w, h).data;
            grigio = new Uint8Array(w * h);
            for (var i = 0; i < w * h; i++) grigio[i] = (px[i * 4] * 3 + px[i * 4 + 1] * 6 + px[i * 4 + 2]) / 10;
            return varianti.reduce(function (c2, variante, iv) {
              return c2.then(function () {
                passo = iv;
                var ctx = canvas.getContext('2d'), dati = ctx.createImageData(w, h), d = dati.data;
                var pulita = window.Giro.pulisciImmagine(grigio, w, h, variante);
                for (var j = 0; j < w * h; j++) { d[j * 4] = d[j * 4 + 1] = d[j * 4 + 2] = pulita[j]; d[j * 4 + 3] = 255; }
                ctx.putImageData(dati, 0, 0);
                return worker.recognize(canvas, { rotateAuto: true }, { blocks: true }).then(function (r) {
                  var parole = [];
                  (r.data.blocks || []).forEach(function (b, bi) { (b.paragraphs || []).forEach(function (p, pi) { (p.lines || []).forEach(function (l, li) { (l.words || []).forEach(function (x) {
                    parole.push({ testo: x.text, conf: x.confidence, x0: x.bbox.x0, y0: x.bbox.y0, x1: x.bbox.x1, y1: x.bbox.y1, linea: bi + '.' + pi + '.' + li });
                  }); }); }); });
                  letture[iv] = letture[iv].concat(window.Giro.righeDaOcr(parole, w / pg.larghezzaPt, n + 1, opzioni));
                });
              });
            }, Promise.resolve());
          });
        });
      }, Promise.resolve());
    }).then(function () {
      worker.terminate();
      window._ultimaLetturaOcr = letture; // utile per capire cosa è stato letto
      return opzioni.varianti ? letture : letture[0];
    }, function (e) { if (worker) worker.terminate(); throw e; });
  }
  var paginaCorrente = 0;
  function paginePdf(pdf) {
    var pagine = [];
    for (var n = 1; n <= pdf.numPages; n++) (function (n) {
      var pg = { larghezzaPt: 842 };
      pg.disegna = function (canvas) {
        return pdf.getPage(n).then(function (pagina) {
          var v1 = pagina.getViewport({ scale: 1 });
          pg.larghezzaPt = v1.width;
          // circa 300-400 dpi: le scritte piccole dei borderò si leggono meglio
          var scala = Math.min(5, Math.max(2, 3400 / Math.max(v1.width, v1.height)));
          var v = pagina.getViewport({ scale: scala });
          canvas.width = Math.round(v.width); canvas.height = Math.round(v.height);
          var ctx = canvas.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
          return pagina.render({ canvasContext: ctx, viewport: v }).promise;
        });
      };
      pagine.push(pg);
    })(n);
    return pagine;
  }
  function paginaFoto(img) {
    var lato = Math.max(img.naturalWidth, img.naturalHeight);
    // le foto piccole vengono ingrandite, quelle enormi ridotte
    var scala = Math.min(2.5, Math.max(0.5, 3400 / lato));
    return [{
      larghezzaPt: img.naturalWidth >= img.naturalHeight ? 842 : 595,
      disegna: function (canvas) {
        canvas.width = Math.round(img.naturalWidth * scala); canvas.height = Math.round(img.naturalHeight * scala);
        var ctx = canvas.getContext('2d'); ctx.imageSmoothingQuality = 'high';
        ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(img.src);
        return Promise.resolve();
      }
    }];
  }

  function leggiFile(file, comeTesto) {
    return new Promise(function (ok, ko) {
      var r = new FileReader();
      r.onload = function () { ok(r.result); };
      r.onerror = function () { ko(new Error('Impossibile leggere il file.')); };
      if (comeTesto) r.readAsDataURL(file); else r.readAsArrayBuffer(file);
    });
  }
  function oraPiu(hhmm, minuti) {
    var p = String(hhmm || '07:30').split(':'), t = Number(p[0]) * 60 + Number(p[1]) + Math.round(minuti);
    return due(Math.floor(t / 60) % 24) + ':' + due(t % 60) + (t >= 1440 ? ' (+1 g)' : '');
  }
  function nuovaTappa(t) {
    return Object.assign({ tipo: '', nome: '', indirizzo: '', colli: '', peso: '', note: '', urgente: false, lat: null, lon: null, trovato: '' }, t || {});
  }
  // Cerca un indirizzo; se non lo trova prova con CAP e località (posizione approssimata)
  function trovaIndirizzo(testo) {
    // con comune (o CAP) si cerca solo dentro quel comune: mai una via omonima in un'altra città
    var parti = window.Giro.dividiIndirizzo(testo);
    if (parti.localita || parti.cap) {
      return api('GET', '/api/percorsi/trova?via=' + encodeURIComponent(parti.via) + '&localita=' + encodeURIComponent(parti.localita) +
        '&prov=' + encodeURIComponent(parti.prov) + '&cap=' + encodeURIComponent(parti.cap)).then(function (x) {
        if (!x) return null;
        return { lat: x.lat, lon: x.lon, nome: x.nome, trovato: x.precisione === 'comune' ? 'comune' : 'si' };
      });
    }
    return api('GET', '/api/percorsi/cerca?paese=it&solo=indirizzo&q=' + encodeURIComponent(testo)).then(function (r) {
      if (r.length) return { lat: r[0].lat, lon: r[0].lon, nome: r[0].nome, trovato: 'si' };
      var m = String(testo).match(/\b\d{5}\b[^,]*/);
      var comune = m ? m[0] : String(testo).split(',').slice(-1)[0];
      if (!comune || comune.trim() === String(testo).trim()) return null;
      return api('GET', '/api/percorsi/cerca?paese=it&solo=indirizzo&q=' + encodeURIComponent(comune.trim())).then(function (r2) {
        return r2.length ? { lat: r2[0].lat, lon: r2[0].lon, nome: r2[0].nome, trovato: 'comune' } : null;
      });
    });
  }
  function linkNavigatore(punti) {
    // Google Maps accetta un numero limitato di tappe per link: il giro viene diviso in parti
    var parti = [], passo = 9;
    for (var i = 0; i < punti.length - 1; i += passo) {
      var pezzo = punti.slice(i, Math.min(punti.length, i + passo + 1));
      var u = 'https://www.google.com/maps/dir/?api=1&travelmode=driving&origin=' + pezzo[0].lat + ',' + pezzo[0].lon +
        '&destination=' + pezzo[pezzo.length - 1].lat + ',' + pezzo[pezzo.length - 1].lon;
      if (pezzo.length > 2) u += '&waypoints=' + pezzo.slice(1, -1).map(function (p) { return p.lat + ',' + p.lon; }).join('%7C');
      parti.push({ url: u, da: i, a: i + pezzo.length - 1 });
    }
    return parti;
  }

  function vistaGiri() {
    Promise.all([
      caricaMezzi(),
      api('GET', '/api/impostazioni/giri').catch(function () { return null; }),
      api('GET', '/api/impostazioni/costi').catch(function () { return null; }),
      api('GET', '/api/giri/stato').catch(function () { return { ai: false }; })
    ]).then(function (r) {
      var mezzi = r[0].filter(function (m) { return !m.categoria || (CATEGORIE[m.categoria] && CATEGORIE[m.categoria].motore); });
      var imp = r[1] || {}, costi = r[2] || {}, servizio = r[3];
      var admin = stato.utente.ruolo === 'admin';
      if (!stato.giro) {
        stato.giro = {
          tappe: [], deposito: imp.deposito || null, depositoTesto: imp.deposito ? imp.deposito.nome : '',
          rientro: imp.rientro !== false, consegnePrima: !!imp.consegnePrima, sosta: imp.sosta != null ? imp.sosta : 15,
          partenza: imp.partenza || '07:30', mezzoId: mezzi[0] ? mezzi[0].id : null,
          gasolio: costi.gasolio || 1.65, risultato: null, testo: ''
        };
      }
      var g = stato.giro;
      function mezzoScelto() { return mezzi.filter(function (m) { return m.id === g.mezzoId; })[0] || null; }

      var main = guscio('giri',
        '<div class="testata"><div><h1>Ottimizza giro</h1><p>Carica la distinta di ritiri e consegne dell’autista: il programma trova l’ordine delle tappe con meno km, e quindi meno gasolio.</p></div>' +
        '<div class="riga-azioni no-stampa"><button class="btn" id="giro-nuovo">Nuovo giro</button></div></div>' +
        '<section class="pannello no-stampa"><h2>1. Carica la distinta</h2>' +
          '<div class="carica-distinta">' +
            '<div><label class="btn btn-scuro" style="cursor:pointer">Scegli PDF o foto<input type="file" id="giro-file" accept="application/pdf,image/jpeg,image/png,image/webp" hidden></label>' +
              (servizio.ai ? '<label class="spunta" style="margin-top:10px"><input type="checkbox" id="giro-ai" checked> Lettura intelligente (più precisa su scansioni e foto)</label>' : '<p class="nota" style="margin-top:8px">Legge i PDF creati da un programma e, con la lettura gratuita, anche scansioni e foto (più lente e da controllare).</p>') +
            '</div>' +
            '<div class="oppure">oppure</div>' +
            '<div><label class="campo">Scrivi o incolla le tappe, una per riga<textarea id="giro-testo" rows="4" placeholder="Consegna Rossi Srl, Via Roma 12, 52100 Arezzo&#10;Ritiro Bianchi, Via Senese 45, 53100 Siena">' + esc(g.testo) + '</textarea></label>' +
              '<button class="btn btn-piccolo" id="giro-leggi-testo" style="margin-top:8px">Leggi il testo</button></div>' +
          '</div>' +
          '<p class="nota" id="giro-stato-lettura" style="margin-top:12px"></p>' +
        '</section>' +
        '<section class="pannello no-stampa" id="giro-sez-tappe"></section>' +
        '<section class="pannello no-stampa"><h2>3. Impostazioni del giro</h2><div class="griglia-form" style="margin-top:14px">' +
          '<label class="campo" style="grid-column:span 2">Partenza (deposito)<input type="text" id="giro-deposito" value="' + esc(g.depositoTesto) + '" placeholder="Indirizzo del deposito, premi Invio per cercarlo"><span class="nota-campo" id="giro-deposito-trovato">' + (g.deposito ? '✓ ' + esc(g.deposito.nome) : '') + '</span></label>' +
          '<fieldset class="campo scelta-ordine"><legend>Come deve girare l\'autista?</legend>' +
            '<label><input type="radio" name="giro-ordine" value="libero"' + (!g.consegnePrima ? ' checked' : '') + '> <b>Tutto insieme</b>: consegne e ritiri mescolati, meno km possibili</label>' +
            '<label><input type="radio" name="giro-ordine" value="consegne"' + (g.consegnePrima ? ' checked' : '') + '> <b>Prima tutte le consegne</b>, poi i ritiri (il camion si svuota prima di ricaricare)</label>' +
          '</fieldset>' +
          '<label class="campo">Mezzo<select id="giro-mezzo"><option value="">Nessuno in particolare</option>' + mezzi.map(function (m) { return '<option value="' + m.id + '"' + (m.id === g.mezzoId ? ' selected' : '') + '>' + esc(nomeMezzo(m)) + '</option>'; }).join('') + '</select></label>' +
          '<label class="campo">Ora di partenza<input type="time" id="giro-partenza" value="' + esc(g.partenza) + '"></label>' +
          '<label class="campo">Sosta media per tappa (minuti)<input type="number" min="0" step="5" id="giro-sosta" value="' + esc(g.sosta) + '"></label>' +
          '<label class="campo">Gasolio (€/litro)<input type="number" min="0" step="0.01" id="giro-gasolio" value="' + esc(g.gasolio) + '"></label>' +
        '</div>' +
        '<label class="spunta" style="margin-top:14px"><input type="checkbox" id="giro-rientro"' + (g.rientro ? ' checked' : '') + '> Rientro al deposito a fine giro</label>' +
        (admin ? '<button class="btn btn-piccolo" id="giro-predefiniti" style="margin-top:14px">Usa questi valori come predefiniti</button>' : '') +
        '<div class="barra-calcolo"><p class="nota">Nella colonna “Ordine” puoi fissare le tappe da fare per 1ª, 2ª… e quelle da fare appena possibile (“Presto”): il resto lo ordina il programma.</p><button class="btn btn-primario" id="giro-ottimizza">Ottimizza il giro</button></div>' +
        '<p class="errore" id="giro-err"></p><p class="nota" id="giro-avanzamento"></p>' +
        '</section>' +
        '<div id="giro-risultato"></div>');

      // --- tappe ---
      var sez = main.querySelector('#giro-sez-tappe');
      function disegnaTappe() {
        var n = g.tappe.length;
        sez.innerHTML = '<div class="testa-grafico"><div><h2>2. Tappe' + (n ? ' (' + n + ')' : '') + '</h2><p class="nota">Controlla tipo e indirizzi: puoi correggere, aggiungere o togliere tappe. L’ordine qui è quello della distinta.</p></div></div>' +
          (n ? '<div class="tabella-scroll"><table class="tab-colli tab-giro"><thead><tr><th>N.</th><th title="Libero: lo decide il programma. 1ª, 2ª…: posizione fissa. Presto: subito dopo le tappe fisse">Ordine</th><th>Tipo</th><th>Cliente</th><th>Indirizzo</th><th class="num">Colli</th><th class="num">Peso</th><th>Note</th><th>Posizione</th><th></th></tr></thead><tbody>' +
            g.tappe.map(function (t, i) {
              var pos = t.trovato === 'si' ? '<span class="pos ok" title="' + esc(t.trovatoNome || '') + '">✓ trovata</span>'
                : t.trovato === 'comune' ? '<span class="pos approx" title="Trovato solo il comune: posizione approssimata">≈ solo comune</span>'
                : t.trovato === 'no' ? '<span class="pos no">✗ non trovata</span>' : '<span class="nota">da cercare</span>';
              return '<tr data-i="' + i + '"><td class="num">' + (i + 1) + '</td>' +
                '<td><select data-k="ordine" class="sel-ordine' + (t.ordineFisso || t.urgente ? ' fissato' : '') + '">' +
                  '<option value=""' + (!t.ordineFisso && !t.urgente ? ' selected' : '') + '>Libero</option>' +
                  g.tappe.map(function (_, k) { return '<option value="' + (k + 1) + '"' + (Number(t.ordineFisso) === k + 1 ? ' selected' : '') + '>' + (k + 1) + 'ª</option>'; }).join('') +
                  '<option value="presto"' + (!t.ordineFisso && t.urgente ? ' selected' : '') + '>Presto</option>' +
                '</select></td>' +
                '<td><select data-k="tipo"><option value=""' + (!t.tipo ? ' selected' : '') + '>–</option><option value="consegna"' + (t.tipo === 'consegna' ? ' selected' : '') + '>Consegna</option><option value="ritiro"' + (t.tipo === 'ritiro' ? ' selected' : '') + '>Ritiro</option></select></td>' +
                '<td><input type="text" data-k="nome" value="' + esc(t.nome) + '"></td>' +
                '<td><input type="text" data-k="indirizzo" class="campo-indirizzo" value="' + esc(t.indirizzo) + '"></td>' +
                '<td class="num"><input type="number" min="0" data-k="colli" value="' + esc(t.colli) + '"></td>' +
                '<td class="num"><input type="number" min="0" data-k="peso" value="' + esc(t.peso) + '"></td>' +
                '<td><input type="text" data-k="note" value="' + esc(t.note) + '"></td>' +
                '<td>' + pos + '</td><td><button class="btn-testo pericolo" data-togli="' + i + '">Togli</button></td></tr>';
            }).join('') + '</tbody></table></div>' : '<div class="esito-vuoto">Nessuna tappa: carica la distinta o scrivi le tappe qui sopra.</div>') +
          '<div class="aggiungi-colli"><button class="btn btn-piccolo" id="giro-aggiungi">Aggiungi tappa</button></div>';
        sez.querySelector('#giro-aggiungi').onclick = function () { g.tappe.push(nuovaTappa()); disegnaTappe(); sez.querySelector('tbody tr:last-child [data-k=nome]').focus(); };
      }
      sez.addEventListener('input', function (e) {
        var k = e.target.dataset.k; if (!k) return;
        var t = g.tappe[Number(e.target.closest('tr').dataset.i)];
        if (k === 'ordine') {
          var v = e.target.value;
          t.ordineFisso = /^\d+$/.test(v) ? Number(v) : null; t.urgente = v === 'presto';
          e.target.classList.toggle('fissato', !!v);
          return;
        }
        t[k] = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
        if (k === 'indirizzo') { t.lat = t.lon = null; t.trovato = ''; }
        g.risultato = null;
      });
      sez.addEventListener('click', function (e) {
        var b = e.target.closest('[data-togli]'); if (!b) return;
        g.tappe.splice(Number(b.dataset.togli), 1); g.risultato = null; disegnaTappe(); mostraRisultato();
      });

      // --- lettura della distinta ---
      var statoLettura = main.querySelector('#giro-stato-lettura');
      function caricaTappe(tappe, fonte, deposito) {
        if (!tappe.length) {
          statoLettura.innerHTML = '<span class="errore">Non ho riconosciuto nessuna tappa. ' + (fonte === 'pdf' ? (servizio.ai ? 'Prova con la lettura intelligente, o ' : '') + 'scrivi le tappe nel riquadro a destra.' : 'Scrivi una tappa per riga con via, CAP e località.') + '</span>';
          return;
        }
        g.tappe = tappe.map(nuovaTappa); g.risultato = null;
        if (deposito && !g.deposito && !g.depositoTesto) { g.depositoTesto = deposito; main.querySelector('#giro-deposito').value = deposito; }
        var senzaTipo = g.tappe.filter(function (t) { return !t.tipo; }).length;
        statoLettura.innerHTML = '✓ Lette <b>' + tappe.length + ' tappe</b>' + (senzaTipo ? ', ' + senzaTipo + ' senza tipo (ritiro o consegna): indicalo tu se serve' : '') + '. Controllale qui sotto.';
        traccia('giro_letto');
        disegnaTappe(); mostraRisultato();
        sez.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      main.querySelector('#giro-file').onchange = function () {
        var file = this.files[0]; this.value = '';
        if (!file) return;
        var ai = servizio.ai && main.querySelector('#giro-ai') && main.querySelector('#giro-ai').checked;
        statoLettura.textContent = ai ? 'Lettura intelligente in corso, può richiedere fino a un minuto…' : 'Leggo il PDF…';
        if (ai) {
          leggiFile(file, true).then(function (url) {
            return api('POST', '/api/giri/leggi', { tipo: file.type, dati: String(url).split(',')[1] });
          }).then(function (r2) { caricaTappe(r2.tappe, 'pdf', r2.deposito); })
            .catch(function (e) { statoLettura.innerHTML = '<span class="errore">' + esc(e.message) + '</span>'; });
          return;
        }
        function avanza(t) { statoLettura.textContent = t; }
        function daScansione(righe) {
          var ris = window.Giro.estraiTappe(righe).tappe;
          if (!ris.length) {
            statoLettura.innerHTML = '<span class="errore">Non riesco a trovare le tappe nella scansione. Prova con una scansione più nitida (almeno 300 dpi, foglio dritto e ben illuminato), oppure scrivi le tappe a mano.</span>';
            return;
          }
          caricaTappe(ris, 'pdf');
          statoLettura.innerHTML += '<br><span class="avviso-ocr">⚠ Letto da scansione: controlla bene nomi, indirizzi e pesi prima di ottimizzare.</span>';
        }
        function errore(e) { statoLettura.innerHTML = '<span class="errore">Non riesco a leggere il file: ' + esc(e.message) + '</span>'; }
        if (file.type !== 'application/pdf') {
          if (!/^image\//.test(file.type)) { errore(new Error('usa un PDF o una foto JPG/PNG.')); return; }
          avanza('Preparo la foto…');
          immagineDaFile(file).then(function (img) { return leggiScansione(paginaFoto(img), avanza); }).then(daScansione).catch(errore);
          return;
        }
        var documento;
        Promise.all([caricaPdfJs(), leggiFile(file)]).then(function (x) {
          return x[0].getDocument({ data: new Uint8Array(x[1]) }).promise;
        }).then(function (pdf) { documento = pdf; return window.Giro.righeDaPdf(pdf); }).then(function (righe) {
          if (righe.length) { caricaTappe(window.Giro.estraiTappe(righe).tappe, 'pdf'); return; }
          // nessun testo: è una scansione, si prova la lettura gratuita
          avanza('Il PDF è una scansione: provo a leggerlo, può richiedere un minuto…');
          return leggiScansione(paginePdf(documento), avanza).then(daScansione);
        }).catch(errore);
      };
      main.querySelector('#giro-testo').oninput = function () { g.testo = this.value; };
      main.querySelector('#giro-leggi-testo').onclick = function () {
        caricaTappe(window.Giro.estraiTappe(window.Giro.righeDaTesto(g.testo)).tappe, 'testo');
      };

      // --- impostazioni ---
      var campoDep = main.querySelector('#giro-deposito'), depTrovato = main.querySelector('#giro-deposito-trovato');
      function cercaDeposito() {
        var q = campoDep.value.trim();
        if (!q) return Promise.reject(new Error('Indica l’indirizzo del deposito di partenza.'));
        depTrovato.textContent = 'Cerco…';
        return trovaIndirizzo(q).then(function (x) {
          if (!x) { depTrovato.textContent = '✗ indirizzo non trovato'; throw new Error('Non trovo l’indirizzo del deposito: controllalo.'); }
          g.deposito = { nome: q, lat: x.lat, lon: x.lon }; g.depositoTesto = q;
          depTrovato.textContent = '✓ ' + x.nome;
          return g.deposito;
        });
      }
      campoDep.oninput = function () { g.depositoTesto = this.value; g.deposito = null; depTrovato.textContent = ''; g.risultato = null; };
      campoDep.onkeydown = function (e) { if (e.key === 'Enter') { e.preventDefault(); cercaDeposito().catch(function (er) { main.querySelector('#giro-err').textContent = er.message; }); } };
      main.querySelectorAll('[name=giro-ordine]').forEach(function (r) { r.onchange = function () { g.consegnePrima = this.value === 'consegne'; }; });
      main.querySelector('#giro-mezzo').onchange = function () { g.mezzoId = this.value ? Number(this.value) : null; };
      main.querySelector('#giro-partenza').onchange = function () { g.partenza = this.value; if (g.risultato) mostraRisultato(); };
      main.querySelector('#giro-sosta').oninput = function () { g.sosta = this.value; if (g.risultato) mostraRisultato(); };
      main.querySelector('#giro-gasolio').oninput = function () { g.gasolio = this.value; if (g.risultato) mostraRisultato(); };
      main.querySelector('#giro-rientro').onchange = function () { g.rientro = this.checked; };
      var pred = main.querySelector('#giro-predefiniti');
      if (pred) pred.onclick = function () {
        (g.deposito ? Promise.resolve(g.deposito) : (campoDep.value.trim() ? cercaDeposito() : Promise.resolve(null))).then(function () {
          return api('PUT', '/api/impostazioni/giri', { deposito: g.deposito, rientro: g.rientro, consegnePrima: g.consegnePrima, sosta: numero(g.sosta), partenza: g.partenza });
        }).then(function () { avvisa('Impostazioni del giro salvate per tutta l’azienda'); }).catch(function (e) { avvisa(e.message); });
      };
      main.querySelector('#giro-nuovo').onclick = function () { stato.giro = null; vistaGiri(); };

      // --- ottimizzazione ---
      var avanz = main.querySelector('#giro-avanzamento'), err = main.querySelector('#giro-err');
      main.querySelector('#giro-ottimizza').onclick = function () {
        var btn = this;
        err.textContent = '';
        g.tappe = g.tappe.filter(function (t) { return (t.indirizzo || '').trim(); });
        if (g.tappe.length < 2) { err.textContent = 'Servono almeno due tappe con l’indirizzo.'; disegnaTappe(); return; }
        if (g.tappe.length > 45) { err.textContent = 'Massimo 45 tappe per giro: dividi la distinta in due giri.'; return; }
        btn.disabled = true;
        var fatto = function () { btn.disabled = false; avanz.textContent = ''; };
        (g.deposito ? Promise.resolve(g.deposito) : cercaDeposito()).then(function () {
          // cerca gli indirizzi uno alla volta
          var daCercare = g.tappe.filter(function (t) { return t.lat == null; }), k = 0;
          return daCercare.reduce(function (catena, t) {
            return catena.then(function () {
              avanz.textContent = 'Cerco gli indirizzi sulla mappa: ' + (++k) + ' di ' + daCercare.length + '…';
              return trovaIndirizzo(t.indirizzo).then(function (x) {
                if (x) { t.lat = x.lat; t.lon = x.lon; t.trovato = x.trovato; t.trovatoNome = x.nome; } else t.trovato = 'no';
              }).catch(function () { t.trovato = 'no'; });
            });
          }, Promise.resolve());
        }).then(function () {
          disegnaTappe();
          var mancanti = g.tappe.filter(function (t) { return t.trovato === 'no'; });
          if (mancanti.length) throw new Error('Non trovo ' + mancanti.length + (mancanti.length === 1 ? ' indirizzo' : ' indirizzi') + ' (segnati con ✗): correggili e riprova.');
          avanz.textContent = 'Calcolo le distanze stradali tra le tappe…';
          var punti = [g.deposito].concat(g.tappe).map(function (p) { return { lat: p.lat, lon: p.lon }; });
          return api('POST', '/api/percorsi/matrice', { punti: punti });
        }).then(function (mat) {
          avanz.textContent = 'Cerco l’ordine migliore…';
          var usati = {};
          g.tappe.forEach(function (t, i) {
            if (!t.ordineFisso) return;
            if (usati[t.ordineFisso]) throw new Error('Le tappe ' + usati[t.ordineFisso] + ' e ' + (i + 1) + ' hanno tutte e due l’ordine ' + t.ordineFisso + 'ª: cambiane una.');
            usati[t.ordineFisso] = i + 1;
          });
          var ris = window.Giro.ottimizzaGiro(mat.km, { tappe: g.tappe, rientro: g.rientro, consegnePrima: g.consegnePrima });
          var seq = [0].concat(ris.ordine.map(function (i) { return i + 1; }));
          if (g.rientro) seq.push(0);
          var orig = [0]; g.tappe.forEach(function (t, i) { orig.push(i + 1); }); if (g.rientro) orig.push(0);
          function minuti(s) { var m = 0; for (var i = 1; i < s.length; i++) m += mat.minuti[s[i - 1]][s[i]]; return m; }
          g.risultato = {
            ordine: ris.ordine, km: ris.km, kmOriginale: ris.kmOriginale, metodo: ris.metodo, fonte: mat.fonte,
            tratte: seq.slice(1).map(function (b, i) { return { km: mat.km[seq[i]][b], minuti: mat.minuti[seq[i]][b] }; }),
            minutiGuida: minuti(seq), minutiOriginale: minuti(orig),
            rientro: g.rientro, consegnePrima: g.consegnePrima, linea: null
          };
          traccia('giro_ottimizzato');
          mostraRisultato();
          // linea del percorso sulla mappa (se non arriva, il risultato resta valido)
          var m = mezzoScelto();
          var puntiOrdinati = [g.deposito].concat(ris.ordine.map(function (i) { return g.tappe[i]; }));
          if (g.rientro) puntiOrdinati.push(g.deposito);
          return api('POST', '/api/percorsi/calcola', {
            punti: puntiOrdinati.map(function (p) { return { lat: p.lat, lon: p.lon }; }),
            mezzo: m ? { categoria: m.categoria, lunghezza: m.lunghezza, larghezza: m.larghezza, altezza: m.altezza } : null
          }).then(function (p) { if (g.risultato) { g.risultato.linea = p.linea; disegnaMappaGiro(); } }).catch(function () {});
        }).catch(function (e) { err.textContent = e.message; }).then(fatto);
      };

      // --- risultato ---
      var mappaGiro = null;
      function disegnaMappaGiro() {
        var el = main.querySelector('#giro-mappa'), R = g.risultato;
        if (!el || !window.L || !R) return;
        if (stato.mappa) { stato.mappa.remove(); stato.mappa = null; }
        mappaGiro = L.map(el); stato.mappa = mappaGiro;
        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' }).addTo(mappaGiro);
        var pts = [[g.deposito.lat, g.deposito.lon]];
        L.marker(pts[0], { icon: L.divIcon({ className: 'pin-mappa pin-deposito', html: '<span>D</span>', iconSize: [30, 30], iconAnchor: [15, 15] }) }).bindTooltip('Deposito').addTo(mappaGiro);
        R.ordine.forEach(function (idx, k) {
          var t = g.tappe[idx]; pts.push([t.lat, t.lon]);
          L.marker([t.lat, t.lon], { icon: L.divIcon({ className: 'pin-mappa' + (t.tipo === 'ritiro' ? ' pin-ritiro' : ''), html: '<span>' + (k + 1) + '</span>', iconSize: [30, 30], iconAnchor: [15, 15] }) })
            .bindTooltip((k + 1) + '. ' + (t.tipo ? (t.tipo === 'ritiro' ? 'Ritiro' : 'Consegna') + ' – ' : '') + (t.nome || t.indirizzo)).addTo(mappaGiro);
        });
        var linea = R.linea || (R.rientro ? pts.concat([pts[0]]) : pts);
        L.polyline(linea, { color: '#f5b800', weight: 8, opacity: 0.9 }).addTo(mappaGiro);
        L.polyline(linea, { color: '#1b1f24', weight: 3, dashArray: R.linea ? null : '6 6' }).addTo(mappaGiro);
        mappaGiro.fitBounds(L.latLngBounds(pts), { padding: [30, 30] });
      }
      function mostraRisultato() {
        var box = main.querySelector('#giro-risultato'), R = g.risultato;
        if (!R) { box.innerHTML = ''; if (stato.mappa) { stato.mappa.remove(); stato.mappa = null; } return; }
        var m = mezzoScelto();
        var consumo = m && m.consumo ? Number(m.consumo) : (numero(costi.consumo) || consumoTipico(m));
        var gas = numero(g.gasolio) || 1.65, sosta = numero(g.sosta);
        var fattore = R.fonte === 'auto' ? 1.2 : 1;   // i tempi del profilo auto vengono maggiorati per un camion
        var kmRisp = Math.max(0, R.kmOriginale - R.km), litri = kmRisp * consumo / 100;
        var tGuida = R.minutiGuida * fattore, tTot = tGuida + sosta * R.ordine.length;
        var t = 0, righe = R.ordine.map(function (idx, k) {
          var tp = g.tappe[idx], tr = R.tratte[k];
          t += tr.minuti * fattore;
          var arrivo = oraPiu(g.partenza, t);
          t += sosta;
          return '<tr><td class="num"><span class="ordine-num' + (tp.tipo === 'ritiro' ? ' ritiro' : '') + '">' + (k + 1) + '</span></td><td>' + arrivo + '</td>' +
            '<td>' + (tp.tipo ? '<span class="etichetta tipo-' + tp.tipo + '">' + (tp.tipo === 'ritiro' ? 'Ritiro' : 'Consegna') + '</span>' : '') + (tp.ordineFisso ? ' <span class="etichetta etichetta-fissa">' + tp.ordineFisso + 'ª fissa</span>' : tp.urgente ? ' <span class="etichetta rev-vicina">Presto</span>' : '') + '</td>' +
            '<td><b>' + esc(tp.nome || '–') + '</b><div class="nota">' + esc(tp.indirizzo) + (tp.trovato === 'comune' ? ' <span class="pos approx">≈ posizione approssimata</span>' : '') + '</div></td>' +
            '<td class="num">' + num(tr.km, 1) + ' km</td>' +
            '<td class="num">' + (tp.colli !== '' ? num(tp.colli) + ' colli' : '') + (tp.peso !== '' ? '<div class="nota">' + num(tp.peso) + ' kg</div>' : '') + '</td>' +
            '<td>' + esc(tp.note || '') + '</td><td class="num nota">n. ' + (idx + 1) + '</td></tr>';
        }).join('');
        var ultimo = R.tratte[R.tratte.length - 1];
        var fine = R.rientro ? oraPiu(g.partenza, t + ultimo.minuti * fattore) : oraPiu(g.partenza, t - sosta);
        var puntiNav = [g.deposito].concat(R.ordine.map(function (i) { return g.tappe[i]; }));
        if (R.rientro) puntiNav.push(g.deposito);
        var nav = linkNavigatore(puntiNav);
        box.innerHTML =
          '<div class="risultato"><div class="testata" style="margin-bottom:0"><div><h1>Giro ottimizzato</h1><p>' + R.ordine.length + ' tappe, partenza alle ' + esc(g.partenza) + ' da ' + esc(g.deposito.nome) + (R.consegnePrima ? '. Prima tutte le consegne, poi i ritiri' : '. Consegne e ritiri insieme') + '.</p></div>' +
          '<div class="riga-azioni no-stampa"><button class="btn" id="giro-copia">Copia elenco</button><button class="btn" id="giro-stampa">Stampa</button></div></div>' +
          '<div class="cruscotto cruscotto-viaggio">' +
            '<div class="evidenza"><div class="valore">' + num(R.km, 0) + ' km</div><div class="desc">giro ottimizzato' + (R.rientro ? ', con rientro' : '') + '</div></div>' +
            '<div><div class="valore">' + num(R.kmOriginale, 0) + ' km</div><div class="desc">nell’ordine della distinta</div></div>' +
            (R.km > R.kmOriginale + 0.5
              ? '<div><div class="valore">+' + num(R.km - R.kmOriginale, 0) + ' km</div><div class="desc">in più rispetto alla distinta, per rispettare l’ordine che hai scelto</div></div>' +
                '<div><div class="valore">' + euro((R.km - R.kmOriginale) * consumo / 100 * gas) + '</div><div class="desc">di gasolio in più (' + num((R.km - R.kmOriginale) * consumo / 100, 0) + ' litri a ' + num(consumo, 1) + ' l/100 km)</div></div>'
              : '<div><div class="valore">' + num(kmRisp, 0) + ' km</div><div class="desc">risparmiati (' + (R.kmOriginale ? num(kmRisp / R.kmOriginale * 100, 0) : 0) + '%)</div></div>' +
                '<div><div class="valore">' + euro(litri * gas) + '</div><div class="desc">di gasolio risparmiato (' + num(litri, 0) + ' litri a ' + num(consumo, 1) + ' l/100 km)</div></div>') +
            '<div><div class="valore">' + durata(tTot / 60) + '</div><div class="desc">guida ' + durata(tGuida / 60) + ' + soste; ' + (R.rientro ? 'rientro' : 'fine') + ' alle ' + fine + '</div></div>' +
          '</div>' +
          (kmRisp < 0.5 ? '<div class="avviso giallo">L’ordine della distinta era già il migliore possibile.</div>' : '') +
          '<div class="mappa" id="giro-mappa" style="height:420px;margin-bottom:18px"></div>' +
          '<div class="pannello tabella-scroll"><h3 style="margin-bottom:10px">Ordine delle tappe</h3><table class="tab-ordine"><thead><tr><th class="num">Ordine</th><th>Arrivo</th><th>Tipo</th><th>Cliente e indirizzo</th><th class="num">Dalla prec.</th><th class="num">Merce</th><th>Note</th><th class="num">Distinta</th></tr></thead><tbody>' +
            '<tr class="riga-deposito"><td class="num"><span class="ordine-num dep">D</span></td><td>' + esc(g.partenza) + '</td><td>Partenza</td><td><b>Deposito</b><div class="nota">' + esc(g.deposito.nome) + '</div></td><td></td><td></td><td></td><td></td></tr>' +
            righe +
            (R.rientro ? '<tr class="riga-deposito"><td class="num"><span class="ordine-num dep">D</span></td><td>' + fine + '</td><td>Rientro</td><td><b>Deposito</b></td><td class="num">' + num(ultimo.km, 1) + ' km</td><td></td><td></td><td></td></tr>' : '') +
          '</tbody></table></div>' +
          '<div class="pannello no-stampa"><h3>Navigatore</h3><p class="nota" style="margin:4px 0 12px">Apre il giro in Google Maps, sul telefono dell’autista o sul computer. Google accetta un numero limitato di tappe per volta, quindi i giri lunghi sono divisi in parti.</p><div class="riga-azioni">' +
            nav.map(function (p, i) { return '<a class="btn' + (i === 0 ? ' btn-primario' : '') + '" target="_blank" rel="noopener" href="' + p.url + '">' + (nav.length > 1 ? 'Parte ' + (i + 1) + ': ' + (p.da === 0 ? 'deposito' : 'tappa ' + p.da) + ' → ' + (p.a === puntiNav.length - 1 && R.rientro ? 'deposito' : 'tappa ' + p.a) : 'Apri in Google Maps') + '</a>'; }).join('') +
            (haFunzione('viaggi') ? '<button class="btn" id="giro-costi">Calcola i costi in Viaggi e costi</button>' : '') +
          '</div></div>' +
          '<p class="nota">' + (R.metodo === 'esatto' ? 'Con ' + R.ordine.length + ' tappe il programma ha provato tutte le combinazioni: questo è il giro più corto possibile.' : 'Con molte tappe il programma usa un metodo di ricerca molto accurato, ma non prova tutte le combinazioni.') +
          (R.fonte === 'auto' ? ' Distanze calcolate sulle strade per auto e tempi maggiorati del 20% per un camion: con la chiave OpenRouteService si usano le strade per camion.' : ' Distanze e tempi calcolati sulle strade per camion.') + ' Gli orari sono stime: non tengono conto di traffico, pause obbligatorie e orari di apertura.</p>' +
          '</div>';
        disegnaMappaGiro();
        box.querySelector('#giro-stampa').onclick = function () { window.print(); };
        box.querySelector('#giro-copia').onclick = function () {
          var tt = 0, testo = 'Giro del ' + new Date().toLocaleDateString('it-IT') + ' – partenza ' + g.partenza + ' da ' + g.deposito.nome + '\n' +
            R.ordine.map(function (idx, k) {
              var tp = g.tappe[idx]; tt += R.tratte[k].minuti * fattore; var ar = oraPiu(g.partenza, tt); tt += sosta;
              return (k + 1) + '. ' + ar + ' ' + (tp.tipo ? (tp.tipo === 'ritiro' ? 'RITIRO' : 'CONSEGNA') + ' ' : '') + (tp.nome ? tp.nome + ' – ' : '') + tp.indirizzo + (tp.note ? ' (' + tp.note + ')' : '');
            }).join('\n') + '\n' + (R.rientro ? 'Rientro al deposito verso le ' + fine + '\n' : '') + 'Totale ' + num(R.km, 0) + ' km';
          if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(testo).then(function () { avvisa('Elenco copiato: incollalo dove vuoi'); });
        };
        var bc = box.querySelector('#giro-costi');
        if (bc) bc.onclick = function () {
          var tappeV = [{ nome: g.deposito.nome, lat: g.deposito.lat, lon: g.deposito.lon }].concat(R.ordine.map(function (i) { var tp = g.tappe[i]; return { nome: (tp.nome ? tp.nome + ', ' : '') + tp.indirizzo, lat: tp.lat, lon: tp.lon }; }));
          stato.viaggio = null;
          location.hash = '#/viaggi';
          stato.viaggioDaGiro = { tappe: tappeV, ritorno: R.rientro, mezzoId: g.mezzoId };
        };
      }

      disegnaTappe();
      mostraRisultato();
    }).catch(errorePagina);
  }

  // ---------- Scadenze (revisioni) ----------
  function vistaScadenze() {
    caricaMezzi().then(function (tutti) {
      var mezzi = tutti.filter(function (m) { return m.proprieta !== 'padroncino'; });
      var padroncini = tutti.length - mezzi.length;
      var filtro = stato.filtroScadenze || 'tutte';
      var elenco = mezzi.map(function (m) { return { m: m, s: statoRevisione(m) }; });
      elenco.sort(function (a, b) {
        if (a.s.g === null && b.s.g === null) return a.m.nome.localeCompare(b.m.nome);
        if (a.s.g === null) return 1;
        if (b.s.g === null) return -1;
        return a.s.g - b.s.g;
      });
      var conta = { scaduta: 0, vicina: 0, ok: 0, nd: 0 };
      elenco.forEach(function (x) { conta[x.s.cls]++; });
      var visibili = elenco.filter(function (x) { return filtro === 'tutte' || x.s.cls === filtro; });
      var filtri = [['tutte', 'Tutte', elenco.length], ['scaduta', 'Scadute', conta.scaduta], ['vicina', 'Entro 30 giorni', conta.vicina], ['ok', 'In regola', conta.ok], ['nd', 'Da inserire', conta.nd]];

      var main = guscio('scadenze',
        '<div class="testata"><div><h1>Scadenze</h1><p>Le revisioni di tutti i mezzi della flotta, compresi trattori e rimorchi, ordinate per urgenza.</p></div>' +
        '<div class="riga-azioni no-stampa"><button class="btn" id="stampa">Stampa</button></div></div>' +
        (mezzi.length ?
          '<div class="filtri-scadenze no-stampa">' + filtri.map(function (f) {
            return '<button class="filtro filtro-' + f[0] + (f[0] === filtro ? ' attivo' : '') + '" data-filtro="' + f[0] + '"><b>' + f[2] + '</b> ' + f[1] + '</button>';
          }).join('') + '</div>' +
          '<div class="pannello tabella-scroll"><table class="tab-scadenze"><thead><tr><th>Stato</th><th>Mezzo</th><th>Targa</th><th>Ultima revisione</th><th>Officina</th><th>Scadenza</th><th class="no-stampa"></th></tr></thead><tbody>' +
          (visibili.length ? visibili.map(function (x) {
            var m = x.m, c = CATEGORIE[m.categoria] || { nome: '' };
            return '<tr class="riga-' + x.s.cls + '" data-id="' + m.id + '"><td><span class="etichetta rev-' + x.s.cls + '">' + x.s.testo + '</span></td>' +
              '<td><b>' + esc(m.nome) + '</b><div class="nota">' + c.nome + '</div></td><td>' + esc(m.targa || '') + '</td>' +
              '<td>' + dataIt(m.ultima_revisione) + '</td><td>' + esc(m.officina_revisione || '–') + '</td>' +
              '<td><b>' + dataIt(m.scadenza_revisione) + '</b></td>' +
              '<td class="num no-stampa"><button class="btn btn-piccolo" data-registra="' + m.id + '">Registra revisione</button></td></tr>';
          }).join('') : '<tr><td colspan="7" class="nota">Nessun mezzo in questo elenco.</td></tr>') +
          '</tbody></table></div>' +
          (padroncini ? '<p class="nota" style="margin-top:14px">' + (padroncini === 1 ? 'Un mezzo di padroncino non è incluso: la sua revisione non è gestita dall’azienda.' : padroncini + ' mezzi di padroncini non sono inclusi: la loro revisione non è gestita dall’azienda.') + '</p>' : '') +
          '<p class="nota" style="margin-top:6px">Mezzi pesanti e rimorchi oltre 3,5 t si revisionano ogni anno; i veicoli fino a 3,5 t dopo 4 anni dall’immatricolazione e poi ogni 2 anni. Fa sempre fede la carta di circolazione.</p>'
          : '<div class="vuoto"><h2>Nessun mezzo inserito</h2><p>Aggiungi i mezzi della flotta con la data di scadenza della revisione.</p><a class="btn btn-primario" href="#/mezzi">Aggiungi un mezzo</a></div>'));

      var st = main.querySelector('#stampa');
      if (st) st.onclick = function () { window.print(); };
      main.querySelectorAll('[data-filtro]').forEach(function (b) {
        b.onclick = function () { stato.filtroScadenze = b.dataset.filtro; vistaScadenze(); };
      });
      main.querySelectorAll('[data-registra]').forEach(function (b) {
        b.onclick = function () {
          var vecchio = main.querySelector('.riga-registra');
          if (vecchio) vecchio.remove();
          var m = mezzi.filter(function (x) { return x.id === Number(b.dataset.registra); })[0];
          var anni = (CATEGORIE[m.categoria] || { anni: 1 }).anni;
          var tr = document.createElement('tr');
          tr.className = 'riga-registra';
          tr.innerHTML = '<td colspan="7"><form class="griglia-form form-registra" novalidate>' +
            '<label class="campo">Revisione fatta il<input type="date" name="ultima_revisione" value="' + oggiIso() + '"></label>' +
            '<label class="campo" style="grid-column:span 2">Officina o centro<input type="text" name="officina_revisione" value="' + esc(m.officina_revisione || '') + '"></label>' +
            '<label class="campo">Nuova scadenza<input type="date" name="scadenza_revisione" value="' + aggiungiAnni(oggiIso(), anni) + '"></label>' +
            '<div class="campo" style="justify-content:flex-end"><div class="riga-azioni"><button class="btn btn-primario" type="submit">Salva</button><button class="btn" type="button" data-annulla>Annulla</button></div></div>' +
            '</form><p class="errore"></p></td>';
          b.closest('tr').after(tr);
          var f = tr.querySelector('form');
          f.elements.ultima_revisione.onchange = function () {
            if (this.value) f.elements.scadenza_revisione.value = aggiungiAnni(this.value, anni);
          };
          tr.querySelector('[data-annulla]').onclick = function () { tr.remove(); };
          f.onsubmit = function (e) {
            e.preventDefault();
            api('PATCH', '/api/mezzi/' + m.id + '/revisione', valoriForm(f)).then(function () {
              avvisa('Revisione registrata per ' + m.nome);
              vistaScadenze();
            }).catch(function (err) { tr.querySelector('.errore').textContent = err.message; });
          };
          f.elements.officina_revisione.focus();
        };
      });
    }).catch(errorePagina);
  }

  // ---------- Finestra di conferma riutilizzabile ----------
  // opz: titolo, testo (HTML), pulsante, pericolo, campo {etichetta, tipo, attr}, azione(valore) -> Promise
  function dialogo(opz) {
    return new Promise(function (fine) {
      var d = document.createElement('dialog');
      d.className = 'dialogo' + (opz.pericolo ? ' dialogo-pericolo' : '');
      d.innerHTML = '<form novalidate><h2>' + esc(opz.titolo) + '</h2><div class="dialogo-testo">' + (opz.testo || '') + '</div>' +
        (opz.campo ? '<label class="campo">' + esc(opz.campo.etichetta) + '<input name="valore" type="' + (opz.campo.tipo || 'text') + '" autocomplete="off" ' + (opz.campo.attr || '') + '></label>' : '') +
        '<p class="errore"></p><div class="riga-azioni"><button class="btn ' + (opz.pericolo ? 'btn-pericolo' : 'btn-primario') + '" type="submit">' + esc(opz.pulsante) + '</button>' +
        '<button class="btn" type="button" data-annulla>Annulla</button></div></form>';
      document.body.appendChild(d);
      var form = d.querySelector('form'), err = d.querySelector('.errore'), input = d.querySelector('input'), btn = d.querySelector('[type=submit]');
      var fatto = false;
      function chiudi(esito) { if (fatto) return; fatto = true; d.close(); d.remove(); fine(esito); }
      d.querySelector('[data-annulla]').onclick = function () { chiudi(false); };
      d.addEventListener('cancel', function (e) { e.preventDefault(); chiudi(false); });
      form.onsubmit = function (e) {
        e.preventDefault();
        var valore = input ? input.value.trim() : null;
        if (input && !valore) { err.textContent = 'Compila il campo per continuare.'; input.focus(); return; }
        err.textContent = '';
        btn.disabled = true;
        Promise.resolve(opz.azione ? opz.azione(valore) : null).then(function () { chiudi(true); }, function (e2) {
          err.textContent = e2.message;
          btn.disabled = false;
          if (input) { input.select(); input.focus(); }
        });
      };
      d.showModal();
      (input || d.querySelector('[data-annulla]')).focus();
    });
  }

  function nomeRuolo(r) { return r === 'admin' ? 'Titolare' : 'Operatore'; }

  // ---------- Utenti (titolare): sola lettura ----------
  function vistaUtenti() {
    api('GET', '/api/utenti').then(function (utenti) {
      guscio('utenti',
        '<div class="testata"><div><h1>Utenti</h1><p>Le persone della tua azienda che possono accedere al programma.</p></div></div>' +
        '<div class="pannello tabella-scroll"><table><thead><tr><th>Nome</th><th>Email</th><th>Ruolo</th><th>Stato</th></tr></thead><tbody>' +
        utenti.map(function (u) {
          var io = u.id === stato.utente.id;
          return '<tr class="' + (u.attivo ? '' : 'spento') + '"><td><b>' + esc(u.nome) + '</b>' + (io ? ' <span class="nota">(tu)</span>' : '') + '</td><td>' + esc(u.email) + '</td>' +
            '<td>' + nomeRuolo(u.ruolo) + '</td>' +
            '<td><span class="etichetta ' + (u.attivo ? 'ok' : 'no') + '">' + (u.attivo ? 'Attivo' : 'Sospeso') + '</span></td></tr>';
        }).join('') + '</tbody></table></div>' +
        '<p class="nota" style="margin-top:14px">Per aggiungere un utente, cambiargli ruolo o password, sospenderlo o eliminarlo contatta l’amministratore del programma.</p>');
    }).catch(errorePagina);
  }

  // ---------- Utenti di un'azienda cliente (super amministratore) ----------
  function vistaUtentiAzienda(aid) {
    api('GET', '/api/aziende/' + aid + '/utenti').then(function (r) {
      var az = r.azienda, utenti = r.utenti;
      var base = '/api/aziende/' + aid + '/utenti/';
      var main = guscio('aziende',
        '<div class="riga-azioni" style="margin-bottom:8px"><a class="btn-testo" href="#/aziende">Torna alle aziende clienti</a></div>' +
        '<div class="testata"><div><h1>' + esc(az.nome) + '</h1><p>Utenti dell’azienda' + (az.attiva ? '' : '. <b>L’azienda è sospesa</b>: nessun utente può accedere finché non la riattivi') + '.</p></div></div>' +
        (utenti.length ?
          '<div class="pannello tabella-scroll"><table><thead><tr><th>Nome</th><th>Email</th><th>Ruolo</th><th>Stato</th><th class="num">Piani</th><th class="num">Viaggi</th><th>Creato</th><th></th></tr></thead><tbody>' +
          utenti.map(function (u) {
            return '<tr class="' + (u.attivo ? '' : 'spento') + '"><td><b>' + esc(u.nome) + '</b></td><td>' + esc(u.email) + '</td>' +
              '<td>' + nomeRuolo(u.ruolo) + '</td>' +
              '<td><span class="etichetta ' + (u.attivo ? 'ok' : 'no') + '">' + (u.attivo ? 'Attivo' : 'Sospeso') + '</span></td>' +
              '<td class="num">' + u.piani + '</td><td class="num">' + u.viaggi + '</td><td>' + data(u.creato_il) + '</td>' +
              '<td class="num azioni-utente">' +
                '<button class="btn-testo" data-ruolo="' + u.id + '">' + (u.ruolo === 'admin' ? 'Rendi operatore' : 'Rendi titolare') + '</button>' +
                '<button class="btn-testo" data-pw="' + u.id + '">Nuova password</button>' +
                '<button class="btn-testo" data-sosp="' + u.id + '">' + (u.attivo ? 'Sospendi' : 'Riattiva') + '</button>' +
                '<button class="btn-testo pericolo" data-elimina="' + u.id + '">Elimina</button>' +
              '</td></tr>';
          }).join('') + '</tbody></table></div>'
          : '<div class="vuoto"><h2>Nessun utente</h2><p>Aggiungi il primo utente dell’azienda.</p></div>') +
        '<form class="pannello" id="form-utente" novalidate><h2 style="margin-bottom:6px">Nuovo utente</h2>' +
        '<p class="nota" style="margin-bottom:16px">Il titolare gestisce mezzi, piani e viaggi e vede l’elenco degli utenti. L’operatore calcola e salva piani e viaggi. Comunica tu le credenziali: al primo accesso l’utente potrà cambiare la password.</p><div class="griglia-form">' +
          '<label class="campo">Nome<input type="text" name="nome"></label>' +
          '<label class="campo">Email<input type="email" name="email"></label>' +
          '<label class="campo">Password iniziale<input type="text" name="password" placeholder="almeno 8 caratteri"></label>' +
          '<label class="campo">Ruolo<select name="ruolo"><option value="operatore">Operatore</option><option value="admin">Titolare</option></select></label>' +
        '</div><p class="errore" id="err"></p><button class="btn btn-primario" type="submit">Aggiungi utente</button></form>');

      function trova(id) { return utenti.filter(function (u) { return u.id === Number(id); })[0]; }
      function ricarica() { vistaUtentiAzienda(aid); }

      main.querySelector('#form-utente').onsubmit = function (e) {
        e.preventDefault();
        api('POST', '/api/aziende/' + aid + '/utenti', valoriForm(this)).then(function () { avvisa('Utente aggiunto'); ricarica(); })
          .catch(function (err) { main.querySelector('#err').textContent = err.message; });
      };
      main.querySelectorAll('[data-ruolo]').forEach(function (b) {
        b.onclick = function () {
          var u = trova(b.dataset.ruolo), nuovo = u.ruolo === 'admin' ? 'operatore' : 'admin';
          api('PATCH', base + u.id, { ruolo: nuovo }).then(function () { avvisa(u.nome + ' ora è ' + nomeRuolo(nuovo).toLowerCase()); ricarica(); })
            .catch(function (err) { avvisa(err.message); });
        };
      });
      main.querySelectorAll('[data-pw]').forEach(function (b) {
        b.onclick = function () {
          var u = trova(b.dataset.pw);
          dialogo({
            titolo: 'Nuova password', pulsante: 'Imposta password',
            testo: '<p>Imposta una nuova password per <b>' + esc(u.nome) + '</b> (' + esc(u.email) + '). Comunicagliela tu: potrà cambiarla da “Il mio account”.</p>',
            campo: { etichetta: 'Nuova password (almeno 8 caratteri)', tipo: 'text' },
            azione: function (pw) { return api('PATCH', base + u.id, { password: pw }); }
          }).then(function (ok) { if (ok) avvisa('Password aggiornata per ' + u.nome); });
        };
      });
      main.querySelectorAll('[data-sosp]').forEach(function (b) {
        b.onclick = function () {
          var u = trova(b.dataset.sosp);
          if (!u.attivo) {
            api('PATCH', base + u.id, { attivo: true }).then(function () { avvisa(u.nome + ' riattivato'); ricarica(); }).catch(function (err) { avvisa(err.message); });
            return;
          }
          dialogo({
            titolo: 'Sospendere l’utente?', pulsante: 'Sospendi',
            testo: '<p><b>' + esc(u.nome) + '</b> (' + esc(u.email) + ') non potrà più accedere, anche se è già collegato. I suoi dati restano salvati e puoi riattivarlo quando vuoi.</p>',
            azione: function () { return api('PATCH', base + u.id, { attivo: false }); }
          }).then(function (ok) { if (ok) { avvisa(u.nome + ' sospeso'); ricarica(); } });
        };
      });
      main.querySelectorAll('[data-elimina]').forEach(function (b) {
        b.onclick = function () {
          var u = trova(b.dataset.elimina);
          dialogo({
            titolo: 'Eliminare l’utente?', pulsante: 'Elimina definitivamente', pericolo: true,
            testo: '<p>Stai per eliminare <b>' + esc(u.nome) + '</b> (' + esc(u.email) + ') da ' + esc(az.nome) + '. Non potrà più accedere e l’operazione <b>non si può annullare</b>.</p>' +
              ((u.piani || u.viaggi) ? '<p>I suoi ' + u.piani + ' piani e ' + u.viaggi + ' viaggi salvati restano all’azienda, senza autore.</p>' : '') +
              '<p>Se vuoi solo bloccarlo per un periodo, usa “Sospendi”.</p>',
            campo: { etichetta: 'Chiave di conferma', tipo: 'password', attr: 'inputmode="numeric"' },
            azione: function (chiave) { return api('DELETE', base + u.id, { chiave: chiave }); }
          }).then(function (ok) { if (ok) { avvisa(u.nome + ' eliminato'); ricarica(); } });
        };
      });
    }).catch(errorePagina);
  }

  // ---------- Aziende (super amministratore) ----------
  function vistaAziende() {
    api('GET', '/api/aziende').then(function (risp) {
      var aziende = risp.aziende, funzioni = risp.funzioni;
      var attive = aziende.filter(function (a) { return a.attiva; }).length;
      var main = guscio('aziende',
        '<div class="testata"><div><h1>Aziende clienti</h1><p>' + aziende.length + ' aziende, di cui ' + attive + ' attive. Ogni azienda vede solo i propri mezzi, piani e utenti.</p></div></div>' +
        (aziende.length ? '<div class="pannello tabella-scroll"><table><thead><tr><th>Azienda</th><th>Titolare</th><th class="num">Utenti</th><th class="num">Mezzi</th><th class="num">Piani</th><th>Funzioni attive</th><th>Dal</th><th>Stato</th><th></th></tr></thead><tbody>' +
          aziende.map(function (a) {
            return '<tr class="' + (a.attiva ? '' : 'spento') + '"><td><a href="#/aziende/' + a.id + '"><b>' + esc(a.nome) + '</b></a></td><td>' + esc(a.email_titolare || '') + '</td>' +
              '<td class="num"><a href="#/aziende/' + a.id + '">' + a.utenti + '</a></td><td class="num">' + a.mezzi + '</td><td class="num">' + a.piani + '</td>' +
              '<td class="funzioni-azienda">' + funzioni.map(function (f) {
                return '<label class="spunta"><input type="checkbox" data-fz="' + a.id + '" data-id="' + f.id + '"' + (a.funzioni[f.id] ? ' checked' : '') + '> ' + esc(f.nome) + '</label>';
              }).join('') + '</td><td>' + data(a.creata_il) + '</td>' +
              '<td><span class="etichetta ' + (a.attiva ? 'ok' : 'no') + '">' + (a.attiva ? 'Attiva' : 'Sospesa') + '</span></td>' +
              '<td class="num" style="white-space:nowrap"><a class="btn-testo" href="#/aziende/' + a.id + '">Utenti</a><button class="btn-testo ' + (a.attiva ? 'pericolo' : '') + '" data-az="' + a.id + '" data-attiva="' + a.attiva + '">' + (a.attiva ? 'Sospendi' : 'Riattiva') + '</button></td></tr>';
          }).join('') + '</tbody></table></div>' : '') +
        '<form class="pannello" id="form-azienda" novalidate><h2 style="margin-bottom:6px">Nuova azienda cliente</h2>' +
        '<p class="nota" style="margin-bottom:16px">Crei l’azienda e il suo titolare. Comunica tu le credenziali al cliente: al primo accesso potrà cambiare la password.</p><div class="griglia-form">' +
          '<label class="campo" style="grid-column:span 2">Nome azienda<input type="text" name="nome"></label>' +
          '<label class="campo">Nome titolare<input type="text" name="titolareNome"></label>' +
          '<label class="campo">Email titolare<input type="email" name="titolareEmail"></label>' +
          '<label class="campo">Password iniziale<input type="text" name="titolarePassword" placeholder="almeno 8 caratteri"></label>' +
        '</div><p class="errore" id="err"></p><button class="btn btn-primario" type="submit">Crea azienda</button></form>');
      main.querySelector('#form-azienda').onsubmit = function (e) {
        e.preventDefault();
        api('POST', '/api/aziende', valoriForm(this)).then(function () { avvisa('Azienda creata'); vistaAziende(); })
          .catch(function (err) { main.querySelector('#err').textContent = err.message; });
      };
      main.querySelectorAll('[data-fz]').forEach(function (c) {
        c.onchange = function () {
          var f = {}; f[c.dataset.id] = c.checked;
          api('PATCH', '/api/aziende/' + c.dataset.fz, { funzioni: f })
            .then(function () { avvisa(c.checked ? 'Funzione attivata' : 'Funzione disattivata'); })
            .catch(function (err) { avvisa(err.message); c.checked = !c.checked; });
        };
      });
      main.querySelectorAll('[data-az]').forEach(function (b) {
        b.onclick = function () {
          var attiva = b.dataset.attiva === 'true';
          if (attiva && !confirm('Sospendere l’azienda? I suoi utenti non potranno più accedere finché non la riattivi. I dati restano salvati.')) return;
          api('PATCH', '/api/aziende/' + b.dataset.az, { attiva: !attiva }).then(vistaAziende).catch(function (err) { avvisa(err.message); });
        };
      });
    }).catch(errorePagina);
  }

  // ---------- Backup (super amministratore) ----------
  var NOMI_TABELLE = [['aziende', 'Aziende'], ['utenti', 'Utenti'], ['mezzi', 'Mezzi'], ['complessi', 'Complessi veicolari'], ['colli_salvati', 'Colli salvati'], ['piani', 'Piani di carico'], ['viaggi', 'Viaggi'], ['attivita', 'Registro attività']];

  function dataOra(iso) {
    var d = new Date(iso);
    return d.toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' }) + ' alle ' + d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
  }

  function vistaBackup() {
    api('GET', '/api/backup/riepilogo').then(function (r) {
      var main = guscio('backup',
        '<div class="testata"><div><h1>Backup</h1><p>Scarica una copia completa dei dati di tutte le aziende e, in caso di problemi, ripristinala.</p></div></div>' +
        '<section class="pannello">' +
          '<h2>Scarica backup</h2>' +
          '<p class="nota" style="margin:6px 0 16px">Un unico file con tutti i dati presenti oggi nel programma. Database attuale: ' + esc(r.dimensione) + '.</p>' +
          '<div class="conteggi">' + NOMI_TABELLE.map(function (t) { return '<div><b>' + num(r.conta[t[0]] || 0) + '</b><span>' + t[1] + '</span></div>'; }).join('') + '</div>' +
          '<div class="riga-azioni" style="margin-top:18px"><a class="btn btn-primario" id="scarica" href="/api/backup" download>Scarica backup completo</a></div>' +
          '<p class="nota" style="margin-top:14px">Il file contiene i dati di tutti i clienti e le password (cifrate): conservalo in un posto sicuro, per esempio in una cartella protetta sul tuo computer e in una copia su un disco esterno o un cloud personale. Consiglio: scaricane uno a settimana e prima di ogni aggiornamento importante.</p>' +
        '</section>' +
        '<section class="pannello">' +
          '<h2>Ripristina da backup</h2>' +
          '<p class="nota" style="margin:6px 0 16px">Scegli un file di backup: prima di ripristinare vedrai cosa contiene.</p>' +
          '<label class="btn" style="cursor:pointer">Scegli file di backup<input type="file" id="file-backup" accept=".json,application/json" hidden></label>' +
          '<p class="errore" id="err-file"></p>' +
          '<div id="anteprima"></div>' +
        '</section>');

      main.querySelector('#scarica').onclick = function () {
        avvisa('Preparo il backup, il download parte tra qualche secondo');
      };

      main.querySelector('#file-backup').onchange = function () {
        var file = this.files[0], err = main.querySelector('#err-file'), box = main.querySelector('#anteprima');
        err.textContent = ''; box.innerHTML = '';
        if (!file) return;
        var lettore = new FileReader();
        lettore.onload = function () {
          var b;
          try { b = JSON.parse(lettore.result); } catch (e) { err.textContent = 'Il file non è leggibile: non è un backup di Stiva.'; return; }
          if (!b || b.formato !== 'stiva-backup' || !b.tabelle) { err.textContent = 'Il file non è un backup di Stiva.'; return; }
          var aziende = b.tabelle.aziende || [];
          box.innerHTML =
            '<div class="anteprima-backup">' +
              '<h3>Backup del ' + esc(dataOra(b.creato_il)) + '</h3>' +
              '<p class="nota">File: ' + esc(file.name) + (b.creato_da ? ', scaricato da ' + esc(b.creato_da) : '') + '</p>' +
              '<table class="confronto"><thead><tr><th></th><th class="num">Nel file</th><th class="num">Oggi nel programma</th></tr></thead><tbody>' +
                NOMI_TABELLE.map(function (t) {
                  var f = (b.tabelle[t[0]] || []).length, o = r.conta[t[0]] || 0;
                  return '<tr><td>' + t[1] + '</td><td class="num"><b>' + num(f) + '</b></td><td class="num' + (o > f ? ' in-meno' : '') + '">' + num(o) + '</td></tr>';
                }).join('') +
              '</tbody></table>' +
              (aziende.length ? '<p class="nota" style="margin-top:12px">Aziende nel file: ' + aziende.map(function (a) { return esc(a.nome); }).join(', ') + '.</p>' : '') +
              '<div class="avviso" style="margin-top:16px"><b>Attenzione:</b> il ripristino sostituisce <b>tutti</b> i dati attuali di <b>tutte</b> le aziende con quelli del file. Tutto ciò che è stato inserito dopo il ' + esc(dataOra(b.creato_il)) + ' andrà perso. Se non sei sicuro, scarica prima un backup dello stato attuale.</div>' +
              '<div class="riga-azioni"><button class="btn btn-pericolo" id="ripristina">Ripristina questo backup</button></div>' +
            '</div>';
          box.querySelector('#ripristina').onclick = function () {
            dialogo({
              titolo: 'Ripristinare il backup?', pulsante: 'Ripristina tutti i dati', pericolo: true,
              testo: '<p>Tutti i dati attuali verranno sostituiti con quelli del backup del <b>' + esc(dataOra(b.creato_il)) + '</b>. L’operazione non si può annullare.</p>' +
                '<p>Durante il ripristino gli utenti collegati potrebbero dover rientrare.</p>',
              campo: { etichetta: 'Chiave di conferma', tipo: 'password', attr: 'inputmode="numeric"' },
              azione: function (chiave) { return api('POST', '/api/backup/ripristina', { chiave: chiave, backup: b }); }
            }).then(function (ok) {
              if (!ok) return;
              avvisa('Ripristino completato');
              // La sessione potrebbe essere cambiata: ricarico il programma
              setTimeout(function () { location.hash = '#/backup'; location.reload(); }, 1200);
            });
          };
        };
        lettore.onerror = function () { err.textContent = 'Impossibile leggere il file.'; };
        lettore.readAsText(file);
      };
    }).catch(errorePagina);
  }

  // ---------- Statistiche di utilizzo (solo super amministratore) ----------
  var PERIODI_STAT = [[7, '7 giorni'], [30, '30 giorni'], [90, '90 giorni'], [365, '12 mesi']];
  var METRICHE = [['azioni', 'Operazioni'], ['accessi', 'Accessi'], ['utenti', 'Utenti attivi'], ['aziende', 'Aziende attive']];
  var SEMAFORO = {
    attiva: { testo: 'Attiva', simbolo: '●', ordine: 3 },
    calo: { testo: 'In calo', simbolo: '▲', ordine: 2 },
    ferma: { testo: 'Ferma', simbolo: '■', ordine: 1 },
    sospesa: { testo: 'Sospesa', simbolo: '–', ordine: 4 }
  };

  function quando(iso) {
    if (!iso) return 'mai';
    var d = new Date(iso), oggi = new Date();
    var g0 = new Date(oggi.getFullYear(), oggi.getMonth(), oggi.getDate());
    var gd = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    var diff = Math.round((g0 - gd) / 86400000);
    var ora = d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
    if (diff === 0) return 'oggi alle ' + ora;
    if (diff === 1) return 'ieri alle ' + ora;
    if (diff < 7) return diff + ' giorni fa';
    return d.toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' });
  }
  function giornoBreve(iso) { return new Date(iso + 'T00:00:00').toLocaleDateString('it-IT', { day: 'numeric', month: 'short' }); }
  function giornoLungo(iso) { return new Date(iso + 'T00:00:00').toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' }); }
  function badgeSemaforo(s) {
    var d = SEMAFORO[s.stato];
    return '<span class="semaforo semaforo-' + s.stato + '" title="' + esc(s.motivo) + '"><i aria-hidden="true">' + d.simbolo + '</i>' + d.testo + '</span>';
  }

  // Tetto "pulito" per l'asse (1, 2, 5, 10, 20, 50…)
  function tettoAsse(max) {
    if (max <= 0) return { tetto: 4, passo: 1 };
    var grezzo = max / 4, pot = Math.pow(10, Math.floor(Math.log10(grezzo)));
    var passo = [1, 2, 2.5, 5, 10].map(function (m) { return m * pot; }).filter(function (p) { return p >= grezzo; })[0];
    passo = Math.max(1, passo);
    return { tetto: Math.ceil(max / passo) * passo, passo: passo };
  }

  // Tooltip unico, riusato da tutti i grafici della pagina
  function tooltipGrafico(box) {
    var t = document.createElement('div');
    t.className = 'tooltip-grafico';
    t.hidden = true;
    box.appendChild(t);
    return {
      mostra: function (e, valore, etichetta, extra) {
        t.textContent = '';
        var v = document.createElement('b'); v.textContent = valore; t.appendChild(v);
        var l = document.createElement('span'); l.textContent = etichetta; t.appendChild(l);
        if (extra) { var x = document.createElement('small'); x.textContent = extra; t.appendChild(x); }
        t.hidden = false;
        var r = box.getBoundingClientRect(), w = t.offsetWidth;
        var x0 = e.clientX - r.left + 14;
        if (x0 + w > r.width) x0 = e.clientX - r.left - w - 14;
        t.style.left = Math.max(0, x0) + 'px';
        t.style.top = Math.max(0, e.clientY - r.top - 12) + 'px';
      },
      nascondi: function () { t.hidden = true; }
    };
  }

  // Colonne giorno per giorno (una sola serie). Oltre 92 giorni raggruppa per settimana.
  function graficoColonne(box, serie, chiave, nomeMetrica) {
    var punti = serie;
    if (serie.length > 92) {
      punti = [];
      for (var i = 0; i < serie.length; i += 7) {
        var sett = serie.slice(i, i + 7), somma = 0;
        sett.forEach(function (x) { somma += x[chiave]; });
        // Per utenti e aziende attive la somma dei giorni non ha senso: si mostra il massimo giornaliero
        if (chiave === 'utenti' || chiave === 'aziende') somma = Math.max.apply(null, sett.map(function (x) { return x[chiave]; }));
        punti.push({ giorno: sett[0].giorno, fine: sett[sett.length - 1].giorno, valore: somma, settimana: true });
      }
    } else {
      punti = serie.map(function (x) { return { giorno: x.giorno, valore: x[chiave] }; });
    }
    var W = Math.max(320, box.clientWidth || 800), H = 240, sx = 44, dx = 10, su = 12, giu = 28;
    var larg = (W - sx - dx) / punti.length;
    var barra = Math.max(2, Math.min(24, larg - 2));
    var max = Math.max.apply(null, punti.map(function (p) { return p.valore; }));
    var asse = tettoAsse(max), h = H - su - giu;
    function y(v) { return su + h - (v / asse.tetto) * h; }
    var svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" class="svg-grafico" role="img" aria-label="' + esc(nomeMetrica) + ' per ' + (punti[0] && punti[0].settimana ? 'settimana' : 'giorno') + '">';
    for (var v = 0; v <= asse.tetto + 1e-9; v += asse.passo) {
      svg += '<line x1="' + sx + '" x2="' + (W - dx) + '" y1="' + y(v) + '" y2="' + y(v) + '" class="griglia' + (v === 0 ? ' base' : '') + '"/>' +
        '<text x="' + (sx - 8) + '" y="' + (y(v) + 4) + '" class="asse" text-anchor="end">' + num(v) + '</text>';
    }
    var ogni = Math.ceil(punti.length / Math.max(2, Math.floor((W - sx) / 70)));
    punti.forEach(function (p, i) {
      var cx = sx + i * larg + larg / 2, x = cx - barra / 2, top = y(p.valore), alto = y(0) - top;
      if (p.valore > 0) {
        var rr = Math.min(4, barra / 2, alto);
        svg += '<path class="barra" d="M' + x + ' ' + y(0) + 'V' + (top + rr) + 'Q' + x + ' ' + top + ' ' + (x + rr) + ' ' + top + 'H' + (x + barra - rr) + 'Q' + (x + barra) + ' ' + top + ' ' + (x + barra) + ' ' + (top + rr) + 'V' + y(0) + 'Z"/>';
      }
      svg += '<rect class="zona" data-i="' + i + '" x="' + (sx + i * larg) + '" y="' + su + '" width="' + larg + '" height="' + (h + 1) + '"/>';
      if (i % ogni === 0) svg += '<text x="' + cx + '" y="' + (H - 8) + '" class="asse" text-anchor="middle">' + giornoBreve(p.giorno) + '</text>';
    });
    svg += '</svg>';
    box.innerHTML = svg;
    var tip = tooltipGrafico(box);
    box.querySelectorAll('.zona').forEach(function (z) {
      z.addEventListener('pointermove', function (e) {
        var p = punti[Number(z.dataset.i)];
        box.querySelectorAll('.zona.su').forEach(function (a) { a.classList.remove('su'); });
        z.classList.add('su');
        tip.mostra(e, num(p.valore), nomeMetrica, p.settimana ? 'Settimana dal ' + giornoBreve(p.giorno) + ' al ' + giornoBreve(p.fine) + (chiave === 'utenti' || chiave === 'aziende' ? ' (massimo in un giorno)' : '') : giornoLungo(p.giorno));
      });
      z.addEventListener('pointerleave', function () { z.classList.remove('su'); tip.nascondi(); });
    });
    return punti;
  }

  // Barre orizzontali (una serie), valore alla punta
  function graficoBarre(box, voci) {
    var max = Math.max(1, Math.max.apply(null, voci.map(function (v) { return v.valore; })));
    box.innerHTML = '<div class="barre-oriz">' + voci.map(function (v) {
      return '<div class="barra-riga' + (v.spenta ? ' spenta' : '') + '"><span class="barra-nome">' + esc(v.nome) + (v.nota ? '<small>' + esc(v.nota) + '</small>' : '') + '</span>' +
        '<span class="barra-traccia"><i style="width:' + (v.valore / max * 100) + '%"></i><b>' + num(v.valore) + '</b></span></div>';
    }).join('') + '</div>';
  }

  // Mappa di calore giorno della settimana × ora (una tinta, da chiara a scura)
  function mappaOrari(box, orari) {
    var giorni = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'], m = {}, max = 0;
    orari.forEach(function (o) { m[o.dow + '|' + o.ora] = o.n; if (o.n > max) max = o.n; });
    var html = '<div class="mappa-orari"><span></span>';
    for (var h = 0; h < 24; h++) html += '<span class="ora">' + (h % 3 === 0 ? h : '') + '</span>';
    for (var d = 1; d <= 7; d++) {
      html += '<span class="giorno">' + giorni[d - 1] + '</span>';
      for (var o = 0; o < 24; o++) {
        var n = m[d + '|' + o] || 0;
        var liv = n ? 0.14 + 0.86 * Math.sqrt(n / max) : 0;
        html += '<span class="cella" data-d="' + d + '" data-o="' + o + '" data-n="' + n + '" style="' + (n ? 'background:rgba(27,31,36,' + liv.toFixed(2) + ')' : '') + '"></span>';
      }
    }
    html += '</div><div class="scala-calore"><span>meno</span><i></i><span>più</span></div>';
    box.innerHTML = html;
    var tip = tooltipGrafico(box);
    box.querySelectorAll('.cella').forEach(function (c) {
      c.addEventListener('pointermove', function (e) {
        var d2 = ['lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato', 'domenica'][c.dataset.d - 1];
        tip.mostra(e, num(Number(c.dataset.n)), 'attività', d2 + ' dalle ' + c.dataset.o + ':00 alle ' + (Number(c.dataset.o) + 1) + ':00');
      });
      c.addEventListener('pointerleave', function () { tip.nascondi(); });
    });
  }

  function filtroPeriodo(g) {
    return '<div class="filtri-stat no-stampa"><span class="nota">Periodo</span>' + PERIODI_STAT.map(function (p) {
      return '<button class="filtro' + (p[0] === g ? ' attivo' : '') + '" data-periodo="' + p[0] + '">' + p[1] + '</button>';
    }).join('') + '</div>';
  }

  function metricheDi(r) { return r.azienda ? METRICHE.filter(function (x) { return x[0] !== 'aziende'; }) : METRICHE; }
  function metricaScelta(r) {
    var m = stato.metricaStat || 'azioni';
    return metricheDi(r).some(function (x) { return x[0] === m; }) ? m : 'azioni';
  }
  function sezioneAndamento(r) {
    var m = metricaScelta(r), METR = metricheDi(r);
    return '<section class="pannello"><div class="testa-grafico"><div><h2>Andamento</h2><p class="nota">' +
      (r.giorni > 92 ? 'Una colonna per settimana.' : 'Una colonna per giorno.') + ' Passa sulle colonne per i valori.</p></div>' +
      '<div class="scelta-metrica" role="group" aria-label="Cosa mostrare">' + METR.map(function (x) {
        return '<button class="' + (x[0] === m ? 'attivo' : '') + '" data-metrica="' + x[0] + '">' + x[1] + '</button>';
      }).join('') + '</div></div>' +
      '<div class="grafico" id="g-andamento"></div>' +
      '<details class="tabella-dati"><summary>Mostra i numeri in tabella</summary><div class="tabella-scroll"><table><thead><tr><th>Giorno</th>' +
        METR.map(function (x) { return '<th class="num">' + x[1] + '</th>'; }).join('') + '</tr></thead><tbody>' +
        r.serie.slice().reverse().map(function (x) {
          return '<tr><td>' + giornoLungo(x.giorno) + '</td>' + METR.map(function (k) { return '<td class="num">' + num(x[k[0]]) + '</td>'; }).join('') + '</tr>';
        }).join('') + '</tbody></table></div></details></section>';
  }

  function vociFunzioni(r, azienda) {
    return Object.keys(r.nomiFunzioni).map(function (f) {
      var u = r.perFunzione[f] || { aperture: 0, azioni: 0 };
      var spenta = azienda && azienda.funzioni[f] === false;
      return { nome: r.nomiFunzioni[f], valore: u.aperture + u.azioni, nota: spenta ? 'non attivata' : num(u.azioni) + ' operazioni, ' + num(u.aperture) + ' aperture', spenta: spenta };
    }).sort(function (a, b) { return b.valore - a.valore; });
  }

  function collegaAndamento(main, r) {
    function disegna() {
      var m = metricaScelta(r);
      graficoColonne(main.querySelector('#g-andamento'), r.serie, m, METRICHE.filter(function (x) { return x[0] === m; })[0][1]);
    }
    main.querySelectorAll('[data-metrica]').forEach(function (b) {
      b.onclick = function () {
        stato.metricaStat = b.dataset.metrica;
        main.querySelectorAll('[data-metrica]').forEach(function (x) { x.classList.toggle('attivo', x === b); });
        disegna();
      };
    });
    disegna();
  }

  function vistaStatistiche() {
    var g = stato.periodoStat || 30;
    api('GET', '/api/statistiche?giorni=' + g).then(function (r) {
      var t = r.totali, az = r.aziende;
      var attiveAz = az.filter(function (a) { return a.attiva; });
      var conta = { attiva: 0, calo: 0, ferma: 0 };
      attiveAz.forEach(function (a) { conta[a.semaforo.stato]++; });
      var disp = r.dispositivi, totDisp = (disp.telefono || 0) + (disp.computer || 0);
      var filtroSem = stato.filtroSemaforo || 'tutte';
      var elenco = az.slice().sort(function (a, b) {
        return (SEMAFORO[a.semaforo.stato].ordine - SEMAFORO[b.semaforo.stato].ordine) || a.nome.localeCompare(b.nome);
      }).filter(function (a) { return filtroSem === 'tutte' || a.semaforo.stato === filtroSem; });
      var accessiP = r.serie.reduce(function (s, x) { return s + x.accessi; }, 0);
      var azioniP = r.serie.reduce(function (s, x) { return s + x.azioni; }, 0);

      var main = guscio('statistiche',
        '<div class="testata"><div><h1>Statistiche</h1><p>Come viene usato il programma, azienda per azienda. Le vedi solo tu: i titolari non hanno accesso a queste informazioni.</p></div>' +
        '<div class="riga-azioni no-stampa"><a class="btn" href="/api/statistiche/esporta?giorni=' + g + '" download>Esporta in Excel</a></div></div>' +
        filtroPeriodo(g) +
        '<div class="tile-stat">' +
          '<div><span>Aziende attive negli ultimi 7 giorni</span><b>' + num(t.aziende7) + '<small> su ' + num(attiveAz.length) + '</small></b></div>' +
          '<div><span>Utenti attivi negli ultimi 7 giorni</span><b>' + num(t.utenti7) + '<small> su ' + num(t.utenti) + '</small></b></div>' +
          '<div><span>Accessi nel periodo</span><b>' + num(accessiP) + '</b></div>' +
          '<div><span>Operazioni nel periodo</span><b>' + num(azioniP) + '</b></div>' +
          '<div><span>Da telefono</span><b>' + (totDisp ? num(Math.round((disp.telefono || 0) / totDisp * 100)) + '%' : '–') + '</b></div>' +
          '<div><span>Aziende oggi</span><b>' + num(t.aziendeoggi) + '</b></div>' +
        '</div>' +
        '<section class="pannello"><div class="testa-grafico"><div><h2>Aziende clienti</h2><p class="nota">Semaforo: attiva se usata negli ultimi 7 giorni, in calo se ferma da 7 giorni o con uso dimezzato rispetto al mese prima, ferma se non usata da 14 giorni.</p></div></div>' +
          '<div class="filtri-scadenze">' + [['tutte', 'Tutte', az.length], ['ferma', 'Ferme', conta.ferma], ['calo', 'In calo', conta.calo], ['attiva', 'Attive', conta.attiva]].map(function (f) {
            return '<button class="filtro filtro-sem-' + f[0] + (f[0] === filtroSem ? ' attivo' : '') + '" data-sem="' + f[0] + '"><b>' + f[2] + '</b> ' + f[1] + '</button>';
          }).join('') + '</div>' +
          '<div class="tabella-scroll"><table class="tab-stat"><thead><tr><th>Azienda</th><th>Utilizzo</th><th>Ultimo utilizzo</th><th class="num">Utenti attivi</th><th class="num">Accessi</th><th class="num">Operazioni</th><th>Funzioni nel periodo</th><th></th></tr></thead><tbody>' +
          (elenco.length ? elenco.map(function (a) {
            var funz = Object.keys(r.nomiFunzioni).filter(function (f) { return f !== 'mezzi' && a.funzioni[f] !== false; }).map(function (f) {
              var n = a.usoFunzioni[f] || 0;
              return '<span class="chip-funz' + (n ? '' : ' mai') + '" title="' + (n ? num(n) + ' utilizzi' : 'mai usata nel periodo') + '">' + esc(r.nomiFunzioni[f]) + (n ? '' : ' · mai') + '</span>';
            }).join('');
            return '<tr><td><a href="#/statistiche/' + a.id + '"><b>' + esc(a.nome) + '</b></a></td>' +
              '<td>' + badgeSemaforo(a.semaforo) + '<div class="nota">' + esc(a.semaforo.motivo) + '</div></td>' +
              '<td>' + quando(a.ultimo) + '</td>' +
              '<td class="num">' + num(a.utenti_attivi) + ' / ' + num(a.utenti) + (a.mai_entrati ? '<div class="nota">' + a.mai_entrati + ' mai entrati</div>' : '') + '</td>' +
              '<td class="num">' + num(a.accessi) + '</td><td class="num">' + num(a.azioni) + '</td>' +
              '<td class="funz-cella">' + funz + '</td>' +
              '<td class="num"><a class="btn-testo" href="#/statistiche/' + a.id + '">Dettaglio</a></td></tr>';
          }).join('') : '<tr><td colspan="8" class="nota">Nessuna azienda in questo elenco.</td></tr>') +
          '</tbody></table></div></section>' +
        sezioneAndamento(r) +
        '<div class="due-colonne">' +
          '<section class="pannello"><h2>Funzioni più usate</h2><p class="nota" style="margin-bottom:14px">Aperture delle pagine e operazioni, tutte le aziende.</p><div id="g-funzioni"></div></section>' +
          '<section class="pannello"><h2>Giorni e orari</h2><p class="nota" style="margin-bottom:14px">Quando si lavora col programma (ora italiana).</p><div class="grafico" id="g-orari"></div></section>' +
        '</div>' +
        '<p class="nota" style="margin-top:18px">Registro attivo dal ' + (t.primo_evento ? new Date(t.primo_evento).toLocaleDateString('it-IT') : 'oggi') + '. Si registra solo che una funzione è stata usata, mai i dati inseriti. Le attività più vecchie di ' + r.conservazioneMesi + ' mesi vengono cancellate automaticamente. Lo storico precedente al registro è ricostruito dai piani e viaggi salvati.</p>');

      main.querySelectorAll('[data-periodo]').forEach(function (b) {
        b.onclick = function () { stato.periodoStat = Number(b.dataset.periodo); vistaStatistiche(); };
      });
      main.querySelectorAll('[data-sem]').forEach(function (b) {
        b.onclick = function () { stato.filtroSemaforo = b.dataset.sem; vistaStatistiche(); };
      });
      collegaAndamento(main, r);
      graficoBarre(main.querySelector('#g-funzioni'), vociFunzioni(r));
      mappaOrari(main.querySelector('#g-orari'), r.orari);
    }).catch(errorePagina);
  }

  function vistaStatAzienda(id) {
    var g = stato.periodoStat || 30;
    api('GET', '/api/statistiche/azienda/' + id + '?giorni=' + g).then(function (r) {
      var a = r.azienda;
      var giorniUso = r.serie.filter(function (x) { return x.accessi + x.azioni > 0; }).length;
      var main = guscio('statistiche',
        '<div class="riga-azioni" style="margin-bottom:8px"><a class="btn-testo" href="#/statistiche">Torna alle statistiche</a></div>' +
        '<div class="testata"><div><h1>' + esc(a.nome) + '</h1><p>' + badgeSemaforo(a.semaforo) + ' ' + esc(a.semaforo.motivo) + '. Cliente dal ' + new Date(a.creata_il).toLocaleDateString('it-IT') + ', ' + num(a.mezzi) + ' mezzi inseriti.</p></div>' +
        '<div class="riga-azioni no-stampa"><a class="btn" href="#/aziende/' + a.id + '">Gestisci utenti</a></div></div>' +
        filtroPeriodo(g) +
        '<div class="tile-stat">' +
          '<div><span>Utenti attivi nel periodo</span><b>' + num(a.utenti_attivi) + '<small> su ' + num(a.utenti) + '</small></b></div>' +
          '<div><span>Giorni di utilizzo</span><b>' + num(giorniUso) + '<small> su ' + num(r.giorni) + '</small></b></div>' +
          '<div><span>Accessi</span><b>' + num(a.accessi) + '</b></div>' +
          '<div><span>Operazioni</span><b>' + num(a.azioni) + '</b></div>' +
          '<div><span>Ultimo utilizzo</span><b class="piccolo">' + quando(a.ultimo) + '</b></div>' +
        '</div>' +
        '<section class="pannello"><h2>Utenti</h2><p class="nota" style="margin-bottom:12px">Numeri del periodo scelto. “Cronologia” mostra le ultime attività registrate.</p>' +
          '<div class="tabella-scroll"><table><thead><tr><th>Utente</th><th>Ruolo</th><th>Ultimo accesso</th><th class="num">Giorni attivi</th><th class="num">Accessi</th><th class="num">Operazioni</th><th class="num">Da telefono</th><th>Usa di più</th><th></th></tr></thead><tbody>' +
          r.utenti.map(function (u) {
            return '<tr class="' + (u.attivo ? '' : 'spento') + '"><td><b>' + esc(u.nome) + '</b><div class="nota">' + esc(u.email) + '</div></td>' +
              '<td>' + (u.ruolo === 'admin' ? 'Titolare' : 'Operatore') + (u.attivo ? '' : ' <span class="etichetta no">Sospeso</span>') + '</td>' +
              '<td>' + (u.ultimo_accesso ? quando(u.ultimo_accesso) : '<span class="etichetta rev-vicina">Mai entrato</span>') + '</td>' +
              '<td class="num">' + num(u.giorni_attivi) + '</td><td class="num">' + num(u.accessi) + '</td><td class="num">' + num(u.azioni) + '</td>' +
              '<td class="num">' + (u.eventi ? num(Math.round(u.da_telefono / u.eventi * 100)) + '%' : '–') + '</td>' +
              '<td>' + esc(u.funzionePreferita || '–') + '</td>' +
              '<td class="num"><button class="btn-testo" data-cron="' + u.id + '">Cronologia</button></td></tr>';
          }).join('') + '</tbody></table></div></section>' +
        sezioneAndamento(r) +
        '<section class="pannello"><h2>Funzioni</h2><p class="nota" style="margin-bottom:14px">Aperture delle pagine e operazioni nel periodo. Le funzioni non attivate per questa azienda sono in grigio.</p><div id="g-funzioni"></div></section>');

      main.querySelectorAll('[data-periodo]').forEach(function (b) {
        b.onclick = function () { stato.periodoStat = Number(b.dataset.periodo); vistaStatAzienda(id); };
      });
      collegaAndamento(main, r);
      graficoBarre(main.querySelector('#g-funzioni'), vociFunzioni(r, a));
      main.querySelectorAll('[data-cron]').forEach(function (b) {
        b.onclick = function () {
          api('GET', '/api/statistiche/utente/' + b.dataset.cron).then(function (c) {
            var righe = c.attivita.map(function (x) {
              var d = new Date(x.creato_il);
              return '<tr><td>' + d.toLocaleDateString('it-IT') + ' ' + d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }) + '</td><td>' + esc((c.eventi[x.evento] || { nome: x.evento }).nome) + '</td><td>' + esc(x.dispositivo || '–') + '</td></tr>';
            }).join('');
            dialogo({
              titolo: c.utente.nome, pulsante: 'Chiudi',
              testo: '<p>' + esc(c.utente.azienda) + '. Ultime ' + c.attivita.length + ' attività registrate.</p>' +
                (righe ? '<div class="cronologia"><table><thead><tr><th>Quando</th><th>Cosa</th><th>Da</th></tr></thead><tbody>' + righe + '</tbody></table></div>' : '<p>Nessuna attività registrata.</p>')
            });
          }).catch(function (err) { avvisa(err.message); });
        };
      });
    }).catch(errorePagina);
  }

  // ---------- Account ----------
  function vistaAccount() {
    var u = stato.utente;
    var ruolo = { superadmin: 'Amministratore del programma', admin: 'Titolare', operatore: 'Operatore' }[u.ruolo];
    var main = guscio('account',
      '<div class="testata"><div><h1>Il mio account</h1><p>' + esc(u.nome) + ', ' + esc(u.email) + '. ' + ruolo + (u.azienda ? ' di ' + esc(u.azienda) : '') + '.</p></div></div>' +
      '<form class="pannello" id="form-pw" novalidate style="max-width:520px"><h2 style="margin-bottom:16px">Cambia password</h2>' +
      '<div class="griglia-form" style="grid-template-columns:1fr">' +
        '<label class="campo">Password attuale<input type="password" name="attuale" autocomplete="current-password"></label>' +
        '<label class="campo">Nuova password (almeno 8 caratteri)<input type="password" name="nuova" autocomplete="new-password"></label>' +
      '</div><p class="errore" id="err"></p><button class="btn btn-primario" type="submit">Cambia password</button></form>');
    main.querySelector('#form-pw').onsubmit = function (e) {
      e.preventDefault();
      var f = this;
      api('POST', '/api/me/password', valoriForm(f)).then(function () { avvisa('Password cambiata'); f.reset(); })
        .catch(function (err) { main.querySelector('#err').textContent = err.message; });
    };
  }

  function errorePagina(err) {
    if (!stato.utente) return;
    guscio('', '<div class="vuoto"><h2>Qualcosa non ha funzionato</h2><p>' + esc(err.message) + '</p><a class="btn" href="#/">Torna alla home</a></div>');
  }

  // ---------- navigazione ----------
  function naviga() {
    if (!stato.utente) return;
    var parti = location.hash.replace(/^#\/?/, '').split('/');
    var sez = parti[0];
    if (['carico', 'piani', 'tassato', 'giri', 'viaggi', 'mezzi', 'scadenze'].indexOf(sez) >= 0 && haFunzione(sez === 'piani' ? 'carico' : sez)) traccia('pagina:' + sez);
    var admin = stato.utente.ruolo === 'superadmin';
    if (admin) {
      if (sez === 'account') return vistaAccount();
      if (sez === 'backup') return vistaBackup();
      if (sez === 'statistiche') return parti[1] ? vistaStatAzienda(Number(parti[1])) : vistaStatistiche();
      if (sez === 'aziende' && parti[1]) return vistaUtentiAzienda(Number(parti[1]));
      return vistaAziende();
    }
    switch (sez) {
      case 'carico': return haFunzione('carico') ? vistaCarico() : vistaHome();
      case 'viaggi': return haFunzione('viaggi') ? vistaViaggi(parti[1] ? Number(parti[1]) : null) : vistaHome();
      case 'tassato': return haFunzione('tassato') ? vistaTassato() : vistaHome();
      case 'giri': return haFunzione('giri') ? vistaGiri() : vistaHome();
      case 'mezzi': return vistaMezzi();
      case 'scadenze': return haFunzione('scadenze') ? vistaScadenze() : vistaHome();
      case 'piani': return !haFunzione('carico') ? vistaHome() : (parti[1] ? vistaPiano(Number(parti[1])) : vistaPiani());
      case 'utenti': return stato.utente.ruolo === 'admin' ? vistaUtenti() : vistaHome();
      case 'account': return vistaAccount();
      default: return vistaHome();
    }
  }

  function avvia(dopoLogin) {
    return api('GET', '/api/me').then(function (u) {
      stato.utente = u;
      if (dopoLogin !== true) traccia('sessione');
      naviga();
    });
  }

  window.addEventListener('hashchange', naviga);
  avvia().catch(function () { mostraAccesso(); });
})();
