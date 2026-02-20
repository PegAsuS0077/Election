import { useMemo } from "react";
import { parties } from "./mockData";
import type { ConstituencyResult, Province } from "./mockData";

// Simplified schematic SVG paths for Nepal's 7 provinces.
const PROVINCE_PATHS: Record<Province, { d: string; labelX: number; labelY: number }> = {
  Sudurpashchim: { d: "M 0,110 L 138,75 L 160,295 L 0,308 Z",          labelX: 72,  labelY: 205 },
  Karnali:       { d: "M 138,75 L 346,32 L 368,248 L 160,295 Z",        labelX: 248, labelY: 175 },
  Lumbini:       { d: "M 160,295 L 368,248 L 393,338 L 0,338 L 0,308 Z", labelX: 210, labelY: 322 },
  Gandaki:       { d: "M 346,32 L 508,22 L 520,238 L 368,248 Z",        labelX: 432, labelY: 155 },
  Bagmati:       { d: "M 508,22 L 656,28 L 663,242 L 520,238 Z",        labelX: 582, labelY: 152 },
  Madhesh:       { d: "M 393,338 L 760,330 L 760,378 L 393,378 Z",      labelX: 576, labelY: 358 },
  Koshi:         { d: "M 656,28 L 900,55 L 888,330 L 760,330 L 663,242 Z", labelX: 775, labelY: 210 },
};

function getLeadingParty(results: ConstituencyResult[], province: Province): string | null {
  const rows = results.filter((r) => r.province === province);
  if (!rows.length) return null;

  const tally: Record<string, number> = {};
  for (const r of rows) {
    if (!r.candidates.length) continue;
    const winner = [...r.candidates].sort((a, b) => b.votes - a.votes)[0];
    tally[winner.party] = (tally[winner.party] ?? 0) + 1;
  }

  const top = Object.entries(tally).sort((a, b) => b[1] - a[1])[0];
  return top?.[0] ?? null;
}

// Map Tailwind bg-* classes to actual hex colors for SVG fill
const PARTY_FILL: Record<string, string> = {
  "bg-red-600":     "#dc2626",
  "bg-blue-600":    "#2563eb",
  "bg-orange-600":  "#ea580c",
  "bg-emerald-600": "#059669",
  "bg-slate-500":   "#64748b",
};

export default function NepalMap({
  results,
  selectedProvince,
  onSelect,
}: {
  results: ConstituencyResult[];
  selectedProvince: "All" | Province;
  onSelect: (p: "All" | Province) => void;
}) {
  const provinces = Object.keys(PROVINCE_PATHS) as Province[];

  const leadingParties = useMemo(() => {
    const map: Partial<Record<Province, string | null>> = {};
    for (const p of provinces) {
      map[p] = getLeadingParty(results, p);
    }
    return map;
  }, [results, provinces]);

  return (
    <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm dark:bg-slate-900 dark:border-slate-800">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Province Map</h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Click a province to filter results · Shaded by leading party
          </p>
        </div>
        {selectedProvince !== "All" && (
          <button
            type="button"
            onClick={() => onSelect("All")}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold
                       text-slate-700 transition hover:bg-slate-50 active:scale-95
                       dark:bg-slate-900 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Clear filter
          </button>
        )}
      </div>

      <svg
        viewBox="0 0 900 390"
        className="w-full h-auto"
        aria-label="Nepal province map"
        role="img"
      >
        {provinces.map((province) => {
          const { d, labelX, labelY } = PROVINCE_PATHS[province];
          const leadParty = leadingParties[province];
          const partyColor = leadParty ? parties[leadParty as keyof typeof parties]?.color : null;
          const fillHex = partyColor ? (PARTY_FILL[partyColor] ?? "#94a3b8") : "#e2e8f0";
          const isSelected = selectedProvince === province;

          return (
            <g
              key={province}
              onClick={() => onSelect(isSelected ? "All" : province)}
              className="cursor-pointer"
              role="button"
              aria-label={`${province} province${leadParty ? ` — leading: ${leadParty}` : ""}`}
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && onSelect(isSelected ? "All" : province)}
            >
              <path
                d={d}
                fill={fillHex}
                fillOpacity={isSelected ? 1 : 0.65}
                stroke={isSelected ? "#1e293b" : "#94a3b8"}
                strokeWidth={isSelected ? 2.5 : 1}
                className="transition-all duration-200 hover:fill-opacity-90"
              />
              <text
                x={labelX}
                y={labelY}
                textAnchor="middle"
                fontSize="11"
                fontWeight={isSelected ? "700" : "500"}
                fill={isSelected ? "#0f172a" : "#334155"}
                className="pointer-events-none select-none"
              >
                {province}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-3">
        {Object.entries(parties).map(([key, { name, color }]) => (
          <div key={key} className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
            <span
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: PARTY_FILL[color] ?? "#94a3b8" }}
            />
            {name}
          </div>
        ))}
      </div>
    </section>
  );
}
