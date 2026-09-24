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
  ma i dati restano salvati.
- **Titolare**: gestisce mezzi, piani e gli utenti della sua azienda.
- **Operatore**: calcola, salva e stampa i piani di carico, gestisce i mezzi.
