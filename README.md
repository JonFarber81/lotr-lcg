# Lord of the Rings LCG — Knowledge Vault

An [Obsidian](https://obsidian.md) knowledge vault for **Lord of the Rings: The Card Game** by Fantasy Flight Games.

Tracks cards, scenarios, decks, strategy, and tips. Card and scenario data is synced from [RingsDB](https://ringsdb.com), the community's definitive card database.

---

## What's Inside

| Folder | Contents |
|--------|----------|
| `cards/` | Every player card — heroes, allies, attachments, events — as linked Markdown notes |
| `scenarios/` | Quest scenarios with encounter details and difficulty notes |
| `cycles/` | Adventure pack cycle overviews |
| `decks/` | Deck notes (imported from OCTGN `.o8d` files and hand-built) |
| `strategy/` | Guides, combo notes, sphere tips, and scenario walkthroughs |
| `templates/` | Obsidian templates for new notes |
| `scripts/` | Python tools for syncing data from RingsDB and importing decks |

---

## Prerequisites

- [Obsidian](https://obsidian.md) (free) — open this directory as a vault
- Python 3.10+ — for the sync scripts
- Recommended Obsidian plugins: **Dataview**, **Templater**, **Tag Wrangler**

---

## Setup

**1. Open the vault in Obsidian**

In Obsidian: *Open folder as vault* → select this directory.

**2. Install Python dependencies**

```bash
cd scripts
pip install -r requirements.txt
```

**3. Sync card data from RingsDB**

```bash
python scripts/sync_cards.py
python scripts/sync_scenarios.py
```

This will populate `cards/` and `scenarios/` with linked Markdown notes. Run these periodically to pick up new releases.

**4. Import your OCTGN decks**

```bash
python scripts/import_decks.py
```

Parses all `.o8d` files in `decks/` and generates deck notes with links to card pages.

---

## Example Dataview Queries

Once cards are synced, use Dataview in any note to query the vault:

**All Leadership heroes sorted by threat cost:**
````
```dataview
TABLE threat_cost, willpower, attack, defense
FROM "cards/heroes"
WHERE sphere = "Leadership"
SORT threat_cost ASC
```
````

**Decks featuring Aragorn:**
````
```dataview
LIST
FROM "decks"
WHERE contains(heroes, "[[Aragorn]]")
```
````

**Hard solo scenarios:**
````
```dataview
TABLE cycle, difficulty
FROM "scenarios"
WHERE solo_friendly = true AND difficulty = "Hard"
SORT title ASC
```
````

---

## Data Source

Card and scenario data comes from [RingsDB](https://ringsdb.com) via their public API. RingsDB is the community-maintained card database for LOTR LCG — all credit to the RingsDB team and contributors.

---

## Contributing / Extending

- **Strategy notes** — hand-write these in `strategy/`, no special format required
- **Scenario notes** — add personal difficulty ratings and tips in the body of scenario files (below the front matter)
- **Deck notes** — add strategy sections and personal commentary after the generated card list

Generated files are marked `<!-- generated -->` at the top and will be overwritten on re-sync. Everything else is safe to edit freely.
