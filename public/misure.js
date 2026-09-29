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
      if (dims >= 2 || (dims >= 1 && riga.peso != null)) out.push(riga);
    }
    return out;
  }

  // ---------- modo righe libere ----------
  function normalizza(t) {
    return String(t || '').replace(/[×✕✖*]/g, 'x').replace(/(\d)\s*[Xx]\s*(?=\d)/g, '$1x')
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
    return { nome: tipo ? maiuscola(tipo[1]) : '', n: n, l: d.l, p: d.p, h: d.h, peso: peso, impilabile: !RE_NS.test(t) };
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
        if (x) risultato.push(x);
      });
    }
    return { modo: modo, righe: unita(risultato).map(function (r) {
      return { nome: r.nome || '', n: r.n || 1, l: r.l == null ? '' : r.l, p: r.p == null ? '' : r.p, h: r.h == null ? '' : r.h,
        peso: r.peso == null ? '' : r.peso, impilabile: r.impilabile !== false };
    }) };
  }

  var api = { estraiMisure: estraiMisure, _daRiga: daRiga };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else globale.Misure = api;
})(this);
