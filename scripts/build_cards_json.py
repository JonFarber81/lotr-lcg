"""
Extracts card data from the RingsDB cache and writes webapp/public/cards.json.
Run this once after sync_cards.py to prepare data for the deck builder.

Usage:
    python scripts/build_cards_json.py
"""

import json
from pathlib import Path

VAULT_ROOT = Path(__file__).parent.parent
CACHE_FILE = Path(__file__).parent / "cache" / "cards.json"
OUT_FILE = VAULT_ROOT / "webapp" / "public" / "cards.json"

DECK_BUILDER_TYPES = {"hero", "ally", "attachment", "event", "player-side-quest", "contract"}

SECTION_MAP = {
    "hero": "Hero",
    "ally": "Ally",
    "attachment": "Attachment",
    "event": "Event",
    "player-side-quest": "Side Quest",
    "contract": "Contract",
}


def normalize_cost(raw):
    """Return int for numeric costs, 'X' for variable, None for heroes/missing."""
    if raw is None or raw == "-":
        return None
    if str(raw).upper() == "X":
        return "X"
    try:
        return int(raw)
    except (ValueError, TypeError):
        return None


def main():
    raw = json.loads(CACHE_FILE.read_text())
    output = []
    for c in raw:
        if c["type_code"] not in DECK_BUILDER_TYPES:
            continue
        if not c.get("octgnid"):
            continue
        output.append({
            "code": c["code"],
            "octgnid": c["octgnid"],
            "name": c["name"],
            "type_code": c["type_code"],
            "type_name": c["type_name"],
            "section": SECTION_MAP[c["type_code"]],
            "sphere_code": c["sphere_code"],
            "sphere_name": c["sphere_name"],
            "cost": normalize_cost(c.get("cost")),
            "threat": c.get("threat"),
            "willpower": c.get("willpower", 0) or 0,
            "attack": c.get("attack", 0) or 0,
            "defense": c.get("defense", 0) or 0,
            "health": c.get("health", 0) or 0,
            "deck_limit": c.get("deck_limit", 3) or 3,
            "is_unique": c.get("is_unique", False),
            "traits": c.get("traits", "") or "",
            "text": c.get("text", "") or "",
            "pack_name": c.get("pack_name", ""),
            "pack_code": c.get("pack_code", ""),
            "imagesrc": c.get("imagesrc", ""),
        })

    OUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    OUT_FILE.write_text(json.dumps(output, ensure_ascii=False))
    print(f"Wrote {len(output)} cards to {OUT_FILE}")


if __name__ == "__main__":
    main()
