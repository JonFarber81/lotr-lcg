"""
Fetch a published RingsDB decklist and generate a linked Obsidian deck note.

Usage:
    python scripts/fetch_decklist.py 961
    python scripts/fetch_decklist.py https://ringsdb.com/decklist/view/961/seastanssinglecoresetsolo-2.0
"""

import json
import re
import argparse
from pathlib import Path
from collections import Counter

import requests

VAULT_ROOT = Path(__file__).parent.parent
DECKS_DIR = VAULT_ROOT / "decks"
CARDS_DIR = VAULT_ROOT / "cards"
CACHE_DIR = Path(__file__).parent / "cache"
RINGSDB_API = "https://ringsdb.com/api/public/decklist/{}.json"
RINGSDB_BASE = "https://ringsdb.com"

# Type display order in the card list
TYPE_ORDER = ["Hero", "Ally", "Attachment", "Event", "Player Side Quest", "Contract"]


def extract_id(arg: str) -> str:
    m = re.search(r"/decklist/view/(\d+)/", arg)
    if m:
        return m.group(1)
    if arg.isdigit():
        return arg
    raise ValueError(f"Cannot extract decklist ID from: {arg}")


def load_card_index() -> dict:
    cache_file = CACHE_DIR / "cards.json"
    if not cache_file.exists():
        print("Warning: cards.json cache missing — run sync_cards.py first.")
        return {}
    cards = json.loads(cache_file.read_text())
    return {c["code"]: c for c in cards}


def find_duplicate_hero_names(card_index: dict) -> set:
    counts = Counter(c["name"] for c in card_index.values() if c.get("type_code") == "hero")
    return {name for name, n in counts.items() if n > 1}


def hero_wikilink(card: dict, dup_heroes: set) -> str:
    name = card["name"]
    if name in dup_heroes:
        sphere = card.get("sphere_name", "Neutral")
        return f"[[{name} ({sphere})|{name}]]"
    return f"[[{name}]]"


def card_wikilink(card: dict) -> str:
    """Plain wikilink for non-hero cards — names are unique within type."""
    return f"[[{card['name']}]]"


def convert_description(text: str, card_index: dict, dup_heroes: set) -> str:
    """
    Convert RingsDB Markdown description to Obsidian-flavored Markdown.
    - [Card Name](/card/CODE) → [[wikilink|Card Name]]
    - Strips trailing \r
    """
    text = text.replace("\r\n", "\n").replace("\r", "\n")

    def replace_card_link(m):
        display = m.group(1)
        code = m.group(2).lstrip("/card/")
        card = card_index.get(code)
        if not card:
            return display
        if card.get("type_code") == "hero":
            return hero_wikilink(card, dup_heroes)
        return f"[[{card['name']}]]"

    text = re.sub(r"\[([^\]]+)\]\(/card/([^)]+)\)", replace_card_link, text)
    return text


def fetch_decklist(deck_id: str) -> dict:
    url = RINGSDB_API.format(deck_id)
    print(f"Fetching decklist {deck_id} from RingsDB ...")
    resp = requests.get(url, timeout=30)
    resp.raise_for_status()
    return resp.json()


def derive_spheres(hero_codes: list, card_index: dict) -> list[str]:
    seen = []
    for code in hero_codes:
        card = card_index.get(code)
        if card:
            sphere = card.get("sphere_name", "Neutral")
            if sphere not in seen:
                seen.append(sphere)
    return seen


def build_deck_note(deck: dict, card_index: dict, dup_heroes: set) -> str:
    name = deck["name"]
    version = deck.get("version", "1.0")
    threat = deck.get("starting_threat", "?")
    last_pack = deck.get("last_pack", "")
    votes = deck.get("nb_votes", 0)
    favs = deck.get("nb_favorites", 0)
    comments = deck.get("nb_comments", 0)
    date_created = deck.get("date_creation", "")[:10]
    date_updated = deck.get("date_update", "")[:10]
    deck_id = deck["id"]
    name_slug = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
    source_url = f"{RINGSDB_BASE}/decklist/view/{deck_id}/{name_slug}-{version}"

    hero_codes = sorted(deck.get("heroes", {}).keys())
    all_slots = deck.get("slots", {})
    sideslots = deck.get("sideslots", {}) or {}

    # Separate hero codes from main deck slots for display
    non_hero_codes = [c for c in all_slots if c not in deck.get("heroes", {})]

    heroes = [card_index[c] for c in hero_codes if c in card_index]
    spheres = derive_spheres(hero_codes, card_index)

    # --- Front matter ---
    hero_names = [c.get("name", c) for c in heroes]
    fm_lines = [
        "---",
        f'title: "{name}"',
        f"ringsdb_id: {deck_id}",
        f'version: "{version}"',
        f"date_created: {date_created}",
        f"date_updated: {date_updated}",
        f"starting_threat: {threat}",
        f'last_pack: "{last_pack}"',
        f"heroes: [{', '.join(hero_names)}]",
        f"spheres: [{', '.join(spheres)}]",
        f"player_count: 1",
        f"nb_votes: {votes}",
        f"nb_favorites: {favs}",
        f"nb_comments: {comments}",
        f'source: ringsdb',
        f'source_url: "{source_url}"',
        f"tags: [deck, {re.sub(r'[^a-z0-9]+', '-', last_pack.lower()).strip('-')}]",
        "---",
    ]
    front_matter = "\n".join(fm_lines)

    # --- Stat block ---
    hero_links = "  ·  ".join(hero_wikilink(h, dup_heroes) for h in heroes)
    sphere_str = " · ".join(spheres)
    stat_block = (
        f"> [!abstract] Starting Threat: **{threat}** · {last_pack} · v{version}\n"
        f"> **Heroes:** {hero_links}\n"
        f"> **Spheres:** {sphere_str}\n"
        f"> ⭐ {votes} votes  ·  ❤️ {favs} favorites  ·  💬 {comments} comments"
    )

    # --- Card list grouped by type ---
    by_type: dict[str, list] = {}
    for code in hero_codes:
        card = card_index.get(code)
        if card:
            by_type.setdefault("Hero", []).append((all_slots.get(code, 1), card))

    for code, qty in all_slots.items():
        if code in deck.get("heroes", {}):
            continue
        card = card_index.get(code)
        if card:
            type_name = card.get("type_name", "Other")
            by_type.setdefault(type_name, []).append((qty, card))

    PLURAL = {
        "Hero": "Heroes", "Ally": "Allies", "Attachment": "Attachments",
        "Event": "Events", "Player Side Quest": "Player Side Quests", "Contract": "Contracts",
    }

    card_list_parts = []
    for type_name in TYPE_ORDER:
        if type_name not in by_type:
            continue
        entries = sorted(by_type[type_name], key=lambda x: x[1]["name"])
        total = sum(qty for qty, _ in entries)
        heading = PLURAL.get(type_name, f"{type_name}s")
        card_list_parts.append(f"### {heading} ({total})\n")
        for qty, card in entries:
            if type_name == "Hero":
                link = hero_wikilink(card, dup_heroes)
            else:
                link = card_wikilink(card)
            sphere = card.get("sphere_name", "")
            card_list_parts.append(f"- {qty}x {link} _({sphere})_")
        card_list_parts.append("")

    # Sideboard
    if sideslots:
        card_list_parts.append("### Sideboard\n")
        for code, qty in sideslots.items():
            card = card_index.get(code)
            if card:
                card_list_parts.append(f"- {qty}x [[{card['name']}]] _({card.get('sphere_name','')})_")
        card_list_parts.append("")

    total_cards = sum(v for k, v in all_slots.items() if k not in deck.get("heroes", {}))
    card_list_parts.insert(0, f"**Total cards:** {total_cards}\n")

    # --- Description ---
    raw_desc = deck.get("description_md", "").strip()
    description = convert_description(raw_desc, card_index, dup_heroes) if raw_desc else "_No description provided._"

    # --- Assemble ---
    body_parts = [
        f"# {name}\n",
        stat_block,
        "\n---\n",
        "## Card List\n",
        "\n".join(card_list_parts),
        "---\n",
        "## Strategy\n",
        description,
        "",
        f"---\n_Source: [{source_url}]({source_url})_",
    ]

    return front_matter + "\n\n" + "\n".join(body_parts)


# ---------------------------------------------------------------------------
# Card note enrichment — append deck tips to individual card ## Notes sections
# ---------------------------------------------------------------------------

NOTES_MARKER = "\n\n---\n\n## Notes\n"
NOTES_PLACEHOLDER = "\n\n---\n\n## Notes\n\n<!-- Tips, combos, and strategy notes -->\n"

# Subdirectories to search for card files
CARD_SUBDIRS = ["heroes", "allies", "attachments", "events", "player-side-quests"]


def build_card_file_index() -> dict[str, Path]:
    """Map every card display name (lowercase) → its .md path in cards/."""
    index: dict[str, Path] = {}
    for subdir in CARD_SUBDIRS:
        for f in (CARDS_DIR / subdir).glob("*.md"):
            index[f.stem.lower()] = f
    return index


def extract_tips_for_card(card_name: str, description: str) -> list[str]:
    """
    Find paragraphs in the description that mention card_name.
    Matches both [[Card Name]] and [[Card Name (Sphere)|Card Name]] wikilinks,
    as well as plain text occurrences.
    """
    paragraphs = [p.strip() for p in re.split(r"\n{2,}", description) if p.strip()]
    tips = []
    # Match wikilink targets and plain name
    pattern = re.compile(
        rf"\[\[{re.escape(card_name)}(?:\s*\([^)]*\))?(?:\|[^\]]+)?\]\]"
        rf"|(?<!\[\[)\b{re.escape(card_name)}\b",
        re.IGNORECASE,
    )
    for para in paragraphs:
        # Skip headings and very short generic lines
        if para.startswith("#") or len(para) < 30:
            continue
        if pattern.search(para):
            # Keep wikilinks intact; strip leftover HTML tags
            clean = re.sub(r"<[^>]+>", "", para)
            tips.append(clean)
    return tips


def append_card_notes(deck_name: str, description: str, card_names: list[str], card_file_index: dict[str, Path]):
    """For each card in the deck, find relevant tips and append to its ## Notes section."""
    deck_link = f"[[{deck_name}]]"
    enriched = 0

    for name in card_names:
        card_path = card_file_index.get(name.lower())
        if not card_path or not card_path.exists():
            continue

        tips = extract_tips_for_card(name, description)
        if not tips:
            continue

        content = card_path.read_text()

        # Ensure ## Notes section exists
        if NOTES_MARKER not in content:
            content = content.rstrip("\n") + NOTES_PLACEHOLDER

        # Build the note block to add
        note_header = f"\n**{deck_link}**\n"
        note_body = "\n".join(f"- {t}" for t in tips) + "\n"
        note_block = note_header + note_body

        # Skip if this deck's notes are already present
        if f"**{deck_link}**" in content:
            continue

        content = content.rstrip("\n") + "\n" + note_block
        card_path.write_text(content)
        enriched += 1

    print(f"Card notes enriched: {enriched} card(s) updated from '{deck_name}'")


def main():
    parser = argparse.ArgumentParser(description="Fetch a RingsDB decklist and generate a vault note")
    parser.add_argument("deck", help="Decklist ID or full RingsDB URL")
    args = parser.parse_args()

    deck_id = extract_id(args.deck)
    card_index = load_card_index()
    dup_heroes = find_duplicate_hero_names(card_index)

    deck = fetch_decklist(deck_id)
    content = build_deck_note(deck, card_index, dup_heroes)

    safe_name = re.sub(r'[<>:"/\\|?*]', "", deck["name"]).strip()
    out_path = DECKS_DIR / (safe_name + ".md")
    out_path.write_text(content)
    print(f"Written: {out_path}")

    # Enrich card notes with tips extracted from the deck description.
    # Use the already-converted (wikilink) description rather than raw API markdown.
    raw_desc = deck.get("description_md", "")
    if raw_desc:
        converted_desc = convert_description(raw_desc, card_index, dup_heroes)
        all_card_names = [
            card_index[code]["name"]
            for code in deck.get("slots", {})
            if code in card_index
        ]
        card_file_index = build_card_file_index()
        append_card_notes(safe_name, converted_desc, all_card_names, card_file_index)


if __name__ == "__main__":
    main()
