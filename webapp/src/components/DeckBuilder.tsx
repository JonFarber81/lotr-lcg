import { useState, useMemo } from "react";
import type { Card, DeckMap } from "../types";
import { isCardEligible, deckSize } from "../eligibility";
import "./DeckBuilder.css";

interface Props {
  allCards: Card[];
  heroes: Card[];
  deck: DeckMap;
  setCardQty: (code: string, qty: number) => void;
}

const TYPE_TABS = [
  { key: "all",               label: "All" },
  { key: "ally",              label: "Allies" },
  { key: "attachment",        label: "Attachments" },
  { key: "event",             label: "Events" },
  { key: "player-side-quest", label: "Side Quests" },
  { key: "contract",          label: "Contracts" },
];

const DECK_SECTION_ORDER = ["ally", "attachment", "event", "player-side-quest", "contract"];
const DECK_SECTION_LABELS: Record<string, string> = {
  ally:               "Allies",
  attachment:         "Attachments",
  event:              "Events",
  "player-side-quest":"Side Quests",
  contract:           "Contracts",
};

export default function DeckBuilder({ allCards, heroes, deck, setCardQty }: Props) {
  const [search, setSearch]       = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [sphereFilter, setSphereFilter] = useState("all");

  const eligible = useMemo(
    () => allCards.filter((c) => c.type_code !== "hero" && isCardEligible(c, heroes)),
    [allCards, heroes]
  );

  const filtered = useMemo(() => {
    return eligible.filter((c) => {
      if (typeFilter !== "all" && c.type_code !== typeFilter) return false;
      if (sphereFilter !== "all" && c.sphere_code !== sphereFilter) return false;
      if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [eligible, typeFilter, sphereFilter, search]);

  const availableSpheres = useMemo(
    () => [...new Set(eligible.map((c) => c.sphere_code))].sort(),
    [eligible]
  );

  const totalCards = deckSize(deck);

  const deckByType = useMemo(() => {
    const groups: Record<string, { card: Card; qty: number }[]> = {};
    for (const [code, qty] of deck) {
      const card = allCards.find((c) => c.code === code);
      if (!card) continue;
      if (!groups[card.type_code]) groups[card.type_code] = [];
      groups[card.type_code].push({ card, qty });
    }
    return groups;
  }, [deck, allCards]);

  return (
    <div className="deck-builder">
      {/* ── Left: card browser ── */}
      <div className="card-browser">
        {/* Type tabs */}
        <div className="type-tabs">
          {TYPE_TABS.map((t) => (
            <button
              key={t.key}
              className={`type-tab ${typeFilter === t.key ? "active" : ""}`}
              onClick={() => setTypeFilter(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Search + sphere filter */}
        <div className="browser-toolbar">
          <input
            type="text"
            placeholder="Search cards…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select value={sphereFilter} onChange={(e) => setSphereFilter(e.target.value)}>
            <option value="all">All spheres</option>
            {availableSpheres.map((s) => (
              <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
            ))}
          </select>
          <span className="result-count">{filtered.length} cards</span>
        </div>

        {/* Card grid */}
        <div className="card-grid">
          {filtered.map((card) => {
            const qty = deck.get(card.code) ?? 0;
            const atLimit = qty >= card.deck_limit;
            return (
              <div
                key={card.code}
                className={`card-tile sphere-${card.sphere_code} ${qty > 0 ? "in-deck" : ""}`}
              >
                <img
                  className="card-tile-img"
                  src={`/images/${card.code}.png`}
                  alt={card.name}
                  loading="lazy"
                />
                {qty > 0 && (
                  <div className="card-qty-badge">{qty}</div>
                )}
                <div className="card-tile-footer">
                  <span className="card-tile-name">
                    {card.is_unique && "◆ "}{card.name}
                  </span>
                  {card.cost != null && (
                    <span className="card-tile-cost">{card.cost}</span>
                  )}
                </div>
                <div className="card-tile-controls">
                  <button
                    className="tile-btn tile-btn-remove"
                    onClick={() => setCardQty(card.code, qty - 1)}
                    disabled={qty === 0}
                  >−</button>
                  <button
                    className="tile-btn tile-btn-add"
                    onClick={() => setCardQty(card.code, qty + 1)}
                    disabled={atLimit}
                    title={atLimit ? `Deck limit: ${card.deck_limit}` : ""}
                  >+</button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Right: deck panel ── */}
      <div className="deck-panel">
        <div className="deck-panel-header">
          <div className="deck-heroes">
            {heroes.map((h) => (
              <span key={h.code} className={`hero-chip sphere-${h.sphere_code}`}>
                {h.name}
              </span>
            ))}
          </div>
          <span className={`deck-total ${totalCards >= 50 ? "ok" : "warn"}`}>
            {totalCards} / 50
          </span>
        </div>

        <div className="deck-list">
          {DECK_SECTION_ORDER.filter((t) => deckByType[t]?.length).map((type) => (
            <div key={type} className="deck-section">
              <div className="deck-section-title">
                {DECK_SECTION_LABELS[type]} ({deckByType[type].reduce((s, e) => s + e.qty, 0)})
              </div>
              {deckByType[type]
                .sort((a, b) => (a.card.cost ?? 0) - (b.card.cost ?? 0))
                .map(({ card, qty }) => (
                  <div key={card.code} className="deck-entry">
                    <span className={`deck-dot sphere-${card.sphere_code}`} />
                    <span className="deck-entry-qty">{qty}×</span>
                    <span className="deck-entry-name">{card.name}</span>
                    <span className="deck-entry-cost">
                      {card.cost != null ? card.cost : ""}
                    </span>
                    <button
                      className="deck-remove"
                      onClick={() => setCardQty(card.code, 0)}
                    >×</button>
                  </div>
                ))}
            </div>
          ))}
          {totalCards === 0 && (
            <div className="deck-empty">Browse and add cards on the left.</div>
          )}
        </div>
      </div>
    </div>
  );
}
