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

## Deck Builder Web App

A local browser-based deck builder lives in `webapp/`. Pick 3 heroes, browse eligible player cards, and export a valid `.o8d` file for Dragn or OCTGN.

```bash
# one-time setup
ln -s $(pwd)/cards/images webapp/public/images
cd webapp && npm install

# prepare data (re-run after sync_cards.py)
cd .. && python scripts/build_cards_json.py

# start it
cd webapp && npm run dev   # → http://localhost:5174
```

### Telling the app what you own

The **Collection** tab lists every pack, grouped by cycle. Check off what you own (a cycle's header checkbox toggles the whole cycle at once). With the **"Owned only"** toggle in the header enabled, the hero picker and card browser only show cards from packs you own.

Your collection is saved in the browser's `localStorage` automatically — no further steps needed for day-to-day use. Two ways to manage it as a file:

- **Export** — the *Export collection.json* button on the Collection tab downloads your current collection.
- **Import** — the *Import…* button loads a `collection.json` file back in.

The file is a flat map of RingsDB pack code → `1` (owned) or `0` (not owned), so you can also edit it by hand:

```json
{
  "Core": 1,
  "HfG": 1,
  "CatC": 1,
  "KD": 0,
  "OHaUH": 1
}
```

Pack codes are listed in `webapp/public/packs.json` (also visible in RingsDB set URLs, e.g. `ringsdb.com/set/KD`). Packs missing from the file count as **not owned**; if you've never configured a collection at all, everything shows.

To make a collection survive a cleared browser (or carry to another machine), drop your exported file at `webapp/public/collection.json` — it seeds the app on first run.

### Saving decks

- The deck you're working on **auto-saves** — refreshing the page picks up where you left off.
- **Save Deck** in the header stores it under its name; the **My Decks** tab lists saved decks to reopen or delete. Saving again under the same name updates it.

### Importing decks

Both importers live at the top of the **My Decks** tab and open the deck straight into the builder for editing:

- **Import .o8d…** — load any OCTGN/Dragn deck file, including ones exported from this app (full round-trip: export, reload, keep editing). Sideboards are skipped.
- **Import from RingsDB** — paste a published decklist URL (e.g. `https://ringsdb.com/decklist/view/961/…`) or just its numeric ID.

Cards the importer doesn't recognize (e.g. from packs newer than your last `sync_cards.py`) are skipped with a warning listing them.

Contract decks are supported: with Bond of Friendship in the deck the builder allows (and requires) 4 heroes and caps every card at 2 copies; The Grey Wanderer, Messenger of the King, and At the End of All Things adjust the hero count likewise, and Council of the Wise enforces 1 copy per card. Other contract deck-building rules (Bond's 10-per-sphere requirement, Three Hunters' no-allies rule, etc.) show as warnings in the deck panel, which also displays type totals, a cost curve, and a sphere breakdown.

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
