import type { Card, DeckMap } from "./types";

export interface ImportedDeck {
  name: string;
  heroes: Card[];
  deck: DeckMap;
  /** Names (or codes) of cards that couldn't be matched to the card pool. */
  unmatched: string[];
}

/**
 * Player-deck sections of an .o8d file. Shared (encounter) sections are
 * ignored, and so is the Sideboard — the builder has no sideboard concept,
 * and merging it in would silently inflate the deck.
 */
const PLAYER_SECTIONS = new Set([
  "Hero",
  "Ally",
  "Attachment",
  "Event",
  "Side Quest",
  "Contract",
]);

/**
 * Parse an OCTGN .o8d XML file into heroes + deck, matching cards by octgnid.
 * Contract cards sometimes live in the Hero section (e.g. Bond of Friendship
 * decks) — anything non-hero found there is moved into the deck instead.
 */
export function parseO8d(
  xml: string,
  allCards: Card[],
  fallbackName: string
): ImportedDeck {
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  if (doc.querySelector("parsererror")) {
    throw new Error("Not a valid .o8d file (XML parse error)");
  }

  // An octgnid can map to several cards: RingsDB's "(MotK) …" hero variants
  // share their id with the base ally. Collect all candidates and pick by
  // section — the Hero section prefers the hero version, everything else
  // prefers the non-hero.
  const byOctgnId = new Map<string, Card[]>();
  for (const c of allCards) {
    const id = c.octgnid.toLowerCase();
    const list = byOctgnId.get(id);
    if (list) list.push(c);
    else byOctgnId.set(id, [c]);
  }

  const heroes: Card[] = [];
  const deck: DeckMap = new Map();
  const unmatched: string[] = [];

  for (const section of doc.querySelectorAll("deck > section")) {
    const sectionName = section.getAttribute("name") ?? "";
    if (!PLAYER_SECTIONS.has(sectionName)) continue;
    for (const el of section.querySelectorAll("card")) {
      const id = (el.getAttribute("id") ?? "").toLowerCase();
      const qty = Number(el.getAttribute("qty") ?? "1");
      const candidates = byOctgnId.get(id) ?? [];
      const card =
        sectionName === "Hero"
          ? candidates.find((c) => c.type_code === "hero") ?? candidates[0]
          : candidates.find((c) => c.type_code !== "hero") ?? candidates[0];
      if (!card) {
        unmatched.push(el.textContent?.trim() || id);
        continue;
      }
      if (card.type_code === "hero") {
        heroes.push(card);
      } else {
        deck.set(card.code, (deck.get(card.code) ?? 0) + qty);
      }
    }
  }

  return { name: fallbackName, heroes, deck, unmatched };
}

/** Extract a decklist ID from a RingsDB URL or a plain numeric ID. */
export function parseRingsDbId(input: string): string {
  const trimmed = input.trim();
  const urlMatch = trimmed.match(/\/decklist\/view\/(\d+)/);
  if (urlMatch) return urlMatch[1];
  if (/^\d+$/.test(trimmed)) return trimmed;
  throw new Error(
    "Enter a decklist ID or URL like https://ringsdb.com/decklist/view/961/…"
  );
}

/**
 * Fetch a published RingsDB decklist and match its cards against the pool.
 * RingsDB's `slots` map includes the hero codes as well, so heroes are
 * excluded when building the deck map.
 */
export async function fetchRingsDbDeck(
  input: string,
  allCards: Card[]
): Promise<ImportedDeck> {
  const id = parseRingsDbId(input);
  const res = await fetch(`https://ringsdb.com/api/public/decklist/${id}.json`);
  if (!res.ok) {
    throw new Error(`RingsDB returned ${res.status} for decklist ${id}`);
  }
  const data = await res.json();

  const byCode = new Map(allCards.map((c) => [c.code, c]));
  const heroes: Card[] = [];
  const deck: DeckMap = new Map();
  const unmatched: string[] = [];

  const heroCodes = new Set(Object.keys(data.heroes ?? {}));
  for (const code of heroCodes) {
    const card = byCode.get(code);
    if (card) heroes.push(card);
    else unmatched.push(code);
  }

  for (const [code, qty] of Object.entries(data.slots ?? {})) {
    if (heroCodes.has(code)) continue;
    const card = byCode.get(code);
    if (!card) {
      unmatched.push(code);
      continue;
    }
    if (card.type_code === "hero") continue;
    deck.set(card.code, Number(qty));
  }

  return { name: data.name ?? `RingsDB deck ${id}`, heroes, deck, unmatched };
}
