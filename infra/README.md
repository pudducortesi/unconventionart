# UnconventionArt — stato operativo

Ultimo controllo: 28 settembre 2026. Il repository usa il progetto Supabase `unconventionart` in EU Central; Vercel pubblica `https://unconventionart.vercel.app/`.

## Sistema live

- Il catalogo live è attivo (`data/publishing.json`). Supabase contiene 78 opere pubblicate; la funzione `gallery-public` restituisce solo metadati pubblici e anteprime JPEG di opere pubblicate. Gli originali restano in bucket privato.
- Il pannello `/admin` è collegato e nel database è presente un amministratore. Non risultano membership artista.
- `gallery-public` non richiede JWT perché serve contenuti pubblici. La chiave publishable nell'app identifica il client, ma non è un segreto né una protezione contro l'abuso. La funzione non ha un rate limiter condiviso e non memorizza in cache le risposte.
- Incontri è una beta privata: richiede account autenticato e email confermata, limita ogni incontro a 16 partecipanti e lo fa scadere dopo 24 ore. La migrazione `20260927225917_social_data_retention` attiva la pulizia automatica: messaggi dopo 24 ore, profili 30 giorni dopo l'eliminazione dell'account e segnalazioni dopo 90 giorni. Il job ogni cinque minuti ha completato le prime esecuzioni; al momento dell'applicazione non c'erano dati social da eliminare.

## Migrazioni

Le versioni 1–7 in `supabase/migrations/` derivano dai file SQL presenti nei rispettivi commit storici. Le versioni 8–9 sono state ricostruite dallo schema e dalle policy live perché il repository non conteneva il loro SQL originario. La ricostruzione è segnalata nei file; non va presentata come copia byte-per-byte delle migrazioni eseguite.

Le versioni 10–11 correggono i permessi EXECUTE dei due helper RLS artista e li spostano nello schema interno `ua_private`; le policy mantengono l'autorizzazione alle bozze senza esporre gli helper come RPC in `public`. Per applicare nuove modifiche di schema usare nuove migrazioni versionate; non modificare le versioni già registrate in produzione. Prima di collegare un nuovo progetto, verificare il contenuto e l'ordine dell'intera serie.

La versione `20260927225917` implementa la retention sociale concordata e installa il cron `ua-social-retention` ogni cinque minuti. Conserva i riferimenti e i nomi nelle segnalazioni tramite snapshot, anche quando l'account segnalato viene eliminato.

## Decisioni attuate e limiti

- In Auth sono impostati password di almeno 12 caratteri con maiuscole, minuscole, numeri e simboli, e cambio password protetto da sessione recente. La verifica delle password compromesse è proposta solo dal piano Supabase Pro; il progetto è sul piano Free, quindi resta disattivata senza upgrade. SMTP personalizzato e consegna email non sono stati verificati.
- La foto di prova è stata rimossa dal catalogo statico, dalla pagina senza JavaScript e dal percorso di build. Le ricerche nelle opere e nello Storage Supabase non trovano riferimenti Kavyar. Dopo la riscrittura, i 12 branch GitHub corrispondono alle ref locali; il check Vercel risulta riuscito sul branch predefinito e sulla PR, la homepage pubblica risponde 200 e il vecchio percorso immagine risponde 404.
- Il roster in `data/artists/provisional-roster.json` contiene un solo segnaposto non attivo: nessun utente Auth, email, membership o pubblicazione viene creato. Il nome, lo slug definitivo e la mappatura della sala si definiranno quando saranno scelti gli artisti.
- L'editor consente bozze artista ma disabilita la prima pubblicazione finché la sala non è mappata. Nessuna membership va creata senza ID utente Auth e assegnazione esplicita.
- Il sistema sociale applica limiti per utente alle chiamate, non un rate limiter globale alla funzione pubblica `gallery-public`. Questa funzione non richiede JWT e non memorizza in cache le risposte.
- Non è stata verificata la consegna reale delle email né sono state condotte prove su due dispositivi fisici o su visore.
- `.github/workflows/project-checks.yml` esegue build e suite esistente sulle PR e sui push al branch predefinito. I controlli non sostituiscono una prova di consegna email o una visita su hardware VR/mobile.

## Riferimenti

- [Audit sistema 2026-09-28](../docs/system-audit-2026-09-27.md)
- [Guida Beta Sociale](../docs/SOCIAL_BETA_2026-09-26.md)
- [Supabase password security](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection)
