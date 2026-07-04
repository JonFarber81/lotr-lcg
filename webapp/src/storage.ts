import type { Card, DeckMap } from "./types";

/**
 * A serialized deck. DeckMap is a Map, which JSON.stringify can't handle
 * directly, so cards are stored as [code, qty] entry pairs.
 */
export interface SavedDeck {
  name: string;
  heroCodes: string[];
  cards: [string, number][];
  savedAt: string; // ISO date
}

const DECKS_KEY = "lotr-saved-decks";
const WIP_KEY = "lotr-wip-deck";

function serialize(name: string, heroes: Card[], deck: DeckMap): SavedDeck {
  return {
    name,
    heroCodes: heroes.map((h) => h.code),
    cards: Array.from(deck.entries()),
    savedAt: new Date().toISOString(),
  };
}

export function deserializeDeck(
  saved: SavedDeck,
  allCards: Card[]
): { name: string; heroes: Card[]; deck: DeckMap } {
  const byCode = new Map(allCards.map((c) => [c.code, c]));
  const heroes = saved.heroCodes
    .map((code) => byCode.get(code))
    .filter((c): c is Card => !!c);
  return {
    name: saved.name,
    heroes,
    deck: new Map(saved.cards.filter(([code]) => byCode.has(code))),
  };
}

/* ── Named saves ── */

export function listDecks(): SavedDeck[] {
  try {
    return JSON.parse(localStorage.getItem(DECKS_KEY) ?? "[]");
  } catch {
    return [];
  }
}

/** Save under `name`, overwriting any existing deck with the same name. */
export function saveDeck(name: string, heroes: Card[], deck: DeckMap): void {
  const decks = listDecks().filter((d) => d.name !== name);
  decks.push(serialize(name, heroes, deck));
  decks.sort((a, b) => a.name.localeCompare(b.name));
  localStorage.setItem(DECKS_KEY, JSON.stringify(decks));
}

export function deleteDeck(name: string): void {
  const decks = listDecks().filter((d) => d.name !== name);
  localStorage.setItem(DECKS_KEY, JSON.stringify(decks));
}

/* ── Work-in-progress auto-save ── */

export function saveWip(name: string, heroes: Card[], deck: DeckMap): void {
  localStorage.setItem(WIP_KEY, JSON.stringify(serialize(name, heroes, deck)));
}

export function loadWip(): SavedDeck | null {
  try {
    const raw = localStorage.getItem(WIP_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearWip(): void {
  localStorage.removeItem(WIP_KEY);
}
