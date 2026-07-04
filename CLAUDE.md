# LOTR LCG Knowledge Vault — CLAUDE.md

## Project Overview

This is an Obsidian-based knowledge vault for **Lord of the Rings: The Card Game (LCG)** by Fantasy Flight Games. The entire `lotr_lcg/` directory is the Obsidian vault.

**Primary goals:**
- Comprehensive card database synced from RingsDB
- Scenario and quest notes with encounter deck details
- Deck notes imported from OCTGN `.o8d` files and hand-built
- Strategy guides, combo notes, and tips
- Rich interlinking between cards, decks, scenarios, and strategy content

**Primary data source:** [RingsDB API](https://ringsdb.com/api/) — public data only (no auth required for cards and scenarios).

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
ringsdb_id: "<pack_code><position, zero-padded to 3 digits>"
ringsdb_slug: "<url slug from RingsDB>"
type: Hero | Ally | Attachment | Event | Player Side Quest
sphere: Leadership | Tactics | Spirit | Lore | Neutral | Baggins | Fellowship
cost: <integer or "-" for heroes (threat cost)>
threat_cost: <integer, heroes only>
willpower: <integer>
attack: <integer>
defense: <integer>
hit_points: <integer>
traits: [Trait1, Trait2]
keywords: [Keyword1]
unique: true | false
pack: "<Adventure Pack or Core Set name>"
pack_code: "<ringsdb pack code>"
position: <integer>
tags: [card, <type-lowercase>, <sphere-lowercase>]
---
```

Heroes use `threat_cost` instead of `cost`. Non-combat cards (Events, Attachments) omit combat stats.

**Wikilink conventions:**
- Link to other cards: `[[Aragorn]]`
- Link to traits (if we create trait index pages): `[[Dúnedain]]`
- Link to a pack: `[[Core Set]]`
- Link to a scenario: `[[Passage Through Mirkwood]]`

---

## Scenario Note Format

```yaml
---
title: "<scenario name>"
cycle: "<cycle name>"
pack: "<adventure pack>"
pack_code: "<ringsdb pack code>"
quest_cards: <integer>
encounter_sets: [Set1, Set2]
difficulty: Easy | Medium | Hard | Brutal  # hand-assigned
solo_friendly: true | false               # hand-assigned
tags: [scenario, <cycle-slug>]
---
```

---

## Deck Note Format

Generated from `.o8d` OCTGN files or hand-written.

```yaml
---
title: "<deck name>"
source: octgn | ringsdb | hand-built
source_file: "<filename.o8d>"           # if from OCTGN
heroes: [Hero1, Hero2, Hero3]
spheres: [Leadership, Spirit]
player_count: 1 | 2 | 3 | 4
solo_optimized: true | false
tags: [deck]
---
```

Body should include a card list grouped by type, and a strategy section.

---

## Scripts

All scripts live in `scripts/` and require Python 3.10+.

### Setup

```bash
cd scripts
pip install -r requirements.txt
```

### sync_cards.py

Pulls all player cards from RingsDB and writes/updates Markdown files in `cards/`.

```bash
python scripts/sync_cards.py
```

- Reads: `GET https://ringsdb.com/api/public/cards/`
- Writes: one `.md` per card, organized by type
- Safe to re-run — only updates files when content changes

### sync_scenarios.py

Pulls quest/scenario data from RingsDB and writes files to `scenarios/` and `cycles/`.

```bash
python scripts/sync_scenarios.py
```

### import_decks.py

Parses `.o8d` OCTGN XML files from `decks/` and generates linked Markdown deck notes.

```bash
python scripts/import_decks.py
# or for a single file:
python scripts/import_decks.py decks/thercoonedeck-1.0.o8d
```

- Resolves card names via the local card database (run `sync_cards.py` first)
- Generates `decks/<deck-slug>.md` alongside the `.o8d` source file

---

## RingsDB API Notes

Base URL: `https://ringsdb.com/api/`

Key endpoints:
- `GET /api/public/cards/` — all player cards (large JSON array)
- `GET /api/public/card/<code>/` — single card by code
- `GET /api/public/packs/` — all adventure packs
- `GET /api/public/cycles/` — all cycles

The API returns JSON. No authentication required for public data. Be respectful: cache responses locally and avoid hammering the API. Scripts should store raw API responses in `scripts/cache/` and only re-fetch when stale.

---

## Obsidian Plugins (Recommended)

- **Dataview** — query cards by stats, traits, sphere using inline SQL-like syntax
- **Templater** — for consistent new note creation using `templates/`
- **Tag Wrangler** — manage the tag hierarchy
- **Graph Analysis** — visualize card/scenario relationships

---

## Conventions

- All generated files include a comment at the top: `<!-- generated by scripts/sync_cards.py — do not edit manually -->`
- Hand-edited files (strategy notes, deck notes with personal commentary) should NOT have that comment
- Sphere names always capitalized: `Leadership`, `Tactics`, `Spirit`, `Lore`, `Neutral`
- Card types always title-cased: `Hero`, `Ally`, `Attachment`, `Event`
- Deck names come from the `.o8d` filename, slugified
