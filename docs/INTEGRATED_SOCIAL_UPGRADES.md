# Integrazione dei potenziamenti social

## Disponibile nella galleria

- **three-vrm**: loader npm effettivo per gli avatar; MeshoptDecoder condiviso nel caricamento dei modelli.
- **glTF Transform + meshoptimizer**: la build comprime Atelier da 1.779.588 a 1.363.756 byte (circa −23%). Il sorgente resta intatto. Test confrontano geometria, orientamento dei triangoli, morph target, texture e rig decodificati.
- **CharacterStudio**: `avatar-lab.html`, raggiungibile da Incontri → Il mio avatar. Editor caricato su richiesta in iframe isolato. Preferenze in memoria, esportazione da effettuare prima di chiudere. Anteprima VRM locale fino a 25 MB; risorse esterne respinte. Il VRM personalizzato non viene ancora salvato nel profilo o condiviso con gli altri partecipanti.
- **UIKit**: pannello nel visore con stato dell’incontro, saluto e uscita, selezionabile col controller. Il bundle viene caricato soltanto entrando in VR.

## Collegamenti pronti, servizi da configurare

**Colyseus**: server `server/multiplayer/start.mjs`, Dockerfile con contesto nella radice del repository. Autentica il JWT Supabase, verifica l’appartenenza all’incontro e aggiorna la visibilità per destinatario ogni secondo. Le posizioni viaggiano a 10 Hz. Blocchi e revoche sono ricontrollati; in caso di errore il client torna al polling esistente. I dati durevoli rimangono in Supabase.

Variabili del server: `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `PORT` (2567 predefinita). Distribuire inizialmente una singola istanza con HTTPS/WSS. Per più istanze occorrono presenza/matchmaking condivisi e instradamento coerente; il processo in memoria non basta.

Su Vercel impostare `COLYSEUS_URL` all’endpoint WSS del servizio. Non impostarlo finché il server non è operativo. La configurazione corrente mantiene il polling.

**LiveKit**: client con audio spaziale Web Audio, connessione esplicita e microfono inizialmente spento. `api/social-session.js` verifica utente e invito prima di emettere un token di 5 minuti, limitato al microfono e alla stanza richiesta. Variabili soltanto server: `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`. Le chiavi non entrano nella build dell’editor o nei bundle browser.

La voce non è abilitata nella configurazione pubblicata: non sono stati provisionati servizi né fornite credenziali. Prima dell’attivazione pubblica occorrono prova audio fra dispositivi e revoca/moderazione dei partecipanti anche sul server LiveKit. Il filtro audio locale rispetta la visibilità dell’incontro ma non sostituisce l’espulsione dal server di un client modificato. La scadenza del token limita nuovi accessi, non termina una connessione già aperta.

## Build e verifiche

```sh
npm run setup:upgrades
npm run build:editor
npm run check
npm run check:multiplayer
```

La build Vercel recupera CharacterStudio dalla revisione fissata nel manifest anche quando i submodule non sono materializzati. L’editor usa il catalogo upstream remoto: disponibilità e licenze dei singoli asset rimangono distinte dalla licenza del codice.

Test automatici: autenticazione/inviti per i token voce, rifiuto file VRM non validi, compressione del modello, selezione del pannello VR e sessione WebSocket con due identità, visibilità individuale e revoca. Verifica fisica del visore e conversazione audio reale ancora da effettuare.
