# Potenziamenti installati

**Stato aggiornato:** integrazione applicativa descritta in [INTEGRATED_SOCIAL_UPGRADES.md](INTEGRATED_SOCIAL_UPGRADES.md). Il resto di questa pagina documenta il precedente checkpoint di installazione.

Tutti i sette repository selezionati sono disponibili come submodule con revisione bloccata. I pacchetti eseguibili sono installati con lockfile; le revisioni dei sorgenti sono indipendenti dalle release npm. Manifest: `research/social-upgrades.json`.

| Progetto | Installazione | Stato |
| --- | --- | --- |
| pixiv/three-vrm | `@pixiv/three-vrm@3.5.5`, dipendenza principale | Import verificato. La galleria aveva già un loader VRM distribuito localmente; questa installazione non aggiunge un secondo loader alla scena. |
| M3-org/CharacterStudio | Submodule `research/upstream/CharacterStudio`, revisione `293182bf4a6087f4a4a7fd00e4fbdfb590029da7`, npm ci con lock upstream | Dipendenze installate e build Vite riuscita. Editor separato, non ancora collegato agli account della galleria. |
| livekit/client-sdk-js | `livekit-client@2.22.3`, dipendenza principale | Import verificato. Servono server/cloud e token emessi dal backend per attivare la voce. |
| pmndrs/uikit | `@pmndrs/uikit@1.0.76`, dipendenza principale | Import verificato con Three.js 0.186.0. Pannelli VR da costruire. |
| donmccurdy/glTF-Transform | `@gltf-transform/cli@4.5.0`, dipendenza di sviluppo | CLI eseguita correttamente. |
| zeux/meshoptimizer | `meshoptimizer@1.3.0`, dipendenza principale | Encoder WASM inizializzato correttamente. |
| colyseus/colyseus | `colyseus@0.18.8`, progetto separato `server/multiplayer` | Import server verificato. Richiede Node >=22 e un processo server persistente; nessun servizio esposto in questo aggiornamento. |

## Comandi ripetibili

Dalla radice, con Node >=22 e npm:

```sh
npm run setup:upgrades
npm run check:upgrades
npm run characterstudio:build
npm run characterstudio:dev
npm run assets:inspect -- percorso/modello.glb
npm run assets:optimize -- ingresso.glb uscita.glb
```

`setup:upgrades` installa dipendenze della galleria, server Colyseus e CharacterStudio. `node tools/fetch-research.mjs` recupera tutti i sorgenti registrati, verificandone gli SHA. L'editor si avvia localmente; non è pubblicato nella galleria. Il suo catalogo di asset è un componente separato da scegliere e verificare prima dell'integrazione.

L'ottimizzazione scrive un nuovo file: controllare resa, materiali, rig, animazioni e licenze degli asset prima di pubblicarlo. I master fotografici non sono coinvolti.

## Verifiche effettuate

- `npm run check:upgrades`: import dei moduli, encoder WASM, CLI, dipendenze editor e server.
- `npm run characterstudio:build`: completata. L'upstream segnala un bundle consistente; l'editor resta separato dalla visita.
- `npm run check`: build della galleria e 216 test superati.
- Le nuove librerie non sono importate dal percorso iniziale della galleria: l'installazione non equivale all'attivazione delle funzioni. Nessun servizio a pagamento acquistato, nessun server esterno provisionato.
