"""
Parse OCTGN .o8d deck files and generate linked Markdown deck notes.

Usage:
    python scripts/import_decks.py              # process all .o8d files in decks/
    python scripts/import_decks.py path/to/deck.o8d  # single file
"""

import json
import sys
import argparse
import xml.etree.ElementTree as ET
from pathlib import Path

from slugify import slugify

VAULT_ROOT = Path(__file__).parent.parent
DECKS_DIR = VAULT_ROOT / "decks"
CACHE_DIR = Path(__file__).parent / "cache"


def load_card_index() -> dict[str, str]:
    """
    Build a lookup of OCTGN card GUID → card name using cached RingsDB data.
    Falls back to the name embedded in the .o8d XML if not found.
    """
    cache_file = CACHE_DIR / "cards.json"
    if not cache_file.exists():
        print("Warning: cards.json cache not found. Run sync_cards.py first for best results.")
        return {}
    cards = json.loads(cache_file.read_text())
    # RingsDB cards have an octgn_id field linking to OCTGN GUIDs
    return {c["octgn_id"]: c["name"] for c in cards if c.get("octgn_id")}


def parse_o8d(path: Path) -> dict:
    """
    Parse an OCTGN .o8d XML file into a structured deck dict.

    Returns:
        {
            "sections": {
                "Hero": [{"qty": 1, "id": "...", "name": "..."}],
                "Ally": [...],
                ...
            },
            "notes": "<raw notes text>"
        }
    """
    tree = ET.parse(path)
    root = tree.getroot()

    sections = {}
    for section in root.findall("section"):
        name = section.get("name", "Unknown")
        cards = []
        for card in section.findall("card"):
            cards.append({
                "qty": int(card.get("qty", 1)),
                "id": card.get("id", ""),
                "name": card.text or "",
            })
        sections[name] = cards

    notes_el = root.find("notes")
    notes = notes_el.text or "" if notes_el is not None else ""
    # Strip CDATA wrapper if present (ElementTree handles it, but just in case)
    notes = notes.strip()

    return {"sections": sections, "notes": notes}


def resolve_card_names(deck: dict, card_index: dict[str, str]) -> dict:
    """Replace OCTGN GUIDs with canonical card names from RingsDB where available."""
    for section_cards in deck["sections"].values():
        for card in section_cards:
            resolved = card_index.get(card["id"])
            if resolved:
                card["name"] = resolved
    return deck


def deck_name_from_path(path: Path) -> str:
    """Derive a human-readable deck name from the .o8d filename."""
    stem = path.stem  # e.g. "thercoonedeck-1.0"
    # Strip version suffix like "-1.0", "-2.0"
    import re
    stem = re.sub(r"-\d+\.\d+$", "", stem)
    # Un-slugify: replace hyphens with spaces, title-case
    return stem.replace("-", " ").title()


def heroes_from_deck(deck: dict) -> list[str]:
    return [c["name"] for c in deck["sections"].get("Hero", [])]


def spheres_from_heroes(hero_names: list[str], card_index_by_name: dict) -> list[str]:
    # TODO: implement sphere detection from card data if needed
    return []


def format_deck_markdown(deck_name: str, deck: dict, source_file: str) -> str:
    """
    Format a parsed deck as an Obsidian Markdown note.

    TODO: Implement this function to define how decks are displayed.
    Consider:
    - How to group cards (by section, by sphere, by cost curve?)
    - Whether to include card counts prominently or inline
    - How much space to give the strategy/notes section
    - Whether to auto-link every card name with [[wikilinks]]

    Parameters:
        deck_name:   Human-readable name for the deck
        deck:        Parsed deck dict from parse_o8d(), with names resolved
        source_file: Filename of the .o8d source (for the front matter)

    Returns:
        Full Markdown string for the deck note
    """
    heroes = heroes_from_deck(deck)

    # --- Front matter ---
    hero_links = ", ".join(f"[[{h}]]" for h in heroes)
    front_matter_lines = [
        "---",
        f'title: "{deck_name}"',
        f"source: octgn",
        f'source_file: "{source_file}"',
        f"heroes: [{', '.join(heroes)}]",
        "spheres: []  # fill in manually or extend script to detect",
        "player_count: 1",
        "solo_optimized: true",
        "tags: [deck]",
        "---",
    ]
    front_matter = "\n".join(front_matter_lines)

    # --- Body ---
    # Build the card list section
    # TODO: Replace this basic implementation with your preferred formatting.
    # The sections dict has keys like "Hero", "Ally", "Attachment", "Event", etc.
    # Each value is a list of {"qty": int, "name": str} dicts.
    card_lines = []
    section_order = ["Hero", "Ally", "Attachment", "Event", "Side Quest", "Player Side Quest"]
    seen_sections = set()

    for section_name in section_order:
        if section_name in deck["sections"] and deck["sections"][section_name]:
            seen_sections.add(section_name)
            card_lines.append(f"\n### {section_name}s\n")
            for card in deck["sections"][section_name]:
                qty = card["qty"]
                name = card["name"]
                card_lines.append(f"- {qty}x [[{name}]]")

    # Any sections not in our ordered list
    for section_name, cards in deck["sections"].items():
        if section_name not in seen_sections and cards:
            card_lines.append(f"\n### {section_name}\n")
            for card in cards:
                card_lines.append(f"- {card['qty']}x [[{card['name']}]]")

    notes_section = ""
    if deck["notes"]:
        notes_section = f"\n## Notes\n\n{deck['notes']}\n"

    body = f"# {deck_name}\n\n**Heroes:** {hero_links}\n" + "\n".join(card_lines) + notes_section + "\n\n## Strategy\n\n<!-- Add strategy notes here -->\n"

    return front_matter + "\n\n" + body


def process_file(path: Path, card_index: dict):
    deck_name = deck_name_from_path(path)
    print(f"Importing: {path.name} → {slugify(deck_name)}.md")

    deck = parse_o8d(path)
    deck = resolve_card_names(deck, card_index)

    content = format_deck_markdown(deck_name, deck, source_file=path.name)

    out_path = DECKS_DIR / (slugify(deck_name) + ".md")
    out_path.write_text(content)
    print(f"  Written: {out_path}")


def main():
    parser = argparse.ArgumentParser(description="Import OCTGN .o8d deck files into vault")
    parser.add_argument("files", nargs="*", help=".o8d file(s) to import (default: all in decks/)")
    args = parser.parse_args()

    card_index = load_card_index()
    print(f"Loaded {len(card_index)} card GUIDs from cache")

    if args.files:
        targets = [Path(f) for f in args.files]
    else:
        targets = sorted(DECKS_DIR.glob("*.o8d"))

    if not targets:
        print("No .o8d files found.")
        return

    for path in targets:
        process_file(path, card_index)


if __name__ == "__main__":
    main()
