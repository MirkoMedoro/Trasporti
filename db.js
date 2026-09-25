// Collegamento al database PostgreSQL e creazione delle tabelle.
// Ogni dato di un cliente porta la colonna azienda_id: è questo che separa
// le aziende tra loro dentro lo stesso database.
const { Pool } = require('pg');

if (!process.env.DATABASE_URL) {
  console.error('Manca la variabile DATABASE_URL: collega il database PostgreSQL al servizio.');
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : false,
});

async function inizializza() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS aziende (
      id SERIAL PRIMARY KEY,
      nome TEXT NOT NULL,
      attiva BOOLEAN NOT NULL DEFAULT true,
      creata_il TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS utenti (
      id SERIAL PRIMARY KEY,
      azienda_id INT REFERENCES aziende(id) ON DELETE CASCADE,
      email TEXT NOT NULL UNIQUE,
      nome TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      ruolo TEXT NOT NULL CHECK (ruolo IN ('superadmin','admin','operatore')),
      attivo BOOLEAN NOT NULL DEFAULT true,
      creato_il TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS mezzi (
      id SERIAL PRIMARY KEY,
      azienda_id INT NOT NULL REFERENCES aziende(id) ON DELETE CASCADE,
      nome TEXT NOT NULL,
      targa TEXT,
      lunghezza INT NOT NULL,
      larghezza INT NOT NULL,
      altezza INT NOT NULL,
      portata INT NOT NULL,
      creato_il TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS colli_salvati (
      id SERIAL PRIMARY KEY,
      azienda_id INT NOT NULL REFERENCES aziende(id) ON DELETE CASCADE,
      nome TEXT NOT NULL,
      lunghezza INT NOT NULL,
      larghezza INT NOT NULL,
      altezza INT NOT NULL,
      peso INT NOT NULL,
      impilabile BOOLEAN NOT NULL DEFAULT true,
      ruotabile BOOLEAN NOT NULL DEFAULT true
    );
    CREATE TABLE IF NOT EXISTS piani (
      id SERIAL PRIMARY KEY,
      azienda_id INT NOT NULL REFERENCES aziende(id) ON DELETE CASCADE,
      nome TEXT NOT NULL,
      mezzo JSONB NOT NULL,
      colli JSONB NOT NULL,
      risultato JSONB NOT NULL,
      creato_da INT REFERENCES utenti(id) ON DELETE SET NULL,
      creato_il TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS viaggi (
      id SERIAL PRIMARY KEY,
      azienda_id INT NOT NULL REFERENCES aziende(id) ON DELETE CASCADE,
      nome TEXT NOT NULL,
      dati JSONB NOT NULL,
      creato_da INT REFERENCES utenti(id) ON DELETE SET NULL,
      creato_il TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    -- Aggiunte successive (sicure anche su un database già esistente)
    ALTER TABLE aziende ADD COLUMN IF NOT EXISTS funzioni JSONB NOT NULL DEFAULT '{}';
    ALTER TABLE aziende ADD COLUMN IF NOT EXISTS impostazioni JSONB NOT NULL DEFAULT '{}';
    ALTER TABLE mezzi ADD COLUMN IF NOT EXISTS consumo NUMERIC(5,1);
    CREATE INDEX IF NOT EXISTS idx_viaggi_azienda ON viaggi(azienda_id);
    CREATE INDEX IF NOT EXISTS idx_utenti_azienda ON utenti(azienda_id);
    CREATE INDEX IF NOT EXISTS idx_mezzi_azienda ON mezzi(azienda_id);
    CREATE INDEX IF NOT EXISTS idx_colli_azienda ON colli_salvati(azienda_id);
    CREATE INDEX IF NOT EXISTS idx_piani_azienda ON piani(azienda_id);
  `);
}

module.exports = { pool, inizializza };
