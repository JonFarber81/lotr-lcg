import type { Card } from "./types";

/**
 * Returns true if a non-hero card can be included in a deck built around the
 * given heroes.
 *
 * Standard rules:
 *  - "neutral" sphere cards are always allowed.
 *  - "baggins" and "fellowship" are special spheres — treat them as always
 *    allowed (they don't require a matching hero sphere to use).
 *  - All other cards require their sphere_code to match at least one hero's
 *    sphere_code.
 *
 * TODO: Implement this function.
 *
 * @param card   The non-hero card being tested.
 * @param heroes The (up to 3) chosen hero cards.
 */
export function isCardEligible(card: Card, heroes: Card[]): boolean {
  const ALWAYS_ELIGIBLE = new Set(["neutral", "baggins", "fellowship"]);
  if (ALWAYS_ELIGIBLE.has(card.sphere_code)) return true;
  const heroSpheres = new Set(heroes.map((h) => h.sphere_code));
  return heroSpheres.has(card.sphere_code);
}

/**
 * Contracts that change how many heroes you may start with.
 * Keyed by card code; anything else keeps the standard 3.
 */
const CONTRACT_HERO_RANGE: Record<string, { min: number; max: number }> = {
  "22147": { min: 4, max: 4 }, // Bond of Friendship — exactly 4 heroes
  "22074": { min: 1, max: 1 }, // The Grey Wanderer — 1 starting hero
  "22134": { min: 1, max: 2 }, // Messenger of the King — at most 2 heroes
  "501053": { min: 2, max: 2 }, // At the End of All Things — exactly 2 heroes
};

/** Allowed hero count for the deck's contract (standard: exactly 3). */
export function heroRange(deck: Map<string, number>): { min: number; max: number } {
  for (const code of deck.keys()) {
    const range = CONTRACT_HERO_RANGE[code];
    if (range) return range;
  }
  return { min: 3, max: 3 };
}

/**
 * Per-card copy limit, accounting for contracts that tighten it:
 * Bond of Friendship allows at most 2 copies of any card,
 * Council of the Wise allows only 1.
 */
export function copyLimit(card: Card, deck: Map<string, number>): number {
  let limit = card.deck_limit;
  if (deck.has("22147")) limit = Math.min(limit, 2); // Bond of Friendship
  if (deck.has("22091")) limit = Math.min(limit, 1); // Council of the Wise
  return limit;
}

export interface DeckEntry {
  card: Card;
  qty: number;
}

/**
 * Deck-building rules from contracts that we can't hard-enforce without
 * getting in the way — surfaced as warnings instead. Copy limits and hero
 * counts ARE enforced (see copyLimit/heroRange); everything here is advisory.
 */
export function contractWarnings(heroes: Card[], entries: DeckEntry[]): string[] {
  const codes = new Set(entries.map((e) => e.card.code));
  // Contracts sit outside the deck, so they don't count toward size/spheres.
  const deckCards = entries.filter((e) => e.card.type_code !== "contract");
  const size = deckCards.reduce((s, e) => s + e.qty, 0);
  const count = (pred: (c: Card) => boolean) =>
    deckCards.filter((e) => pred(e.card)).reduce((s, e) => s + e.qty, 0);
  const warnings: string[] = [];

  if (codes.has("22147")) {
    // Bond of Friendship
    if (size !== 50)
      warnings.push(`Bond of Friendship: deck must be exactly 50 cards (currently ${size}).`);
    for (const sphere of ["leadership", "lore", "spirit", "tactics"]) {
      const n = count((c) => c.sphere_code === sphere);
      if (n !== 10)
        warnings.push(
          `Bond of Friendship: needs exactly 10 ${sphere[0].toUpperCase() + sphere.slice(1)} cards (currently ${n}).`
        );
    }
    if (new Set(heroes.map((h) => h.sphere_code)).size !== heroes.length)
      warnings.push("Bond of Friendship: each hero must belong to a different sphere.");
  }

  if (codes.has("22049")) {
    // Forth, The Three Hunters!
    const allies = count((c) => c.type_code === "ally");
    if (allies > 0)
      warnings.push(`Forth, The Three Hunters!: deck cannot include allies (currently ${allies}).`);
  }

  if (codes.has("22024")) {
    // The Burglar's Turn
    const attachments = count((c) => c.type_code === "attachment");
    if (attachments > 0)
      warnings.push(
        `The Burglar's Turn: deck cannot include attachments (currently ${attachments}).`
      );
  }

  if (codes.has("21074")) {
    // Fellowship
    const nonUnique = count((c) => c.type_code === "ally" && !c.is_unique);
    if (nonUnique > 0)
      warnings.push(
        `Fellowship: non-unique allies can never be played (${nonUnique} in deck).`
      );
  }

  if (codes.has("500042")) {
    // Into the West
    const perCost = [1, 2, 3, 4, 5].map((n) => count((c) => c.cost === n));
    if (new Set(perCost).size !== 1)
      warnings.push(
        `Into the West: needs equal counts of cost 1–5 cards (currently ${perCost.join("/")}).`
      );
  }

  if (codes.has("505062")) {
    // The Gifts of Galadriel
    const allies = count((c) => c.type_code === "ally");
    const attachments = count((c) => c.type_code === "attachment");
    if (allies !== attachments || allies + attachments !== size)
      warnings.push(
        `The Gifts of Galadriel: deck must be exactly half allies and half attachments (currently ${allies} allies / ${attachments} attachments of ${size}).`
      );
  }

  if (codes.has("40047")) {
    // A Perilous Voyage
    if (size < 100)
      warnings.push(`A Perilous Voyage: minimum deck size is 100 cards (currently ${size}).`);
  }

  return warnings;
}

/** Starting threat = sum of hero threat values. */
export function startingThreat(heroes: Card[]): number {
  return heroes.reduce((sum, h) => sum + (h.threat ?? 0), 0);
}

/** Total non-hero cards currently in the deck. */
export function deckSize(deck: Map<string, number>): number {
  return Array.from(deck.values()).reduce((sum, qty) => sum + qty, 0);
}
