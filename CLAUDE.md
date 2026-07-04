# LOTR LCG Knowledge Vault — CLAUDE.md

## Project Overview

This is an Obsidian-based knowledge vault for **Lord of the Rings: The Card Game (LCG)** by Fantasy Flight Games. The entire `lotr_lcg/` directory is the Obsidian vault.

**Primary goals:**
- Comprehensive card database synced from RingsDB
- Scenario and quest notes with encounter deck details
- Deck notes imported from OCTGN `.o8d` files and fetched from RingsDB
- Strategy guides, combo notes, and tips
- Rich interlinking between cards, decks, scenarios, and strategy content

**Primary data source:** [RingsDB API](https://ringsdb.com/api/) — public data only (no auth required for cards and scenarios).

---

## Obsidian CLI

The `obsidian` CLI is installed at `/opt/homebrew/bin/obsidian` and should be used **whenever possible** for vault operations. It communicates with the running Obsidian app, so backlinks and the vault index stay in sync.

**Always target the vault explicitly:**
```bash
obsidian vault="lotr_lcg" <command>
```

**Key commands:**
```bash
obsidian vault="lotr_lcg" rename path="cards/heroes/Aragorn.md" name="Aragorn (Leadership)"
obsidian vault="lotr_lcg" unresolved          # find broken wikilinks
obsidian vault="lotr_lcg" backlinks file="Aragorn (Leadership)"
obsidian vault="lotr_lcg" search "Dúnedain"
obsidian vault="lotr_lcg" files               # list all files in vault
obsidian vault="lotr_lcg" tags                # list all tags
```

Use `obsidian rename` (not plain `mv`) when renaming individual notes so Obsidian updates all backlinks automatically. For bulk renames, use `scripts/rename_to_title_case.py` (filesystem rename + wikilink patch) then let Obsidian detect the changes.

---

## File Naming Convention

**All note filenames use the card/deck/scenario's display name directly — no slugs, no dashes replacing spaces.**

| Type | Filename format | Example |
|------|----------------|---------|
| Card (unique name) | `{Card Name}.md` | `Steward of Gondor.md` |
| Hero (multiple sphere versions) | `{Name} ({Sphere}).md` | `Aragorn (Leadership).md` |
| Scenario / Pack | `{Pack Name}.md` | `Passage Through Mirkwood.md` |
| Cycle | `{Cycle Name}.md` | `Shadows of Mirkwood.md` |
| Deck | `{Deck Title}.md` | `Seastan's Single Core Set Solo.md` |

**Rules:**
- Preserve all special characters (apostrophes, accents, parentheses) — macOS and Obsidian handle them fine
- Strip only truly illegal filename characters: `< > : " / \ | ? *`
- Never slugify or lowercase filenames
- Hero disambiguation always uses `(Sphere)` in parentheses, not a dash

---

## Vault Structure

```
lotr_lcg/
├── cards/
│   ├── heroes/           # Hero cards — one .md per card
│   ├── allies/
│   ├── attachments/
│   ├── events/
│   └── player-side-quests/
├── cycles/               # One .md per adventure pack cycle
├── decks/                # .o8d source files + generated deck .md notes
├── scenarios/            # One .md per quest scenario
├── strategy/             # Hand-written guides, combos, tips
├── templates/            # Obsidian templates for new note types
├── scripts/              # Python sync and import tools
└── .obsidian/            # Obsidian app config
```

---

## Card Note Format

Every generated card note uses this front matter schema:

```yaml
---
title: "<card name>"
ringsdb_id: "<pack_code><position>"
type: Hero | Ally | Attachment | Event | Player Side Quest
sphere: Leadership | Tactics | Spirit | Lore | Neutral | Baggins | Fellowship
threat: <integer, heroes only>
cost: <integer or X, non-heroes>
willpower: <integer>
attack: <integer>
defense: <integer>
hit_points: <integer>
traits: [Trait1, Trait2]
unique: true | false
pack: "<Adventure Pack or Core Set name>"
pack_code: "<ringsdb pack code>"
position: <integer>
deck_limit: <integer>
tags: [card, <type-lowercase>, <sphere-lowercase>]
---
```

**Wikilink conventions:**
- Single-version card: `[[Guard of the Citadel]]`
- Multi-version hero: `[[Aragorn (Leadership)]]` or with display text `[[Aragorn (Leadership)|Aragorn]]`
- Pack: `[[Core Set]]`
- Scenario: `[[Passage Through Mirkwood]]`

---

## Scenario Note Format

```yaml
---
title: "<scenario name>"
cycle: "<cycle name>"
pack_code: "<ringsdb pack code>"
position: <integer>
available: "<release date>"
difficulty: ""  # Easy | Medium | Hard | Brutal — fill in manually
solo_friendly: null  # true | false — fill in manually
tags: [scenario, <cycle-slug>]
---
```

---

## Deck Note Format

Generated from RingsDB API (`fetch_decklist.py`) or `.o8d` OCTGN files (`import_decks.py`).

```yaml
---
title: "<deck name>"
ringsdb_id: <integer>
version: "<version>"
date_created: <YYYY-MM-DD>
date_updated: <YYYY-MM-DD>
starting_threat: <integer>
last_pack: "<pack name>"
heroes: [Hero1, Hero2, Hero3]
spheres: [Leadership, Spirit]
player_count: 1
nb_votes: <integer>
nb_favorites: <integer>
nb_comments: <integer>
source: ringsdb | octgn | hand-built
source_url: "<url>"
tags: [deck, <pack-slug>]
---
```

---

## Scripts

All scripts live in `scripts/` and require Python 3.10+.

### Setup

```bash
pip install -r scripts/requirements.txt
```

### sync_cards.py

Pulls all player cards from RingsDB and writes/updates Markdown files in `cards/`.

```bash
python scripts/sync_cards.py           # use cache if available
python scripts/sync_cards.py --force   # re-fetch from API
```

### sync_scenarios.py

Pulls quest/scenario data from RingsDB and writes files to `scenarios/` and `cycles/`.

```bash
python scripts/sync_scenarios.py
```

### fetch_decklist.py

Fetches a public RingsDB decklist and generates a linked deck note.

```bash
python scripts/fetch_decklist.py 961
python scripts/fetch_decklist.py https://ringsdb.com/decklist/view/961/...
```

### import_decks.py

Parses `.o8d` OCTGN XML files from `decks/` and generates linked Markdown deck notes.

```bash
python scripts/import_decks.py              # all .o8d files
python scripts/import_decks.py decks/foo.o8d  # single file
```

### rename_to_title_case.py

Renames all vault notes from slug format to display-name format and patches wikilinks.

```bash
python scripts/rename_to_title_case.py --dry-run  # preview
python scripts/rename_to_title_case.py             # execute
```

### build_cards_json.py

Extracts card data from the RingsDB cache and writes `webapp/public/cards.json` for the deck builder web app. Run this once after `sync_cards.py`.

```bash
python scripts/build_cards_json.py
```

---

## Deck Builder Web App

A browser-based deck builder lives in `webapp/`. Pick 3 heroes, browse eligible cards by type (Allies, Attachments, Events…), and export a valid `.o8d` file for Dragn or OCTGN.

### First-time setup

```bash
# 1. Wire up card images (one-time symlink)
ln -s $(pwd)/cards/images webapp/public/images

# 2. Install dependencies
cd webapp && npm install

# 3. Prepare card data (re-run after sync_cards.py)
cd .. && python scripts/build_cards_json.py
```

### Starting the dev server

```bash
cd webapp
npm run dev
# → http://localhost:5174
```

### Keeping data fresh

After running `sync_cards.py` to pull new cards from RingsDB, rebuild the webapp data:

```bash
python scripts/build_cards_json.py
```

---

## RingsDB API Notes

Base URL: `https://ringsdb.com/api/`

Key endpoints:
- `GET /api/public/cards/` — all player cards
- `GET /api/public/card/<code>/` — single card
- `GET /api/public/packs/` — all adventure packs
- `GET /api/public/decklist/<id>/` — a public decklist (full card list, stats, description)
- `GET /api/public/decklists/by_date/<date>/` — decklists published on a date
- `GET /api/public/scenario/<id>/` — scenario encounter stats (Easy/Normal/Nightmare)

Hall of Fame (top-voted decks): `https://ringsdb.com/decklists/halloffame`

Scripts cache API responses in `scripts/cache/`. Pass `--force` to re-fetch.

---

## Obsidian Plugins (Recommended)

- **Dataview** — query cards by stats, traits, sphere using inline SQL-like syntax
- **Templater** — for consistent new note creation using `templates/`
- **Tag Wrangler** — manage the tag hierarchy
- **Graph Analysis** — visualize card/scenario relationships

---

## Conventions

- Generated files include a comment at the top: `<!-- generated by scripts/... — do not edit manually -->`
- Hand-edited files (strategy notes, personal deck commentary) should NOT have that comment
- Sphere names always capitalized: `Leadership`, `Tactics`, `Spirit`, `Lore`, `Neutral`
- Card types always title-cased: `Hero`, `Ally`, `Attachment`, `Event`
- Icon placeholders in card text: `[attack]` → `ATK`, `[willpower]` → `WP`, `[defense]` → `DEF`
