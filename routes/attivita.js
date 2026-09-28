// Il browser segnala l'uso di pagine e calcoli (solo eventi dell'elenco consentito)
const express = require('express');
const { richiediLogin } = require('../auth');
const { registra, DAL_BROWSER } = require('../attivita');

const r = express.Router();

r.post('/', richiediLogin, (req, res) => {
  const evento = String((req.body && req.body.evento) || '');
  if (DAL_BROWSER.has(evento) && req.utente.azienda_id) registra(req, req.utente, evento);
  res.status(204).end();
});

module.exports = r;
