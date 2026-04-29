# UnconventionArt

Fine art photography duo · Dark monochrome.

## Stack

- Static HTML/CSS/JS — no framework, no build step
- Cormorant Garamond + Inter + JetBrains Mono via Google Fonts
- JSON-driven content (`data/exhibitions.json`, `data/journal.json`)
- `tools/publish.py` — drop photos into a folder, get a published site

## Local preview

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

## Adding new work

```bash
python3 tools/publish.py ./my-photos/ --series "Liminal Spaces" --status current --push
```

See `tools/publish.py --help` for all options.

## Structure

- `index.html` — Homepage (hero, featured exhibition, recent works, journal preview)
- `exhibitions.html` — Catalogue with All/Current/Past tabs and Viewing Room
- `about.html` — Biography with the brand mark
- `journal.html` + `post.html` — Editorial entries
- `contact.html` — Contact form
- `css/style.css` — Single stylesheet, design tokens-based
- `js/main.js` — Vanilla JS: lightbox, scroll reveal, mobile menu, content loaders
- `data/` — JSON content
- `images/` — All assets (SVG placeholders, brand mark, OG image, favicons)
- `tools/publish.py` — Photo publishing pipeline (Pillow + git)

## Brand assets

- `images/site/logo.png` — Master logo, 2000×776
- `images/site/logo-small.png` — Smaller version, 600×232 (used in header/footer)
- `images/site/og-image.png` — Open Graph image for social sharing, 1200×630
- `images/site/favicon-32.png` / `favicon-192.png` / `apple-touch-icon.png` — Favicons
