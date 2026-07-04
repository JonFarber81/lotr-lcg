import { useState, useEffect } from "react";
import type { Card, DeckMap, Phase } from "./types";
import { startingThreat, deckSize } from "./eligibility";
import { downloadO8d } from "./export";
import HeroPicker from "./components/HeroPicker";
import DeckBuilder from "./components/DeckBuilder";
import "./App.css";

export default function App() {
  const [allCards, setAllCards] = useState<Card[]>([]);
  const [heroes, setHeroes] = useState<Card[]>([]);
  const [deck, setDeck] = useState<DeckMap>(new Map());
  const [phase, setPhase] = useState<Phase>("heroes");
  const [deckName, setDeckName] = useState("My Deck");

  useEffect(() => {
    fetch("/cards.json")
      .then((r) => r.json())
      .then(setAllCards);
  }, []);

  function toggleHero(hero: Card) {
    setHeroes((prev) => {
      const exists = prev.find((h) => h.code === hero.code);
      if (exists) return prev.filter((h) => h.code !== hero.code);
      if (prev.length >= 3) return prev;
      return [...prev, hero];
    });
  }

  function setCardQty(code: string, qty: number) {
    setDeck((prev) => {
      const next = new Map(prev);
      if (qty <= 0) next.delete(code);
      else next.set(code, qty);
      return next;
    });
  }

  function resetDeck() {
    setDeck(new Map());
    setHeroes([]);
    setPhase("heroes");
  }

  const threat = startingThreat(heroes);
  const size = deckSize(deck);
  const canBuild = heroes.length === 3;
  const canExport = canBuild && size >= 50;

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-left">
          <h1>LOTR LCG Deck Builder</h1>
          {phase === "deck" && (
            <input
              className="deck-name-input"
              value={deckName}
              onChange={(e) => setDeckName(e.target.value)}
              placeholder="Deck name"
            />
          )}
        </div>
        <div className="header-stats">
          {phase === "deck" && (
            <>
              <span className={`stat ${size >= 50 ? "stat-ok" : "stat-warn"}`}>
                {size}/50 cards
              </span>
              <span className="stat">Threat: {threat}</span>
            </>
          )}
          {phase === "heroes" && heroes.length > 0 && (
            <span className="stat">Threat: {threat}</span>
          )}
        </div>
        <div className="header-actions">
          {phase === "heroes" && (
            <button
              onClick={() => setPhase("deck")}
              disabled={!canBuild}
              className="btn-primary"
            >
              Build Deck ({heroes.length}/3 heroes)
            </button>
          )}
          {phase === "deck" && (
            <>
              <button onClick={() => setPhase("heroes")}>← Change Heroes</button>
              <button
                onClick={() => downloadO8d(heroes, deck, allCards, deckName)}
                disabled={!canExport}
                className="btn-primary"
              >
                Export .o8d
              </button>
              <button onClick={resetDeck} className="btn-danger">
                Reset
              </button>
            </>
          )}
        </div>
      </header>

      <main className="app-main">
        {phase === "heroes" ? (
          <HeroPicker
            allCards={allCards}
            selected={heroes}
            onToggle={toggleHero}
          />
        ) : (
          <DeckBuilder
            allCards={allCards}
            heroes={heroes}
            deck={deck}
            setCardQty={setCardQty}
          />
        )}
      </main>
    </div>
  );
}
