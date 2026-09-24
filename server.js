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

const app = express();
app.set('trust proxy', 1);
app.use(express.json({ limit: '5mb' }));
app.use(cookieParser());

app.use('/api', require('./routes/accesso'));
app.use('/api/aziende', require('./routes/aziende'));
app.use('/api/utenti', require('./routes/utenti'));
app.use('/api/mezzi', require('./routes/mezzi'));
app.use('/api/colli', require('./routes/colli'));
app.use('/api/piani', require('./routes/piani'));

app.use(express.static(path.join(__dirname, 'public')));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ errore: 'Errore interno del server. Riprova tra poco.' });
});

const PORT = process.env.PORT || 3000;
inizializza()
  .then(() => app.listen(PORT, () => console.log(`Stiva avviato sulla porta ${PORT}`)))
  .catch((e) => { console.error('Impossibile preparare il database:', e); process.exit(1); });
