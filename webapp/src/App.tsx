import { useState, useEffect, useMemo } from "react";
import type { Card, DeckMap, Pack, Phase } from "./types";
import { startingThreat, deckSize, heroRange } from "./eligibility";
import { downloadO8d } from "./export";
import {
  type Collection,
  loadCollection,
  saveCollection,
  isPackOwned,
  fillCollection,
} from "./collection";
import {
  type SavedDeck,
  listDecks,
  saveDeck,
  deleteDeck,
  saveWip,
  clearWip,
  deserializeDeck,
} from "./storage";
import type { ImportedDeck } from "./import";
import HeroPicker from "./components/HeroPicker";
import DeckBuilder from "./components/DeckBuilder";
import CollectionScreen from "./components/CollectionScreen";
import DecksScreen from "./components/DecksScreen";
import "./App.css";

export default function App() {
  const [allCards, setAllCards] = useState<Card[]>([]);
  const [packs, setPacks] = useState<Pack[]>([]);
  const [collection, setCollection] = useState<Collection | null>(null);
  const [ownedOnly, setOwnedOnly] = useState(true);
  const [savedDecks, setSavedDecks] = useState<SavedDeck[]>([]);
  const [heroes, setHeroes] = useState<Card[]>([]);
  const [deck, setDeck] = useState<DeckMap>(new Map());
  const [phase, setPhase] = useState<Phase>("heroes");
  const [deckName, setDeckName] = useState("My Deck");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/cards.json").then((r) => r.json()) as Promise<Card[]>,
      fetch("/packs.json").then((r) => r.json()) as Promise<Pack[]>,
      loadCollection(),
    ]).then(([cards, packList, storedCollection]) => {
      setAllCards(cards);
      setPacks(packList);
      // Fill to a complete map once, applying the ownership policy to the
      // never-configured and missing-pack cases (see collection.ts).
      setCollection(fillCollection(packList, storedCollection));
      setSavedDecks(listDecks());

      const wip = localStorage.getItem("lotr-wip-deck");
      if (wip) {
        try {
          const restored = deserializeDeck(JSON.parse(wip), cards);
          if (restored.heroes.length > 0 || restored.deck.size > 0) {
            setDeckName(restored.name);
            setHeroes(restored.heroes);
            setDeck(restored.deck);
            if (restored.heroes.length === 3) setPhase("deck");
          }
        } catch {
          /* corrupted WIP — start fresh */
        }
      }
      setReady(true);
    });
  }, []);

  // Auto-save work in progress so a refresh never loses the deck.
  useEffect(() => {
    if (ready) saveWip(deckName, heroes, deck);
  }, [ready, deckName, heroes, deck]);

  const ownedCards = useMemo(
    () => allCards.filter((c) => isPackOwned(c.pack_code, collection)),
    [allCards, collection]
  );
  const browseCards = ownedOnly ? ownedCards : allCards;

  function toggleHero(hero: Card) {
    setHeroes((prev) => {
      const exists = prev.find((h) => h.code === hero.code);
      if (exists) return prev.filter((h) => h.code !== hero.code);
      if (prev.length >= heroRange(deck).max) return prev;
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
    setDeckName("My Deck");
    setPhase("heroes");
    clearWip();
  }

  function handleCollectionChange(next: Collection) {
    setCollection(next);
    saveCollection(next);
  }

  function handleSaveDeck() {
    saveDeck(deckName, heroes, deck);
    setSavedDecks(listDecks());
  }

  function handleLoadDeck(saved: SavedDeck) {
    const { name, heroes: h, deck: d } = deserializeDeck(saved, allCards);
    setDeckName(name);
    setHeroes(h);
    setDeck(d);
    setPhase(h.length === 3 ? "deck" : "heroes");
  }

  function handleDeleteDeck(name: string) {
    deleteDeck(name);
    setSavedDecks(listDecks());
  }

  function handleImportDeck(imported: ImportedDeck) {
    setDeckName(imported.name);
    setHeroes(imported.heroes);
    setDeck(imported.deck);
    setPhase(imported.heroes.length >= heroRange(imported.deck).min ? "deck" : "heroes");
  }

  const threat = startingThreat(heroes);
  const size = deckSize(deck);
  const { min: heroMin, max: heroMax } = heroRange(deck);
  const canBuild = heroes.length >= heroMin && heroes.length <= heroMax;
  const canExport = canBuild && size >= 50;
  const buildPhase = phase === "heroes" || phase === "deck";
  const backPhase: Phase = canBuild ? "deck" : "heroes";
  const isSaved = savedDecks.some((d) => d.name === deckName);

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-left">
          <h1>LOTR LCG Deck Builder</h1>
          <nav className="header-nav">
            <button
              className={`nav-btn ${buildPhase ? "active" : ""}`}
              onClick={() => setPhase(backPhase)}
            >
              Builder
            </button>
            <button
              className={`nav-btn ${phase === "decks" ? "active" : ""}`}
              onClick={() => setPhase("decks")}
            >
              My Decks
            </button>
            <button
              className={`nav-btn ${phase === "collection" ? "active" : ""}`}
              onClick={() => setPhase("collection")}
            >
              Collection
            </button>
          </nav>
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
          {buildPhase && (
            <label className="owned-toggle" title="Only show cards from packs you own">
              <input
                type="checkbox"
                checked={ownedOnly}
                onChange={(e) => setOwnedOnly(e.target.checked)}
              />
              Owned only
            </label>
          )}
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
              Build Deck ({heroes.length}/{heroMax} heroes)
            </button>
          )}
          {phase === "deck" && (
            <>
              <button onClick={() => setPhase("heroes")}>← Change Heroes</button>
              <button onClick={handleSaveDeck} disabled={!canBuild}>
                {isSaved ? "Update Deck" : "Save Deck"}
              </button>
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
        {phase === "heroes" && (
          <HeroPicker
            allCards={browseCards}
            selected={heroes}
            heroMax={heroMax}
            onToggle={toggleHero}
          />
        )}
        {phase === "deck" && (
          <DeckBuilder
            allCards={allCards}
            browseCards={browseCards}
            heroes={heroes}
            deck={deck}
            setCardQty={setCardQty}
          />
        )}
        {phase === "collection" && collection && (
          <CollectionScreen
            packs={packs}
            collection={collection}
            onChange={handleCollectionChange}
          />
        )}
        {phase === "decks" && (
          <DecksScreen
            decks={savedDecks}
            allCards={allCards}
            onLoad={handleLoadDeck}
            onDelete={handleDeleteDeck}
            onImport={handleImportDeck}
          />
        )}
      </main>
    </div>
  );
}
