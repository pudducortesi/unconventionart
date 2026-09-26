# UnconventionArt · beta sociale del 26 settembre 2026

URL pubblico: https://unconventionart.vercel.app/

## Percorso della beta

1. Apri **Incontri**, crea un account e conferma l'email, oppure accedi.
2. Scegli nome e avatar e salvali.
3. Crea un incontro privato; copia l'invito e condividilo con i partecipanti.
4. Chi riceve il link viene guidato attraverso accesso, avatar e ingresso.
5. Visitate la stessa galleria con presenze, gesti, chat, raggiungimento dei partecipanti e riconnessione. Ogni stanza ammette 16 persone e scade dopo 24 ore.
6. Dal browser di un visore compatibile apri **? → Entra in VR**. Entra prima nell'incontro. Il grilletto indica il teletrasporto, la levetta destra ruota a scatti. La chat testuale rimane nell'interfaccia sullo schermo; per uscire usa il menu del visore.

La visita individuale e l'indice delle opere restano accessibili senza account. Il recupero password si trova nel modulo di accesso. I link email e gli inviti usano il dominio pubblico, evitando le anteprime Vercel protette.

## Implementato in questo aggiornamento

- Consumo immediato dei callback di autenticazione: rimozione dei token dall'indirizzo, verifica dell'identità sul server e protezione dalle risposte tardive dopo il logout.
- Conferma email, richiesta di recupero e cambio password con controllo della conferma.
- Inviti persistenti nella scheda durante accesso e conferma, con percorso guidato e link pubblico stabile.
- WebXR nella scena esistente: sessione immersiva, controller, teletrasporto con verifica del percorso, collisioni e rotazione di 30 gradi. Uscita e rifiuto del visore ripristinano la visita sullo schermo.
- Sala Simone: panca spostata fuori dallo spazio riservato alle opere; mantenuti cemento, acciaio, arredi ispirati al Bauhaus e correzione delle pareti sovrapposte.
- La build con catalogo live evita di generare il vecchio modello AR e gli asset fotografici dimostrativi.

## Repository di riferimento e scelte

- [mrdoob/three.js](https://github.com/mrdoob/three.js), MIT: WebXRManager e ciclo sessione dell'esempio VRButton. Integrazione con la versione già fissata dal progetto, 0.186.0; nessun secondo motore grafico.
- [networked-aframe/networked-aframe](https://github.com/networked-aframe/networked-aframe): riferimento per le scene condivise. Non aggiunto: la galleria ha già renderer, avatar e servizio Supabase con regole di accesso e stanze isolate.
- [livekit/client-sdk-js](https://github.com/livekit/client-sdk-js): candidato per voce spaziale e moderazione audio. Non installato né attivato; richiede server, emissione sicura dei token e verifica microfono/rete.

## Verifiche e limiti

La verifica automatica comprende build di produzione, integrità degli asset, navigazione, geometria, profili, inviti, autenticazione, isolamento delle stanze e moderazione. Test WebXR simulano avvio, uscita e rifiuto della sessione; non sostituiscono una prova su visore.

Sul database reale è stata eseguita una transazione con due identità sintetiche: profili, creazione stanza, ingresso, messaggio e lettura delle presenze. Risultato: due partecipanti e un messaggio con mittente corretto. Transazione annullata, senza utenti o messaggi di prova persistenti. Gli accessi anonimi al servizio sociale sono rifiutati.

Prima di aprire una beta pubblica estesa restano da verificare:

- Consegna reale delle email, configurazione dei redirect e disponibilità/limiti SMTP; nessuna email di prova inviata in questa sessione.
- Due browser autenticati contemporaneamente e una sessione su visore fisico; il browser cloud di verifica non offre WebGL.
- Comfort e prestazioni su Quest/browser mobili: la presenza sociale attuale usa polling a 1 Hz, non sincronizza mani e testa a frequenza VR.
- Voce spaziale: non ancora disponibile.
- Catalogo artista: il percorso `room_slug` della sala Simone deve essere collegato all'assegnazione live dei posti prima di caricare le opere; la capienza editoriale di 75 opere non equivale ai posti fisici implementati.
- I quattro piani del masterplan non sono quattro livelli costruiti: la visita attuale comprende piano terra e soppalchi.
- Le edizioni usano pagine di vendita esterne; il sito non implementa un marketplace con transazioni NFT proprie.

Questa è una beta per visite private a piccoli gruppi, con ingresso VR da collaudare su hardware. Non è ancora un social network pubblico completo con voce, eventi pubblici e marketplace autonomo.
