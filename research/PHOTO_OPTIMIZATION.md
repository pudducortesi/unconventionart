# Pipeline di ottimizzazione immagini

La build usa Sharp, fissato nel lockfile, per generare derivate WebP delle immagini elencate nel catalogo statico. Per ogni opera crea una miniatura con lato massimo di 768 px, un'anteprima mobile da 1024 px e un'anteprima da 1536 px. Il processo ruota l'immagine secondo l'orientamento incorporato e converte i pixel in sRGB; non modifica il file sorgente.

Per ogni dimensione la pipeline prova qualità WebP 90 e 95, poi lossless finché il PSNR rispetto alla stessa immagine ridimensionata non raggiunge 42 dB. Il PSNR è un controllo numerico, non una misura percettiva. I nomi delle derivate includono un hash dei byte codificati; i metadati dell'originale non vengono copiati.

Il catalogo pubblico live viene letto da Supabase. Il caricamento autenticato conserva gli originali nel bucket privato e pubblica solo le anteprime previste dal workflow. Le immagini di prova non vanno aggiunte direttamente al repository o al catalogo statico.

La pipeline è progettata per produrre file limitati e versionabili tramite hash. I risultati vanno rivalutati per ogni tipo di immagine prima di estendere il flusso a nuovi formati, soggetti o dimensioni.
