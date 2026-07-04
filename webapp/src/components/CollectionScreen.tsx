import { useMemo, useRef } from "react";
import type { Pack } from "../types";
import type { Collection } from "../collection";
import { exportCollection, importCollectionFile } from "../collection";
import "./CollectionScreen.css";

interface Props {
  packs: Pack[];
  collection: Collection; // filled: every pack code present
  onChange: (next: Collection) => void;
}

export default function CollectionScreen({ packs, collection, onChange }: Props) {
  const fileInput = useRef<HTMLInputElement>(null);

  const cycles = useMemo(() => {
    const groups: { cycle: string; packs: Pack[] }[] = [];
    for (const p of packs) {
      const last = groups[groups.length - 1];
      if (last && last.cycle === p.cycle) last.packs.push(p);
      else groups.push({ cycle: p.cycle, packs: [p] });
    }
    return groups;
  }, [packs]);

  const ownedCount = packs.filter((p) => collection[p.code] === 1).length;

  function togglePack(code: string) {
    onChange({ ...collection, [code]: collection[code] === 1 ? 0 : 1 });
  }

  function setCycle(cyclePacks: Pack[], owned: boolean) {
    const next = { ...collection };
    for (const p of cyclePacks) next[p.code] = owned ? 1 : 0;
    onChange(next);
  }

  async function handleImport(file: File | undefined) {
    if (!file) return;
    try {
      const imported = await importCollectionFile(file);
      // Imported file may be sparse — overlay it on the current full map.
      onChange({ ...collection, ...imported });
    } catch (err) {
      alert(`Could not import: ${err instanceof Error ? err.message : err}`);
    }
  }

  return (
    <div className="collection-screen">
      <div className="collection-toolbar">
        <span className="collection-summary">
          {ownedCount} / {packs.length} packs owned
        </span>
        <div className="collection-toolbar-actions">
          <button onClick={() => setCycle(packs, true)}>Own all</button>
          <button onClick={() => setCycle(packs, false)}>Own none</button>
          <button onClick={() => exportCollection(collection)}>
            Export collection.json
          </button>
          <button onClick={() => fileInput.current?.click()}>Import…</button>
          <input
            ref={fileInput}
            type="file"
            accept=".json,application/json"
            style={{ display: "none" }}
            onChange={(e) => {
              handleImport(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </div>
      </div>

      <div className="cycle-groups">
        {cycles.map(({ cycle, packs: cyclePacks }) => {
          const ownedInCycle = cyclePacks.filter((p) => collection[p.code] === 1).length;
          const allOwned = ownedInCycle === cyclePacks.length;
          return (
            <div key={cycle} className="cycle-group">
              <div className="cycle-header">
                <label className="cycle-toggle">
                  <input
                    type="checkbox"
                    checked={allOwned}
                    ref={(el) => {
                      if (el) el.indeterminate = ownedInCycle > 0 && !allOwned;
                    }}
                    onChange={() => setCycle(cyclePacks, !allOwned)}
                  />
                  <span className="cycle-name">{cycle}</span>
                </label>
                <span className="cycle-count">
                  {ownedInCycle}/{cyclePacks.length}
                </span>
              </div>
              <div className="pack-list">
                {cyclePacks.map((p) => (
                  <label
                    key={p.code}
                    className={`pack-row ${collection[p.code] === 1 ? "owned" : ""}`}
                  >
                    <input
                      type="checkbox"
                      checked={collection[p.code] === 1}
                      onChange={() => togglePack(p.code)}
                    />
                    <span className="pack-name">{p.name}</span>
                  </label>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
