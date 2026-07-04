import type { Pack } from "./types";

/**
 * Collection = pack_code → 0 | 1 ownership flags, e.g. { "Core": 1, "KD": 0 }.
 * This is the same shape as the optional seed file webapp/public/collection.json,
 * so a hand-written config file and an in-app export are interchangeable.
 */
export type Collection = Record<string, 0 | 1>;

const STORAGE_KEY = "lotr-collection";

/**
 * Load the collection: localStorage first (the live copy), falling back to
 * the optional seed file /collection.json. Returns null if neither exists —
 * meaning the user has never configured a collection.
 */
export async function loadCollection(): Promise<Collection | null> {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      /* corrupted — fall through to seed */
    }
  }
  try {
    const res = await fetch("/collection.json");
    if (res.ok) {
      const seed: Collection = await res.json();
      saveCollection(seed); // promote seed to live copy
      return seed;
    }
  } catch {
    /* no seed file — that's fine */
  }
  return null;
}

export function saveCollection(collection: Collection): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(collection));
}

/**
 * Decide whether a pack counts as owned.
 *
 * Policy:
 *  - `collection` is null (never configured): everything counts as owned, so
 *    a fresh install shows the full card pool instead of an empty app.
 *  - Pack code missing from the map (e.g. a new pack synced after the
 *    collection was last edited): unowned, so new packs don't silently
 *    appear in the "owned only" view until explicitly checked off.
 *
 * @param packCode   The card's pack_code (e.g. "Core", "KD").
 * @param collection The ownership map, or null if never configured.
 */
export function isPackOwned(
  packCode: string,
  collection: Collection | null
): boolean {
  if (collection === null) return true;
  return collection[packCode] === 1;
}

/** Download the collection as collection.json (drop it in webapp/public/ to make it the seed). */
export function exportCollection(collection: Collection): void {
  const blob = new Blob([JSON.stringify(collection, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "collection.json";
  a.click();
  URL.revokeObjectURL(url);
}

/** Parse an uploaded collection.json file. Throws on malformed input. */
export async function importCollectionFile(file: File): Promise<Collection> {
  const text = await file.text();
  const data = JSON.parse(text);
  if (typeof data !== "object" || data === null || Array.isArray(data)) {
    throw new Error("collection.json must be an object of pack_code → 0|1");
  }
  const collection: Collection = {};
  for (const [code, val] of Object.entries(data)) {
    collection[code] = val ? 1 : 0;
  }
  return collection;
}

/** Build a complete map (every known pack present) from a possibly-sparse one. */
export function fillCollection(
  packs: Pack[],
  collection: Collection | null
): Collection {
  const full: Collection = {};
  for (const p of packs) {
    full[p.code] = isPackOwned(p.code, collection) ? 1 : 0;
  }
  return full;
}
