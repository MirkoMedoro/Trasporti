/* Stiva - lettura delle misure dei colli da un foglio (foto o testo) per il Calcolatore.
 * Riceve le righe lette (stesso formato di Giro.righeDaOcr / righeDaTesto) e restituisce le righe del
 * Calcolatore: { nome, n, l, p, h, peso, impilabile }. Misure in cm, peso per singolo collo.
 * Due modi: tabella con intestazioni (Colli, Lunghezza, Larghezza, Altezza, Peso) oppure righe libere
 * come "3 bancali 120x80x150 450 kg".
 */
(function (globale) {
  'use strict';

  function num(t) {
    var s = String(t == null ? '' : t).trim().replace(/\s/g, '');
    if (!s) return null;
    if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) s = s.replace(/\./g, '').replace(',', '.'); // 1.200,50
    else s = s.replace(',', '.');
    var n = parseFloat(s);
    return isFinite(n) ? n : null;
  }
  var RE_NS = /non\s*sovr|nonsovr|non\s*impil|no\s*sovr|non\s*sovrapp|\bn\.?\s?s\.?(?=\s|$|[,;)])/i;
  var RE_TIPO = /\b(bancal[ei]|pallet|plt|cass[ae]|cartone|cartoni|scatol[ae]|gabbi[ae]|fust[io]|rotol[io]|bobin[ae]|sacc[ho]i?|coll[io]|pacc[ho]i?|big\s?bag|cestone|cestoni|tubi|profilati)\b/i;

  // ---------- modo tabella ----------
  var COLONNE = {
    n: /^(colli|collo|n\.?\s?colli|q\.?\s?t[aà]\.?|quantit[aà]|qta|n[°º.]?|nr\.?|num\.?|pz\.?|pezzi)$/i,
    l: /^(lungh?\.?|lunghezza|l\.?|lung\.?\s?cm|l\s?\(?cm\)?)$/i,
    p: /^(largh?\.?|larghezza|p\.?|prof\.?|profondit[aà]|w|larg\.?\s?cm|p\s?\(?cm\)?)$/i,
    h: /^(alt\.?|altezza|h\.?|alt\.?\s?cm|h\s?\(?cm\)?)$/i,
    peso: /^(peso|peso\s?kg|kg|peso\s?\(?kg\)?|peso\s?collo|peso\s?cad\.?|peso\s?lordo)$/i,
    pesoTot: /^(peso\s?tot\.?|peso\s?totale|tot\.?\s?kg|totale\s?kg)$/i,
    misure: /^(misure|dimensioni|dim\.?|l\s?x\s?p\s?x\s?h|lxpxh|misure\s?cm)$/i,
    nome: /^(descrizione|tipo|imballo|merce|articolo|contenuto)$/i,
    ns: /^(non\s?sovr.*|n\.?\s?s\.?|sovrapp.*|impil.*)$/i,
    note: /^(note|annotazioni)$/i
  };
  function pulisciIntest(t) { return String(t || '').trim().replace(/^[\[\(|'‘"“]+|[\]\)|'’"”:_]+$/g, '').replace(/\s+/g, ' '); }
  function intestazione(r) {
    var colonne = [], usate = {};
    r.celle.forEach(function (c) {
      var t = pulisciIntest(c.testo);
      var k = Object.keys(COLONNE).filter(function (x) { return !usate[x] && COLONNE[x].test(t); })[0];
      if (k) usate[k] = true;
      colonne.push({ k: k || 'altro', x: c.x, fine: c.fine != null ? c.fine : c.x + t.length * 5 });
    });
    var dimensioni = (usate.l ? 1 : 0) + (usate.p ? 1 : 0) + (usate.h ? 1 : 0);
    if (!(dimensioni >= 2 || usate.misure)) return null;
    // ogni colonna "possiede" lo spazio fino a metà strada dalle vicine (le intestazioni spesso sono centrate)
    colonne.sort(function (a, b) { return a.x - b.x; });
    colonne.forEach(function (c, i) {
      var centro = (c.x + c.fine) / 2;
      var prec = colonne[i - 1], succ = colonne[i + 1];
      c.da = prec ? ((prec.x + prec.fine) / 2 + centro) / 2 : -Infinity;
      c.a = succ ? (centro + (succ.x + succ.fine) / 2) / 2 : Infinity;
    });
    return colonne;
  }
  function colonnaDi(colonne, c) {
    var fine = c.fine != null ? c.fine : c.x + String(c.testo).length * 5, centro = (c.x + fine) / 2;
    return colonne.filter(function (h) { return centro >= h.da && centro < h.a; })[0] || colonne[colonne.length - 1];
  }
  function daTabella(righe, i0, colonne) {
    var out = [];
    for (var i = i0 + 1; i < righe.length; i++) {
      var r = righe[i], v = {};
      if (intestazione(r)) continue;
      r.celle.forEach(function (c) { var h = colonnaDi(colonne, c); v[h.k] = (v[h.k] ? v[h.k] + ' ' : '') + c.testo; });
      if (/^\s*(tot|totale|totali)\b/i.test(r.testo)) continue;
      var riga = { nome: '', n: null, l: null, p: null, h: null, peso: null, impilabile: true };
      if (v.misure) {
        var d = dimensioniDa(normalizza(v.misure));
        if (d) { riga.l = d.l; riga.p = d.p; riga.h = d.h; }
      }
      ['l', 'p', 'h'].forEach(function (k) { if (v[k] != null) { var x = num((String(v[k]).match(/\d[\d.,]*/) || [])[0]); if (x != null) riga[k] = x; } });
      var n = v.n != null ? num((String(v.n).match(/\d+/) || [])[0]) : null;
      riga.n = n && n > 0 && n < 1000 ? n : 1;
      var peso = v.peso != null ? num((String(v.peso).match(/\d[\d.,]*/) || [])[0]) : null;
      var pesoTot = v.pesoTot != null ? num((String(v.pesoTot).match(/\d[\d.,]*/) || [])[0]) : null;
      riga.peso = peso != null ? peso : (pesoTot != null ? arrotonda(pesoTot / riga.n) : null);
      riga.impilabile = !(RE_NS.test(v.ns || '') || /^(s[iì]|x|✓|v)$/i.test(String(v.ns || '').trim()) || RE_NS.test(v.note || '') || RE_NS.test(v.nome || ''));
      var tipo = String(v.nome || v.altro || '').match(RE_TIPO);
      riga.nome = v.nome ? pulisciNome(v.nome) : (tipo ? maiuscola(tipo[1]) : '');
      var dims = [riga.l, riga.p, riga.h].filter(function (x) { return x != null; }).length;
      riga.incompleta = incerta(r) || dims < 3 || riga.peso == null;
      if (dims >= 2 || (dims >= 1 && riga.peso != null)) out.push(riga);
    }
    return out;
  }

  // ---------- modo righe libere ----------
  function normalizza(t) {
    // la lettura da foto a volte scrive la "x" come "XxX", "×", "*"
    return String(t || '').replace(/[×✕✖*]/g, 'x').replace(/(\d)\s*[Xx]{1,3}\s*(?=\d)/g, '$1x')
      .replace(/(\d),(\d)/g, '$1.$2').replace(/\bcm\b\.?/gi, ' ').replace(/\s+/g, ' ').trim();
  }
  var RE_DIM = /(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)/i;
  function dimensioniDa(t) {
    var m = t.match(RE_DIM);
    return m ? { l: Number(m[1]), p: Number(m[2]), h: Number(m[3]), inizio: m.index, fine: m.index + m[0].length } : null;
  }
  function arrotonda(x) { return Math.round(x * 10) / 10; }
  function maiuscola(t) { t = String(t || '').toLowerCase(); return t.charAt(0).toUpperCase() + t.slice(1); }
  function pulisciNome(t) { return String(t || '').replace(/\s+/g, ' ').replace(/^[\s\-–,;:.)]+|[\s\-–,;:(]+$/g, '').slice(0, 60); }

  var RE_QUATTRO = /(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)/i;
  function daRiga(testo) {
    var t = normalizza(testo), n = null, d, q4 = t.match(RE_QUATTRO);
    if (q4) {
      // 4 numeri in fila: "3x120x80x100" (colli davanti) oppure "120x80x110x5" (colli in fondo)
      var a = Number(q4[1]), z = Number(q4[4]), intero = function (x) { return x === Math.floor(x) && x < 100; };
      var colliDavanti = intero(a) && (z >= 20 || !intero(z)) || (intero(a) && intero(z) && a <= z);
      d = colliDavanti ? { l: Number(q4[2]), p: Number(q4[3]), h: z } : { l: a, p: Number(q4[2]), h: Number(q4[3]) };
      n = colliDavanti ? a : z;
      d.inizio = q4.index; d.fine = q4.index + q4[0].length;
    } else d = dimensioniDa(t);
    if (!d) {
      // le "x" perse nella lettura ("22 22 15 – 2 kgs"): se c'è un peso in kg, i tre numeri
      // subito prima sono le misure (un quarto numero davanti è il numero dei colli). Da controllare.
      var pk0 = t.match(/(\d+(?:\.\d+)?)\s*kgs?\b/i);
      if (pk0) {
        var prima0 = t.slice(0, pk0.index), numeri0 = [], re0 = /\d+(?:\.\d+)?/g, m0;
        while ((m0 = re0.exec(prima0))) numeri0.push({ v: Number(m0[0]), i: m0.index, f: m0.index + m0[0].length });
        if (numeri0.length >= 3) {
          var tre = numeri0.slice(-3);
          d = { l: tre[0].v, p: tre[1].v, h: tre[2].v, inizio: tre[0].i, fine: tre[2].f, dubbia: true };
          if (numeri0.length >= 4) { var q0 = numeri0[numeri0.length - 4].v; if (q0 === Math.floor(q0) && q0 > 0 && q0 < 100) n = q0; }
        }
      }
    }
    if (!d && !/\d{1,2}\/\d{1,2}\/\d{2,4}/.test(t)) {
      // ultima possibilità: riga fatta quasi solo di numeri ("35 35x20 8", "22x22 15 A kgs"):
      // i primi tre sono le misure, quello dopo il peso. Mai scartare una riga che sembra di misure.
      var lettere = (t.replace(/\b(cm|kgs?|x|n|nr|pz|colli|collo|peso|tot\w*|ns)\b/gi, ' ').match(/[a-zà-ù]/gi) || []).length;
      var numeri1 = [], re1 = /\d+(?:\.\d+)?/g, m1;
      while ((m1 = re1.exec(t))) numeri1.push({ v: Number(m1[0]), i: m1.index, f: m1.index + m1[0].length });
      var validi = numeri1.length && numeri1.every(function (x) { return x.v > 0 && x.v <= 3000; });
      var segni = /x|kg/i.test(t) || numeri1.length >= 4;
      if (validi && lettere <= 4 && numeri1.length >= 3 && numeri1.length <= 5 && segni) {
        var da = numeri1.length === 5 ? 1 : 0;   // 5 numeri: colli, L, P, H, peso
        d = { l: numeri1[da].v, p: numeri1[da + 1].v, h: numeri1[da + 2].v, inizio: numeri1[da].i, fine: numeri1[da + 2].f, dubbia: true };
      }
    }
    if (!d) return null;
    var prima = t.slice(0, d.inizio), dopo = t.slice(d.fine);
    if (n == null) {
      var q2 = prima.replace(/\d+[.)]\s*$|^\s*\d+[.)]\s+/, ' ').match(/(\d+)\s*(?:colli|collo|pz\.?|pezzi|plt|pallet|bancali|bancale|casse|cassa|cartoni|nr\.?|n\.?)?\s*[a-zà-ù.\s]*$/i);
      if (q2 && !/kg/i.test(prima.slice(q2.index))) n = Number(q2[1]);
    }
    if (n == null) {
      var q3 = dopo.match(/^\s*(?:x|n\.?|nr\.?|pz\.?|colli)\s*(\d+)\b(?!\s*kg)/i);
      if (q3) { n = Number(q3[1]); dopo = dopo.slice(q3[0].length); }
    }
    if (!(n > 0 && n < 1000)) n = 1;
    var peso = null, totale = false;
    var pk = dopo.match(/(tot\w*\.?\s*)?(?:peso\s*)?(\d+(?:\.\d+)?)\s*kg|(?:peso|kg)\s*[:=]?\s*(tot\w*\.?\s*)?(\d+(?:\.\d+)?)/i);
    if (pk) { peso = Number(pk[2] || pk[4]); totale = !!(pk[1] || pk[3]) || /tot/i.test(dopo.slice(0, pk.index)); }
    else {
      var numeri = dopo.match(/\d+(?:\.\d+)?/g);
      if (numeri && numeri.length) peso = Number(numeri[numeri.length - 1]);
    }
    if (peso != null && totale) peso = arrotonda(peso / n);
    var tipo = (prima + ' ' + dopo).match(RE_TIPO);
    return { nome: tipo ? maiuscola(tipo[1]) : '', n: n, l: d.l, p: d.p, h: d.h, peso: peso, impilabile: !RE_NS.test(t), incompleta: !!d.dubbia || peso == null };
  }

  // Misure in metri (1.2 x 0.8) o in millimetri (1200 x 800): tutto in centimetri
  function unita(righe) {
    var dims = [];
    righe.forEach(function (r) { ['l', 'p', 'h'].forEach(function (k) { if (r[k] != null) dims.push(r[k]); }); });
    if (!dims.length) return righe;
    var max = Math.max.apply(null, dims);
    var k = max <= 5 ? 100 : (max >= 1000 ? 0.1 : 1);
    if (k !== 1) righe.forEach(function (r) { ['l', 'p', 'h'].forEach(function (c) { if (r[c] != null) r[c] = Math.round(r[c] * k * 10) / 10; }); });
    return righe;
  }

  // ---------- modo colonne di numeri (intestazioni illeggibili o assenti) ----------
  // Le colonne si riconoscono dalla posizione dei numeri riga per riga; il significato viene dalle
  // intestazioni lette anche solo in parte, altrimenti dall'ordine abituale: N. riga, Colli, L, P, H, Peso.
  function numeroCella(t) {
    var s = String(t || '').trim().replace(/^[^\d]+|[^\d]+$/g, '');
    if (!/^\d{1,5}([.,]\d{1,3})?$/.test(s)) return null;
    return num(s);
  }
  var PAROLE = [
    { k: 'n', re: /\b(colli|collo|q\.?t[aà]|quantit|pz|pezzi)/i },
    { k: 'l', re: /\blung/i }, { k: 'p', re: /\b(larg|prof)/i }, { k: 'h', re: /\balt/i },
    { k: 'peso', re: /\b(peso|kg)\b/i }, { k: 'idx', re: /^(n\.?|nr\.?|pos\.?|riga|#)$/i }
  ];
  function daColonneNumeriche(righe) {
    // righe di dati: almeno 3 numeri e soprattutto numeri
    var dati = [];
    righe.forEach(function (r, i) {
      var nums = r.celle.map(function (c) { return { c: c, v: numeroCella(c.testo) }; });
      var quanti = nums.filter(function (x) { return x.v != null; }).length;
      var testo = r.celle.filter(function (c) { return numeroCella(c.testo) == null; }).map(function (c) { return c.testo; }).join(' ');
      if (quanti >= 3 && quanti >= r.celle.length * 0.5 && !/\b(tot|totale|totali)\b/i.test(r.testo) && !/\d{1,2}\/\d{1,2}\/\d{2,4}/.test(r.testo))
        dati.push({ i: i, r: r, nums: nums.filter(function (x) { return x.v != null; }), testo: testo });
    });
    if (dati.length < 2) return [];
    // colonne: si raggruppano i centri delle celle numeriche
    var centri = [];
    dati.forEach(function (d) { d.nums.forEach(function (x) { var f = x.c.fine != null ? x.c.fine : x.c.x + 12; centri.push((x.c.x + f) / 2); }); });
    centri.sort(function (a, b) { return a - b; });
    var larghezza = Math.max.apply(null, centri) - Math.min.apply(null, centri) || 1;
    var soglia = Math.max(8, larghezza / 30), colonne = [];
    centri.forEach(function (c) {
      var ultima = colonne[colonne.length - 1];
      if (ultima && c - ultima.ultimo <= soglia) { ultima.valori.push(c); ultima.ultimo = c; }
      else colonne.push({ valori: [c], ultimo: c });
    });
    colonne = colonne.filter(function (c) { return c.valori.length >= Math.max(2, dati.length * 0.3); }).map(function (c) {
      var v = c.valori.slice().sort(function (a, b) { return a - b; });
      return { centro: v[Math.floor(v.length / 2)], da: v[0], a: v[v.length - 1], k: null, numeri: [] };
    });
    if (colonne.length < 3) return [];
    function colonnaDelNumero(x) {
      var f = x.c.fine != null ? x.c.fine : x.c.x + 12, c = (x.c.x + f) / 2, best = null, d = Infinity;
      colonne.forEach(function (col) { var dd = c < col.da ? col.da - c : (c > col.a ? c - col.a : 0); if (dd < d) { d = dd; best = col; } });
      return d <= soglia * 2 ? best : null;
    }
    dati.forEach(function (d, riga) { d.valori = new Map(); d.nums.forEach(function (x) { var col = colonnaDelNumero(x); if (col && !d.valori.has(col)) { d.valori.set(col, x.v); col.numeri.push({ riga: riga, v: x.v }); } }); });
    // intestazioni lette (anche a pezzi) sopra la prima riga di dati
    var primo = dati[0].i;
    righe.slice(Math.max(0, primo - 4), primo).forEach(function (r) {
      r.celle.forEach(function (c) {
        var f = c.fine != null ? c.fine : c.x + c.testo.length * 5, parole = c.testo.split(/\s+/), pos = 0;
        parole.forEach(function (w) {
          var cx = c.x + (f - c.x) * (pos + w.length / 2) / Math.max(1, c.testo.length);
          pos += w.length + 1;
          var tipo = PAROLE.filter(function (p) { return p.re.test(w); })[0];
          if (!tipo) return;
          var best = null, d = Infinity;
          colonne.forEach(function (col) { var dd = Math.abs(col.centro - cx); if (dd < d) { d = dd; best = col; } });
          var gia = colonne.some(function (col) { return col.k === tipo.k; });
          if (best && !best.k && !gia && d <= soglia * 3) best.k = tipo.k;
        });
      });
    });
    // colonna del numero di riga: 1, 2, 3… crescente
    var libere = colonne.filter(function (c) { return !c.k; });
    if (libere.length && !colonne.some(function (c) { return c.k === 'idx'; })) {
      var prima = libere[0], crescenti = 0;
      for (var q = 1; q < prima.numeri.length; q++) if (prima.numeri[q].v > prima.numeri[q - 1].v) crescenti++;
      var uguali = prima.numeri.filter(function (x) { return x.v === x.riga + 1; }).length;
      if (prima.numeri.length >= 3 && colonne.indexOf(prima) === 0 && crescenti >= (prima.numeri.length - 1) * 0.7 &&
          (libere.length >= 5 || uguali >= prima.numeri.length * 0.5)) prima.k = 'idx';
    }
    // le altre in ordine: Colli, L, P, H, Peso
    libere = colonne.filter(function (c) { return !c.k; });
    var ruoli = ['n', 'l', 'p', 'h', 'peso'].filter(function (k) { return !colonne.some(function (c) { return c.k === k; }); });
    if (libere.length < ruoli.length && ruoli[0] === 'n') {
      var mediana = function (col) { var v = col.numeri.map(function (x) { return x.v; }).sort(function (a, b) { return a - b; }); return v[Math.floor(v.length / 2)]; };
      if (!(libere.length && mediana(libere[0]) <= 20)) ruoli.shift(); // la prima non sono colli: manca la colonna colli
    }
    libere.forEach(function (c, k) { c.k = ruoli[k] || 'altro'; });
    return dati.map(function (d) {
      var v = {};
      d.valori.forEach(function (val, col) { if (col.k && col.k !== 'idx' && col.k !== 'altro' && v[col.k] == null) v[col.k] = val; });
      var n = v.n && v.n > 0 && v.n < 1000 ? v.n : null;
      var tipo = d.testo.match(RE_TIPO);
      return { nome: tipo ? maiuscola(tipo[1]) : '', n: n || 1, l: v.l, p: v.p, h: v.h, peso: v.peso,
        impilabile: !RE_NS.test(d.r.testo), incompleta: incerta(d.r) || v.l == null || v.p == null || v.h == null || v.peso == null || !n };
    });
  }

  // numeri letti con poca sicurezza dalla foto: la riga va controllata
  var SICUREZZA_MINIMA = 80;
  function incerta(r) { return r && r.confMin != null && r.confMin < SICUREZZA_MINIMA; }

  function estraiMisure(righe) {
    var risultato = null, modo = 'righe';
    for (var i = 0; i < righe.length && !risultato; i++) {
      var col = intestazione(righe[i]);
      if (col) { var t = daTabella(righe, i, col); if (t.length) { risultato = t; modo = 'tabella'; } }
    }
    if (!risultato) {
      risultato = [];
      righe.forEach(function (r) {
        var x = daRiga(r.testo.replace(/\s*\|\s*/g, ' '));
        if (x) { if (incerta(r)) x.incompleta = true; risultato.push(x); }
      });
    }
    // tabella di numeri senza intestazioni leggibili: se trova più righe, vince lei
    var numeriche = daColonneNumeriche(righe);
    if (numeriche.length > risultato.length) { risultato = numeriche; modo = 'colonne'; }
    return { modo: modo, righe: unita(risultato).map(function (r) {
      return { nome: r.nome || '', n: r.n || 1, l: r.l == null ? '' : r.l, p: r.p == null ? '' : r.p, h: r.h == null ? '' : r.h,
        peso: r.peso == null ? '' : r.peso, impilabile: r.impilabile !== false,
        incompleta: !!r.incompleta || r.l == null || r.p == null || r.h == null };
    }) };
  }

  var api = { estraiMisure: estraiMisure, _daRiga: daRiga };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else globale.Misure = api;
})(this);
