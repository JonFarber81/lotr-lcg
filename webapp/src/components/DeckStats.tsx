import { useMemo, useState } from "react";
import type { DeckEntry } from "../eligibility";
import "./DeckStats.css";

interface Props {
  entries: DeckEntry[];
}

const COST_BUCKETS = ["0", "1", "2", "3", "4", "5+", "X"] as const;

const TYPES: { code: string; label: string }[] = [
  { code: "ally", label: "Allies" },
  { code: "attachment", label: "Attach." },
  { code: "event", label: "Events" },
  { code: "player-side-quest", label: "Quests" },
];

const SPHERES = ["leadership", "tactics", "spirit", "lore", "neutral", "baggins", "fellowship"];

type Breakdown = "type" | "sphere";

function costBucket(cost: number | "X" | null): string | null {
  if (cost === null) return null;
  if (cost === "X") return "X";
  return cost >= 5 ? "5+" : String(cost);
}

export default function DeckStats({ entries }: Props) {
  const [breakdown, setBreakdown] = useState<Breakdown>("type");

  const { typeCounts, sphereCounts, curve, maxCost } = useMemo(() => {
    const typeCounts: Record<string, number> = {};
    const sphereCounts: Record<string, number> = {};
    // curve[bucket][type|sphere key] = card count
    const curve: Record<string, Record<string, number>> = {};
    for (const b of COST_BUCKETS) curve[b] = {};
    for (const { card, qty } of entries) {
      if (card.type_code === "contract") continue;
      typeCounts[card.type_code] = (typeCounts[card.type_code] ?? 0) + qty;
      sphereCounts[card.sphere_code] = (sphereCounts[card.sphere_code] ?? 0) + qty;
      const bucket = costBucket(card.cost);
      if (!bucket) continue;
      for (const key of [`type:${card.type_code}`, `sphere:${card.sphere_code}`]) {
        curve[bucket][key] = (curve[bucket][key] ?? 0) + qty;
      }
    }
    const maxCost = Math.max(
      1,
      ...COST_BUCKETS.map((b) =>
        Object.entries(curve[b])
          .filter(([k]) => k.startsWith("type:"))
          .reduce((s, [, n]) => s + n, 0)
      )
    );
    return { typeCounts, sphereCounts, curve, maxCost };
  }, [entries]);

  if (entries.length === 0) return null;

  // Segment order for the stacked bars (bottom to top).
  const segments =
    breakdown === "type"
      ? TYPES.map((t) => ({ key: `type:${t.code}`, cls: `seg-type-${t.code}`, label: t.label }))
      : SPHERES.map((s) => ({
          key: `sphere:${s}`,
          cls: `seg-sphere-${s}`,
          label: s.charAt(0).toUpperCase() + s.slice(1),
        }));

  return (
    <div className="deck-stats">
      <div className="stats-types">
        {TYPES.map(({ code, label }) => (
          <span key={code} className="stats-type">
            <span className={`stats-swatch seg-type-${code}`} />
            <span className="stats-type-count">{typeCounts[code] ?? 0}</span> {label}
          </span>
        ))}
      </div>

      <div className="curve-header">
        <span className="curve-title">Cost curve</span>
        <div className="curve-toggle">
          {(["type", "sphere"] as const).map((b) => (
            <button
              key={b}
              className={`curve-toggle-btn ${breakdown === b ? "active" : ""}`}
              onClick={() => setBreakdown(b)}
            >
              {b === "type" ? "Type" : "Sphere"}
            </button>
          ))}
        </div>
      </div>

      <div className="cost-curve">
        {COST_BUCKETS.map((bucket) => {
          const total = segments.reduce((s, seg) => s + (curve[bucket][seg.key] ?? 0), 0);
          return (
            <div key={bucket} className="cost-col">
              <span className="cost-count">{total || ""}</span>
              <div className="cost-bar-track">
                <div
                  className="cost-bar-stack"
                  style={{ height: `${Math.round((total / maxCost) * 100)}%` }}
                >
                  {segments.map((seg) => {
                    const n = curve[bucket][seg.key] ?? 0;
                    if (!n) return null;
                    return (
                      <div
                        key={seg.key}
                        className={`cost-seg ${seg.cls}`}
                        style={{ flexGrow: n }}
                        title={`${n} ${seg.label} card${n !== 1 ? "s" : ""} costing ${bucket}`}
                      />
                    );
                  })}
                </div>
              </div>
              <span className="cost-label">{bucket}</span>
            </div>
          );
        })}
      </div>

      <div className="stats-spheres">
        {SPHERES.filter((s) => sphereCounts[s]).map((s) => (
          <span key={s} className="stats-sphere" title={s.charAt(0).toUpperCase() + s.slice(1)}>
            <span className={`deck-dot sphere-${s}`} />
            {sphereCounts[s]}
          </span>
        ))}
      </div>
    </div>
  );
}
