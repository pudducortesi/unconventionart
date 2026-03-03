#!/usr/bin/env python3
"""
UnconventionArt — Publish Agent
================================
Drop photos in a folder → this script does the rest:

  1. Processes & optimizes images (resize, web-ready)
  2. Generates exhibition titles, descriptions, metadata
  3. Creates a News post announcing the new series
  4. Updates exhibitions.json and journal.json
  5. Commits and pushes to git

Usage:
  python3 tools/publish.py ./my-new-photos/

  # With options:
  python3 tools/publish.py ./photos/ --series "Ethereal Decay" --category "Fine Art"
  python3 tools/publish.py ./photos/ --series "Ethereal Decay" --status current --push
  python3 tools/publish.py ./photos/ --interactive

Requirements:
  - Python 3.8+
  - Pillow (optional, for image optimization): pip3 install Pillow
"""

import argparse
import json
import os
import re
import shutil
import subprocess
import sys
import hashlib
import random
from datetime import datetime
from pathlib import Path

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "data"
IMG_DIR = ROOT / "images"
EXH_JSON = DATA_DIR / "exhibitions.json"
JOURNAL_JSON = DATA_DIR / "journal.json"
EXH_IMG_DIR = IMG_DIR / "exhibitions"
JOURNAL_IMG_DIR = IMG_DIR / "journal"

MAX_WIDTH = 2400          # max image width in px
JPEG_QUALITY = 85         # JPEG quality for web
VALID_EXT = {".jpg", ".jpeg", ".png", ".webp", ".tiff", ".tif", ".bmp"}

# ---------------------------------------------------------------------------
# Text generation — evocative art-world vocabulary
# ---------------------------------------------------------------------------

TITLE_TEMPLATES = [
    # Single-word evocative
    ["Threshold", "Reverie", "Stillness", "Apparition", "Dissolution",
     "Undertow", "Afterglow", "Resonance", "Tremor", "Eclipse",
     "Vestige", "Confluence", "Drift", "Meridian", "Penumbra"],
    # Two-word poetic
    ["Silent Architecture", "Borrowed Light", "Distant Frequency",
     "Suspended Gravity", "Hollow Ground", "Woven Shadow",
     "Fractured Noon", "Liquid Boundary", "Fading Hymn",
     "Phantom Limb", "Velvet Hour", "Burning Patience",
     "Invisible Weight", "Broken Symmetry", "Morning Vertigo"],
    # Numbered/series style
    ["Study {n}", "Fragment {n}", "Untitled {n}", "Movement {n}",
     "Passage {n}", "Variation {n}", "State {n}"],
]

DESCRIPTION_TEMPLATES = [
    "A meditation on {theme} — captured in the tension between light and form.",
    "The boundary between {a} and {b}, held in a single frame.",
    "{theme} rendered visible through the interplay of body and architecture.",
    "An image born from the space where {a} meets {b}.",
    "Stillness as an act of defiance. {theme} made tangible.",
    "The quiet aftermath of {theme} — presence lingering where it shouldn't.",
    "Where {a} dissolves into {b}, something unexpected emerges.",
    "A study in {theme}: the body as landscape, the space as witness.",
    "Light finds its way through {theme}, revealing what was always there.",
    "{theme} distilled to its essential gesture.",
]

THEMES = [
    "impermanence", "solitude", "memory", "transformation", "silence",
    "absence", "revelation", "erosion", "intimacy", "vulnerability",
    "transcendence", "displacement", "longing", "surrender", "tension",
    "fragility", "resilience", "decay", "emergence", "threshold",
]

THEME_PAIRS = [
    ("presence", "absence"), ("light", "shadow"), ("stillness", "motion"),
    ("control", "surrender"), ("memory", "forgetting"), ("body", "space"),
    ("intimacy", "distance"), ("chaos", "order"), ("surface", "depth"),
    ("the visible", "the hidden"), ("permanence", "impermanence"),
    ("vulnerability", "strength"), ("nature", "architecture"),
]

CATEGORIES = ["Fine Art", "Conceptual", "Abstract", "Editorial", "Experimental"]

NEWS_TEMPLATES = [
    (
        "New Series: {series}",
        "Introducing our latest body of work",
        "<p>We are pleased to announce <strong>{series}</strong>, a new series of "
        "{count} works exploring {theme}.</p>"
        "<p>{series_desc}</p>"
        "<p>The series was shot on location in Italy, continuing our ongoing "
        "investigation of the relationship between the human form and "
        "architectural space. Each image in this collection emerged from an "
        "unscripted dialogue between photographer and muse — moments of "
        "stillness, gesture, and light captured as they occurred.</p>"
        "<p>The full series is available to view on our "
        "<a href=\"exhibitions.html\">Exhibitions</a> page.</p>"
    ),
    (
        "{series} — New Work",
        "On the making of our newest series",
        "<p>Today we share <strong>{series}</strong>, {count} new photographs "
        "that grew from our fascination with {theme}.</p>"
        "<p>{series_desc}</p>"
        "<h2>Process</h2>"
        "<p>This body of work developed over several weeks of shooting, "
        "revisiting the same spaces at different hours to understand how light "
        "transforms meaning. We worked without a predetermined script — "
        "letting the locations and the energy between us guide each session.</p>"
        "<p>Post-production was kept minimal, as always. What you see is "
        "close to what was there.</p>"
        "<p>View the complete series on our "
        "<a href=\"exhibitions.html\">Exhibitions</a> page.</p>"
    ),
]

SERIES_DESC_TEMPLATES = [
    "The title refers to {theme} — {elaboration}. Through {count} images, "
    "we trace the quiet tension between what is seen and what is felt.",

    "In this series, we turn our attention to {theme}. The images move "
    "between the documentary and the dreamlike, anchored by the muse's "
    "presence in spaces that feel both familiar and uncanny.",

    "{series} grew from a single afternoon of shooting that expanded into "
    "a sustained exploration of {theme}. The work asks what remains when "
    "the obvious is stripped away.",
]

ELABORATION = [
    "a concept that has haunted us since we first started working together",
    "something we've circled around in previous work but never confronted directly",
    "the invisible force that shapes every image we make, whether we intend it or not",
    "a quality we've observed in the spaces we're drawn to, now given form",
    "that particular feeling just before everything changes",
]

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def color(text, code):
    """ANSI color wrapper."""
    return f"\033[{code}m{text}\033[0m"

def green(text):  return color(text, "32")
def yellow(text): return color(text, "33")
def cyan(text):   return color(text, "36")
def dim(text):    return color(text, "90")
def bold(text):   return color(text, "1")

def slugify(text):
    """Convert text to URL-safe slug."""
    text = text.lower().strip()
    text = re.sub(r'[^\w\s-]', '', text)
    text = re.sub(r'[\s_]+', '-', text)
    text = re.sub(r'-+', '-', text)
    return text.strip('-')

def load_json(path):
    """Load JSON file, return empty list if not found."""
    if path.exists():
        with open(path, 'r', encoding='utf-8') as f:
            return json.load(f)
    return []

def save_json(path, data):
    """Save data to JSON file with pretty formatting."""
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        f.write('\n')

def find_photos(folder):
    """Find all valid image files in a folder."""
    folder = Path(folder)
    if not folder.is_dir():
        print(f"  {color('Error:', '31')} '{folder}' is not a directory")
        sys.exit(1)

    photos = sorted([
        f for f in folder.iterdir()
        if f.is_file() and f.suffix.lower() in VALID_EXT
    ])

    if not photos:
        print(f"  {color('Error:', '31')} No images found in '{folder}'")
        print(f"  Supported formats: {', '.join(VALID_EXT)}")
        sys.exit(1)

    return photos

def next_exh_id(exhibitions):
    """Get next available exhibition ID."""
    if not exhibitions:
        return 1
    return max(e["id"] for e in exhibitions) + 1

def next_img_number(directory):
    """Get next available image number in directory."""
    existing = []
    for f in directory.iterdir():
        match = re.match(r'^(\d+)', f.stem)
        if match:
            existing.append(int(match.group(1)))
    return max(existing, default=0) + 1

def date_range_str():
    """Generate exhibition date range string."""
    now = datetime.now()
    months = ["January", "February", "March", "April", "May", "June",
              "July", "August", "September", "October", "November", "December"]
    start = months[now.month - 1]
    end_month = min(now.month + 2, 12)
    end = months[end_month - 1]
    return f"{start} — {end} {now.year}"

# ---------------------------------------------------------------------------
# Image Processing
# ---------------------------------------------------------------------------

def process_image(src, dst, max_width=MAX_WIDTH, quality=JPEG_QUALITY):
    """
    Process image: resize for web, convert to JPEG, strip metadata.
    Uses Pillow if available, otherwise just copies.
    """
    try:
        from PIL import Image, ExifTags

        img = Image.open(src)

        # Auto-rotate based on EXIF
        try:
            exif = img._getexif()
            if exif:
                for tag, value in exif.items():
                    if ExifTags.TAGS.get(tag) == 'Orientation':
                        if value == 3:
                            img = img.rotate(180, expand=True)
                        elif value == 6:
                            img = img.rotate(270, expand=True)
                        elif value == 8:
                            img = img.rotate(90, expand=True)
        except (AttributeError, KeyError):
            pass

        # Resize if wider than max
        w, h = img.size
        if w > max_width:
            ratio = max_width / w
            new_h = int(h * ratio)
            img = img.resize((max_width, new_h), Image.LANCZOS)

        # Convert to RGB (drop alpha channel) and save as JPEG
        if img.mode in ('RGBA', 'P', 'LA'):
            img = img.convert('RGB')

        dst = dst.with_suffix('.jpg')
        img.save(dst, 'JPEG', quality=quality, optimize=True)
        return dst

    except ImportError:
        # No Pillow — just copy with original extension preserved
        dst = dst.with_suffix(src.suffix.lower())
        shutil.copy2(src, dst)
        return dst

# ---------------------------------------------------------------------------
# Text Generation
# ---------------------------------------------------------------------------

def generate_title(index, total, used_titles=None):
    """Generate an evocative artwork title."""
    used = used_titles or set()
    attempts = 0

    while attempts < 50:
        attempts += 1
        pool_idx = random.choice([0, 0, 1, 1, 2])  # weight toward poetic
        template = random.choice(TITLE_TEMPLATES[pool_idx])

        if "{n}" in template:
            title = template.format(n=random.choice(["I", "II", "III", "IV",
                                                      "V", "VI", "VII", "VIII"]))
        else:
            title = template

        if title not in used:
            return title

    return f"Untitled ({index + 1})"

def generate_description(theme=None):
    """Generate artwork description."""
    theme = theme or random.choice(THEMES)
    pair = random.choice(THEME_PAIRS)
    template = random.choice(DESCRIPTION_TEMPLATES)
    return template.format(theme=theme, a=pair[0], b=pair[1])

def generate_series_description(series_name, count, theme):
    """Generate a paragraph describing the series."""
    template = random.choice(SERIES_DESC_TEMPLATES)
    elaboration = random.choice(ELABORATION)
    return template.format(
        series=series_name, count=count,
        theme=theme, elaboration=elaboration
    )

def generate_news_post(series_name, count, theme, first_image_path):
    """Generate a complete news/journal post for the new series."""
    template = random.choice(NEWS_TEMPLATES)
    series_desc = generate_series_description(series_name, count, theme)

    title = template[0].format(series=series_name)
    subtitle = template[1]
    content = template[2].format(
        series=series_name, count=count,
        theme=theme, series_desc=series_desc
    )

    return {
        "slug": slugify(series_name),
        "title": title,
        "subtitle": subtitle,
        "date": datetime.now().strftime("%Y-%m-%d"),
        "tag": "New Work",
        "image": str(first_image_path),
        "excerpt": f"{series_name} — a new series of {count} works exploring {theme}. "
                   f"Shot on location in Italy.",
        "content": content,
    }

# ---------------------------------------------------------------------------
# Interactive Mode
# ---------------------------------------------------------------------------

def prompt_input(label, default=None):
    """Prompt for user input with optional default."""
    if default:
        raw = input(f"  {cyan(label)} [{dim(default)}]: ").strip()
        return raw if raw else default
    else:
        raw = input(f"  {cyan(label)}: ").strip()
        return raw

def prompt_choice(label, choices, default=0):
    """Prompt for choice from list."""
    print(f"  {cyan(label)}")
    for i, choice in enumerate(choices):
        marker = ">" if i == default else " "
        print(f"    {marker} {i + 1}. {choice}")
    raw = input(f"  Choice [default: {default + 1}]: ").strip()
    if not raw:
        return choices[default]
    try:
        return choices[int(raw) - 1]
    except (ValueError, IndexError):
        return choices[default]

def prompt_confirm(label, default=True):
    """Prompt for yes/no confirmation."""
    suffix = "[Y/n]" if default else "[y/N]"
    raw = input(f"  {cyan(label)} {suffix}: ").strip().lower()
    if not raw:
        return default
    return raw in ('y', 'yes', 'si', 'sì')

def interactive_mode(photos):
    """Gather all parameters interactively."""
    print()
    print(bold("  --- UnconventionArt Publish Agent ---"))
    print(f"  Found {green(str(len(photos)))} photos to publish")
    print()

    series = prompt_input("Series name", "New Series")
    category = prompt_choice("Category", CATEGORIES, 0)
    status = prompt_choice("Status", ["current", "past"], 0)
    theme = prompt_choice("Theme", random.sample(THEMES, 5), 0)

    print()
    print(f"  {dim('Generating titles and descriptions...')}")

    # Generate titles, let user review
    titles = []
    used = set()
    for i in range(len(photos)):
        t = generate_title(i, len(photos), used)
        used.add(t)
        titles.append(t)

    print()
    print(f"  {bold('Generated titles:')}")
    for i, t in enumerate(titles):
        print(f"    {dim(str(i+1) + '.')} {t}")

    if not prompt_confirm("Keep these titles?", True):
        print(f"  {dim('Enter titles manually (one per line, empty = auto):')}")
        for i in range(len(photos)):
            custom = input(f"    {i+1}. [{titles[i]}]: ").strip()
            if custom:
                titles[i] = custom

    create_news = prompt_confirm("Create news post?", True)
    do_push = prompt_confirm("Commit & push to git?", True)

    return {
        "series": series,
        "category": category,
        "status": status,
        "theme": theme,
        "titles": titles,
        "create_news": create_news,
        "push": do_push,
    }

# ---------------------------------------------------------------------------
# Main Publish Flow
# ---------------------------------------------------------------------------

def publish(photo_folder, series=None, category=None, status=None,
            theme=None, interactive=False, push=False, create_news=True,
            titles=None):
    """Main publish pipeline."""

    print()
    print(bold("╔══════════════════════════════════════════╗"))
    print(bold("║   UnconventionArt — Publish Agent        ║"))
    print(bold("╚══════════════════════════════════════════╝"))
    print()

    # 1. Find photos
    photos = find_photos(photo_folder)
    print(f"  {green('✓')} Found {bold(str(len(photos)))} photos in {photo_folder}")

    # 2. Interactive or auto mode
    if interactive:
        params = interactive_mode(photos)
        series = params["series"]
        category = params["category"]
        status = params["status"]
        theme = params["theme"]
        titles = params["titles"]
        create_news = params["create_news"]
        push = params["push"]
    else:
        series = series or "New Series"
        category = category or random.choice(CATEGORIES)
        status = status or "current"
        theme = theme or random.choice(THEMES)

        if not titles:
            titles = []
            used = set()
            for i in range(len(photos)):
                t = generate_title(i, len(photos), used)
                used.add(t)
                titles.append(t)

    date_range = date_range_str()

    print()
    print(f"  {cyan('Series:')}    {series}")
    print(f"  {cyan('Category:')}  {category}")
    print(f"  {cyan('Status:')}    {status}")
    print(f"  {cyan('Theme:')}     {theme}")
    print(f"  {cyan('Date:')}      {date_range}")
    print()

    # 3. Process images
    print(f"  {bold('Processing images...')}")
    EXH_IMG_DIR.mkdir(parents=True, exist_ok=True)

    start_num = next_img_number(EXH_IMG_DIR)
    processed_paths = []

    for i, photo in enumerate(photos):
        num = start_num + i
        dst_name = f"{num:02d}"
        dst = EXH_IMG_DIR / dst_name

        result = process_image(photo, dst)
        rel_path = result.relative_to(ROOT)
        processed_paths.append(str(rel_path))
        print(f"    {green('✓')} {photo.name} → {rel_path}")

    print()

    # 4. Generate exhibition entries
    print(f"  {bold('Updating exhibitions.json...')}")
    exhibitions = load_json(EXH_JSON)
    next_id = next_exh_id(exhibitions)

    # If adding "current", move existing "current" to "past"
    if status == "current":
        for exh in exhibitions:
            if exh["status"] == "current":
                exh["status"] = "past"
        print(f"    {dim('Moved previous current exhibitions to past')}")

    new_entries = []
    for i, (title, img_path) in enumerate(zip(titles, processed_paths)):
        entry = {
            "id": next_id + i,
            "title": title,
            "series": series,
            "category": category,
            "status": status,
            "date": date_range,
            "image": img_path,
            "description": generate_description(theme),
        }
        new_entries.append(entry)

    # Prepend new entries
    exhibitions = new_entries + exhibitions
    save_json(EXH_JSON, exhibitions)
    print(f"    {green('✓')} Added {len(new_entries)} exhibition entries")

    # 5. Generate news post
    if create_news:
        print(f"  {bold('Creating news post...')}")

        # Copy first image as news hero
        JOURNAL_IMG_DIR.mkdir(parents=True, exist_ok=True)
        existing_posts = load_json(JOURNAL_JSON)
        post_num = len(existing_posts) + 1
        hero_dst = JOURNAL_IMG_DIR / f"post-{post_num}"
        hero_result = process_image(photos[0], hero_dst)
        hero_rel = str(hero_result.relative_to(ROOT))

        post = generate_news_post(series, len(photos), theme, hero_rel)
        existing_posts.insert(0, post)
        save_json(JOURNAL_JSON, existing_posts)
        print(f"    {green('✓')} Created news post: \"{post['title']}\"")

    print()

    # 6. Summary
    print(bold("  ─── Summary ───────────────────────────"))
    print(f"  Photos processed:  {green(str(len(photos)))}")
    print(f"  Exhibition entries: {green(str(len(new_entries)))}")
    if create_news:
        print(f"  News post:         {green('created')}")
    print(f"  Series:            {series}")
    print(f"  Status:            {status}")
    print()

    # 7. Git commit & push
    if push:
        print(f"  {bold('Committing to git...')}")
        try:
            subprocess.run(["git", "add", "-A"], cwd=ROOT, check=True,
                           capture_output=True)
            msg = f"publish: {series} — {len(photos)} new works"
            subprocess.run(["git", "commit", "-m", msg], cwd=ROOT,
                           check=True, capture_output=True)
            print(f"    {green('✓')} Committed: {dim(msg)}")

            subprocess.run(["git", "push"], cwd=ROOT, check=True,
                           capture_output=True)
            print(f"    {green('✓')} Pushed to remote")
        except subprocess.CalledProcessError as e:
            print(f"    {color('⚠', '33')} Git error: {e.stderr.decode().strip()}")
            print(f"    {dim('You can commit manually later')}")
    else:
        print(f"  {dim('Skipping git push. Run with --push to auto-commit.')}")

    print()
    print(f"  {green('Done!')} Your site is updated.")
    print(f"  Open {bold('index.html')} to preview.")
    print()

# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(
        description="UnconventionArt Publish Agent — photos in, site out.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  %(prog)s ./new-photos/
  %(prog)s ./photos/ --series "Ethereal Decay" --category "Fine Art"
  %(prog)s ./photos/ --series "Night Studies" --status current --push
  %(prog)s ./photos/ --interactive
        """,
    )

    parser.add_argument("photos", help="Folder containing photos to publish")
    parser.add_argument("--series", "-s", help="Series/exhibition name")
    parser.add_argument("--category", "-c", help="Category: Fine Art, Conceptual, Abstract, Editorial, Experimental")
    parser.add_argument("--status", choices=["current", "past"], default="current",
                        help="Exhibition status (default: current)")
    parser.add_argument("--theme", "-t", help="Thematic keyword for text generation")
    parser.add_argument("--interactive", "-i", action="store_true",
                        help="Interactive mode — prompts for all options")
    parser.add_argument("--push", "-p", action="store_true",
                        help="Auto commit and push to git")
    parser.add_argument("--no-news", action="store_true",
                        help="Skip creating a news post")

    args = parser.parse_args()

    publish(
        photo_folder=args.photos,
        series=args.series,
        category=args.category,
        status=args.status,
        theme=args.theme,
        interactive=args.interactive,
        push=args.push,
        create_news=not args.no_news,
    )

if __name__ == "__main__":
    main()
