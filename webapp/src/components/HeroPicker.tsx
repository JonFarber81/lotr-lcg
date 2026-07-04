import { useState, useMemo } from "react";
import type { Card } from "../types";
import "./HeroPicker.css";

interface Props {
  allCards: Card[];
  selected: Card[];
  onToggle: (hero: Card) => void;
}

const SPHERES = ["leadership", "tactics", "spirit", "lore", "baggins", "fellowship"];

const PAGE_SIZE = 40;

export default function HeroPicker({ allCards, selected, onToggle }: Props) {
  const [search, setSearch] = useState("");
  const [sphereFilter, setSphereFilter] = useState<string>("all");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const heroes = useMemo(
    () => allCards.filter((c) => c.type_code === "hero"),
    [allCards]
  );

  const filtered = useMemo(() => {
    return heroes.filter((h) => {
      if (sphereFilter !== "all" && h.sphere_code !== sphereFilter) return false;
      if (search && !h.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [heroes, search, sphereFilter]);

  // Reset pagination when filter changes
  useMemo(() => setVisibleCount(PAGE_SIZE), [search, sphereFilter]);

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
          {selected.length < 3 && (
            <div className="hero-slot-empty">
              {3 - selected.length} more hero{3 - selected.length !== 1 ? "es" : ""} needed
            </div>
          )}
        </div>
      )}

      <div className="hero-grid">
        {visible.map((hero) => {
          const isSelected = selectedCodes.has(hero.code);
          const isFull = !isSelected && selected.length >= 3;
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
