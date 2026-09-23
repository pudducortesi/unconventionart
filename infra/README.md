# Atelier privato — attivazione

## Caricamenti massivi

La selezione multipla non impone un limite di 80 file: il browser li invia in sequenza, con preparazione di una sola anteprima alla volta, percentuale di invio e risultato individuale. I file falliti rimangono in memoria e possono essere riprovati senza riselezionare quelli riusciti. Gli identificatori vengono riutilizzati nei tentativi per riconoscere salvataggi riusciti con risposta persa. La coda non sopravvive alla chiusura o ricarica della pagina; tenere l'atelier aperto. Prima della conferma nel selettore iOS il sito non riceve i file e non può mostrare l'avanzamento del download da iCloud.

Video: applicata `infra/video-schema.sql`; bucket privato `gallery-videos`, MP4/WebM fino a 50 MB per file. Le clip pubblicate sono riprodotte in playlist, senza audio automatico, sullo schermo assegnato nelle sale 4 o 6. Solo lo schermo vicino al visitatore decodifica il filmato. La funzione pubblica verifica la pubblicazione per ogni nuova richiesta, inoltra i byte range e non memorizza il video nella cache. Il ritiro non può cancellare byte già ricevuti dal visitatore. Il passaggio `liveCatalogue` resta da completare prima della pubblicazione.

Verifica sicurezza: RLS sulle nuove tabelle e bucket privati confermati. Supabase segnala inoltre la protezione contro password compromesse disabilitata: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection . Nessun permesso è stato ampliato per correggere questa segnalazione.

Il progetto dedicato `unconventionart` (`ykregzrmynedwwlfavzm`, Francoforte) è stato creato nell'organizzazione pudducortesi, previa conferma del preventivo di 0/mese. Schema e funzione sono distribuiti; il controllo di sicurezza Supabase non segnala problemi. Il pannello `/admin` è collegato (`enabled: true`), ma nessun amministratore è ancora abilitato: serve l'email scelta dal proprietario.

`liveCatalogue: false` mantiene la mostra esistente durante la preparazione dell'archivio. Non è un fallback automatico: il passaggio esplicito a `true` va fatto dopo aver importato la fotografia attuale e verificato pubblicazione/ritiro. Nel frattempo l'atelier permette agli amministratori solo la preparazione delle bozze.

1. Confermare con il proprietario organizzazione e costo del nuovo progetto Supabase UnconventionArt; non riutilizzare progetti di altre applicazioni.
2. Applicare `infra/gallery-schema.sql` al progetto dedicato. Eseguire i controlli Supabase di sicurezza e verificare le policy sul servizio reale.
3. Creare/invitare l'utente amministratore tramite Supabase Auth, impostando la password fuori dalla chat. Inserire il suo UUID in `public.gallery_admins` da un accesso amministrativo. Disabilitare le iscrizioni pubbliche. L'iscrizione da sola non concede accesso al pannello.
4. Distribuire `supabase/functions/gallery-public` con `verify_jwt=false`: applica il controllo della chiave publishable dell'applicazione e controlla sempre lo stato pubblicato. La chiave publishable non concede accesso amministrativo. Il segreto server `SUPABASE_SERVICE_ROLE_KEY` non deve mai finire nel sito o nel repository.
5. Configurare URL progetto, chiave publishable (o legacy anon) ed endpoint `/functions/v1/gallery-public/catalogue`. Abilitare `publishing.json` solo dopo le verifiche. Prima del passaggio, importare nel nuovo archivio le opere attuali da conservare: il catalogo live sostituisce quello statico.
6. Verificare sul backend reale: anonimo e utente non amministratore respinti; upload multiplo; bozza invisibile; pubblicazione nella sala scelta; ritiro e risposta 404 della relativa anteprima; originali sempre privati. La galleria aperta controlla gli aggiornamenti ogni minuto quando visibile.
7. Eseguire `npm run check`, pubblicare sul branch `codex/immersive-portfolio` senza force push e controllare il deploy. Non unire a main.

Il pannello accetta JPEG, PNG e WebP fino a 40 MB e crea anteprime JPEG fino a 1536 pixel. RAW e HEIC vanno esportati prima. Gli originali e le anteprime risiedono in bucket privati; soltanto le anteprime delle opere pubblicate attraversano la funzione pubblica. Il ritiro conserva l'originale. Il sito non implementa ancora acquisti o consegna a pagamento.

Le immagini visibili possono comunque essere catturate o salvate. Il vecchio originale già presente nella cronologia del repository pubblico e nei vecchi deploy richiede una gestione separata: il nuovo archivio non elimina quelle copie storiche.

I test locali usano PostgreSQL tramite PGlite per verificare il vero SQL e le policy, oltre ai test dell'endpoint pubblico. Non sostituiscono la verifica del servizio Supabase dopo l'attivazione.
