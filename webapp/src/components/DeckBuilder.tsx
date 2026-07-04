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

const COST_PILLS = ["X", "0", "1", "2", "3", "4", "5+"] as const;
type CostPill = typeof COST_PILLS[number] | null;

const MIN_STAT_OPTIONS = [
  { label: "Any", value: 0 },
  { label: "1+",  value: 1 },
  { label: "2+",  value: 2 },
  { label: "3+",  value: 3 },
  { label: "4+",  value: 4 },
];

function matchesCost(card: Card, pill: CostPill): boolean {
  if (!pill) return true;
  if (pill === "X")  return card.cost === "X";
  if (pill === "5+") return typeof card.cost === "number" && card.cost >= 5;
  return card.cost === Number(pill);
}

export default function DeckBuilder({ allCards, heroes, deck, setCardQty }: Props) {
  const [search, setSearch]         = useState("");
  const [typeFilter, setTypeFilter]   = useState("all");
  const [sphereFilter, setSphereFilter] = useState("all");
  const [costFilter, setCostFilter]   = useState<CostPill>(null);
  const [traitFilter, setTraitFilter] = useState("");
  const [minWP, setMinWP]             = useState(0);
  const [minATK, setMinATK]           = useState(0);
  const [popup, setPopup] = useState<{ card: Card; x: number; y: number } | null>(null);

  function handleCardMouseEnter(card: Card, e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const POPUP_W = 300;
    const POPUP_H = Math.round(POPUP_W * 600 / 419);
    const GAP = 10;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const x = rect.right + GAP + POPUP_W > vw
      ? rect.left - POPUP_W - GAP
      : rect.right + GAP;
    const y = Math.min(rect.top, vh - POPUP_H - 8);
    setPopup({ card, x, y });
  }

  const eligible = useMemo(
    () => allCards.filter((c) => c.type_code !== "hero" && isCardEligible(c, heroes)),
    [allCards, heroes]
  );

  const filtered = useMemo(() => {
    const trait = traitFilter.trim().toLowerCase();
    return eligible.filter((c) => {
      if (typeFilter !== "all" && c.type_code !== typeFilter) return false;
      if (sphereFilter !== "all" && c.sphere_code !== sphereFilter) return false;
      if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (!matchesCost(c, costFilter)) return false;
      if (trait && !c.traits.toLowerCase().includes(trait)) return false;
      if (minWP  && (c.willpower  ?? 0) < minWP)  return false;
      if (minATK && (c.attack     ?? 0) < minATK) return false;
      return true;
    });
  }, [eligible, typeFilter, sphereFilter, search, costFilter, traitFilter, minWP, minATK]);

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

        {/* Quick filters */}
        <div className="quick-filters">
          <div className="qf-group">
            <span className="qf-label">Cost</span>
            {COST_PILLS.map((p) => (
              <button
                key={p}
                className={`qf-pill ${costFilter === p ? "active" : ""}`}
                onClick={() => setCostFilter(costFilter === p ? null : p)}
              >{p}</button>
            ))}
          </div>
          <div className="qf-group">
            <span className="qf-label">Trait</span>
            <input
              className="qf-trait"
              type="text"
              placeholder="e.g. Gondor"
              value={traitFilter}
              onChange={(e) => setTraitFilter(e.target.value)}
            />
          </div>
          <div className="qf-group">
            <span className="qf-label">Min WP</span>
            <select className="qf-select" value={minWP} onChange={(e) => setMinWP(Number(e.target.value))}>
              {MIN_STAT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div className="qf-group">
            <span className="qf-label">Min ATK</span>
            <select className="qf-select" value={minATK} onChange={(e) => setMinATK(Number(e.target.value))}>
              {MIN_STAT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
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
                onMouseEnter={(e) => handleCardMouseEnter(card, e)}
                onMouseLeave={() => setPopup(null)}
              >
                <div className="card-tile-img-wrap">
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
                .sort((a, b) => {
                  const ca = typeof a.card.cost === "number" ? a.card.cost : 99;
                  const cb = typeof b.card.cost === "number" ? b.card.cost : 99;
                  return ca - cb;
                })
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

      {popup && (
        <div
          className="card-popup"
          style={{ left: popup.x, top: popup.y }}
        >
          <img
            src={`/images/${popup.card.code}.png`}
            alt={popup.card.name}
          />
        </div>
      )}
    </div>
  );
}
