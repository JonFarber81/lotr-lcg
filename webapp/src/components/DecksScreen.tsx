import { useRef, useState } from "react";
import type { Card } from "../types";
import type { SavedDeck } from "../storage";
import type { ImportedDeck } from "../import";
import { parseO8d, fetchRingsDbDeck } from "../import";
import "./DecksScreen.css";

interface Props {
  decks: SavedDeck[];
  allCards: Card[];
  onLoad: (deck: SavedDeck) => void;
  onDelete: (name: string) => void;
  onImport: (imported: ImportedDeck) => void;
}

export default function DecksScreen({ decks, allCards, onLoad, onDelete, onImport }: Props) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [ringsdbInput, setRingsdbInput] = useState("");
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const byCode = new Map(allCards.map((c) => [c.code, c]));

  function finishImport(imported: ImportedDeck) {
    setError(null);
    if (imported.heroes.length === 0 && imported.deck.size === 0) {
      setError("No recognizable cards found in that deck.");
      return;
    }
    if (imported.unmatched.length > 0) {
      alert(
        `Imported, but ${imported.unmatched.length} card(s) weren't recognized ` +
          `and were skipped:\n\n${imported.unmatched.join("\n")}`
      );
    }
    onImport(imported);
  }

  async function handleO8dFile(file: File | undefined) {
    if (!file) return;
    try {
      const text = await file.text();
      const name = file.name.replace(/\.o8d$/i, "");
      finishImport(parseO8d(text, allCards, name));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function handleRingsDb() {
    if (!ringsdbInput.trim() || fetching) return;
    setFetching(true);
    setError(null);
    try {
      finishImport(await fetchRingsDbDeck(ringsdbInput, allCards));
      setRingsdbInput("");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setFetching(false);
    }
  }

  return (
    <div className="decks-screen">
      <div className="import-bar">
        <button onClick={() => fileInput.current?.click()}>Import .o8d…</button>
        <input
          ref={fileInput}
          type="file"
          accept=".o8d,application/xml,text/xml"
          style={{ display: "none" }}
          onChange={(e) => {
            handleO8dFile(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
        <div className="import-ringsdb">
          <input
            type="text"
            placeholder="RingsDB decklist URL or ID…"
            value={ringsdbInput}
            onChange={(e) => setRingsdbInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleRingsDb()}
          />
          <button onClick={handleRingsDb} disabled={fetching || !ringsdbInput.trim()}>
            {fetching ? "Fetching…" : "Import from RingsDB"}
          </button>
        </div>
        {error && <span className="import-error">{error}</span>}
      </div>

      {decks.length === 0 ? (
        <div className="decks-empty">
          No saved decks yet. Build a deck and use “Save Deck” in the header, or
          import one above.
        </div>
      ) : (
        <div className="decks-grid">
          {decks.map((d) => {
            const heroes = d.heroCodes
              .map((code) => byCode.get(code))
              .filter((c): c is Card => !!c);
            const size = d.cards.reduce((s, [, qty]) => s + qty, 0);
            return (
              <div key={d.name} className="deck-card">
                <div className="deck-card-name">{d.name}</div>
                <div className="deck-card-heroes">
                  {heroes.map((h) => (
                    <span key={h.code} className={`hero-chip sphere-${h.sphere_code}`}>
                      {h.name}
                    </span>
                  ))}
                </div>
                <div className="deck-card-meta">
                  {size} cards · saved {new Date(d.savedAt).toLocaleDateString()}
                </div>
                <div className="deck-card-actions">
                  <button className="btn-primary" onClick={() => onLoad(d)}>
                    Open
                  </button>
                  <button
                    className="btn-danger"
                    onClick={() => {
                      if (confirm(`Delete deck “${d.name}”?`)) onDelete(d.name);
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
