# Palazzo-inspired corridor textures

These two original decorative images were generated with the built-in image generation tool on 2026-09-22 for the UnconventionArt virtual corridor.

They are AI-generated Baroque-inspired décor, not photographs of Palazzo Colonna, not historical reproductions, and not catalogue artworks. They must remain separate from the artist's exhibited photographs and must not be attributed to a historical painter. The user's Palazzo Colonna screenshot guided the corridor's overall visual direction; these images were generated from text, not extracted or copied from that screenshot.

## Runtime files

| File | Dimensions | Size | Usage |
| --- | --- | --- | --- |
| `images/palazzo/fresco-vault.webp` | 1536 × 768 | 303,082 bytes | Flat 2:1 decorative fresco for a repeated barrel-vault bay |
| `images/palazzo/paintings-atlas.webp` | 1024 × 1024 | 177,566 bytes | Four decorative paintings, equal 2 × 2 atlas |

Total runtime transfer: 480,648 bytes before transport overhead (approximately 469 KiB).

The original outputs were 1774 × 887 and 1254 × 1254. The only post-processing was proportional downsampling and WebP encoding with Sharp (quality 83 for the fresco, 84 for the paintings; effort 6). No outside photographs or paintings were imported. There was no artistic post-editing or compositing outside the image generation tool.

Atlas visual order, reading from the top left:

1. Golden allegorical figure.
2. Italianate landscape with ruins.
3. Allegory of music in crimson.
4. Pastoral river landscape.

Texture quadrants should be sampled with an inset to avoid neighboring-panel mip/linear filtering bleed. Three.js's vertical texture convention should be accounted for in UVs.

These are runtime texture assets, not a preview or screenshot of the final corridor.

## Exact generation prompts

### Fresco

```text
Use case: historical-scene
Asset type: flat diffuse texture for a 3D Italian Baroque gallery barrel-vault ceiling.
Primary request: original magnificent high-Baroque Italian ceiling fresco, inspired by the richness of Roman seventeenth-century palace galleries, not a reproduction of any real painting.
Composition/framing: landscape canvas with aspect ratio 2:1. Entire image is a flat unfolded painted surface seen orthographically straight on; no view of an actual room and no photographic perspective. Large central oval allegorical scene of graceful adult figures in flowing drapery amongst luminous clouds, surrounded by elaborate painted ivory scrollwork and rich gilded acanthus ornament, subsidiary figural allegories at four corners. Balanced densely detailed composition reaching every edge, suitable for wrapping onto one barrel vault bay.
Style/medium: authentic-looking old fresco pigment and subtle plaster grain, fine seventeenth-century Italian figurative painting, restrained aged surface, richly painted architectural ornament.
Lighting/mood: uniformly legible diffuse surface, luminous central sky with soft painterly shadows.
Color palette: muted ultramarine, pale blue clouds, ochre, ivory, warm gilded gold, olive, muted vermilion.
Constraints: original decorative artwork, fully draped human figures, no text, no lettering, no signature, no logo, no watermark, no room edges, no frame outside canvas, no modern elements. Fill the complete rectangular image.
```

### Paintings atlas

```text
Use case: historical-scene
Asset type: 2 by 2 texture atlas of original decorative old-master paintings for a 3D Italian Baroque gallery.
Primary request: one square image divided exactly into four equal square panels: top-left classical allegory with fully draped adult figures in golden/ochre garments; top-right atmospheric seventeenth-century Italian landscape with classical ruins and a deep olive sky; bottom-left allegory of music with a fully draped adult musician and muted crimson fabric; bottom-right classical pastoral landscape with a river, distant hills and small draped adult figures. These are four distinct original paintings, not copies of real catalogue works.
Style/medium: fine Italian seventeenth-century oil painting, rich painterly chiaroscuro, aged varnish and subtle canvas texture, believable careful human anatomy.
Composition/framing: flat front-facing artwork only, exact equal 2x2 grid, each scene fills its own quadrant edge to edge. No gaps, no divider strokes, no picture frames, no borders or margins. Each quadrant has a readable independent composition.
Lighting/mood: deep warm dark grounds with softly lit figures and landscape highlights.
Color palette: umber, muted gold, warm olive, dark crimson, soft cream highlights.
Constraints: no lettering, no labels, no text, no signatures, no logos, no watermark, no photography, no modern objects. Entire canvas remains square.
```
