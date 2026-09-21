# UnconventionArt

Un’unica pagina HTML, CSS e JavaScript: una galleria contemporanea 3D percorribile in prima persona. Pareti, soffitto, pavimento, cornici, sedute e reception sono bianchi. La profondità deriva da geometria, luce e ombre. Three.js è installato con versione bloccata e servito dallo stesso dominio.

## Avvio e build

Richiede Node.js 20 o successivo.

```sh
npm ci
npm run dev
# http://localhost:4173
npm run build
npm run check
```

`dist/` contiene esclusivamente la galleria, il catalogo pubblico e i suoi asset. Le precedenti pagine editoriali restano nel repository come sorgenti storici: non sono pubblicate dalla build. Vercel riscrive i vecchi indirizzi HTML verso la galleria.

## Visita

La pagina si apre direttamente all’ingresso della sala, senza copertina o pulsante “entra”. Su desktop: trascina per guardare, WASD/frecce per camminare, oppure clicca sul pavimento. Su touch: joystick a sinistra per muoverti e trascinamento con l’altra mano per guardarti intorno. È disponibile anche il tap sul pavimento. Non servono pointer lock, fullscreen o permessi del dispositivo.

Toccando una fotografia ci si avvicina. Il cartellino fisico accanto alla cornice apre descrizione e metadati disponibili; un pulsante HTML ancorato alla sua posizione rende il bersaglio utilizzabile con touch e tastiera. Il cartellino viene nascosto se occluso dall’architettura. Foto intera, informazioni, aiuto e indice sono dialoghi interni alla stessa pagina.

Collisioni e percorsi aggirano tutti e tre gli arredi. Il cambio orientamento del telefono conserva la posizione. Le distanze di osservazione si adattano allo schermo e restano entro la stanza. Il movimento ridotto usa spostamenti immediati; il rendering si ferma quando la scena è immobile o la scheda è nascosta. Risoluzione massima 1,25× su touch e 1,5× su desktop; ombre statiche riutilizzate.

## Codice

- `index.html`: unica pagina, comandi e dialoghi.
- `css/museum.css`: interfaccia, touch, aree sicure e movimento ridotto.
- `js/museum/architecture.js`: geometrie della sala, arredi, luci e opere.
- `js/museum/navigation.js`: collisioni, percorsi e punti di osservazione sicuri.
- `js/museum/main.js`: scena, catalogo, joystick, mouse e tastiera.
- `data/catalogue.json`: fotografie, descrizioni e metadati.
- `tools/build.mjs`: build con elenco esplicito degli asset pubblici.

## Fotografie

Il catalogo pubblico contiene una fotografia Kavyar. Le altre cinque dell’album attendono ancora l’esportazione. Le fotografie non vengono duplicate per riempire le pareti; non sono incluse immagini ARGINE. I JPEG rimangono inalterati, con rapporto originale e senza applicazione del tone mapping alla fotografia.

Aggiungere le immagini autorizzate in `images/kavyar/` e i relativi record in `data/catalogue.json`. Le sale vengono generate per collezione, fino a otto opere per sala. I campi opzionali `description`, `medium`, `year`, `edition` alimentano il cartellino. La galleria legge lo stesso catalogo pubblico anche durante lo sviluppo locale.

## Verifiche

Eseguiti: build, sintassi JavaScript, integrità del catalogo, corrispondenza tra controller e ID HTML, unica pagina nella build e isolamento degli asset privati. Dodici test della navigazione controllano collisioni, percorsi continui, tre arredi, bordi, orientamento e punti di osservazione su formati diversi.

Questi controlli non equivalgono a un collaudo visivo o touch. La verifica del rendering e delle interazioni su browser/dispositivi reali resta da completare: l’anteprima Vercel richiede autenticazione non disponibile nella sessione di verifica.
