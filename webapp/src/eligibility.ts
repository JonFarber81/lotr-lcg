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

/** Starting threat = sum of hero threat values. */
export function startingThreat(heroes: Card[]): number {
  return heroes.reduce((sum, h) => sum + (h.threat ?? 0), 0);
}

/** Total non-hero cards currently in the deck. */
export function deckSize(deck: Map<string, number>): number {
  return Array.from(deck.values()).reduce((sum, qty) => sum + qty, 0);
}
