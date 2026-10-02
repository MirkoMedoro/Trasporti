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
    -- Flotta: tipo di mezzo, revisione, complessi veicolari
    ALTER TABLE mezzi ADD COLUMN IF NOT EXISTS categoria TEXT;
    ALTER TABLE mezzi ADD COLUMN IF NOT EXISTS ultima_revisione DATE;
    ALTER TABLE mezzi ADD COLUMN IF NOT EXISTS scadenza_revisione DATE;
    ALTER TABLE mezzi ADD COLUMN IF NOT EXISTS officina_revisione TEXT;
    ALTER TABLE mezzi ALTER COLUMN lunghezza DROP NOT NULL;
    ALTER TABLE mezzi ALTER COLUMN larghezza DROP NOT NULL;
    ALTER TABLE mezzi ALTER COLUMN altezza DROP NOT NULL;
    ALTER TABLE mezzi ALTER COLUMN portata DROP NOT NULL;
    UPDATE mezzi SET categoria = CASE WHEN lunghezza <= 520 THEN 'furgone' WHEN lunghezza <= 950 THEN 'motrice' ELSE 'semirimorchio' END
      WHERE categoria IS NULL;
    CREATE TABLE IF NOT EXISTS complessi (
      id SERIAL PRIMARY KEY,
      azienda_id INT NOT NULL REFERENCES aziende(id) ON DELETE CASCADE,
      nome TEXT,
      trainante_id INT NOT NULL REFERENCES mezzi(id) ON DELETE CASCADE,
      rimorchio_id INT NOT NULL REFERENCES mezzi(id) ON DELETE CASCADE,
      creato_il TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS idx_complessi_azienda ON complessi(azienda_id);
    ALTER TABLE mezzi ADD COLUMN IF NOT EXISTS proprieta TEXT NOT NULL DEFAULT 'proprio';
    ALTER TABLE mezzi ADD COLUMN IF NOT EXISTS ditta TEXT;
    -- Registro delle attività (solo per le statistiche del super amministratore)
    ALTER TABLE utenti ADD COLUMN IF NOT EXISTS ultimo_accesso TIMESTAMPTZ;
    CREATE TABLE IF NOT EXISTS attivita (
      id BIGSERIAL PRIMARY KEY,
      azienda_id INT NOT NULL REFERENCES aziende(id) ON DELETE CASCADE,
      utente_id INT REFERENCES utenti(id) ON DELETE SET NULL,
      evento TEXT NOT NULL,
      dispositivo TEXT,
      creato_il TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS idx_attivita_azienda ON attivita(azienda_id, creato_il);
    CREATE INDEX IF NOT EXISTS idx_attivita_utente ON attivita(utente_id, creato_il);
    CREATE INDEX IF NOT EXISTS idx_attivita_data ON attivita(creato_il);
    CREATE INDEX IF NOT EXISTS idx_utenti_azienda ON utenti(azienda_id);
    CREATE INDEX IF NOT EXISTS idx_mezzi_azienda ON mezzi(azienda_id);
    CREATE INDEX IF NOT EXISTS idx_colli_azienda ON colli_salvati(azienda_id);
    CREATE INDEX IF NOT EXISTS idx_piani_azienda ON piani(azienda_id);
    -- Lettura intelligente a pagamento: tetto di spesa mensile (dollari) e registro di ogni lettura
    ALTER TABLE aziende ADD COLUMN IF NOT EXISTS limite_ai_mese NUMERIC(8,2);
    CREATE TABLE IF NOT EXISTS consumi_ai (
      id BIGSERIAL PRIMARY KEY,
      azienda_id INT REFERENCES aziende(id) ON DELETE CASCADE,
      utente_id INT REFERENCES utenti(id) ON DELETE SET NULL,
      funzione TEXT NOT NULL,
      fornitore TEXT NOT NULL,
      modello TEXT,
      tok_in INT,
      tok_out INT,
      costo_usd NUMERIC(10,5) NOT NULL DEFAULT 0,
      creato_il TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS idx_consumi_ai_azienda ON consumi_ai(azienda_id, creato_il);
    CREATE INDEX IF NOT EXISTS idx_consumi_ai_data ON consumi_ai(creato_il);
    -- Credito prepagato delle aziende per la lettura intelligente (euro): ricariche (+) e letture (-)
    CREATE TABLE IF NOT EXISTS crediti_ai (
      id BIGSERIAL PRIMARY KEY,
      azienda_id INT NOT NULL REFERENCES aziende(id) ON DELETE CASCADE,
      utente_id INT REFERENCES utenti(id) ON DELETE SET NULL,
      tipo TEXT NOT NULL,
      importo NUMERIC(10,4) NOT NULL,
      nota TEXT,
      creato_il TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS idx_crediti_ai_azienda ON crediti_ai(azienda_id, creato_il);
    -- Chat interna tra gli utenti della stessa azienda. Messaggi di servizio: si cancellano da soli dopo 2 giorni.
    -- destinatario_id NULL = canale "Tutti" dell'azienda. Non finisce nel backup e nessuna pagina la mostra ad altri.
    CREATE TABLE IF NOT EXISTS chat_messaggi (
      id BIGSERIAL PRIMARY KEY,
      azienda_id INT NOT NULL REFERENCES aziende(id) ON DELETE CASCADE,
      mittente_id INT NOT NULL REFERENCES utenti(id) ON DELETE CASCADE,
      destinatario_id INT REFERENCES utenti(id) ON DELETE CASCADE,
      testo TEXT NOT NULL DEFAULT '',
      allegato JSONB,
      foto TEXT,
      creato_il TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS idx_chat_azienda ON chat_messaggi(azienda_id, id);
    CREATE INDEX IF NOT EXISTS idx_chat_data ON chat_messaggi(creato_il);
    CREATE TABLE IF NOT EXISTS chat_letture (
      utente_id INT NOT NULL REFERENCES utenti(id) ON DELETE CASCADE,
      conversazione TEXT NOT NULL,
      ultimo_id BIGINT NOT NULL DEFAULT 0,
      PRIMARY KEY (utente_id, conversazione)
    );
  `);
  // Primo avvio del registro: ricostruisce lo storico dai piani e viaggi già salvati
  const vuoto = await pool.query('SELECT 1 FROM attivita LIMIT 1');
  if (!vuoto.rowCount) {
    await pool.query(`
      INSERT INTO attivita (azienda_id, utente_id, evento, creato_il)
        SELECT azienda_id, creato_da, 'piano_salvato', creato_il FROM piani
        UNION ALL
        SELECT azienda_id, creato_da, 'viaggio_salvato', creato_il FROM viaggi`);
  }
}

module.exports = { pool, inizializza };
