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
    account: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="8" r="4"/><path d="M4 21c1-4.5 4.2-7 8-7s7 2.5 8 7"/></svg>'
  };

  var stato = {
    utente: null,
    mezzi: [],
    colliSalvati: [],
    piano: { unita: null, righe: [], risultato: null },
    viste3d: [],
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
    return Number(n).toLocaleString('it-IT', { minimumFractionDigits: dec || 0, maximumFractionDigits: dec || 0 });
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
  function haFunzione(id) { return !stato.utente || !stato.utente.funzioni || stato.utente.funzioni[id] !== false; }

  // ---------- accesso ----------
  function paginaAccesso(titolo, sottotitolo, campiHtml, pulsante, invio) {
    var cassoni = '';
    for (var i = 0; i < 36; i++) cassoni += '<i class="' + ([0, 1, 2, 6, 7, 8, 12, 13, 18].indexOf(i) >= 0 ? 'p' : '') + '"></i>';
    app.innerHTML =
      '<div class="accesso">' +
        '<div class="accesso-lato">' +
          '<div class="marchio"><div class="marchio-segno"></div><span>Stiva</span></div>' +
          '<div><h1>Ogni collo al suo posto.</h1><p>Piani di carico calcolati sulle misure reali dei tuoi mezzi, con peso e impilabilità sotto controllo.</p></div>' +
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
          'Crea account', function (v) { return api('POST', '/api/setup', v).then(avvia); });
      } else {
        paginaAccesso('Accedi', 'Inserisci le credenziali ricevute dalla tua azienda.',
          '<label class="campo">Email<input type="email" name="email" autocomplete="username" required></label>' +
          '<label class="campo">Password<input type="password" name="password" autocomplete="current-password" required></label>',
          'Accedi', function (v) { return api('POST', '/api/login', v).then(avvia); });
      }
    }).catch(function () {
      app.innerHTML = '<div class="contenuto"><p class="errore">Il server non risponde. Riprova tra qualche istante.</p></div>';
    });
  }

  // ---------- struttura con menu ----------
  function vociMenu() {
    var r = stato.utente.ruolo;
    if (r === 'superadmin') return [['aziende', 'Aziende clienti'], ['account', 'Il mio account']];
    var v = [['home', 'Home']];
    if (haFunzione('carico')) v.push(['carico', 'Piano di carico']);
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
    var menu = vociMenu().map(function (v) {
      return '<a href="#/' + v[0] + '" class="' + (v[0] === sezione ? 'attivo' : '') + '">' + ICONE[v[0]] + '<span>' + v[1] + '</span></a>';
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
    document.getElementById('esci').onclick = function () {
      api('POST', '/api/logout').then(function () { stato.utente = null; location.hash = '#/'; mostraAccesso(); });
    };
    return app.querySelector('.contenuto');
  }

  // ---------- Home ----------
  function vistaHome() {
    var tessere = [];
    if (haFunzione('carico')) tessere.push(['carico', 'Piano di carico', 'Inserisci i colli e ottieni la disposizione migliore.']);
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
      u.scadute = u.mezzi.filter(function (m) { var g = giorniA(m.scadenza_revisione); return g !== null && g < 0; });
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
        return '<tr><td><span class="tipo-mezzo">' + c.nome + '</span></td><td><b>' + esc(x.nome) + '</b></td><td>' + esc(x.targa || '') + '</td>' +
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
          '<fieldset class="gruppo-campi" id="campi-vano"><legend>Vano di carico</legend><div class="griglia-form">' +
            '<label class="campo">Lunghezza (cm)<input type="number" name="lunghezza" min="50" value="' + (m && m.lunghezza ? m.lunghezza : '') + '"></label>' +
            '<label class="campo">Larghezza (cm)<input type="number" name="larghezza" min="50" value="' + (m && m.larghezza ? m.larghezza : '') + '"></label>' +
            '<label class="campo">Altezza (cm)<input type="number" name="altezza" min="50" value="' + (m && m.altezza ? m.altezza : '') + '"></label>' +
            '<label class="campo">Peso massimo caricabile (kg)<input type="number" name="portata" min="1" value="' + (m && m.portata ? m.portata : '') + '"></label>' +
          '</div></fieldset>' +
          '<fieldset class="gruppo-campi" id="campi-motore"><legend>Consumi</legend><div class="griglia-form">' +
            '<label class="campo">Consumo medio (l/100 km)<input type="number" name="consumo" min="1" step="0.1" placeholder="facoltativo" value="' + (m && m.consumo ? m.consumo : '') + '"></label>' +
          '</div></fieldset>' +
          '<fieldset class="gruppo-campi"><legend>Revisione</legend><div class="griglia-form">' +
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
      function opzione(u) { return '<option value="' + u.chiave + '"' + (u.chiave === p.unita ? ' selected' : '') + '>' + esc(u.nome) + (u.scadute.length ? ' – revisione scaduta' : '') + '</option>'; }
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
            '<th title="Si possono appoggiare altri colli sopra">Impilabile</th><th title="Si può girare di 90° sul pianale">Ruotabile</th><th></th>' +
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
            '<td class="centro"><input type="checkbox" data-k="impilabile"' + (r.impilabile ? ' checked' : '') + ' aria-label="Impilabile"></td>' +
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
        r[k] = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
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
            mostraRisultato(main.querySelector('#risultato'), u.nome, righe, esito, true);
            main.querySelector('#risultato').scrollIntoView({ behavior: 'smooth', block: 'start' });
          } catch (ex) { main.querySelector('#err').textContent = ex.message; }
          btn.disabled = false; btn.textContent = 'Calcola carico';
        }, 30);
      }
      main.querySelector('#calcola').onclick = calcola;

      // "Quale mezzo basta?": prova il carico su tutta la flotta
      main.querySelector('#quale-mezzo').onclick = function () {
        var righe = controllaRighe(); if (!righe) return;
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
          box.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      };
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
          return '<g><title>n. ' + b.n + ', ' + esc(b.nome) + ', ' + b.l + '×' + b.w + '×' + b.h + ' cm, ' + b.peso + ' kg' + (b.impilabile ? '' : ', non impilabile') + '</title>' +
            '<rect x="' + b.x + '" y="' + b.y + '" width="' + b.l + '" height="' + b.w + '" fill="' + c + '" stroke="#fff" stroke-width="2"/>' + etich + x + '</g>';
        }).join('') +
        '</svg>';
      sez.querySelector('.pianta-svg').innerHTML = svg;
      sez.querySelector('.strato-nome').textContent = 'Strato ' + (i + 1) + ' di ' + quote.length + ', da ' + q + ' cm di altezza';
      var peso = sopra.reduce(function (a, b) { return a + b.peso; }, 0);
      sez.querySelector('.legenda-strato').innerHTML =
        '<span>' + sopra.length + ' colli in questo strato, ' + num(peso) + ' kg</span>' +
        (sotto.length ? '<span><i class="pallino" style="background:#e3e6ea"></i>colli degli strati sotto</span>' : '') +
        (sopra.some(function (b) { return !b.impilabile; }) ? '<span style="color:var(--rosso)">✕ non impilabile</span>' : '');
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

  // ---------- Scadenze (revisioni) ----------
  function vistaScadenze() {
    caricaMezzi().then(function (mezzi) {
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
          '<p class="nota" style="margin-top:14px">Mezzi pesanti e rimorchi oltre 3,5 t si revisionano ogni anno; i veicoli fino a 3,5 t dopo 4 anni dall’immatricolazione e poi ogni 2 anni. Fa sempre fede la carta di circolazione.</p>'
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

  // ---------- Utenti (titolare) ----------
  function vistaUtenti() {
    api('GET', '/api/utenti').then(function (utenti) {
      var main = guscio('utenti',
        '<div class="testata"><div><h1>Utenti</h1><p>I titolari gestiscono mezzi, piani e utenti. Gli operatori calcolano e salvano i piani di carico.</p></div></div>' +
        '<div class="pannello tabella-scroll"><table><thead><tr><th>Nome</th><th>Email</th><th>Ruolo</th><th>Stato</th><th></th></tr></thead><tbody>' +
        utenti.map(function (u) {
          var io = u.id === stato.utente.id;
          return '<tr class="' + (u.attivo ? '' : 'spento') + '"><td><b>' + esc(u.nome) + '</b>' + (io ? ' <span class="nota">(tu)</span>' : '') + '</td><td>' + esc(u.email) + '</td>' +
            '<td>' + (u.ruolo === 'admin' ? 'Titolare' : 'Operatore') + '</td>' +
            '<td><span class="etichetta ' + (u.attivo ? 'ok' : 'no') + '">' + (u.attivo ? 'Attivo' : 'Disattivato') + '</span></td>' +
            '<td class="num"><button class="btn-testo" data-pw="' + u.id + '">Nuova password</button>' +
            (io ? '' : '<button class="btn-testo pericolo" data-stato="' + u.id + '" data-attivo="' + u.attivo + '">' + (u.attivo ? 'Disattiva' : 'Riattiva') + '</button>') + '</td></tr>';
        }).join('') + '</tbody></table></div>' +
        '<form class="pannello" id="form-utente" novalidate><h2 style="margin-bottom:16px">Nuovo utente</h2><div class="griglia-form">' +
          '<label class="campo">Nome<input type="text" name="nome"></label>' +
          '<label class="campo">Email<input type="email" name="email"></label>' +
          '<label class="campo">Password iniziale<input type="text" name="password" placeholder="almeno 8 caratteri"></label>' +
          '<label class="campo">Ruolo<select name="ruolo"><option value="operatore">Operatore</option><option value="admin">Titolare</option></select></label>' +
        '</div><p class="errore" id="err"></p><button class="btn btn-primario" type="submit">Aggiungi utente</button></form>');
      main.querySelector('#form-utente').onsubmit = function (e) {
        e.preventDefault();
        api('POST', '/api/utenti', valoriForm(this)).then(function () { avvisa('Utente aggiunto'); vistaUtenti(); })
          .catch(function (err) { main.querySelector('#err').textContent = err.message; });
      };
      main.querySelectorAll('[data-stato]').forEach(function (b) {
        b.onclick = function () {
          api('PATCH', '/api/utenti/' + b.dataset.stato, { attivo: b.dataset.attivo !== 'true' }).then(vistaUtenti).catch(function (err) { avvisa(err.message); });
        };
      });
      main.querySelectorAll('[data-pw]').forEach(function (b) {
        b.onclick = function () {
          var pw = prompt('Nuova password per questo utente (almeno 8 caratteri):');
          if (!pw) return;
          api('PATCH', '/api/utenti/' + b.dataset.pw, { password: pw }).then(function () { avvisa('Password aggiornata'); }).catch(function (err) { avvisa(err.message); });
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
            return '<tr class="' + (a.attiva ? '' : 'spento') + '"><td><b>' + esc(a.nome) + '</b></td><td>' + esc(a.email_titolare || '') + '</td>' +
              '<td class="num">' + a.utenti + '</td><td class="num">' + a.mezzi + '</td><td class="num">' + a.piani + '</td>' +
              '<td class="funzioni-azienda">' + funzioni.map(function (f) {
                return '<label class="spunta"><input type="checkbox" data-fz="' + a.id + '" data-id="' + f.id + '"' + (a.funzioni[f.id] ? ' checked' : '') + '> ' + esc(f.nome) + '</label>';
              }).join('') + '</td><td>' + data(a.creata_il) + '</td>' +
              '<td><span class="etichetta ' + (a.attiva ? 'ok' : 'no') + '">' + (a.attiva ? 'Attiva' : 'Sospesa') + '</span></td>' +
              '<td class="num"><button class="btn-testo ' + (a.attiva ? 'pericolo' : '') + '" data-az="' + a.id + '" data-attiva="' + a.attiva + '">' + (a.attiva ? 'Sospendi' : 'Riattiva') + '</button></td></tr>';
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
    var admin = stato.utente.ruolo === 'superadmin';
    if (admin) {
      if (sez === 'account') return vistaAccount();
      return vistaAziende();
    }
    switch (sez) {
      case 'carico': return haFunzione('carico') ? vistaCarico() : vistaHome();
      case 'viaggi': return haFunzione('viaggi') ? vistaViaggi(parti[1] ? Number(parti[1]) : null) : vistaHome();
      case 'mezzi': return vistaMezzi();
      case 'scadenze': return haFunzione('scadenze') ? vistaScadenze() : vistaHome();
      case 'piani': return !haFunzione('carico') ? vistaHome() : (parti[1] ? vistaPiano(Number(parti[1])) : vistaPiani());
      case 'utenti': return stato.utente.ruolo === 'admin' ? vistaUtenti() : vistaHome();
      case 'account': return vistaAccount();
      default: return vistaHome();
    }
  }

  function avvia() {
    return api('GET', '/api/me').then(function (u) {
      stato.utente = u;
      naviga();
    });
  }

  window.addEventListener('hashchange', naviga);
  avvia().catch(function () { mostraAccesso(); });
})();
