# UnconventionArt — prima versione sociale

## Implementato

- Pulsante **Incontri** dentro il museo, con schede Avatar / Incontri / Edizioni e NFT.
- Avatar 3D procedurale stilizzato: cinque carnagioni, cinque colori capelli, quattro tagli, sei abbigliamenti e tre corporature. Anteprima ruotabile. Non è ancora un editor realistico equivalente a The Sims.
- Account email/password tramite il Supabase dedicato esistente. Sessione separata dall'atelier, limitata alla scheda del browser, con rinnovo. Registrazione usa la configurazione Auth del progetto: se le iscrizioni sono disabilitate, non le aggira. La conferma email e la consegna tramite SMTP vanno collaudate prima dell'apertura al pubblico.
- Profilo e avatar persistenti nel database. L'anteprima e le preferenze locali non costituiscono un account.
- Incontri privati con inviti casuali UUID, scadenza dopo 24 ore, massimo 16 presenti, fino a tre incontri attivi per organizzatore. L'utente deve scegliere esplicitamente di partecipare.
- Presenze e posizione aggiornate con RPC ogni secondo, interpolate nel renderer. Nessuna presenza simulata. Alla perdita della connessione gli avatar remoti scompaiono e viene mostrato lo stato del collegamento; dopo 30 secondi senza aggiornamento il server non considera il partecipante presente.
- Saluto attivato dal partecipante, visibile agli altri avatar e nell'elenco dei presenti. Dura tre secondi, scade sul server e viene limitato a un invio ogni quattro secondi. Si può provare nell'anteprima dell'avatar senza entrare in un incontro; anche con movimento ridotto la posa torna automaticamente a riposo.
- Chat di gruppo, blocco reciproco della visibilità e segnalazioni. Blocco dell'organizzatore impedisce di rientrare tramite lo stesso invito. Moderazione dall'atelier, con sospensione e riabilitazione dei profili.
- Offerte amministrabili per stampa, edizione digitale e NFT; bozza, pubblicazione e ritiro. Visibilità pubblica subordinata a opera pubblicata, offerta pubblicata, prezzo, condizioni e link valido. NFT: rete, contratto e token devono corrispondere al link OpenSea. Nessuna offerta o prezzo di esempio pubblicato.

## Vendite: confini effettivi

Le stampe e le edizioni digitali rinviano a un checkout Stripe già configurato; gli NFT a una pagina OpenSea già esistente. Questo rilascio non crea un account venditore, contratti NFT, mint, wallet custodial, ordini interni, consegna di file a pagamento o verifica on-chain della proprietà. La disponibilità e il prezzo definitivi sono quelli del servizio esterno. Prima di pubblicare un'offerta, l'amministratore deve far corrispondere prezzi, diritti, disponibilità e modalità di consegna sui due sistemi. Ritirare il link dalla galleria non disattiva il checkout esterno.

Per mettere in vendita la prima collezione servono opere e diritti individuati dal proprietario, prezzi/tirature, un account di incasso e, per gli NFT, rete e wallet del titolare. Nessuna transazione blockchain viene eseguita da questo codice.

## Architettura e protezioni

Il museo resta sul branch `codex/immersive-portfolio` e su Vercel; fotografie e controlli esistenti sono conservati. Il modulo sociale e il suo motore sono importati su richiesta, con Three.js condiviso. Nessun nuovo pacchetto npm.

Gli schemi SQL di questo rilascio sono `infra/social-schema.sql` e `infra/store-schema.sql`, applicati al solo progetto Supabase `unconventionart`. Le tabelle sociali sono nello schema non esposto `ua_social`, con RLS e senza permessi diretti ai client. Il gateway pubblico è SECURITY INVOKER; la funzione interna SECURITY DEFINER, con search_path vuoto e ACL esplicite, verifica identità, appartenenza, blocchi, sospensioni e frequenza per ogni operazione. La funzione interna è necessaria per non concedere accesso diretto a inviti, messaggi e dati di altri partecipanti. Le email non vengono incluse nelle presenze. I ruoli amministrativi continuano a dipendere esclusivamente da `gallery_admins`.

RLS senza policy nello schema privato è intenzionale: accesso diretto negato, operazioni solo dal gateway verificato. La segnalazione preesistente sulla protezione da password compromesse va risolta nelle impostazioni Auth: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection . Non vengono ampliati permessi per rimuovere gli avvisi.

Le coordinate conservano solo l'ultimo stato, senza cronologia. I messaggi sono consultabili solo nella visita attiva e per 24 ore; questo non equivale a cancellazione fisica automatica. Prima del lancio pubblico vanno definite informativa e tempi di eliminazione di profili, incontri, messaggi e segnalazioni e configurato il relativo processo di pulizia.

## Verifiche

- `npm run check`: build e 141 test superati, compresi i test precedenti della galleria.
- Nuovi test PostgreSQL/PGlite: isolamento degli incontri, accessi anonimi negati, mittente verificato, limiti, blocchi, segnalazioni, sospensione, chiusura, URL di pagamento ammessi.
- Verifica transazionale sul database Supabase reale: due identità di prova, ingresso tramite invito e messaggio attribuito al mittente corretto. Rollback finale: nessun utente o messaggio di prova conservato.
- Pubblicazione Vercel verificata con stato success; pannelli Avatar, Incontri ed Edizioni controllati nel browser online. La lettura anonima delle offerte funziona e restituisce correttamente il catalogo vuoto. Il browser cloud ha WebGL disabilitato: la verifica visiva del personaggio e della scena resta da fare su dispositivo reale.
- Da completare: registrazione e conferma email end-to-end, collaudo con due dispositivi reali, prestazioni iPhone e carico simultaneo. Il polling a 1 Hz è adatto al prototipo; prima di aumentare la capienza occorre passare a un servizio realtime con autorizzazione equivalente e limiti misurati.

## Sviluppi successivi

1. Collaudo account e partecipazione con utenti invitati.
2. Voce di prossimità su attivazione esplicita, consenso alle conversazioni e mute.
3. Avatar con modello riggato e animazioni, accessori e editor più dettagliato.
4. Eventi programmati, sale personali, gestione degli artisti e accesso ai quattro piani.
5. Ordini verificati tramite webhook e consegna; collezione NFT pilota con contratto e diritti approvati.

Non serve acquistare un mini PC per questo rilascio.
