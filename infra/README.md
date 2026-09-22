# Atelier privato — attivazione

Il pannello `/admin` e il backend sono implementati. `data/publishing.json` resta disabilitato finché non esiste un progetto Supabase dedicato verificato. Nessun caricamento è operativo in questo stato.

1. Confermare con il proprietario organizzazione e costo del nuovo progetto Supabase UnconventionArt; non riutilizzare progetti di altre applicazioni.
2. Applicare `infra/gallery-schema.sql` al progetto dedicato. Eseguire i controlli Supabase di sicurezza e verificare le policy sul servizio reale.
3. Creare/invitare l'utente amministratore tramite Supabase Auth, impostando la password fuori dalla chat. Inserire il suo UUID in `public.gallery_admins` da un accesso amministrativo. Disabilitare le iscrizioni pubbliche. L'iscrizione da sola non concede accesso al pannello.
4. Distribuire `supabase/functions/gallery-public` con `verify_jwt=false`: è un endpoint pubblico di sola lettura che controlla sempre lo stato pubblicato. Le variabili server `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` non devono mai finire nel sito o nel repository.
5. Configurare URL progetto, chiave publishable (o legacy anon) ed endpoint `/functions/v1/gallery-public/catalogue`. Abilitare `publishing.json` solo dopo le verifiche. Prima del passaggio, importare nel nuovo archivio le opere attuali da conservare: il catalogo live sostituisce quello statico.
6. Verificare sul backend reale: anonimo e utente non amministratore respinti; upload multiplo; bozza invisibile; pubblicazione nella sala scelta; ritiro e risposta 404 della relativa anteprima; originali sempre privati. La galleria aperta controlla gli aggiornamenti ogni minuto quando visibile.
7. Eseguire `npm run check`, pubblicare sul branch `codex/immersive-portfolio` senza force push e controllare il deploy. Non unire a main.

Il pannello accetta JPEG, PNG e WebP fino a 40 MB e crea anteprime JPEG fino a 1536 pixel. RAW e HEIC vanno esportati prima. Gli originali e le anteprime risiedono in bucket privati; soltanto le anteprime delle opere pubblicate attraversano la funzione pubblica. Il ritiro conserva l'originale. Il sito non implementa ancora acquisti o consegna a pagamento.

Le immagini visibili possono comunque essere catturate o salvate. Il vecchio originale già presente nella cronologia del repository pubblico e nei vecchi deploy richiede una gestione separata: il nuovo archivio non elimina quelle copie storiche.

I test locali usano PostgreSQL tramite PGlite per verificare il vero SQL e le policy, oltre ai test dell'endpoint pubblico. Non sostituiscono la verifica del servizio Supabase dopo l'attivazione.
