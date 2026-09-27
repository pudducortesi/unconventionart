# Audit del sistema UnconventionArt — rilevazione 27 settembre, aggiornamento 28 settembre 2026

## Aggiornamento operativo — 28 settembre 2026

- La foto Kavyar di prova è stata rimossa dal catalogo statico, dall'HTML senza JavaScript e dal percorso di build. Tutti i 12 branch remoti puntano alla cronologia riscritta; il vecchio blob immagine e i file benchmark rimossi non sono raggiungibili dai branch. Le ricerche di `gallery_artworks` e `storage.objects` non trovano riferimenti Kavyar. Dopo il push, il check Vercel risulta riuscito sul branch predefinito e sulla PR; il dominio pubblico risponde 200 sulla homepage e 404 al vecchio URL della foto.
- La migrazione `20260927225917_social_data_retention` è applicata in produzione. Il cron `ua-social-retention` esegue la pulizia ogni cinque minuti e ha completato le prime due esecuzioni. Le policy sono: messaggi 24 ore; profili 30 giorni dalla cancellazione dell'account; segnalazioni 90 giorni. Le tabelle social erano vuote all'applicazione.
- Auth ora impone password di almeno 12 caratteri con maiuscole, minuscole, cifre e simboli; il cambio password richiede una sessione recente. La protezione password compromesse non è disponibile sul piano Supabase Free. SMTP personalizzato e consegna email restano da verificare.
- `data/artists/provisional-roster.json` contiene un solo artista segnaposto, inattivo e non collegato ad account, email, membership o pubblicazione. Il nome e lo slug definitivi saranno scelti più avanti.
- La ricerca Notion collegata non ha trovato una pagina di progetto canonica. I test automatizzati non sono stati eseguiti in questo aggiornamento.

## Sintesi iniziale (27 settembre)

Il sito pubblico è raggiungibile e usa un catalogo fotografico live su Supabase. L'archivio delle opere e degli originali è protetto da Row Level Security e bucket privati; la funzione pubblica verifica lo stato di pubblicazione prima di restituire un'anteprima. Il sistema è però una beta piccola, non ancora pronta per un lancio sociale pubblico: mancano retention fisica e pulizia dei dati sociali, rate limiting condiviso sul catalogo pubblico, verifica della consegna delle email e prove su dispositivi reali.

## Superfici controllate al momento dell'audit iniziale

- Repository pubblico GitHub `pudducortesi/unconventionart`, branch predefinito `claude/build-photo-portfolio-Th0gm`, HEAD `f1b0a354`.
- Produzione Vercel `https://unconventionart.vercel.app/`: ultima deployment controllata `READY`, home HTTP 200. I due deployment precedenti visibili erano falliti.
- Supabase `unconventionart` in EU Central, Postgres 17.6, funzione `gallery-public` e advisor di sicurezza/performance.
- Ricerca nel workspace Notion collegato: nessuna pagina di progetto canonica trovata.

## Rilievi prioritari iniziali

### 1. Schema non riproducibile dal repository — alto

Supabase registra nove migrazioni applicate, ma il repository non conteneva una serie `supabase/migrations/`: c'erano SQL storici in `infra/` e una nota testuale per le migrazioni artista. Lo schema live quindi non era riproducibile da un clone.

Le migrazioni 1–7 sono state ricostruite dai commit sorgente esatti. Le migrazioni 8–9 sono state ricostruite dallo schema live perché il corpo originale non risulta nella cronologia Git. Questa differenza è esplicitata in ogni file.

Il controllo live ha inoltre trovato che i due helper `SECURITY DEFINER` chiamati dalle policy artista non concedevano `EXECUTE` al ruolo `authenticated`: le policy del pannello non potevano valutare tali helper. Le migrazioni 10–11 impostano `search_path` vuoto, concedono l'esecuzione solo alle policy e spostano le funzioni in `ua_private`, fuori da `public` RPC. Dopo la migrazione le policy le invocano ancora e l'advisor non segnala più helper artista eseguibili da utenti autenticati in uno schema esposto.

### 2. Protezione Auth e file nella storia pubblica — alto

L'advisor Supabase segnala disattivata la protezione contro password compromesse. Il repo non ha credenziali per modificare le impostazioni Auth e la sessione della dashboard richiede un login; la preferenza è quindi documentata, ma non risulta ancora attivata.

Il commit della foto storica `images/kavyar/01.jpg` la descrive come autorizzata. La copia è ancora nella storia Git pubblica e alcuni deploy storici la possono servire. Non è stata riscritta la storia né sono stati cancellati deploy: la decisione sulla rimozione completa resta in attesa del proprietario dei diritti.

### 3. Social beta: dati, email e carico — alto prima di un lancio ampio

Il backend sociale richiede utenti autenticati e email confermata, limita gli incontri a 16 partecipanti e assegna loro una scadenza di 24 ore. `expires_at` non cancella da solo i record. I messaggi non vengono mostrati dopo 24 ore nelle risposte `tick`, ma restano memorizzati. Profili, segnalazioni e limiti non hanno una regola di cancellazione automatica osservata nel repository. Le durate vanno decise prima di installare una pulizia pianificata.

Il dispatcher sociale ha limiti per utente: circa 450 ms per gli aggiornamenti di presenza, 10 secondi per creare incontri e 500 ms per le altre azioni. Sono guardrail per account autenticati, non un limite di traffico globale.

La funzione pubblica è intenzionalmente accessibile senza JWT. La chiave publishable è visibile nel client e non ferma l'abuso. Ogni anteprima senza cache comporta una verifica DB e una lettura Storage; non è presente un limiter distribuito affidabile. Il client limita già la concorrenza delle immagini a sei. Un limite per IP richiede un backend condiviso e una retention esplicita dei suoi identificatori: non è stato sostituito da un contatore in memoria, che non sarebbe affidabile tra istanze Edge.

Il codice prevede conferma email, ma né la consegna reale né i redirect SMTP sono stati verificati in questa sessione. Non è stato inviato un messaggio di prova. Non sono state condotte prove su due dispositivi fisici o su visore.

### 4. Percorso artista incompleto — alto prima di invitare artisti

Il database non ha membership artista né opere con proprietario o `room_slug`; le 78 opere esistenti non hanno descrizione o sala artista. `roomSlug` arriva dal catalogo, ma il layout pubblico usa ancora gli slot delle dieci sale generali e non lo instrada alle posizioni `SIMONE_SLOTS`. Inoltre, i vincoli live richiedono una sala numerata per pubblicare, mentre la sala artista usa `hall_index = NULL`.

La migrazione 10 corregge l'accesso RLS per consentire le bozze. L'editor mostra che la sala non è mappata e disabilita la prima pubblicazione artista. Non viene attivata alcuna membership senza l'UUID Auth scelto e una mappatura fisica approvata; il mapping renderer e i vincoli per le 75 posizioni restano da progettare e verificare prima dell'esposizione pubblica.

## Stato e controlli iniziali

- Catalogo live: 78 opere e nessun video pubblicato; il backend pubblico limita i risultati a 200 elementi e le immagini a 4 MiB.
- Advisor sicurezza dopo le migrazioni: un warning residuo sulla protezione password; sette rilievi informativi segnalano RLS senza policy nelle tabelle sociali, che non hanno grant diretti e sono usate solo dal dispatcher RPC.
- Advisor performance: tre chiavi esterne non indicizzate, quattro indici inutilizzati e cinque gruppi di policy permissive sovrapposte; finché le tabelle sociali sono vuote i rilievi sono a bassa priorità.
- Dipendenze: `pnpm audit` sulla lockfile ha restituito zero advisory note per 275 dipendenze. Non sono state eseguite suite di test durante questo audit.
- CI: aggiunta una GitHub Action che esegue `npm ci` e `npm run check` per ogni pull request e per i push al branch predefinito.
- Vercel: nessuna modifica o deploy di produzione effettuato da questo audit.

## Decisioni aperte al 27 settembre

Per completare i lavori rimanenti servono: decisione sulla conservazione della foto storica; durata di conservazione per messaggi e altri record sociali; UUID Supabase Auth, nome e slug per ogni artista da abilitare; e disponibilità di una sessione Auth Supabase e di dispositivi fisici per i controlli finali. La guida operativa in `infra/README.md` mantiene queste dipendenze visibili.
