// Stiva — gestionale per aziende di trasporto (multi-azienda)

// Sul tuo computer le impostazioni stanno nel file .env; su Railway nelle Variables.
(function caricaEnv() {
  const fs = require('fs');
  const file = require('path').join(__dirname, '.env');
  if (!fs.existsSync(file)) return;
  for (const riga of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = riga.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
})();
const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');
const { inizializza } = require('./db');
const { pulisci } = require('./attivita');

const app = express();
app.set('trust proxy', 1);
// Il ripristino del backup accetta file grandi: ha un suo lettore dedicato
const leggiJson = express.json({ limit: '5mb' });
const leggiDocumenti = express.json({ limit: '30mb' });
app.use((req, res, next) => {
  if (req.path === '/api/backup/ripristina') return next();
  if (req.path === '/api/giri/leggi' || req.path === '/api/foto/leggi' || req.path === '/api/foto/prova' || req.path.startsWith('/api/foto/telefono/') || req.path.startsWith('/api/chat/conversazione/')) return leggiDocumenti(req, res, next);
  return leggiJson(req, res, next);
});
app.use(cookieParser());

app.use('/api', require('./routes/accesso'));
app.use('/api/aziende', require('./routes/aziende'));
app.use('/api/utenti', require('./routes/utenti'));
app.use('/api/mezzi', require('./routes/mezzi'));
app.use('/api/complessi', require('./routes/complessi'));
app.use('/api/colli', require('./routes/colli'));
app.use('/api/piani', require('./routes/piani'));
app.use('/api/percorsi', require('./routes/percorsi'));
app.use('/api/viaggi', require('./routes/viaggi'));
app.use('/api/impostazioni', require('./routes/impostazioni'));
app.use('/api/backup', require('./routes/backup'));
app.use('/api/attivita', require('./routes/attivita'));
app.use('/api/statistiche', require('./routes/statistiche'));
app.use('/api/giri', require('./routes/giri'));
app.use('/api/foto', require('./routes/foto'));
app.use('/api/chat', require('./routes/chat'));

app.use(express.static(path.join(__dirname, 'public')));
// Pagina del telefono per scattare le foto (si apre dal QR code, senza accesso)
app.get('/scatta/:codice', (req, res) => res.sendFile(path.join(__dirname, 'public', 'scatta.html')));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.use((err, req, res, next) => {
  if (err.type === 'entity.too.large') return res.status(413).json({ errore: 'File troppo grande.' });
  console.error(err);
  res.status(500).json({ errore: 'Errore interno del server. Riprova tra poco.' });
});

const PORT = process.env.PORT || 3000;
inizializza()
  .then(() => {
    // Il registro delle attività si svuota da solo dei dati troppo vecchi
    pulisci();
    setInterval(pulisci, 24 * 60 * 60 * 1000);
    app.listen(PORT, () => console.log(`Stiva avviato sulla porta ${PORT}`));
    require('./avvisi').avvia();   // avvisi delle revisioni per email
  })
  .catch((e) => { console.error('Impossibile preparare il database:', e); process.exit(1); });
