/*
 * Calcolo del piano di carico.
 *
 * Sistema di riferimento (tutto in cm):
 *   x = lunghezza del vano, da 0 (parete cabina) verso le porte posteriori
 *   y = larghezza, da 0 (lato sinistro guardando dalla cabina) a destra
 *   z = altezza, da 0 (pianale) verso il tetto
 *
 * Metodo: "punti estremi" con riempimento dal fondo (cabina) verso le porte.
 * Ogni collo viene messo nel punto libero più vicino alla cabina, poi più in
 * basso, poi più a sinistra. Regole rispettate:
 *   - nessuna sovrapposizione e nessuna sporgenza dal vano
 *   - un collo sopra un altro deve appoggiare per almeno l'80% della base
 *   - non si appoggia nulla sopra un collo "non impilabile"
 *   - la somma dei pesi non supera la portata del mezzo
 *   - i colli si possono girare solo in orizzontale (mai coricare un bancale)
 */
(function (globale) {
  var APPOGGIO_MINIMO = 0.8;
  var MAX_COLLI = 1500;

  function espandiColli(righe) {
    var colli = [];
    righe.forEach(function (r, tipo) {
      var q = Math.max(0, Math.floor(Number(r.quantita) || 0));
      for (var i = 0; i < q; i++) {
        colli.push({
          tipo: tipo,
          nome: r.nome || 'Collo',
          l: Number(r.lunghezza), w: Number(r.larghezza), h: Number(r.altezza),
          peso: Number(r.peso) || 0,
          impilabile: r.impilabile !== false,
          ruotabile: r.ruotabile !== false
        });
      }
    });
    return colli;
  }

  function sovrappone(a1, a2, b1, b2) { return a1 < b2 && b1 < a2; }

  function pianificaCarico(mezzo, righe) {
    var L = Number(mezzo.lunghezza), W = Number(mezzo.larghezza), H = Number(mezzo.altezza);
    var portata = Number(mezzo.portata) || Infinity;
    var colli = espandiColli(righe);
    if (colli.length > MAX_COLLI) {
      throw new Error('Troppi colli in un solo calcolo (massimo ' + MAX_COLLI + ').');
    }

    // Ordine di carico: prima gli impilabili (fanno da base), poi base più
    // grande, poi più pesanti (i pesanti restano in basso).
    colli.sort(function (a, b) {
      if (a.impilabile !== b.impilabile) return a.impilabile ? -1 : 1;
      var ab = a.l * a.w, bb = b.l * b.w;
      if (ab !== bb) return bb - ab;
      if (a.peso !== b.peso) return b.peso - a.peso;
      if (a.h !== b.h) return b.h - a.h;
      return a.tipo - b.tipo;
    });

    var piazzati = [];
    var nonCaricati = [];
    var punti = [{ x: 0, y: 0, z: 0 }];
    var pesoTotale = 0;
    var ultimoTipo = null, puntiFalliti = null;

    function entra(x, y, z, l, w, h) {
      if (x + l > L || y + w > W || z + h > H) return false;
      var areaAppoggio = 0;
      for (var i = 0; i < piazzati.length; i++) {
        var b = piazzati[i];
        var sx = sovrappone(x, x + l, b.x, b.x + b.l);
        var sy = sovrappone(y, y + w, b.y, b.y + b.w);
        if (!sx || !sy) continue;
        if (sovrappone(z, z + h, b.z, b.z + b.h)) return false;
        if (z > 0 && Math.abs(b.z + b.h - z) < 0.01) {
          if (!b.impilabile) return false;
          var ox = Math.min(x + l, b.x + b.l) - Math.max(x, b.x);
          var oy = Math.min(y + w, b.y + b.w) - Math.max(y, b.y);
          areaAppoggio += ox * oy;
        }
      }
      if (z > 0 && areaAppoggio < APPOGGIO_MINIMO * l * w) return false;
      return true;
    }

    function dentroUnCollo(p) {
      for (var i = 0; i < piazzati.length; i++) {
        var b = piazzati[i];
        if (p.x >= b.x && p.x < b.x + b.l && p.y >= b.y && p.y < b.y + b.w && p.z >= b.z && p.z < b.z + b.h) return true;
      }
      return false;
    }

    // Fa "scivolare" un punto verso il basso / verso sinistra / verso la cabina
    // fino al primo ostacolo, così non restano spazi vuoti.
    function proietta(p, asse) {
      var q = { x: p.x, y: p.y, z: p.z }, lim = 0;
      for (var i = 0; i < piazzati.length; i++) {
        var b = piazzati[i];
        if (asse === 'z') {
          if (p.x >= b.x && p.x < b.x + b.l && p.y >= b.y && p.y < b.y + b.w && b.z + b.h <= p.z) lim = Math.max(lim, b.z + b.h);
        } else if (asse === 'y') {
          if (p.x >= b.x && p.x < b.x + b.l && p.z >= b.z && p.z < b.z + b.h && b.y + b.w <= p.y) lim = Math.max(lim, b.y + b.w);
        } else {
          if (p.y >= b.y && p.y < b.y + b.w && p.z >= b.z && p.z < b.z + b.h && b.x + b.l <= p.x) lim = Math.max(lim, b.x + b.l);
        }
      }
      q[asse] = lim;
      return q;
    }

    function chiave(p) { return p.x + ',' + p.y + ',' + p.z; }

    for (var c = 0; c < colli.length; c++) {
      var collo = colli[c];
      if (pesoTotale + collo.peso > portata) {
        nonCaricati.push({ nome: collo.nome, tipo: collo.tipo, motivo: 'peso' });
        continue;
      }

      // Colli identici consecutivi: i punti già falliti restano falliti
      var firma = [collo.l, collo.w, collo.h, collo.impilabile, collo.ruotabile].join('|');
      if (firma !== ultimoTipo) { ultimoTipo = firma; puntiFalliti = {}; }

      punti.sort(function (a, b) { return (a.x - b.x) || (a.z - b.z) || (a.y - b.y); });

      var orient = [[collo.l, collo.w]];
      if (collo.ruotabile && collo.l !== collo.w) orient.push([collo.w, collo.l]);

      var scelta = null;
      for (var p = 0; p < punti.length && !scelta; p++) {
        var pt = punti[p], k = chiave(pt);
        if (puntiFalliti[k]) continue;
        // Scegli l'orientamento che occupa meno lunghezza del vano
        var migliore = null;
        for (var o = 0; o < orient.length; o++) {
          var ol = orient[o][0], ow = orient[o][1];
          if (entra(pt.x, pt.y, pt.z, ol, ow, collo.h)) {
            if (!migliore || ol < migliore.l) migliore = { l: ol, w: ow };
          }
        }
        if (migliore) scelta = { x: pt.x, y: pt.y, z: pt.z, l: migliore.l, w: migliore.w, indice: p };
        else puntiFalliti[k] = true;
      }

      if (!scelta) {
        nonCaricati.push({ nome: collo.nome, tipo: collo.tipo, motivo: 'spazio' });
        continue;
      }

      var nuovo = {
        n: piazzati.length + 1, tipo: collo.tipo, nome: collo.nome,
        x: scelta.x, y: scelta.y, z: scelta.z, l: scelta.l, w: scelta.w, h: collo.h,
        peso: collo.peso, impilabile: collo.impilabile
      };
      piazzati.push(nuovo);
      pesoTotale += collo.peso;
      punti.splice(scelta.indice, 1);

      var candidati = [
        { x: nuovo.x + nuovo.l, y: nuovo.y, z: nuovo.z },
        { x: nuovo.x, y: nuovo.y + nuovo.w, z: nuovo.z },
        { x: nuovo.x, y: nuovo.y, z: nuovo.z + nuovo.h }
      ];
      var extra = [];
      candidati.forEach(function (cp) {
        extra.push(proietta(cp, 'z'), proietta(cp, 'y'), proietta(cp, 'x'));
      });
      candidati = candidati.concat(extra);

      var visti = {};
      punti = punti.concat(candidati).filter(function (q) {
        if (q.x >= L || q.y >= W || q.z >= H) return false;
        var kk = chiave(q);
        if (visti[kk]) return false;
        visti[kk] = true;
        return !dentroUnCollo(q);
      });
    }

    // Statistiche
    var volVano = L * W * H, volUsato = 0, metriOccupati = 0, momento = 0;
    piazzati.forEach(function (b) {
      volUsato += b.l * b.w * b.h;
      metriOccupati = Math.max(metriOccupati, b.x + b.l);
      momento += b.peso * (b.x + b.l / 2);
    });

    var riepilogo = righe.map(function (r, i) {
      return {
        nome: r.nome || 'Collo',
        richiesti: Math.max(0, Math.floor(Number(r.quantita) || 0)),
        caricati: piazzati.filter(function (b) { return b.tipo === i; }).length
      };
    });

    return {
      piazzati: piazzati,
      nonCaricati: nonCaricati,
      riepilogo: riepilogo,
      statistiche: {
        colliTotali: colli.length,
        colliCaricati: piazzati.length,
        pesoTotale: pesoTotale,
        portata: isFinite(portata) ? portata : null,
        percentualePeso: isFinite(portata) ? Math.round(pesoTotale / portata * 1000) / 10 : null,
        percentualeVolume: Math.round(volUsato / volVano * 1000) / 10,
        metriLineari: Math.round(metriOccupati) / 100,
        baricentro: pesoTotale > 0 ? Math.round(momento / pesoTotale) : null
      }
    };
  }

  var api = { pianificaCarico: pianificaCarico, MAX_COLLI: MAX_COLLI };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else globale.Stiva = api;
})(this);
