/*
 * Ottimizzazione del giro di ritiri e consegne.
 *  1. righeDaPdf: estrae le righe di testo da un PDF (con pdf.js), con le posizioni delle celle
 *  2. estraiTappe: riconosce le tappe (tipo, cliente, indirizzo, colli, peso) dalle righe
 *  3. ottimizzaGiro: trova l'ordine di visita con meno km, partendo dal deposito
 * Funziona sia nel browser sia in Node (per le prove).
 */
(function (globale) {
  'use strict';

  // ---------- 1. Righe dal PDF ----------
  // Raggruppa i pezzi di testo per riga (stessa altezza) e li ordina da sinistra a destra
  function righeDaPdf(pdf) {
    var pagine = [];
    for (var p = 1; p <= pdf.numPages; p++) pagine.push(p);
    return pagine.reduce(function (catena, n) {
      return catena.then(function (tutte) {
        return pdf.getPage(n).then(function (pagina) { return pagina.getTextContent(); }).then(function (tc) {
          var righe = [];
          tc.items.forEach(function (it) {
            var testo = (it.str || '').replace(/\s+/g, ' ');
            if (!testo.trim()) return;
            var x = it.transform[4], y = it.transform[5];
            var r = righe.filter(function (q) { return Math.abs(q.y - y) < 2.5; })[0];
            if (!r) { r = { y: y, celle: [] }; righe.push(r); }
            r.celle.push({ x: x, fine: x + (it.width || testo.length * 4), testo: testo });
          });
          righe.sort(function (a, b) { return b.y - a.y; });
          righe.forEach(function (r) {
            r.celle.sort(function (a, b) { return a.x - b.x; });
            // unisce i pezzi attaccati (stessa parola spezzata) e separa le celle distanti
            var unite = [];
            r.celle.forEach(function (c) {
              var u = unite[unite.length - 1];
              if (u && c.x - u.fine < 3) { u.testo += (c.x - u.fine > 0.8 ? ' ' : '') + c.testo; u.fine = c.fine; }
              else unite.push({ x: c.x, fine: c.fine, testo: c.testo });
            });
            r.celle = unite.map(function (c) { return { x: c.x, fine: c.fine, testo: c.testo.trim() }; }).filter(function (c) { return c.testo; });
            r.testo = r.celle.map(function (c) { return c.testo; }).join(' | ');
            r.pagina = n;
          });
          return tutte.concat(righe);
        });
      });
    }, Promise.resolve([]));
  }

  // ---------- 2. Riconoscimento delle tappe ----------
  var RE_VIA = /\b(via|viale|v\.le|piazza|p\.zza|p\.za|piazzale|p\.le|corso|c\.so|largo|strada|str\.|localit[aà]|loc\.|frazione|fraz\.|vicolo|borgo|lungarno|zona industriale|z\.\s?i\.|contrada|c\.da|regione)\b/i;
  var RE_CAP = /\b(\d{5})\b/;
  var RE_COLLI = /(\d+)\s*(?:colli|collo|plt|pallet|bancali|bancale|pz|pezzi|cartoni)\b|\bcolli\s*[:=]?\s*(\d+)/i;
  var RE_PESO = /(\d+(?:[.,]\d+)?)\s*kg\b|\bpeso(?:\s*kg)?\s*[:=]?\s*(\d+(?:[.,]\d+)?)/i;
  var RE_RITIRO = /\b(ritir[oiae]\w*|presa|prelievo|carico|pick\s?-?up|mittente)\b/i;
  var RE_CONSEGNA = /\b(consegn\w*|scarico|destinatario|recapito|delivery)\b/i;

  function tipoDa(testo) {
    var r = RE_RITIRO.test(testo), c = RE_CONSEGNA.test(testo);
    if (r && !c) return 'ritiro';
    if (c && !r) return 'consegna';
    return '';
  }
  function numero(v) {
    var t = String(v == null ? '' : v).trim().replace(/\s/g, '');
    if (!t) return '';
    if (/,\d+$/.test(t)) t = t.replace(/\./g, '').replace(',', '.');        // 1.455,00
    else if (/^\d{1,3}(\.\d{3})+$/.test(t)) t = t.replace(/\./g, '');      // 3.827 (migliaia)
    var n = parseFloat(t);
    return isFinite(n) ? n : '';
  }
  function pulisci(s) { return String(s || '').replace(/\s*\|\s*/g, ' ').replace(/\s+/g, ' ').replace(/^[\s\-–,;:.]+|[\s\-–,;:]+$/g, '').trim(); }

  // Modalità tabella: c'è una riga di intestazione con Indirizzo e CAP/Località
  var COLONNE = {
    tipo: /^(tipo|operazione|servizio|r\/c|attivit[aà])/i,
    nome: /^(cliente|ragione sociale|destinatario|mittente|nominativo|ditta|azienda|nome)/i,
    indirizzo: /^(indirizzo|via|luogo)/i,
    cap: /^cap$/i,
    localita: /^(localit[aà]|citt[aà]|comune|paese)/i,
    prov: /^(prov|pr\.?)$/i,
    colli: /^(colli|n\.? ?colli|pz)/i,
    pallet: /^(pallet|plt|bancali)$/i,
    peso: /^(peso|kg)/i,
    note: /^(note|annotazioni|orari?|osservazioni)/i
  };
  function intestazione(r) {
    var usate = {}, colonne = [];
    r.celle.forEach(function (c) {
      var k = Object.keys(COLONNE).filter(function (x) { return !usate[x] && COLONNE[x].test(c.testo.trim()); })[0];
      if (k) usate[k] = true;
      colonne.push({ k: k || 'altro', x: c.x, fine: c.fine != null ? c.fine : c.x + c.testo.length * 5, testo: c.testo });
    });
    var trovate = Object.keys(usate).length;
    if (!(usate.indirizzo && (usate.cap || usate.localita) && trovate >= 3)) return null;
    colonne.forEach(function (c) {
      if (c.k === 'nome') c.dueRighe = /mittente/i.test(c.testo) && /destinatario/i.test(c.testo);
      if (c.k === 'tipo') c.rc = /^r\s*\/\s*c$/i.test(c.testo.trim());
    });
    return colonne;
  }
  // A quale colonna appartiene una cella: quella con cui si sovrappone di più in orizzontale
  // (le intestazioni sono spesso centrate, i dati allineati a sinistra)
  function colonnaDi(colonne, c) {
    var fine = c.fine != null ? c.fine : c.x + c.testo.length * 5, best = null, bestSov = 0;
    colonne.forEach(function (h) {
      var sov = Math.min(fine, h.fine) - Math.max(c.x, h.x);
      if (sov > bestSov) { bestSov = sov; best = h; }
    });
    if (best) return best;
    var centro = (c.x + fine) / 2, dist = Infinity;
    colonne.forEach(function (h) { var d = Math.abs((h.x + h.fine) / 2 - centro); if (d < dist) { dist = d; best = h; } });
    return best;
  }
  // Colonna R/C: "3" = consegna, "13 RIT" = ritiro
  function tipoDaColonna(testo, rc) {
    var t = String(testo || '').trim();
    if (/\bRIT\b|^R$/i.test(t)) return 'ritiro';
    if (/\bCONS?\b|^C$/i.test(t)) return 'consegna';
    if (rc && /^\d+$/.test(t)) return 'consegna';
    return tipoDa(t);
  }
  // Le celle che iniziano nella stessa posizione formano una colonna vera: la colonna intera
  // (con la sua larghezza massima) viene abbinata all'intestazione con cui si sovrappone di più
  function colonneDati(righe, i0, colonne) {
    var gruppi = [];
    for (var i = i0 + 1; i < righe.length; i++) {
      righe[i].celle.forEach(function (c) {
        var fine = c.fine != null ? c.fine : c.x + c.testo.length * 5;
        var g = gruppi.filter(function (x) { return Math.abs(x.x - c.x) <= 4; })[0];
        if (!g) { g = { x: c.x, min: c.x, fine: fine, n: 0 }; gruppi.push(g); }
        g.min = Math.min(g.min, c.x); g.fine = Math.max(g.fine, fine); g.n++;
      });
    }
    gruppi.forEach(function (g) { g.col = colonnaDi(colonne, { x: g.min, fine: g.fine, testo: '' }); });
    return function (c) {
      var g = gruppi.filter(function (x) { return Math.abs(x.x - c.x) <= 4; })[0];
      return g ? g.col : colonnaDi(colonne, c);
    };
  }

  function daTabella(righe, i0, colonne) {
    var tappe = [], ultima = null;
    var colonnaCella = colonneDati(righe, i0, colonne);
    var colTipo = colonne.filter(function (h) { return h.k === 'tipo'; })[0];
    var colNome = colonne.filter(function (h) { return h.k === 'nome'; })[0];
    for (var i = i0 + 1; i < righe.length; i++) {
      var r = righe[i];
      if (intestazione(r)) { ultima = null; continue; } // intestazione ripetuta su una nuova pagina
      var v = {}, chiavi = {};
      r.celle.forEach(function (c) {
        var h = colonnaCella(c);
        v[h.k] = (v[h.k] ? v[h.k] + ' ' : '') + c.testo;
        chiavi[h.k] = true;
      });
      var soloNome = Object.keys(chiavi).every(function (k) { return k === 'nome' || k === 'note'; });
      if (!v.indirizzo || !(v.localita || v.cap)) {
        // riga che continua la tappa precedente: note o secondo nome (destinatario)
        if (ultima && soloNome) {
          var testo = pulisci((v.nome || '') + ' ' + (v.note || ''));
          if (/^note\s*:/i.test(testo) || ultima.inNote) {
            ultima.note = pulisci((ultima.note ? ultima.note + ' ' : '') + testo.replace(/^note\s*:\s*/i, ''));
            ultima.inNote = true;
          } else if (!ultima.secondoNome && colNome && colNome.dueRighe) {
            ultima.secondoNome = testo;
          } else {
            ultima.note = pulisci((ultima.note ? ultima.note + ' ' : '') + testo);
          }
        } else if (!soloNome) ultima = null; // totali, piè di pagina: fine delle tappe
        continue;
      }
      // con la colonna R/C, una tappa vera ha un numero in quella colonna
      if (colTipo && colTipo.rc && !/\d/.test(v.tipo || '')) { ultima = null; continue; }
      var cap = (String(v.cap || '').match(RE_CAP) || [])[1] || (String(v.localita || '').match(RE_CAP) || [])[1] || '';
      var loc = pulisci(String(v.localita || '').replace(RE_CAP, ''));
      var prov = pulisci(v.prov || '');
      ultima = {
        tipo: tipoDaColonna(v.tipo, colTipo && colTipo.rc) || tipoDa(r.testo),
        nome: pulisci(v.nome || ''),
        indirizzo: pulisci([v.indirizzo, [cap, loc].filter(Boolean).join(' ') + (prov ? ' ' + prov : '')].filter(Boolean).join(', ')),
        colli: numero((String(v.colli || '').match(/\d+/) || [])[0]),
        peso: numero((String(v.peso || '').match(/\d[\d.,]*/) || [])[0]),
        note: pulisci(v.note || ''),
        pallet: v.pallet
      };
      tappe.push(ultima);
    }
    // Consegne: la merce va al destinatario (seconda riga); il mittente resta nelle note
    return tappe.map(function (t) {
      var nome = t.nome, note = t.note;
      if (t.secondoNome) {
        if (t.tipo === 'ritiro') note = pulisci('Per: ' + t.secondoNome + (note ? ' – ' + note : ''));
        else { nome = t.secondoNome; note = pulisci('Mitt.: ' + String(t.nome).replace(/([A-Za-z])\d{3,}$/, '$1') + (note ? ' – ' + note : '')); }
      }
      var pallet = numero((String(t.pallet || '').match(/\d+/) || [])[0]);
      if (pallet) note = pulisci(pallet + (pallet === 1 ? ' pallet' : ' pallet') + (note ? ' – ' + note : ''));
      return { tipo: t.tipo, nome: nome, indirizzo: t.indirizzo, colli: t.colli, peso: t.peso, note: note };
    });
  }

  // Modalità blocchi: ogni tappa è su una o più righe
  var RE_INIZIO = /^\s*(?:n\.?\s*)?\d{1,3}\s*[)\].\-–:]\s*|^\s*(?:ritir|consegn|scaric|presa)/i;
  function daBlocchi(righe) {
    var testi = righe.map(function (r) { return r.testo.replace(/\s*\|\s*/g, ' ').trim(); }).filter(Boolean);
    var blocchi = [], corrente = null;
    var conInizio = testi.filter(function (t) { return RE_INIZIO.test(t); }).length >= 2;
    // Una tappa per riga: quasi tutte le righe contengono CAP e località
    var conCap = testi.filter(function (t) { return RE_CAP.test(t) && /[a-zà-ÿ]{3}/i.test(t.replace(RE_CAP, '')); }).length;
    var unaPerRiga = testi.length >= 1 && conCap >= Math.max(1, testi.length * 0.7);
    testi.forEach(function (t) {
      if (unaPerRiga) { blocchi.push([t]); return; }
      if (conInizio) {
        if (RE_INIZIO.test(t)) { corrente = [t]; blocchi.push(corrente); }
        else if (corrente) corrente.push(t);
      } else {
        if (!corrente) { corrente = []; blocchi.push(corrente); }
        corrente.push(t);
        if (RE_CAP.test(t) && /[a-zà-ÿ]{3}/i.test(t.replace(RE_CAP, ''))) corrente = null;
      }
    });
    var tappe = [];
    blocchi.forEach(function (b) {
      var testo = b.join('\n');
      if (!RE_CAP.test(testo) && !RE_VIA.test(testo)) return;
      var tappa = { tipo: tipoDa(testo), nome: '', indirizzo: '', colli: '', peso: '', note: '' };
      var mc = testo.match(RE_COLLI); if (mc) tappa.colli = numero(mc[1] || mc[2]);
      var mp = testo.match(RE_PESO); if (mp) tappa.peso = numero(mp[1] || mp[2]);
      // riga con CAP e località; riga con la via
      var parti = [], resto = [];
      b.forEach(function (riga, k) {
        var r = riga;
        if (k === 0) r = r.replace(/^\s*(?:n\.?\s*)?\d{1,3}\s*[)\].\-–:]\s*/i, '').replace(/^(ritir\w*|consegn\w*|scaric\w*|presa)\b\s*[-–:]?\s*/i, '');
        var mVia = r.match(RE_VIA), mCap = r.match(RE_CAP);
        // Nella prima riga (numero, tipo, cliente) una parola come "Borgo" o "Corso" fa parte del nome,
        // a meno che dopo ci sia un numero civico
        if (mVia && k === 0 && !/\d/.test(r.slice(r.indexOf(mVia[0])))) mVia = null;
        if (mVia) {
          var da = r.indexOf(mVia[0]);
          if (da > 0 && !tappa.nome) tappa.nome = pulisci(r.slice(0, da));
          var via = r.slice(da);
          if (mCap && via.indexOf(mCap[1]) > 0) {
            parti.push(pulisci(via.slice(0, via.indexOf(mCap[1]))));
            parti.push(capLocalita(via.slice(via.indexOf(mCap[1]))));
          } else parti.push(pulisci(via.split(/\s[-–]\s|colli|peso|kg/i)[0]));
        } else if (mCap && !/tel|fax|p\.?\s?iva|cod/i.test(r.slice(0, r.indexOf(mCap[1])))) {
          var prima = r.slice(0, r.indexOf(mCap[1]));
          if (prima.trim() && !tappa.nome && !parti.length) tappa.nome = pulisci(prima);
          parti.push(capLocalita(r.slice(r.indexOf(mCap[1]))));
        } else if (!tappa.nome && k <= 1) {
          tappa.nome = pulisci(r.split(/\s[-–]\s/).slice(-1)[0] === r ? r : r.split(/\s[-–]\s/).slice(1).join(' - ') || r);
        } else resto.push(r);
      });
      tappa.nome = pulisci(tappa.nome.replace(/^(ritir\w*|consegn\w*)\s*[-–:]?\s*/i, ''));
      tappa.indirizzo = pulisci(parti.filter(Boolean).join(', '));
      tappa.note = pulisci(resto.join(' ')
        .replace(/\bpeso\b\s*(?:kg)?\s*[:=]?\s*\d+(?:[.,]\d+)?\s*(?:kg)?/gi, '')
        .replace(/\d+(?:[.,]\d+)?\s*kg\b/gi, '')
        .replace(/\bcolli\b\s*[:=]?\s*\d+/gi, '')
        .replace(/\d+\s*(?:colli|collo|plt|pallet|bancali|bancale|pz|pezzi|cartoni)\b/gi, '')
        .replace(/^[\s\-–,]+|[\s\-–,]+$/g, '').replace(/\s[-–]\s[-–]\s/g, ' - '));
      if (tappa.indirizzo) tappe.push(tappa);
    });
    return tappe;
  }
  // "52100 Arezzo (AR) 3 colli" -> "52100 Arezzo AR"
  function capLocalita(s) {
    var m = String(s).match(/(\d{5})\s+([^|,\d(]+?)(?:\s*\(?\s*([A-Z]{2})\s*\)?)?(?=\s*(?:$|[|,\-–]|\d|colli|peso|kg|tel))/);
    if (!m) return pulisci(String(s).split(/colli|peso|kg|\s[-–]\s/i)[0]);
    return pulisci(m[1] + ' ' + m[2] + (m[3] ? ' ' + m[3] : ''));
  }

  function estraiTappe(righe) {
    for (var i = 0; i < righe.length; i++) {
      var m = intestazione(righe[i]);
      if (m) { var t = daTabella(righe, i, m); if (t.length) return { tappe: t, modo: 'tabella' }; }
    }
    return { tappe: daBlocchi(righe), modo: 'blocchi' };
  }

  // Righe scritte o incollate a mano: una tappa per riga
  function righeDaTesto(testo) {
    return String(testo || '').split(/\r?\n/).map(function (t) {
      return { testo: t.replace(/\t/g, ' | '), celle: t.split(/\t/).map(function (c, i) { return { x: i * 100, testo: c.trim() }; }).filter(function (c) { return c.testo; }) };
    }).filter(function (r) { return r.testo.trim(); });
  }

  // ---------- 3. Ottimizzazione ----------
  // D: matrice delle distanze (km), indice 0 = deposito, 1..n = tappe.
  // gruppi[i]: ordine obbligato (0 = urgenti, 1 = consegne se "prima le consegne", 2 = resto).
  function costo(D, seq, rientro) {
    var c = 0, prec = 0;
    for (var i = 0; i < seq.length; i++) { c += D[prec][seq[i]]; prec = seq[i]; }
    if (rientro) c += D[prec][0];
    return c;
  }
  function valida(seq, gruppi) {
    for (var i = 1; i < seq.length; i++) if (gruppi[seq[i]] < gruppi[seq[i - 1]]) return false;
    return true;
  }
  // Partenza "dal più vicino", rispettando l'ordine dei gruppi
  function piuVicino(D, gruppi, n) {
    var seq = [], liberi = [];
    for (var i = 1; i <= n; i++) liberi.push(i);
    var prec = 0;
    while (liberi.length) {
      var g = Math.min.apply(null, liberi.map(function (x) { return gruppi[x]; }));
      var best = null;
      liberi.forEach(function (x) { if (gruppi[x] === g && (best === null || D[prec][x] < D[prec][best])) best = x; });
      seq.push(best); liberi.splice(liberi.indexOf(best), 1); prec = best;
    }
    return seq;
  }
  // Inserimento più economico: costruisce il giro aggiungendo ogni tappa dove costa meno
  function inserimento(D, gruppi, n, rientro) {
    var ordine = [];
    for (var i = 1; i <= n; i++) ordine.push(i);
    ordine.sort(function (a, b) { return (gruppi[a] - gruppi[b]) || (D[0][b] - D[0][a]); });
    var seq = [];
    ordine.forEach(function (x) {
      var best = null, bestC = Infinity;
      for (var p = 0; p <= seq.length; p++) {
        var prova = seq.slice(0, p).concat([x], seq.slice(p));
        if (!valida(prova, gruppi)) continue;
        var c = costo(D, prova, rientro);
        if (c < bestC) { bestC = c; best = prova; }
      }
      seq = best;
    });
    return seq;
  }
  // Miglioramenti locali: inversione di tratti (2-opt) e spostamento di 1-3 tappe (or-opt)
  function migliora(D, seq, gruppi, rientro) {
    var migliore = costo(D, seq, rientro), cambiato = true, giri = 0;
    while (cambiato && giri++ < 200) {
      cambiato = false;
      for (var i = 0; i < seq.length - 1; i++) {
        for (var j = i + 1; j < seq.length; j++) {
          var prova = seq.slice(0, i).concat(seq.slice(i, j + 1).reverse(), seq.slice(j + 1));
          if (!valida(prova, gruppi)) continue;
          var c = costo(D, prova, rientro);
          if (c < migliore - 1e-9) { seq = prova; migliore = c; cambiato = true; }
        }
      }
      for (var lung = 1; lung <= 3; lung++) {
        for (var a = 0; a + lung <= seq.length; a++) {
          var pezzo = seq.slice(a, a + lung), senza = seq.slice(0, a).concat(seq.slice(a + lung));
          for (var p = 0; p <= senza.length; p++) {
            if (p === a) continue;
            [pezzo, pezzo.slice().reverse()].forEach(function (pz) {
              var prova2 = senza.slice(0, p).concat(pz, senza.slice(p));
              if (!valida(prova2, gruppi)) return;
              var c2 = costo(D, prova2, rientro);
              if (c2 < migliore - 1e-9) { seq = prova2; migliore = c2; cambiato = true; }
            });
            if (cambiato) break;
          }
          if (cambiato) break;
        }
        if (cambiato) break;
      }
    }
    return seq;
  }

  // Soluzione esatta (programmazione dinamica) fino a 15 tappe: garantisce il giro più corto
  function esatto(D, gruppi, n, rientro) {
    var PIENO = (1 << n) - 1, INF = Infinity;
    var dp = new Float64Array((1 << n) * n).fill(INF), da = new Int16Array((1 << n) * n).fill(-1);
    // per ogni gruppo, la maschera delle tappe di gruppo inferiore (vanno visitate prima)
    var prima = [];
    for (var j = 0; j < n; j++) {
      var m = 0;
      for (var k = 0; k < n; k++) if (gruppi[k + 1] < gruppi[j + 1]) m |= 1 << k;
      prima.push(m);
    }
    for (j = 0; j < n; j++) if (!prima[j]) dp[(1 << j) * n + j] = D[0][j + 1];
    for (var mask = 1; mask <= PIENO; mask++) {
      for (var ultimo = 0; ultimo < n; ultimo++) {
        var v = dp[mask * n + ultimo];
        if (v === INF) continue;
        for (j = 0; j < n; j++) {
          if (mask & (1 << j) || (prima[j] & mask) !== prima[j]) continue;
          var nm = mask | (1 << j), c = v + D[ultimo + 1][j + 1];
          if (c < dp[nm * n + j]) { dp[nm * n + j] = c; da[nm * n + j] = ultimo; }
        }
      }
    }
    var best = INF, fine = -1;
    for (j = 0; j < n; j++) {
      var tot = dp[PIENO * n + j] + (rientro ? D[j + 1][0] : 0);
      if (tot < best) { best = tot; fine = j; }
    }
    var seq = [], mk = PIENO, cur = fine;
    while (cur >= 0) { seq.unshift(cur + 1); var pr = da[mk * n + cur]; mk &= ~(1 << cur); cur = pr; }
    return seq;
  }

  // Oltre 15 tappe: ricerca locale ripetuta con piccole perturbazioni (circa 1,5 secondi al massimo)
  function ricercaRipetuta(D, seq, gruppi, rientro) {
    var best = seq, bestC = costo(D, seq, rientro), cur = seq, curC = bestC;
    var inizio = Date.now(), n = seq.length, seme = 12345;
    function caso(m) { seme = (seme * 1103515245 + 12345) & 0x7fffffff; return seme % m; }
    for (var it = 0; it < 3000 && Date.now() - inizio < 1500; it++) {
      // "doppio ponte": taglia il giro in 4 pezzi e li ricompone in un altro ordine
      var a = 1 + caso(n - 3), b = a + 1 + caso(n - a - 2), c = b + 1 + caso(n - b - 1);
      var prova = cur.slice(0, a).concat(cur.slice(b, c), cur.slice(a, b), cur.slice(c));
      if (!valida(prova, gruppi)) continue;
      prova = migliora(D, prova, gruppi, rientro);
      var pc = costo(D, prova, rientro);
      if (pc < curC - 1e-9) { cur = prova; curC = pc; }
      if (pc < bestC - 1e-9) { best = prova; bestC = pc; }
    }
    return best;
  }

  // opz: { tappe: [{tipo, urgente}], rientro, consegnePrima }
  function ottimizzaGiro(D, opz) {
    var n = opz.tappe.length, gruppi = [0];
    opz.tappe.forEach(function (t) {
      gruppi.push(t.urgente ? 0 : (opz.consegnePrima ? (t.tipo === 'ritiro' ? 2 : 1) : 2));
    });
    var originale = [];
    for (var i = 1; i <= n; i++) originale.push(i);
    var candidati = [piuVicino(D, gruppi, n), inserimento(D, gruppi, n, opz.rientro)];
    // anche l'ordine del documento, se rispetta le regole, è un buon punto di partenza
    if (valida(originale, gruppi)) candidati.push(originale.slice());
    var best = null, bestC = Infinity, metodo;
    if (n <= 15) {
      best = esatto(D, gruppi, n, opz.rientro); bestC = costo(D, best, opz.rientro); metodo = 'esatto';
    } else {
      candidati.forEach(function (s) {
        var m = migliora(D, s, gruppi, opz.rientro), c = costo(D, m, opz.rientro);
        if (c < bestC) { bestC = c; best = m; }
      });
      if (n >= 4) { best = ricercaRipetuta(D, best, gruppi, opz.rientro); bestC = costo(D, best, opz.rientro); }
      metodo = 'euristico';
    }
    return {
      metodo: metodo,
      ordine: best.map(function (x) { return x - 1; }),         // indici delle tappe (0..n-1)
      km: bestC,
      kmOriginale: costo(D, originale, opz.rientro)
    };
  }

  var api = { righeDaPdf: righeDaPdf, estraiTappe: estraiTappe, righeDaTesto: righeDaTesto, ottimizzaGiro: ottimizzaGiro, costo: costo, _esatto: esatto, _migliora: migliora, _ricerca: ricercaRipetuta, _valida: valida };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else globale.Giro = api;
})(this);
