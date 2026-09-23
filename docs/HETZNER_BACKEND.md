# Backend dedicato UnconventionArt

Stato: implementato e verificato localmente. Non è ancora in esecuzione su Hetzner.
Nessun server acquistato, nessun account collegato, nessun pagamento o mint attivato.
Il frontend continua su Vercel. Il servizio non accede ai dati di Jarvis o Antikythera.

## Funzioni e confini

- `GET /healthz`: salute del processo.
- `GET /v1/catalogue`: metadati del solo catalogo pubblico, offerte pubblicate, servizi attivi.
- `POST /v1/inquiries`: richiesta di informazioni su un'opera pubblica. Nome, email, messaggio (massimo 2000 caratteri), presa visione dell'informativa. Registra un file privato; **non invia email**, non crea ordini, non riserva tirature.
- `POST /v1/curator`: domanda di massimo 240 caratteri su una singola opera pubblica. Senza AI restituisce la guida editoriale. Con AI usa un endpoint HTTPS compatibile con il formato chat-completions, una chiave dedicata e un modello esplicitamente configurati. Errori/timeout restituiscono il testo editoriale con `source: editorial`. Una risposta AI è etichettata e può contenere errori: non costituisce una scheda commerciale verificata.

Nessun endpoint amministrativo pubblico. Le richieste si consultano via SSH nella directory protetta del servizio. Prima dell'apertura al pubblico assegnare una persona e una frequenza di controllo; il riferimento restituito attesta solo la registrazione. La cancellazione avviene dopo 90 giorni per impostazione iniziale, all'avvio, ogni ora e prima di una nuova registrazione. Concordare una durata appropriata e riportarla nell'informativa. I backup richiedono una propria politica di conservazione.

Il processo ascolta solo su loopback. Caddy termina HTTPS. Limiti sul corpo (8 KiB), timeout, origini esatte, permessi 0700/0600, nessun log di contatti o domande. Dietro il proxy il limite è **globale**: 3 richieste di contatto e 10 domande al minuto. Non ci si fida di X-Forwarded-For. Questo primo servizio è deliberatamente a singola istanza; prima di scalare occorrono storage transazionale condiviso, quote distribuite e gestione delle richieste.

## Installazione sul server dedicato

Prerequisiti: Linux con systemd, Node.js 24 LTS, Caddy, hostname API reale con DNS puntato al server. Il progetto non richiede dipendenze npm per il backend. I file necessari sono `server/`, `data/catalogue.json`, `data/experience.json`, `js/museum/experience-model.js`. Non copiare `data/local-catalogue.json` o fotografie private.

1. Creare l'utente di sistema `unconventionart`, senza login, e installare i file in `/opt/unconventionart`, di proprietà dell'amministratore, leggibili dal servizio.
2. Copiare `deploy/hetzner/env.example` in `/etc/unconventionart.env`, leggibile solo da root. Impostare l'origine esatta del frontend. Lasciare inizialmente `INQUIRIES_ENABLED=false` e `CURATOR_ENABLED=false`.
3. Installare `deploy/hetzner/unconventionart.service` in `/etc/systemd/system/`; verificare che Node sia `/usr/bin/node`. Eseguire `systemctl daemon-reload` e `systemctl enable --now unconventionart`. `StateDirectory` crea la directory persistente protetta.
4. Adattare il Caddyfile all'hostname API reale: la variabile `GALLERY_API_HOST` deve essere disponibile al processo Caddy, oppure sostituire il segnaposto direttamente. Verificare la configurazione con `caddy validate` prima del reload. Aprire solo 80/443 e l'accesso amministrativo necessario; non esporre 8787.
5. Verificare `/healthz` e `/v1/catalogue` via HTTPS dall'esterno, quindi CORS dall'origine esatta del sito.
6. Per le richieste: pubblicare un'informativa corretta (titolare, finalità, recapiti, conservazione), impostare `PRIVACY_URL` e la durata scelta, quindi `INQUIRIES_ENABLED=true`. Riavviare. Provare una richiesta di collaudo e rimuovere il relativo file dopo verifica.
7. Facoltativo, solo dopo scelta del fornitore e del budget: configurare endpoint completo, modello e chiave AI dedicata; impostare `CURATOR_ENABLED=true`. Applicare anche una quota di spesa sul provider. Non riutilizzare chiavi o archivi di Jarvis/Antikythera. Le richieste AI non sono archiviate dall'app; verificare separatamente la conservazione del provider.
8. Solo dopo i controlli impostare `services.apiBaseUrl` in `data/experience.json` all'origine HTTPS reale (nessun percorso), pubblicare sul branch Vercel e provare da desktop/mobile. Il form e l'opzione AI compaiono soltanto quando il backend dichiara il servizio attivo. L'utente sceglie esplicitamente se usare l'AI; senza selezione le risposte restano locali.

Per disattivare il collegamento basta riportare `apiBaseUrl` a `null`; nessuna funzione della galleria dipende dal backend. Per disattivare effettivamente gli endpoint impostare anche le variabili di abilitazione a `false` e riavviare il servizio. Non inserire mai chiavi in `experience.json`: è pubblico.

## Verifica e limitazioni

`node --test tests/collector-service.test.mjs` prova HTTP reale locale, persistenza su file e riapertura, permessi, validazione, CORS, limiti, conservazione e fallback. Il provider AI è simulato nei test: nessuna chiamata a pagamento. Il collaudo su un server reale e la prova con il provider scelto restano da eseguire.

Non sono inclusi checkout proprietario, webhook Stripe, contratti NFT, mint, account o certificati di autenticità. Le offerte già previste dal frontend restano collegamenti a pagine esterne approvate, solo quando pubblicate dall'autore. Un server aggiuntivo non aumenta la GPU del Chromebook: i miglioramenti del frame rate restano un lavoro sul rendering client.
