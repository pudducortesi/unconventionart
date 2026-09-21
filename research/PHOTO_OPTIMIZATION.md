# Ottimizzazione fotografie: risultato verificato

Sharp 0.35.4 è una dipendenza di sviluppo fissata nel lockfile. I cinque checkout di ricerca restano separati; il codice del compressore non entra nel browser. La build genera le varianti del solo catalogo pubblico in `dist/images/optimized` e arricchisce il catalogo di produzione. Il catalogo sorgente e gli originali non vengono modificati.

## Misure sulla fotografia Kavyar / 01

| Uso | Dimensioni | Byte | Riduzione rispetto al JPEG originale |
|---|---|---:|---:|
| Originale HD | 1365 × 2048 | 331.182 | — |
| Miniatura | 512 × 768 | 39.336 | 88,1% |
| Navigazione mobile | 683 × 1024 | 73.018 | 78,0% |
| Navigazione desktop | 1024 × 1536 | 157.724 | 52,4% |

Sono risparmi per singola immagine usata in quel contesto, non percentuali sull'intero sito o sui frame al secondo. Se il visitatore si avvicina o apre l'HD scarica anche l'originale. Sulla prima opera il risparmio dipende quindi dal percorso effettivo.

Le varianti adottate sono WebP qualità 90, effort 6. PSNR RGB rispetto al riferimento sRGB **ridimensionato alla stessa risoluzione**: 43,226 / 43,216 / 43,877 dB. Il controllo non misura la perdita di dettaglio dovuta al ridimensionamento e non è una certificazione percettiva. Originale e anteprima mobile sono stati anche ispezionati visivamente. La scelta mantiene l'HD intatto e accessibile.

La pipeline prova qualità 90, poi 95, poi lossless se non raggiunge 42 dB; se il risultato pesa più dell'originale conserva l'originale. Il nome del file dipende dai byte codificati e può usare cache immutable senza confondere versioni diverse. Orientamento applicato e conversione sRGB; i metadati personali non vengono copiati nelle derivate. Nessuna alterazione degli originali.

Confronto aggiuntivo in `benchmarks/photo-codecs.json`: WebP 90/95/lossless e AVIF 85 a 768/1024/1536/2048 pixel. I tempi includono codifica e decodifica di confronto su questo ambiente e non rappresentano i tempi del Chromebook. I livelli di qualità dei codec non sono equivalenti; non si conclude che WebP sia universalmente migliore. Nel report un PSNR 100 per lossless indica identità dei pixel dopo il ridimensionamento (il valore matematico sarebbe infinito).

## Caricamento e fallback

- Pareti: variante mobile o desktop; se manca/non viene decodificata, recupero dell'originale.
- Catalogo: miniatura; Studio: anteprima, immagini lazy. Sala di visione e HD mantengono l'originale.
- La texture HD viene richiesta vicino all'opera (5,5 m), quando il movimento si ferma; resta fino a 7 m per evitare cambi continui sul bordo della soglia. La selezione di un'opera lontana non basta più a scaricarne l'HD.
- Una texture desktop di navigazione passa da 1365×2048 a 1024×1536: circa 44% di texel in meno. Su mobile il limite precedente era già 1024: qui il vantaggio è principalmente nel download e nella preparazione dell'immagine, non in una nuova riduzione equivalente di VRAM.

## Valutazione degli altri repository

- **SSIMULACRA2:** sorgenti acquisiti, compilazione non completata. CMake/Ninja e librerie native mancanti; installazione dipendenze rifiutata dall'ambiente per permessi. Nessun punteggio SSIMULACRA2 inventato. Prima di scalare a molte fotografie diverse va aggiunto questo controllo e una revisione visiva rappresentativa.
- **Meshoptimizer e glTF Transform:** il GLB AR attuale pesa 333.892 byte, dei quali 331.182 sono il JPEG originale. Solo 2.710 byte includono geometrie e struttura; 14 triangoli. Aggiungere un decoder per comprimere questo contenuto non è giustificato. Gli arredi attuali sono soprattutto geometrie procedurali/istanziate, non grossi GLB scaricati. I due strumenti restano candidati per futuri arredi importati.
- **Basis Universal:** molte texture correnti sono cartelli e superfici generati con CanvasTexture, senza file da comprimere durante il download. La conversione KTX2 richiede una pipeline dedicata e una misura del costo del transcoder e della qualità dei testi. Non attivata senza un confronto utile sulla scena reale.

Verifiche: conservazione byte-per-byte degli originali, metadati del catalogo preservati, dimensioni e peso delle derivate, controllo PSNR, fallback all'originale, richiesta HD separata, assenza di sorgenti/compressori nel bundle pubblico. Nessuna misura di FPS su hardware dell'utente viene attribuita a questa modifica.
