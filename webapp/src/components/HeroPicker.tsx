import { useState, useMemo } from "react";
import type { Card } from "../types";
import "./HeroPicker.css";

interface Props {
  allCards: Card[];
  selected: Card[];
  heroMax: number; // 3 normally; contracts can change it (e.g. Bond of Friendship → 4)
  onToggle: (hero: Card) => void;
}

const SPHERES = ["leadership", "tactics", "spirit", "lore", "baggins", "fellowship"];

const PAGE_SIZE = 40;
const THREAT_PILLS = [8, 9, 10, 11, 12] as const;
type ThreatMax = typeof THREAT_PILLS[number] | null;

const MIN_STAT_OPTIONS = [
  { label: "Any", value: 0 },
  { label: "1+",  value: 1 },
  { label: "2+",  value: 2 },
  { label: "3+",  value: 3 },
  { label: "4+",  value: 4 },
];

export default function HeroPicker({ allCards, selected, heroMax, onToggle }: Props) {
  const [search, setSearch]           = useState("");
  const [sphereFilter, setSphereFilter] = useState<string>("all");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [maxThreat, setMaxThreat]     = useState<ThreatMax>(null);
  const [traitFilter, setTraitFilter] = useState("");
  const [minWP, setMinWP]             = useState(0);
  const [minATK, setMinATK]           = useState(0);

  const heroes = useMemo(
    () => allCards.filter((c) => c.type_code === "hero"),
    [allCards]
  );

  const filtered = useMemo(() => {
    const trait = traitFilter.trim().toLowerCase();
    return heroes.filter((h) => {
      if (sphereFilter !== "all" && h.sphere_code !== sphereFilter) return false;
      if (search && !h.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (maxThreat !== null && (h.threat ?? 99) > maxThreat) return false;
      if (trait && !h.traits.toLowerCase().includes(trait)) return false;
      if (minWP  && (h.willpower ?? 0) < minWP)  return false;
      if (minATK && (h.attack    ?? 0) < minATK) return false;
      return true;
    });
  }, [heroes, search, sphereFilter, maxThreat, traitFilter, minWP, minATK]);

  // Reset pagination when any filter changes
  useMemo(() => setVisibleCount(PAGE_SIZE), [search, sphereFilter, maxThreat, traitFilter, minWP, minATK]);

  const visible = filtered.slice(0, visibleCount);
  const selectedCodes = new Set(selected.map((h) => h.code));

  return (
    <div className="hero-picker">
      <div className="hero-picker-toolbar">
        <input
          type="text"
          placeholder="Search heroes…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="hero-search"
        />
        <div className="sphere-filters">
          <button
            className={sphereFilter === "all" ? "active" : ""}
            onClick={() => setSphereFilter("all")}
          >
            All
          </button>
          {SPHERES.map((s) => (
            <button
              key={s}
              className={`sphere-btn sphere-${s} ${sphereFilter === s ? "active" : ""}`}
              onClick={() => setSphereFilter(s === sphereFilter ? "all" : s)}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
        <span className="hero-count">{filtered.length} heroes</span>
      </div>

      {/* Quick filters */}
      <div className="hero-quick-filters">
        <div className="qf-group">
          <span className="qf-label">Max Threat</span>
          {THREAT_PILLS.map((t) => (
            <button
              key={t}
              className={`qf-pill ${maxThreat === t ? "active" : ""}`}
              onClick={() => setMaxThreat(maxThreat === t ? null : t)}
            >≤{t}</button>
          ))}
        </div>
        <div className="qf-group">
          <span className="qf-label">Trait</span>
          <input
            className="qf-trait"
            type="text"
            placeholder="e.g. Hobbit"
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

      {selected.length > 0 && (
        <div className="selected-heroes">
          {selected.map((h) => (
            <div key={h.code} className={`selected-hero sphere-${h.sphere_code}`}>
              <span className="selected-hero-name">{h.name}</span>
              <span className="selected-hero-threat">⚠ {h.threat}</span>
              <button
                className="remove-hero"
                onClick={() => onToggle(h)}
              >
                ×
              </button>
            </div>
          ))}
          {selected.length < heroMax && (
            <div className="hero-slot-empty">
              {heroMax - selected.length} more hero{heroMax - selected.length !== 1 ? "es" : ""} needed
            </div>
          )}
        </div>
      )}

      <div className="hero-grid">
        {visible.map((hero) => {
          const isSelected = selectedCodes.has(hero.code);
          const isFull = !isSelected && selected.length >= heroMax;
          return (
            <div
              key={hero.code}
              className={`hero-card sphere-${hero.sphere_code} ${isSelected ? "selected" : ""} ${isFull ? "disabled" : ""}`}
              onClick={() => !isFull && onToggle(hero)}
            >
              <img
                className="hero-card-img"
                src={`/images/${hero.code}.png`}
                alt={hero.name}
                loading="lazy"
              />
              <div className="hero-card-footer">
                <span className="hero-card-name">{hero.name}</span>
                <span className={`sphere-badge sphere-${hero.sphere_code}`}>
                  {hero.sphere_name}
                </span>
              </div>
              {isSelected && <div className="hero-selected-mark">✓</div>}
            </div>
          );
        })}
        {visibleCount < filtered.length && (
          <button
            className="show-more"
            onClick={() => setVisibleCount((n) => n + PAGE_SIZE)}
          >
            Show {Math.min(PAGE_SIZE, filtered.length - visibleCount)} more…
          </button>
        )}
      </div>
    </div>
  );
}
