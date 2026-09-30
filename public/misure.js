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
  // Intestazioni riconosciute: italiano, inglese, tedesco, francese, spagnolo
  // (le packing list estere usano "Length / Width / Height", "Qty", "Gross weight"...)
  var COLONNE = {
    n: /^(colli|collo|n\.?\s?colli|q\.?\s?t[aà]\.?|quantit[aà]|qta|n[°º.]?|nr\.?|num\.?|pz\.?|pezzi|nr\.?\s?packing|n\.?\s?of\s?(packages|pkgs?|pcs)|pcs\.?|pieces?|qty\.?|quantity|units?|no\.?\s?of\s?units|anzahl|st[uü]ck|colis|nombre|nb\.?\s?colis|bultos|cantidad|piezas)$/i,
    // "Packages" a volte è il numero dei colli, a volte il codice del collo (2973…): si decide dai valori
    pkg: /^(packages?|pkgs?\.?|packing|package\s?no\.?|pkg\s?no\.?|collo\s?n[°º.]?)$/i,
    l: /^(lungh?\.?|lunghezza|lung\.?|l\.?|length|len\.?|lenght|lg\.?|l[aä]nge|longueur|long\.?|largo)$/i,
    p: /^(largh?\.?|larghezza|larg\.?|p\.?|prof\.?|profondit[aà]|w\.?|width|wide|depth|breite|br\.?|largeur|ancho)$/i,
    h: /^(alt\.?|altezza|h\.?|height|heigth|high|hgt\.?|h[oö]he|hauteur|haut\.?|alto|altura)$/i,
    peso: /^(peso|peso\s?collo|peso\s?cad\.?|peso\s?lordo|peso\s?bruto|kg|kgs|weight|gross\s?weight|g\.?\s?w\.?|gross|wt\.?|weight\s?per\s?(unit|piece|pkg)|gewicht|brutto(gewicht)?|poids|poids\s?brut)$/i,
    pesoTot: /^(peso\s?tot\.?|peso\s?totale|tot\.?\s?kg|totale\s?kg|total\s?weight|total\s?gross\s?weight|tot\.?\s?weight|gesamtgewicht|poids\s?total)$/i,
    // colonne da ignorare: peso netto, volume (lo calcola il programma), codici e descrizioni
    net: /^(net\s?weight|net|n\.?\s?w\.?|peso\s?netto|netto|nettogewicht|poids\s?net)$/i,
    vol: /^(cube|cube\s?total|cbm|m3|m³|mc|volume|vol\.?|cubatura|total\s?cbm)$/i,
    desc: /^(description|descrizione|desc\.?|item|articolo|codice|code|ref\.?|riferimento|product|prodotto)$/i,
    misure: /^(misure|dimensioni|dim\.?|l\s?x\s?p\s?x\s?h|lxpxh|misure\s?cm|dimensions?|dims?\.?|size|measures?|l\s?x\s?w\s?x\s?h|lxwxh|abmessungen|ma[sß]e)$/i,
    nome: /^(tipo|imballo|tipo\s?imballo|packing\s?type|package\s?type|type)$/i,
    stack: /^(stackable|sovrapponibile|impilabile|stapelbar|gerbable)$/i,
    ns: /^(non\s?sovr.*|n\.?\s?s\.?|sovrapp.*|impil.*|non[\s-]?stackable|not\s?stackable|no\s?stack)$/i,
    note: /^(note|annotazioni|notes?|remarks?|bemerkung|remarques)$/i
  };
  // "Length (cm)", "Weight kg", "Peso (kg)" → si toglie l'unità di misura per riconoscere la colonna
  function senzaUnita(t) { return t.replace(/\s*[\(\[]?\s*\b(cm|mm|mt|m|kg|kgs|lbs?|in)\b\s*[\)\]]?\.?$/i, '').trim(); }
  function pulisciIntest(t) { return String(t || '').trim().replace(/^[\[\(|'‘"“]+|[\]\)|'’"”:_]+$/g, '').replace(/\s+/g, ' '); }
  function intestazione(r) {
    var colonne = [], usate = {};
    r.celle.forEach(function (c) {
      var t = pulisciIntest(c.testo), t2 = senzaUnita(t);
      var k = Object.keys(COLONNE).filter(function (x) { return !usate[x] && (COLONNE[x].test(t) || (t2 && COLONNE[x].test(t2))); })[0];
      if (k) usate[k] = true;
      colonne.push({ k: k || 'altro', x: c.x, fine: c.fine != null ? c.fine : c.x + t.length * 5, testo: t });
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
    var out = [], vuote = 0, conPeso = colonne.some(function (c) { return c.k === 'peso' || c.k === 'pesoTot'; });
    var conColli = colonne.some(function (c) { return c.k === 'n'; }), totale = null;
    for (var i = i0 + 1; i < righe.length; i++) {
      var r = righe[i], v = {};
      if (intestazione(r)) continue;
      // due righe di fila senza misure dopo la tabella: la tabella è finita (firma, indirizzi, telefoni…)
      if (vuote >= 2 && out.length) break;
      r.celle.forEach(function (c) { var h = colonnaDi(colonne, c); v[h.k] = (v[h.k] ? v[h.k] + ' ' : '') + c.testo; });
      // riga dei totali: non è un collo, ma serve a capire se il peso è del collo o della riga
      if (/^\s*(tot|totale|totali|total|totals|grand\s?total)\b/i.test(r.testo)) {
        totale = { peso: v.peso != null ? num((String(v.peso).match(/\d[\d.,]*/) || [])[0]) : null,
          n: v.n != null ? num((String(v.n).match(/\d+/) || [])[0]) : null };
        continue;
      }
      // "Packages": se non c'è la colonna colli e il valore è piccolo, è il numero dei colli; altrimenti è un codice
      if (!conColli && v.pkg != null) { var pk = num((String(v.pkg).match(/^\D*(\d+)\D*$/) || [])[1]); if (pk != null && pk > 0 && pk < 100) v.n = String(pk); }
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
      var sovr = String(v.stack || '').trim();
      riga.impilabile = !(/^(no|n|false|non?)$/i.test(sovr) || RE_NS.test(v.ns || '') || /^(s[iì]|x|✓|v)$/i.test(String(v.ns || '').trim()) || RE_NS.test(v.note || '') || RE_NS.test(v.nome || ''));
      var tipo = String(v.nome || v.altro || '').match(RE_TIPO);
      riga.nome = v.nome ? pulisciNome(v.nome) : (tipo ? maiuscola(tipo[1]) : '');
      var dims = [riga.l, riga.p, riga.h].filter(function (x) { return x != null; }).length;
      // colli mancanti = 1 collo (regola della packing list), senza segnalarlo
      riga.incompleta = incerta(r) || dims < 3 || (conPeso && riga.peso == null);
      if (dims >= 2 || (dims >= 1 && riga.peso != null)) { out.push(riga); vuote = 0; }
      else vuote++;
    }
    var intestPeso = colonne.filter(function (c) { return c.k === 'peso'; })[0];
    pesoPerCollo(out, totale && totale.peso, !!(intestPeso && /weight|gross|g\.?\s?w|brutto|poids/i.test(intestPeso.testo || '')));
    out.totali = totale;
    return out;
  }

  // Il peso scritto è del singolo collo o di tutta la riga (es. Qty 2, Gross Weight 40 = 2 colli da 20 kg)?
  // 1) se c'è la riga dei totali: si confronta la somma; 2) altrimenti le packing list in inglese ("Gross Weight")
  // indicano di solito il peso della riga, quelle italiane ("Peso collo") il peso del collo.
  function pesoPerCollo(righe, totalePeso, inglese) {
    var multiple = righe.filter(function (r) { return r.n > 1 && r.peso != null; });
    if (!multiple.length) return;
    var diRiga = inglese;
    if (totalePeso) {
      var sommaRighe = righe.reduce(function (a, r) { return a + (r.peso || 0); }, 0);
      var sommaColli = righe.reduce(function (a, r) { return a + (r.peso || 0) * (r.n || 1); }, 0);
      if (Math.abs(sommaRighe - totalePeso) <= totalePeso * 0.015) diRiga = true;
      else if (Math.abs(sommaColli - totalePeso) <= totalePeso * 0.015) diRiga = false;
    }
    if (diRiga) multiple.forEach(function (r) { r.peso = arrotonda(r.peso / r.n); });
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
    // prezzi e costi non sono pesi: "— > costo € 85.00 a plt", "+ iva", "Fuel 5 %"
    // (anche letti male: "c0sto", "E85.00", "∈140.00", e la freccia "—>" che di solito introduce il prezzo)
    dopo = dopo.replace(/(c[o0]st[o0]|prezz[o0]|tariff|imp[o0]rt[o0]|diritti|fuel|\biva\b|€|∈|\beur\b|eur[o0]|\bE\s?\d|[—–-]\s*>|=>)[\s\S]*$/i, '');
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
    // peso mancante: da controllare solo se sul foglio c'era un peso ("kg") che non si è letto
    return { nome: tipo ? maiuscola(tipo[1]) : '', n: n, l: d.l, p: d.p, h: d.h, peso: peso, impilabile: !RE_NS.test(t), incompleta: !!d.dubbia || (peso == null && /kg/i.test(t)) };
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
    // solo celle fatte di un numero (al massimo qualche segno attorno): "Top, 152cm, Round" non è un numero
    var s = String(t || '').trim().replace(/^[^\d]{0,2}/, '').replace(/[^\d]{0,3}$/, '');
    if (!/^\d{1,5}([.,]\d{1,3})?$/.test(s)) return null;
    return num(s);
  }
  // Parole delle intestazioni, anche lette a pezzi. prec = parola precedente ("Net Weight" ≠ "Gross Weight")
  function tipoParola(w, prec) {
    w = String(w || '').replace(/[^A-Za-zÀ-ú.]/g, ''); prec = String(prec || '').replace(/[^A-Za-zÀ-ú]/g, '');
    if (!w) return null;
    // "Weight" letto male: "Welt", "Welght", "Weigth", "Wejght"
    if (/^(w[ae][il1j]?[gq]?h?[ht]t?|weight|weigth|welght|kgs?|peso|gewicht|poids)\.?$/i.test(w) && !/^wh/i.test(w)) {
      if (/^(net|nett|netto|nw)$/i.test(prec)) return 'net';
      return 'peso';
    }
    if (/^(net|netto)$/i.test(w) || /^net\w{3,}/i.test(w)) return 'net';
    if (/^(gross|gres|gros|lordo|brutto)$/i.test(w)) return 'peso';
    if (/^(cube|cbm|m3|volume|vol\.?|cubatura|mc)$/i.test(w)) return 'vol';
    if (/^(total|totale)$/i.test(w) && /^(cube|cbm|vol)/i.test(prec)) return 'vol';
    if (/^pa?ck/i.test(w) && !/^packing$/i.test(w)) return 'pkg';
    if (/^(desc|item|articolo|codice|code)/i.test(w)) return 'desc';
    if (/^(colli|collo|qt|quantit|pz|pezzi|pcs|pieces?|qty|anzahl|colis|bultos|nrpacking|packing)/i.test(w)) return 'n';
    if (/^(lung|length|lenght|l[aä]nge|longueur)/i.test(w)) return 'l';
    if (/^(larg|prof|width|depth|breite|ancho)/i.test(w)) return 'p';
    if (/^(alt|height|heigth|h[oö]he|hauteur)/i.test(w)) return 'h';
    if (/^(n\.?|nr\.?|pos\.?|riga|#)$/i.test(w)) return 'idx';
    return null;
  }
  function daColonneNumeriche(righe) {
    // righe di dati: almeno 3 numeri e soprattutto numeri
    var dati = [];
    righe.forEach(function (r, i) {
      var nums = r.celle.map(function (c) { return { c: c, v: numeroCella(c.testo) }; });
      var quanti = nums.filter(function (x) { return x.v != null; }).length;
      var testo = r.celle.filter(function (c) { return numeroCella(c.testo) == null; }).map(function (c) { return c.testo; }).join(' ');
      if (quanti >= 3 && quanti >= r.celle.length * 0.5 && !/\b(tot|totale|totali|total|totals)\b/i.test(r.testo) && !/\d{1,2}\/\d{1,2}\/\d{2,4}/.test(r.testo))
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
    dati.forEach(function (d, riga) { d.valori = new Map(); d.nums.forEach(function (x) { var col = colonnaDelNumero(x); if (col && !d.valori.has(col)) { d.valori.set(col, x.v); col.numeri.push({ riga: riga, v: x.v, x: x.c.x, fine: x.c.fine != null ? x.c.fine : x.c.x + 12 }); } }); });
    var mediana = function (a) { a = a.slice().sort(function (p, q) { return p - q; }); return a[Math.floor(a.length / 2)]; };
    colonne.forEach(function (col) { col.sx = mediana(col.numeri.map(function (x) { return x.x; })); col.dx = mediana(col.numeri.map(function (x) { return x.fine; })); });
    // intestazioni lette (anche a pezzi) sopra la prima riga di dati. Ogni parola riconosciuta è un candidato;
    // la distanza da una colonna è la migliore tra bordo sinistro, bordo destro e centro (i numeri sono spesso
    // allineati a destra sotto il titolo). Poi si abbinano prima le coppie più vicine.
    var primo = dati[0].i, candidati = [];
    righe.slice(Math.max(0, primo - 4), primo).forEach(function (r) {
      r.celle.forEach(function (c) {
        var f = c.fine != null ? c.fine : c.x + c.testo.length * 5, parole = c.testo.split(/\s+/), pos = 0;
        var vere = c.parole && c.parole.length === parole.length ? c.parole : null;
        parole.forEach(function (w, iw) {
          var sx = vere ? vere[iw].x : c.x + (f - c.x) * pos / Math.max(1, c.testo.length);
          var dx = vere ? vere[iw].fine : c.x + (f - c.x) * (pos + w.length) / Math.max(1, c.testo.length);
          pos += w.length + 1;
          var k = tipoParola(w, parole[iw - 1]);
          if (!k || k === 'desc') return;
          // "Gross Weight": il titolo intero va dalla prima parola all'ultima
          if (iw > 0 && tipoParola(parole[iw - 1], parole[iw - 2]) === k) sx = vere ? vere[iw - 1].x : sx;
          candidati.push({ k: k, sx: sx, dx: dx });
        });
      });
    });
    // parole vicine dello stesso tipo ("Gross" + "Weight") diventano un titolo solo
    candidati.sort(function (a, b) { return a.sx - b.sx; });
    var titoli = [];
    candidati.forEach(function (cd) {
      var u = titoli[titoli.length - 1];
      if (u && u.k === cd.k && cd.sx - u.dx < soglia * 2) { u.dx = Math.max(u.dx, cd.dx); return; }
      titoli.push({ k: cd.k, sx: cd.sx, dx: cd.dx });
    });
    // Abbinamento titoli ↔ colonne rispettando l'ordine da sinistra a destra (Qty prima di Length, prima di
    // Width…): anche con posizioni stimate, un titolo non può finire sulla colonna sbagliata.
    var cols = colonne.slice().sort(function (a, b) { return a.centro - b.centro; });
    var distanza = function (t, col) { return Math.min(Math.abs(t.sx - col.sx), Math.abs(t.dx - col.dx), Math.abs((t.sx + t.dx) / 2 - col.centro)); };
    var nT = titoli.length, nC = cols.length, dp = [], da = [];
    for (var a = 0; a <= nT; a++) { dp.push([]); da.push([]); for (var b2 = 0; b2 <= nC; b2++) { dp[a].push(null); da[a].push(null); } }
    var meglio = function (x, y) { return !y || x.n > y.n || (x.n === y.n && x.d < y.d); };
    dp[0][0] = { n: 0, d: 0 };
    for (var a2 = 0; a2 <= nT; a2++) for (var b3 = 0; b3 <= nC; b3++) {
      var cur = dp[a2][b3]; if (!cur) continue;
      if (a2 < nT && meglio(cur, dp[a2 + 1][b3])) { dp[a2 + 1][b3] = { n: cur.n, d: cur.d }; da[a2 + 1][b3] = [a2, b3, false]; }
      if (b3 < nC && meglio(cur, dp[a2][b3 + 1])) { dp[a2][b3 + 1] = { n: cur.n, d: cur.d }; da[a2][b3 + 1] = [a2, b3, false]; }
      if (a2 < nT && b3 < nC) {
        var dd = distanza(titoli[a2], cols[b3]);
        if (dd <= soglia * 5) { var nuovo = { n: cur.n + 1, d: cur.d + dd }; if (meglio(nuovo, dp[a2 + 1][b3 + 1])) { dp[a2 + 1][b3 + 1] = nuovo; da[a2 + 1][b3 + 1] = [a2, b3, true]; } }
      }
    }
    var daTitolo = 0, pa = nT, pb = nC;
    while (pa > 0 || pb > 0) {
      var passo = da[pa][pb]; if (!passo) break;
      if (passo[2]) {
        var tt = titoli[passo[0]], cc = cols[passo[1]];
        if (!cc.k && !colonne.some(function (c) { return c.k === tt.k; })) { cc.k = tt.k; daTitolo++; }
      }
      pa = passo[0]; pb = passo[1];
    }
    // riconoscimento dai valori, per le intestazioni illeggibili
    function stat(col) {
      var v = col.numeri.map(function (x) { return x.v; });
      return { tanti: v.length, grandi: v.filter(function (x) { return x >= 1000 && x === Math.floor(x); }).length,
        decimaliPiccoli: v.filter(function (x) { return x < 20 && x !== Math.floor(x); }).length };
    }
    colonne.forEach(function (col) {
      if (col.k) return;
      var st = stat(col);
      var primaCol = colonne.indexOf(col) === 0;
      if (st.tanti && st.grandi >= st.tanti * (primaCol ? 0.5 : 0.7)) col.k = 'id';   // codici dei colli (2973, 2974…)
    });
    var ultimaLibera = colonne.filter(function (c) { return !c.k; }).slice(-1)[0];
    if (ultimaLibera && colonne.indexOf(ultimaLibera) === colonne.length - 1) {
      var su = stat(ultimaLibera);
      if (su.tanti && su.decimaliPiccoli >= su.tanti * 0.5) ultimaLibera.k = 'vol';   // metri cubi in fondo
    }
    // due pesi vicini (lordo e netto): il secondo è sempre minore o uguale al primo
    if (!colonne.some(function (c) { return c.k === 'peso'; })) {
      var lib = colonne.filter(function (c) { return !c.k; });
      for (var z = lib.length - 1; z > 0; z--) {
        var a = lib[z - 1], b = lib[z], coppie = 0, minori = 0;
        a.numeri.forEach(function (x) { var y = b.numeri.filter(function (q) { return q.riga === x.riga; })[0]; if (y) { coppie++; if (y.v <= x.v) minori++; } });
        if (coppie >= 3 && minori >= coppie * 0.8 && colonne.indexOf(b) === colonne.indexOf(a) + 1 && lib.length >= 5) { a.k = 'peso'; b.k = 'net'; break; }
      }
    }
    // "Packages" senza colonna colli: numeri piccoli = colli, numeri grandi = codici
    var colPkg = colonne.filter(function (c) { return c.k === 'pkg'; })[0];
    if (colPkg) {
      var vp = colPkg.numeri.map(function (x) { return x.v; }).sort(function (a, b) { return a - b; });
      colPkg.k = !colonne.some(function (c) { return c.k === 'n'; }) && vp.length && vp[Math.floor(vp.length / 2)] < 100 ? 'n' : 'id';
    }
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
      var medianaCol = function (col) { var v = col.numeri.map(function (x) { return x.v; }).sort(function (a, b) { return a - b; }); return v[Math.floor(v.length / 2)]; };
      if (!(libere.length && medianaCol(libere[0]) <= 20)) ruoli.shift(); // la prima non sono colli: manca la colonna colli
    }
    libere.forEach(function (c, k) { c.k = ruoli[k] || 'altro'; });
    if (typeof process !== 'undefined' && process.env && process.env.DEBUG_MISURE) console.log(colonne.map(function (c) { return Math.round(c.centro) + ':' + c.k + '(' + c.numeri.length + ')'; }).join(' '));
    var conPeso = colonne.some(function (c) { return c.k === 'peso'; });
    // packing list in inglese, anche con le parole lette male ("GOrene Welt", "Lenghticm)", "Wiethiem)")
    var inglese = righe.slice(Math.max(0, primo - 4), primo).some(function (r) { return /(weig|welt|welg|gross|gres|\bqty|lengh|lenght|length|width|wieth|height|heig|\bnet\s?w|cube|packag|packeg|descr)/i.test(r.testo); });
    var risultato = dati.map(function (d) {
      var v = {};
      d.valori.forEach(function (val, col) { if (['n', 'l', 'p', 'h', 'peso'].indexOf(col.k) >= 0 && v[col.k] == null) v[col.k] = val; });
      var n = v.n && v.n > 0 && v.n < 1000 ? v.n : null;
      var tipo = d.testo.match(RE_TIPO);
      // colli mancanti = 1 collo, senza segnalarlo (regola della packing list)
      return { nome: tipo ? maiuscola(tipo[1]) : '', n: n || 1, l: v.l, p: v.p, h: v.h, peso: v.peso,
        impilabile: !RE_NS.test(d.r.testo), incompleta: incerta(d.r) || v.l == null || v.p == null || v.h == null || (conPeso && v.peso == null) };
    });
    // riga dei totali
    var tot = righe.filter(function (r) { return /\b(total|totale|totali|tot)\b/i.test(r.testo); }).slice(-1)[0], totPeso = null;
    var totN = null;
    if (tot) tot.celle.forEach(function (c) { var val = numeroCella(c.testo); if (val == null) return; var col = colonnaDelNumero({ c: c }); if (col && col.k === 'peso') totPeso = val; if (col && col.k === 'n') totN = val; });
    pesoPerCollo(risultato, totPeso, inglese);
    risultato.titoli = daTitolo;
    risultato.ruoli = ['n', 'l', 'p', 'h', 'peso'].filter(function (k) { return colonne.some(function (c) { return c.k === k; }); }).length;
    risultato.totali = tot ? { peso: totPeso, n: totN } : null;
    return risultato;
  }

  // Una riga è "prosa" se, tolte misure, numeri, prezzi e parole tipiche delle misure, restano più di 3 parole
  var PAROLE_MISURE = /^(pallet|plt|pit|bancal[ei]|colli|collo|cass[ae]|cartoni?|pz|pezzi|pcs|cm|mm|kg|kgs|cad|x|n|nr|tot|totale|peso|ns|non|sovrapponibile|sovrapp|costo|prezzo|a|al|il|la|di|da|e|con|per|plt\.|euro|eur|iva|lordo|netto|circa|ca)$/i;
  function prosa(testo) {
    // parole "libere" scritte PRIMA delle misure: "come da conversazione, per i plt 200x110x60"
    var t = String(testo || ''), m = t.search(/\d+\s*[xX×*]\s*\d+/);
    var prima = m >= 0 ? t.slice(0, m) : t;
    var parole = prima.split(/[^A-Za-zÀ-ú]+/).filter(function (w) { return w.length >= 2 && !PAROLE_MISURE.test(w); });
    return parole.length >= 2;
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
        if (x) { if (incerta(r)) x.incompleta = true; x._prosa = prosa(r.testo); risultato.push(x); }
      });
      // misure dentro una frase ("come da conversazione, per i plt 200x110x60 costo…"): se c'è anche
      // un elenco, valgono solo le righe dell'elenco
      if (risultato.some(function (x) { return !x._prosa; })) risultato = risultato.filter(function (x) { return !x._prosa; });
    }
    // tabella di numeri senza intestazioni leggibili: se trova più righe, vince lei
    var numeriche = daColonneNumeriche(righe), titoli = modo === 'tabella' ? 5 : 0, totali = risultato.totali || null, ruoli = null;
    if (numeriche.length > risultato.length) { risultato = numeriche; modo = 'colonne'; titoli = numeriche.titoli || 0; totali = numeriche.totali || null; ruoli = numeriche.ruoli; }
    return { modo: modo, titoli: titoli, ruoli: ruoli, totali: controllaTotali(risultato, totali), righe: unita(risultato.filter(function (r) { return r.l != null || r.p != null || r.h != null; })).map(function (r) {
      return { nome: r.nome || '', n: r.n || 1, l: r.l == null ? '' : r.l, p: r.p == null ? '' : r.p, h: r.h == null ? '' : r.h,
        peso: r.peso == null ? '' : r.peso, impilabile: r.impilabile !== false,
        incompleta: !!r.incompleta || r.l == null || r.p == null || r.h == null };
    }) };
  }

  // Confronto con la riga "Total" del foglio: colli e peso tornano?
  function controllaTotali(righe, tot) {
    if (!tot || (tot.n == null && tot.peso == null)) return null;
    var colli = righe.reduce(function (a, r) { return a + (r.n || 1); }, 0);
    var peso = righe.reduce(function (a, r) { return a + (r.peso || 0) * (r.n || 1); }, 0);
    return {
      colliFoglio: tot.n, colliLetti: colli, colliOk: tot.n == null ? null : tot.n === colli,
      pesoFoglio: tot.peso, pesoLetto: arrotonda(peso), pesoOk: tot.peso == null ? null : Math.abs(peso - tot.peso) <= Math.max(1, tot.peso * 0.01)
    };
  }

  // Tra più letture della stessa foto sceglie la migliore: più righe con le tre misure, poi meno righe da controllare
  function migliore(letture) {
    var migliore = null, punti = -Infinity;
    letture.forEach(function (righe) {
      var ris = estraiMisure(righe);
      var complete = ris.righe.filter(function (r) { return r.l !== '' && r.p !== '' && r.h !== ''; }).length;
      var gialle = ris.righe.filter(function (r) { return r.incompleta; }).length;
      // colli poco credibili (272 colli in una riga = codice letto come numero di colli)
      var strani = ris.righe.filter(function (r) { return r.n > 50; }).length;
      var tt = ris.totali, bonus = (tt && tt.colliOk ? 20 : 0) + (tt && tt.pesoOk ? 20 : 0);
      // colonne trovate tra colli, lunghezza, larghezza, altezza, peso: una lettura che ha perso il peso vale meno
      var ruoli = ris.ruoli != null ? ris.ruoli : 0;
      var p = complete * 10 - gialle * 3 + ris.righe.length + (ris.titoli || 0) * 15 + ruoli * 30 - strani * 25 + bonus;
      if (p > punti) { punti = p; migliore = ris; }
    });
    return migliore || { modo: 'righe', righe: [] };
  }

  var api = { estraiMisure: estraiMisure, migliore: migliore, _daRiga: daRiga };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else globale.Misure = api;
})(this);
