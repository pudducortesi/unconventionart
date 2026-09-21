# UnconventionArt

Una sola pagina HTML/CSS/JavaScript: galleria contemporanea 3D in prima persona. Dieci sale collegate, venti postazioni per sala, capacità complessiva di 200 opere. L’edificio misura 54 × 140 metri, con una promenade centrale di dieci metri e porte larghe cinque metri. Pareti, pavimenti, lucernari, reception e arredi sono bianchi.

## Avvio

Richiede Node.js 20 o successivo.

```sh
npm ci
npm run dev
# http://localhost:4173
npm run build
npm run check
```

`dist/` contiene l’unica pagina della galleria e gli asset pubblici espliciti. Le vecchie pagine editoriali restano nel repository ma non nella build. Vercel riscrive i vecchi indirizzi verso la galleria.

## Visita

L’ingresso si apre nella prima sala, in vista delle fotografie disponibili. Tutte le dieci sale appartengono allo stesso spazio e sono collegate da porte percorribili; il passaggio tra sale non sostituisce la scena.

Desktop: WASD/frecce e trascinamento per guardare. Touch: joystick analogico a sinistra e visuale con l’altro dito; i gesti funzionano contemporaneamente. Il tap sul pavimento avvia un percorso intorno agli ostacoli. Dal pulsante Sale si può raggiungere una sala specifica. Tocca una fotografia per avvicinarti e il cartellino per leggere la descrizione. Fotografie intere, aiuto, indice e pianta restano nella stessa pagina.

## Fluidità e caricamento

Il movimento usa integrazione indipendente dalla frequenza dello schermo, accelerazione e rilascio graduali, zona morta del joystick e gestione separata delle due dita. Rilasci multitouch, perdita del focus e apertura dei dialoghi non avviano movimenti accidentali.

L’architettura usa geometrie ripetute in istanze: circa 19 mesh e 5.500 triangoli per l’intero edificio, senza luci per singola opera o mappe d’ombra dinamiche. Le ombre di contatto sono condivise. Non vengono caricate 200 texture contemporaneamente: massimo 24 residenti su touch e 48 su desktop, due caricamenti in parallelo. Opere lontane vengono rilasciate e ricaricate avvicinandosi.

Le texture sulle pareti hanno lato massimo 1.024 pixel su touch e 2.048 su desktop; il file fotografico originale resta inalterato ed è usato nel visore. Risoluzione iniziale del canvas limitata a 1,1× su touch, adattata verso il basso solo quando i fotogrammi lenti persistono. Il rendering si ferma a scena immobile e a scheda nascosta.

## Codice

- `js/museum/layout.js`: pianta unica condivisa, pareti, arredi e 200 postazioni.
- `architecture.js`: ambiente, istanze, illuminazione e fotografie.
- `navigation.js`: collisioni, griglia di navigazione A*, percorsi continui.
- `controls.js`: joystick, multitouch, tastiera e filtro del movimento.
- `streaming.js`: coda delle texture, priorità, limiti, errori e rilascio delle risorse.
- `main.js`: integrazione della scena, dialoghi, pianta e catalogo.
- `data/catalogue.json`: opere pubblicate, descrizioni e metadati.

## Fotografie disponibili

È pubblicata una fotografia Kavyar. L’album Lightroom contiene sei fotografie; le altre cinque non sono state importate perché l’esportazione non è disponibile nel flusso di lavoro corrente. Non vengono duplicate fotografie per riempire le sale, né pubblicate immagini di altri album per sostituirle.

Per aggiungere gli scatti Kavyar esportati, inserirli in `images/kavyar/` e in `data/catalogue.json`; le postazioni vengono assegnate automaticamente, fino a 200. `thumbnail` può indicare una versione ottimizzata, `image` resta la fotografia intera. `description`, `medium`, `year`, `edition` sono facoltativi. Il catalogo pubblico viene letto anche durante lo sviluppo locale.

## Verifiche

Build e controlli statici; test di multitouch e input a 30/60/120 Hz; raggiungibilità di tutte le 200 postazioni e dieci porte; collisioni con pareti e arredi; limite e concorrenza dello streaming su 200 opere simulate, smaltimento di caricamenti obsoleti e gestione degli errori. La costruzione delle geometrie è stata verificata con Three.js e 210 percorsi del controller sono stati simulati senza blocchi.

Questi controlli non misurano gli FPS effettivi e non equivalgono al collaudo visivo su iPhone. La verifica interattiva dell’anteprima resta condizionata dall’autenticazione Vercel non disponibile nella sessione di verifica.
