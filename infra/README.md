# UnconventionArt — stato operativo

Ultimo controllo: 27 settembre 2026. Il repository usa il progetto Supabase `unconventionart` in EU Central; Vercel pubblica `https://unconventionart.vercel.app/`.

## Sistema live

- Il catalogo live è attivo (`data/publishing.json`). Supabase contiene 78 opere pubblicate; la funzione `gallery-public` restituisce solo metadati pubblici e anteprime JPEG di opere pubblicate. Gli originali restano in bucket privato.
- Il pannello `/admin` è collegato e nel database è presente un amministratore. Non risultano membership artista.
- `gallery-public` non richiede JWT perché serve contenuti pubblici. La chiave publishable nell'app identifica il client, ma non è un segreto né una protezione contro l'abuso. La funzione non ha un rate limiter condiviso e non memorizza in cache le risposte.
- Incontri è una beta privata: richiede account autenticato e email confermata, limita ogni incontro a 16 partecipanti e lo fa scadere dopo 24 ore. Il servizio sociale applica limiti per utente alle chiamate; non è stato verificato su due dispositivi fisici né è stata confermata la consegna reale delle email.

## Migrazioni

Le versioni 1–7 in `supabase/migrations/` derivano dai file SQL presenti nei rispettivi commit storici. Le versioni 8–9 sono state ricostruite dallo schema e dalle policy live perché il repository non conteneva il loro SQL originario. La ricostruzione è segnalata nei file; non va presentata come copia byte-per-byte delle migrazioni eseguite.

Le versioni 10–11 correggono i permessi EXECUTE dei due helper RLS artista e li spostano nello schema interno `ua_private`; le policy mantengono l'autorizzazione alle bozze senza esporre gli helper come RPC in `public`. Per applicare nuove modifiche di schema usare nuove migrazioni versionate; non modificare le versioni già registrate in produzione. Prima di collegare un nuovo progetto, verificare il contenuto e l'ordine dell'intera serie.

## Lavoro residuo e limiti

- Auth segnala disattivata la protezione contro password compromesse. Il pannello richiede un accesso Supabase; il repo non conserva credenziali. Attivarla nelle impostazioni Auth e registrarne l'esito.
- L'anteprima storica in `images/kavyar/01.jpg` è documentata dal commit come autorizzata. Non è stata rimossa dalla storia Git o dai vecchi deploy; una riscrittura della storia non va eseguita senza una decisione esplicita sui diritti.
- `expires_at` nasconde gli incontri scaduti ma non comporta una cancellazione automatica. I messaggi spariscono dalle risposte dopo 24 ore, ma non vengono cancellati fisicamente per età. Non è definita la conservazione di profili e segnalazioni; scegliere le durate prima di schedulare una pulizia.
- Il record artista, le opere con `room_slug` e le 75 posizioni di progetto non sono ancora collegati al renderer pubblico. L'editor consente bozze artista ma disabilita la prima pubblicazione finché la sala non è mappata. Nessuna membership va creata senza ID utente Auth e assegnazione esplicita.
- `.github/workflows/project-checks.yml` esegue build e suite esistente sulle PR e sui push al branch predefinito. I controlli non sostituiscono una prova di consegna email o una visita su hardware VR/mobile.

## Riferimenti

- [Audit sistema 2026-09-27](../docs/system-audit-2026-09-27.md)
- [Guida Beta Sociale](../docs/SOCIAL_BETA_2026-09-26.md)
- [Supabase password security](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection)
