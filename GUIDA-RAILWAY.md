# Mettere Stiva online su Railway

Stiva è un solo programma che serve tutte le aziende clienti. Tu sei il
super amministratore: crei le aziende, e ognuna vede solo i propri mezzi,
piani e utenti. Serve un database PostgreSQL, che Railway fornisce
nello stesso progetto.

Tutto si fa dal browser. Tempo stimato: 20 minuti.

## 1. Carica il codice su GitHub

1. Su **https://github.com** clicca **+** in alto a destra, poi **New repository**.
2. Nome, ad esempio `stiva-trasporti`, lascialo **Private** e clicca **Create repository**.
3. Clicca il link **uploading an existing file**.
4. Apri la cartella `stiva` che ti ho consegnato e trascina **il suo contenuto**
   (`server.js`, `package.json`, `db.js`, `auth.js`, `validazione.js`, le cartelle
   `routes` e `public`). Non la cartella `stiva` stessa.
5. Scrivi "Primo caricamento" e clicca **Commit changes**.

## 2. Crea il progetto su Railway

1. Su **https://railway.com** entra con **Sign in with GitHub**.
2. **New Project**, poi **Deploy from GitHub repo**, scegli `stiva-trasporti`.
3. Il primo avvio fallirà con il messaggio "Manca la variabile DATABASE_URL":
   è normale, il database lo aggiungiamo adesso.

## 3. Aggiungi il database PostgreSQL

1. Nella schermata del progetto clicca **+ Create** (o **New**), poi
   **Database**, poi **Add PostgreSQL**.
2. Dopo un minuto compare un secondo riquadro chiamato **Postgres**.

## 4. Collega il programma al database

1. Clicca sul riquadro del programma (`stiva-trasporti`) e apri la scheda **Variables**.
2. Aggiungi queste variabili con **New Variable**:

| Nome | Valore |
|---|---|
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` |
| `JWT_SECRET` | una frase lunga e casuale, es. `camion-giallo-47-lago-orso-tramonto` |
| `NODE_ENV` | `production` |

   Scrivi `${{Postgres.DATABASE_URL}}` esattamente così: Railway lo sostituisce
   da solo con l'indirizzo del database. Non condividere mai `JWT_SECRET`.
3. Railway riavvia il programma. Nella scheda **Deployments** lo stato deve
   diventare **Active**, e nei log leggi "Stiva avviato sulla porta ...".

## 5. Dai un indirizzo web al programma

1. Sempre nel riquadro del programma: **Settings**, sezione **Networking**,
   clicca **Generate Domain**.
2. Ottieni un indirizzo tipo `stiva-trasporti-production.up.railway.app`.
   Più avanti potrai collegare un dominio tuo (es. `app.stiva.it`).

## 6. Primo accesso

1. Apri l'indirizzo. Compare **Primo avvio**: crea il tuo account da
   super amministratore. Questa schermata appare una sola volta.
2. In **Aziende clienti** crea la prima azienda con il suo titolare.
3. Esci e rientra con le credenziali del titolare: vedrai il gestionale
   come lo vedrà il cliente. Aggiungi un mezzo e prova un piano di carico.

## Aggiornamenti futuri

Quando ti consegno una nuova versione, su GitHub carica i file modificati
(stessa procedura, sovrascrivono i vecchi). Railway aggiorna il programma
da solo in un paio di minuti, per tutte le aziende insieme. I dati restano
nel database e non vengono toccati.

## Costi

Il programma e il database consumano ciascuno un po' di credito Railway.
Con poche aziende si resta tipicamente su pochi dollari al mese, ma i prezzi
cambiano: controlla la pagina **Pricing** di Railway e, nel progetto,
la voce **Usage** per il consumo reale.

## Ruoli

- **Super amministratore (tu)**: crea, sospende e riattiva le aziende clienti.
  Se un cliente non paga, sospendi l'azienda: i suoi utenti non entrano più,
  ma i dati restano salvati. Sei l'unico che crea gli utenti delle aziende:
  da **Aziende clienti → Utenti** li aggiungi, cambi ruolo e password,
  li sospendi o li elimini.
- **Titolare**: gestisce mezzi, piani e viaggi della sua azienda e vede
  l'elenco dei suoi utenti, senza poterli modificare.
- **Operatore**: calcola, salva e stampa piani di carico e viaggi.

Ogni azienda deve avere almeno un titolare attivo: il programma non permette
di sospendere, eliminare o declassare l'ultimo.

## Chiave di conferma per le eliminazioni

Eliminare un utente richiede la chiave di conferma, per evitare cancellazioni
accidentali. La chiave predefinita è `1234`. Per cambiarla, su Railway aggiungi
nelle **Variables** del programma `CHIAVE_CONFERMA` con il valore che preferisci.

## Percorsi per camion (OpenRouteService)

Senza configurare nulla, "Viaggi e costi" funziona già con servizi pubblici
gratuiti: la ricerca indirizzi si fa premendo Invio e il percorso è calcolato
per un'automobile. Va bene per le prove.

Per il percorso da camion (esclude strade con limiti di altezza, larghezza o
peso) e la ricerca che suggerisce mentre scrivi:

1. Registrati su **https://openrouteservice.org** (gratuito).
2. Nella **Dashboard** crea una chiave (**Request a token**, piano Standard).
3. Su Railway, nel riquadro del programma, scheda **Variables**, aggiungi
   `ORS_API_KEY` con la chiave copiata, poi clicca **Deploy**.

Il piano gratuito ha limiti giornalieri di richieste: controlla quelli
aggiornati sul sito. Prima di vendere il programma a molte aziende conviene
un piano a pagamento, sia per i percorsi sia per le mappe (le piastrelle di
OpenStreetMap sono pensate per un uso leggero).

## Funzioni per azienda

Nel pannello **Aziende clienti** ogni azienda ha le spunte delle funzioni
("Piano di carico", "Calcolatore", "Viaggi e costi", "Scadenze", "Ottimizza giro"). Togliendo la spunta, la funzione
sparisce dal menu di quell'azienda e viene bloccata anche sul server.

## Ottimizza giro

Menu **Strumenti → Ottimizza giro**. Si carica il PDF della distinta (o
borderò) e il programma legge ritiri e consegne: nella prima colonna un
numero da solo è una consegna, un numero con "RIT" è un ritiro. Indirizzo,
località e provincia dicono dove andare; i pallet finiscono nelle note.

- Controlla la tabella delle tappe: si può correggere, aggiungere o togliere.
- Scrivi l'indirizzo di **partenza (deposito)** e premi **Usa questi valori
  come predefiniti**: la volta dopo è già compilato.
- Scegli come deve girare l'autista: **Tutto insieme** (meno km possibili)
  oppure **Prima tutte le consegne, poi i ritiri**. Le tappe segnate
  "Urgente" vengono fatte per prime.
- Il risultato mostra km risparmiati, gasolio, orari, la mappa, i link per
  Google Maps sul telefono dell'autista e il passaggio a "Viaggi e costi".

Senza configurare nulla legge:

- i PDF creati da un programma (con testo): lettura immediata e precisa;
- i PDF scansionati e le foto, con la **lettura gratuita** che lavora nel
  browser: 10–20 secondi a pagina, la prima volta scarica circa 5 MB. È meno
  precisa: il programma avvisa di controllare nomi, indirizzi e pesi, e le
  tappe senza tipo vanno indicate a mano. Rende meglio con scansioni a
  300 dpi e foto scattate dritte dall'alto, con buona luce.

Facoltativo, per scansioni e foto più difficili: la **lettura intelligente**.
Su Railway aggiungi nelle **Variables** `ANTHROPIC_API_KEY` con una chiave
creata su **https://platform.claude.com** (a pagamento, pochi centesimi a
distinta). Con la chiave compare la spunta "Lettura intelligente".

## Backup dei dati

Dal pannello del super amministratore, voce **Backup**:

- **Scarica backup completo** crea un file `stiva-backup-AAAA-MM-GG-HHMM.json`
  con tutti i dati di tutte le aziende (aziende, utenti, mezzi, complessi,
  colli salvati, piani di carico, viaggi, impostazioni e funzioni attive).
- **Ripristina da backup**: scegli il file, controlla l'anteprima (data e
  numero di dati nel file rispetto a oggi), poi conferma con la chiave di
  conferma. Il ripristino sostituisce tutti i dati attuali. Se qualcosa va
  storto, i dati attuali restano intatti.

Consigli:

- Scarica un backup almeno una volta a settimana e sempre prima di caricare
  una nuova versione del programma.
- Conserva i file in due posti diversi (per esempio il computer e un disco
  esterno o un cloud personale). Contengono i dati di tutti i clienti:
  tienili protetti.
- Il backup del programma si aggiunge a quelli del database fatti da Railway,
  non li sostituisce: nella pagina del database su Railway controlla quali
  backup automatici offre il tuo piano.

## Statistiche di utilizzo

Dal pannello del super amministratore, voce **Statistiche**. Le vedi solo tu:
i titolari e gli operatori non hanno accesso a queste informazioni.

- **Semaforo delle aziende**: attiva (usata negli ultimi 7 giorni), in calo
  (ferma da 7 giorni o con uso dimezzato rispetto al mese precedente), ferma
  (non usata da 14 giorni o mai). Le aziende ferme e in calo sono i clienti da
  chiamare.
- **Andamento** giorno per giorno (o per settimana sui 12 mesi): operazioni,
  accessi, utenti attivi, aziende attive.
- **Funzioni più usate**, **giorni e orari** di lavoro, quota di utilizzo da
  telefono.
- **Dettaglio azienda**: utenti con ultimo accesso, giorni attivi, operazioni,
  funzione più usata, chi non è mai entrato, e la cronologia delle ultime
  attività di ciascuno.
- **Esporta in Excel**: una riga per utente con tutti i numeri del periodo.

Il programma registra solo *che* una funzione è stata usata (per esempio
"ha calcolato un piano di carico"), mai i dati inseriti. Le attività più
vecchie di 13 mesi vengono cancellate automaticamente. Indica questo
trattamento nel contratto e nell'informativa privacy per i tuoi clienti.
