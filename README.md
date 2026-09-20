# UnconventionArt

Portfolio fotografico multipagina, scritto in HTML, CSS e JavaScript nativi.
Galleria 3D in Three.js e pagine editoriali in HTML/CSS/JavaScript. La libreria è installata da npm, bloccata nel lockfile e servita dallo stesso sito.

## Avvio

Richiede Node.js 20 o successivo.

```sh
npm ci
npm run dev
# http://localhost:4173
npm run build
npm run check
```

Il comando build produce `dist/`, pubblicabile su un normale hosting statico anche in una sottocartella. Non pubblica automaticamente nulla. La build copia Three.js e la sua licenza in `dist/vendor/`.

## Pagine

- `index.html`: galleria 3D percorribile, click per camminare, trascinamento per guardare, WASD/frecce, comandi touch, mappa, avvicinamento alle fotografie e visione integrale.
- `editorial.html`: percorso editoriale fotografico precedente.
- `exhibitions.html`: archivio con filtri per serie, modalità galleria e indice. I filtri e la disposizione rimangono nell’URL.
- `collection.html?series=presenza`: pagina autonoma per ogni serie, introduzione, fotografie e passaggio alla serie successiva.
- `about.html`: visione artistica e approccio.
- `contact.html`: composizione di un’email nel client dell’utente. Nessun invio simulato e nessun backend.
- `journal.html` e `post.html`: mantengono raggiungibili i vecchi indirizzi, riportando alle opere senza ripubblicare articoli fittizi.

## Struttura

```text
css/style.css       composizione, responsive, movimento ridotto
js/main.js         navigazione, pagine, filtri, modulo contatto
js/catalogue.js    caricamento dati e componenti fotografici
js/motion.js       scroll, prospettiva, reveal, preferenza movimento
js/viewer.js       visore, URL delle opere, tastiera, swipe, variazioni
data/catalogue.json  catalogo pubblico
tools/serve.mjs    server locale senza dipendenze
tools/build.mjs    build statica
tools/check.mjs    controllo collegamenti, catalogo e isolamento asset
```

## Fotografie e catalogo

Il catalogo pubblico contiene al momento una fotografia dell’album Kavyar, autorizzata per il sito. L’album completo contiene sei fotografie: le altre cinque attendono l’esportazione. Nessuna immagine ARGINE è inclusa nel catalogo pubblico.

Le fotografie finali vanno aggiunte solo dopo averne confermato la pubblicazione. Il codice è pronto a riceverle attraverso `data/catalogue.json`: non serve modificare le pagine.

Ogni collezione ha `id`, `title`, `subtitle`, `description` e `color`. Ogni opera ha `id`, `title`, `collection`, `image`, `alt`, `credit` e l’eventuale array `variants`. `hero` identifica l’immagine d’ingresso. I percorsi sono relativi alla radice del sito.

Per lavorare localmente con fotografie non pubbliche si può usare `data/local-catalogue.json` con lo stesso schema e `images/private/`. Entrambi sono esclusi da Git e dalla build. L’override viene letto solo su localhost, 127.0.0.1 e terminal.local. La build usa sempre il catalogo pubblico.

Le immagini sono mostrate intere con `object-fit: contain`: nessuna rielaborazione automatica. Il visore supporta frecce, Escape, swipe e variazioni della stessa opera. I collegamenti `exhibitions.html#work=1` aprono direttamente la fotografia.

Lo script storico `tools/publish.py` appartiene al vecchio schema: non usarlo per aggiornare questo catalogo.

## Movimento e accessibilità

Scroll nativo senza intercettare la rotella. Su mobile la sala orizzontale diventa una sequenza verticale. Le animazioni rispettano `prefers-reduced-motion` e possono essere disattivate dal footer. I dialoghi nativi gestiscono il focus; la chiusura del visore torna al collegamento originale. Menu e visore funzionano da tastiera.

## Verifica di questa revisione

Eseguiti: controllo sintattico dei quattro moduli JavaScript, build statica, collegamenti locali delle sette pagine, unicità degli ID, integrità del catalogo e assenza degli asset privati da `dist/`.

Da completare prima del rilascio: verifica visiva e interattiva in browser desktop/mobile con le fotografie definitive. L’ambiente di lavoro non ha consentito di collegare il browser al server locale; non viene dichiarata una verifica visiva completata.


## Sala 3D

`js/museum/architecture.js` costruisce la sala e le cornici. `navigation.js` gestisce geometria dei percorsi e collisioni. `main.js` collega rendering, catalogo e comandi; `css/museum.css` è indipendente dallo stile editoriale.

Le sale si generano dal catalogo: massimo otto opere per sala e suddivisione per collezione. Una sola opera viene appesa al centro della parete di fondo. Non vengono duplicate fotografie per riempire lo spazio. I JPEG rimangono invariati e sono mostrati con il loro rapporto originale.

I movimenti non richiedono pointer lock o fullscreen. La navigazione click-to-walk evita la panca con una griglia di percorsi; tastiera e touch rispettano le collisioni. Il movimento ridotto usa spostamenti immediati. Il rendering si ferma quando la scena è immobile o la scheda è nascosta; risoluzione limitata a 1.5× per contenere il carico grafico.

Se WebGL non è disponibile, l’ingresso spiega l’errore e mantiene il collegamento al catalogo. Il catalogo HTML resta accessibile anche dalla sala. Le sei verifiche automatiche della navigazione controllano limiti, ostacoli, percorsi e orientamento della camera. La verifica interattiva sul deploy resta subordinata all’accesso all’anteprima Vercel protetta.


## Revisione off-white e mobile

Sala, soffitto, pavimento, cornici e interfaccia adottano una palette off-white con luce neutra. La sala appare direttamente, senza la copertina a tutto schermo. Su telefono l’inquadratura iniziale mostra l’opera e il suo cartellino, dimensionando la distanza sul rapporto dello schermo.

Ogni fotografia ha un cartellino fisico a destra, cliccabile tramite raycasting e un pulsante HTML ancorato alla sua posizione per touch e tastiera. Il cartellino apre descrizione, autore e i soli metadati realmente disponibili; su telefono la scheda è un pannello dal basso. Da lì si apre la foto intera o si chiede informazione sull’opera.

Rimossi dalla vista i comandi direzionali e i pannelli invasivi. Trascinamento, tap sul pavimento e navigazione tra opere sono disponibili su touch; mouse e tastiera restano disponibili su desktop. Il canvas segue l’altezza dinamica dello schermo e l’area sicura iOS. Un settimo test verifica l’inquadratura su cinque formati, da 320×568 a 1440×900. Non sostituisce il collaudo visivo su dispositivi reali, ancora impedito dall’autenticazione dell’anteprima Vercel.
