"""
Rename all vault notes from slug format to title-case display names.

Strategy:
- Cards/scenarios/cycles/decks: filename = frontmatter title
- Disambiguated heroes: filename = "{Title} ({Sphere})"
- After renaming, updates all wikilinks for the hero disambiguation change
  (old: [[eowyn-spirit|Éowyn]] → new: [[Éowyn (Spirit)|Éowyn]])

Run from the vault root:
    python scripts/rename_to_title_case.py
    python scripts/rename_to_title_case.py --dry-run
"""

import re
import sys
import argparse
from pathlib import Path
from collections import Counter

VAULT_ROOT = Path(__file__).parent.parent

SEARCH_DIRS = ["cards", "scenarios", "cycles", "decks", "templates"]


def parse_frontmatter(text: str) -> dict:
    # Skip leading HTML comment and any trailing blank lines before ---
    text = re.sub(r"^<!--.*?-->\n+", "", text, flags=re.DOTALL)
    m = re.match(r"^---\n(.*?)\n---", text, re.DOTALL)
    if not m:
        return {}
    fm = {}
    for line in m.group(1).splitlines():
        kv = re.match(r"^(\w+):\s*(.+)$", line)
        if kv:
            fm[kv.group(1)] = kv.group(2).strip().strip('"\'')
    return fm


def safe_filename(name: str) -> str:
    """Strip characters that aren't safe in filenames (keep apostrophes, spaces, parens)."""
    return re.sub(r'[<>:"/\\|?*]', "", name).strip()


def collect_files(dry_run: bool) -> list[tuple[Path, Path]]:
    """
    Returns a list of (old_path, new_path) for every file that needs renaming.
    """
    # First pass: find which hero names are disambiguated (multiple sphere versions)
    hero_name_counts: Counter = Counter()
    for f in (VAULT_ROOT / "cards" / "heroes").glob("*.md"):
        fm = parse_frontmatter(f.read_text())
        if fm.get("title"):
            hero_name_counts[fm["title"]] += 1
    dup_hero_names = {n for n, c in hero_name_counts.items() if c > 1}

    renames = []
    for search_dir in SEARCH_DIRS:
        base = VAULT_ROOT / search_dir
        if not base.exists():
            continue
        for f in sorted(base.rglob("*.md")):
            fm = parse_frontmatter(f.read_text())
            title = fm.get("title", "").strip()
            if not title:
                continue

            # Hero disambiguation: "Hero Name (Sphere)"
            if fm.get("type") == "Hero" and title in dup_hero_names:
                sphere = fm.get("sphere", "").strip()
                new_name = safe_filename(f"{title} ({sphere})")
            else:
                new_name = safe_filename(title)

            new_path = f.parent / (new_name + ".md")
            if f.resolve() != new_path.resolve():
                renames.append((f, new_path))

    return renames


def update_wikilinks(renames: list[tuple[Path, Path]], dry_run: bool):
    """
    After renaming, fix wikilinks that changed format.
    Only disambiguated hero links change shape:
      [[old-slug|Name]] → [[Name (Sphere)|Name]]
      [[old-slug]] → [[Name (Sphere)]]
    """
    # Build map of old stem (slug) → new stem (display name)
    slug_to_new: dict[str, str] = {}
    for old, new in renames:
        old_stem = old.stem   # e.g. "eowyn-spirit"
        new_stem = new.stem   # e.g. "Éowyn (Spirit)"
        if old_stem != new_stem:
            slug_to_new[old_stem] = new_stem

    if not slug_to_new:
        print("No wikilink updates needed.")
        return

    # Scan all markdown files and replace old wikilinks
    all_md = list(VAULT_ROOT.rglob("*.md"))
    updated = 0
    for f in all_md:
        try:
            text = f.read_text()
        except Exception:
            continue
        new_text = text
        for old_slug, new_display in slug_to_new.items():
            # [[old-slug|Display]] → [[new_display|Display]]
            new_text = re.sub(
                rf"\[\[{re.escape(old_slug)}\|([^\]]+)\]\]",
                rf"[[{new_display}|\1]]",
                new_text,
            )
            # [[old-slug]] → [[new_display]]
            new_text = re.sub(
                rf"\[\[{re.escape(old_slug)}\]\]",
                rf"[[{new_display}]]",
                new_text,
            )
        if new_text != text:
            updated += 1
            if not dry_run:
                f.write_text(new_text)
            else:
                print(f"  [wikilink update] {f.relative_to(VAULT_ROOT)}")
    print(f"Wikilinks updated in {updated} file(s).")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true", help="Show what would change without doing it")
    args = parser.parse_args()
    dry_run = args.dry_run

    if dry_run:
        print("=== DRY RUN ===\n")

    renames = collect_files(dry_run)
    print(f"Files to rename: {len(renames)}")

    conflicts: dict[Path, list[Path]] = {}
    for _, new in renames:
        conflicts.setdefault(new, []).append(new)

    errors = 0
    renamed = 0
    skipped = 0
    for old, new in renames:
        if dry_run:
            print(f"  {old.relative_to(VAULT_ROOT)}  →  {new.name}")
            continue
        if new.exists() and new.resolve() != old.resolve():
            print(f"  SKIP (target exists): {old.name} → {new.name}")
            skipped += 1
            continue
        try:
            old.rename(new)
            renamed += 1
        except Exception as e:
            print(f"  ERROR renaming {old.name}: {e}")
            errors += 1

    if not dry_run:
        print(f"Renamed: {renamed}  Skipped: {skipped}  Errors: {errors}\n")
        update_wikilinks(renames, dry_run=False)
    else:
        print(f"\n(dry run — nothing changed)")


if __name__ == "__main__":
    main()
