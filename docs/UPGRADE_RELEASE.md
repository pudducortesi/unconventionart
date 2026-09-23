# Release: Studio del collezionista

## Implementato
- Prologo in tre tappe e percorsi per le opere della selezione.
- Selezione locale, link condiviso ed esportazione JSON con crediti e testi.
- Studio su richiesta: scheda editoriale, guida testuale basata sul catalogo, lettura con voce italiana **locale** se disponibile, dieci capitoli/stanze navigabili.
- Parete simulata con quattro colori, tre formati e quattro cornici. Foto privata della stanza solo tramite URL blob locale; nessun upload server.
- Anteprima 3D/AR: model-viewer 4.3.1 isolato con Three.js 0.183.0. Il motore museo resta su 0.186.0. Caricamento solo su click.
- Modello metrico dimostrativo dell'opera disponibile, stampa alta 90 cm, cornice 1,5 cm; immagine JPEG originale incorporata senza ricompressione. Non rappresenta un formato in vendita.
- Sala di visione con sequenza manuale o temporizzata (solo con più opere), suono sintetico facoltativo, stop su chiusura o scheda nascosta.
- Profilo grafico selezionabile; bypass postprocessing durante il movimento e ripristino a riposo; opzione massima fluidità anche a riposo.
- Collegamenti commerciali pubblicabili e schermati: Stripe, Manifold, OpenSea. Calendario eventi e link di incontro configurabili, nessun evento o prodotto fittizio.

## Configurazione editoriale
`data/experience.json` è pubblico. Non inserirvi segreti, credenziali, URL privati di Jarvis o endpoint amministrativi.

Esempio di offerta (da compilare solo con dati e link reali approvati):
```
"offers": {
  "<id-opera>": {
    "published": true,
    "label": "<nome edizione>",
    "edition": "<tiratura approvata>",
    "priceLabel": "<prezzo approvato>",
    "description": "<materiale, formato, consegna>",
    "rights": "<diritti inclusi e condizioni>",
    "checkout": "<link Stripe attivo>",
    "nft": "<pagina Manifold/OpenSea reale>"
  }
}
```
L'ordine e la disponibilità sono gestiti dal servizio di checkout configurato. Il frontend non conferma pagamenti o possesso NFT. Nessun wallet, contratto o mint è creato da questa release.

`events`: elenco di `{title, startsAt, url}` con data ISO; sono mostrati solo eventi futuri su host supportati. `services.liveRoomUrl`: incontro Google Meet, Zoom o Jitsi. Questo collegamento non implementa avatar/presenza multiplayer nella scena.

## Blocchi concreti, non completati
- Esportazione fotografica: il documento Lightroom delle 100 selezioni contiene ID, non file HD. Include inoltre una nota irrisolta sull'album delle tre ragazze da escludere. La build conserva una sola fotografia pubblica. Le foto private locali restano escluse.
- Conversazione AI/LiveKit: Jarvis offre prove di laboratorio; Antikythera ha PR non integrate. Nessun servizio autenticato del curatore pubblico è disponibile/configurato. La guida editoriale non è un LLM.
- Opere attraversabili/Spark: mancano catture multivista o modelli del set. Nessuna falsa ricostruzione da una fotografia singola.
- Edizioni e pagamenti: mancano prezzi, tirature, licenze di vendita, account/link reali e contratto NFT. Rimangono disattivati.
- Mostra NFT collezionabile: richiede catalogo definitivo, asset archiviabili, contratto e conservazione. L'esportazione JSON non è una mostra acquistabile o un certificato.
- AR e fluidità: verifica fisica su iPhone/Chromebook necessaria; il browser di verifica cloud non dispone di WebGL.

## Build riproducibile
```
npm ci --ignore-scripts
npm run setup:ar
npm run check
```
Vercel esegue le due installazioni separate. GLB generato durante build da fotografia pubblica e script versionato; non richiede servizi esterni. I test verificano container, dimensioni e byte originali, isolamento del bundle iniziale, link commerciali e risposte prive di informazioni inventate.

## Backend Hetzner separato
Rick ha indicato la disponibilità ad acquistare un terzo server, dedicato alla galleria. Nessun acquisto eseguito. Jarvis e Antikythera restano separati.

- Vercel/CDN: pagina, modelli e media pubblici ottimizzati. Rendering 3D sul visitatore.
- Servizio galleria: catalogo editoriale, utenti collezionisti, eventi, ricevute webhook e inventario; identità e database propri.
- Media originali: storage separato con derivati e cache; nessun transito delle immagini nella macchina Jarvis.
- Curatore: accesso esclusivo alle schede pubblicate, con autenticazione fra servizi, limiti e timeout. Integrazione al motore Antikythera solo tramite capability dedicata, non token amministrativi o contesti aziendali.
- Voce/live: servizio a parte, da dimensionare in base a utenti concorrenti e trasporto. Inferenza AI locale richiede un benchmark separato; un VPS generico non garantisce inferenza veloce.
- Dimensionamento da chiudere dopo scelta modello, picco visitatori, storage e servizi. L'acquisto non risolve il frame rate WebGL.
