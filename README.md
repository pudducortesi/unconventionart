# UnconventionArt — v2 Overhaul

Fine art photography duo · Dark monochrome.

## What changed in this version

**Type system**
- Editorial serif (Cormorant Garamond) for headings & key italics — paired with Inter (body) and JetBrains Mono (eyebrows / metadata).
- Full type-scale tokenized via CSS variables (`--t-h1` through `--t-eyebrow`).

**Hero**
- Asymmetric editorial layout instead of centered template.
- Three-line title with staggered slide-up reveal animation.
- Rotated side-tag, animated scroll indicator, eyebrow with rule.

**Header**
- Monogram "U" in serif italic + wordmark — monogram rotates on hover.
- Active link state with underline.
- Background goes opaque on scroll (`is-scrolled`).

**Mobile menu**
- Replaced fade-in nav with a real full-screen overlay grouped by section.
- Closes on Esc.

**Works grid (Exhibitions)**
- Editorial masonry: alternating tile sizes (4-col / 6-col / 8-col) with
  varying aspect ratios for rhythm. Same input data, much stronger layout.
- Per-tile numbering (N° 01, N° 02…).

**Lightbox**
- Counter (01 / 12), keyboard nav, swipe gestures, deep-link via `#work-<id>`.
- Bordered nav buttons matching the dark aesthetic.

**About / Biography**
- Drop-cap on first paragraph, full-width pull quote, larger spacing.

**Journal**
- News rows now slide right slightly on hover, with arrow indicator.
- Single-post page is centred and reads more like an essay.

**Footer**
- Italic serif wordmark, mailing-list with quiet copy, 4-column grid.

**Accessibility**
- `aria-expanded` on toggle, `role="dialog"` on overlay & lightbox,
  `prefers-reduced-motion` honoured.

**Content shape**
- All 6 pages renamed nothing — same data files (`exhibitions.json`,
  `journal.json`) work unchanged.
- `tools/publish.py` left untouched; the publishing workflow still works.

## Local preview

```bash
# Any static server, e.g.
python3 -m http.server 8000
# then open http://localhost:8000
```

## Publish a new series

```bash
python3 tools/publish.py ./my-photos/ --series "Ethereal Decay" --status current --push
```

See `tools/publish.py --help` for all options.
