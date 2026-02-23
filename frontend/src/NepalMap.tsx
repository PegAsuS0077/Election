import { useMemo } from "react";
import { parties } from "./mockData";
import type { ConstituencyResult, Province } from "./mockData";
import { DISTRICT_PATHS } from "./districtPaths";
import { t as i18n, provinceName, partyName } from "./i18n";
import type { Lang } from "./i18n";

// Province stroke colors — each province has a distinct border color
const PROVINCE_STROKE: Record<string, string> = {
  Koshi:          "#1e40af",
  Madhesh:        "#92400e",
  Bagmati:        "#134e4a",
  Gandaki:        "#581c87",
  Lumbini:        "#9d174d",
  Karnali:        "#14532d",
  Sudurpashchim:  "#7c2d12",
};

// Province fill tint (very light) used when no party has won in that province yet
const PROVINCE_TINT: Record<string, string> = {
  Koshi:          "#dbeafe",
  Madhesh:        "#fef3c7",
  Bagmati:        "#ccfbf1",
  Gandaki:        "#f3e8ff",
  Lumbini:        "#fce7f3",
  Karnali:        "#dcfce7",
  Sudurpashchim:  "#ffedd5",
};

// Map Tailwind bg-* classes to hex for SVG fill
const PARTY_FILL: Record<string, string> = {
  "bg-red-600":     "#dc2626",
  "bg-blue-600":    "#2563eb",
  "bg-orange-600":  "#ea580c",
  "bg-emerald-600": "#059669",
  "bg-slate-500":   "#64748b",
};

const CONTESTED_FILL = "#a855f7";

type DistrictStatus =
  | { kind: "leading"; party: string }
  | { kind: "contested" }
  | { kind: "no-data"; province: string };

function getDistrictStatus(
  results: ConstituencyResult[],
  districtName: string,
  province: string
): DistrictStatus {
  const rows = results.filter((r) => r.district === districtName);
  if (!rows.length) return { kind: "no-data", province };

  // Tally DECLARED seat winners
  const declared = rows.filter((r) => r.status === "DECLARED");
  if (declared.length) {
    const tally: Record<string, number> = {};
    for (const r of declared) {
      const winner = [...r.candidates].sort((a, b) => b.votes - a.votes)[0];
      tally[winner.party] = (tally[winner.party] ?? 0) + 1;
    }
    const sorted = Object.entries(tally).sort((a, b) => b[1] - a[1]);
    const [first, second] = sorted;
    if (second && first[1] - second[1] === 0) return { kind: "contested" };
    return { kind: "leading", party: first[0] };
  }

  // No seats declared yet — show vote-share leader (lighter opacity in render)
  const voteShare: Record<string, number> = {};
  for (const r of rows) {
    for (const c of r.candidates) {
      voteShare[c.party] = (voteShare[c.party] ?? 0) + c.votes;
    }
  }
  const top = Object.entries(voteShare).sort((a, b) => b[1] - a[1])[0];
  return top ? { kind: "leading", party: top[0] } : { kind: "no-data", province };
}

// Province label centroid (manually tuned to sit inside province)
const PROVINCE_LABELS: Record<string, { x: number; y: number }> = {
  Koshi:          { x: 790, y: 330 },
  Madhesh:        { x: 630, y: 415 },
  Bagmati:        { x: 600, y: 295 },
  Gandaki:        { x: 432, y: 220 },
  Lumbini:        { x: 295, y: 255 },
  Karnali:        { x: 230, y: 128 },
  Sudurpashchim:  { x: 103, y: 118 },
};

export default function NepalMap({
  results,
  selectedProvince,
  onSelect,
  lang = "en",
}: {
  results: ConstituencyResult[];
  selectedProvince: "All" | Province;
  onSelect: (p: "All" | Province) => void;
  lang?: Lang;
}) {
  const districtStatuses = useMemo(() => {
    const map: Record<string, DistrictStatus> = {};
    for (const [name, { province }] of Object.entries(DISTRICT_PATHS)) {
      map[name] = getDistrictStatus(results, name, province);
    }
    return map;
  }, [results]);

  const provinceNames = Object.keys(PROVINCE_LABELS) as Province[];

  return (
    <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm dark:bg-slate-900 dark:border-slate-800">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{i18n("districtMap", lang)}</h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            {i18n("mapDesc", lang)}
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
            {i18n("clearFilter", lang)}
          </button>
        )}
      </div>

      <svg
        viewBox="0 0 900 450"
        className="w-full h-auto"
        aria-label="Nepal district map"
        role="img"
      >
        {Object.entries(DISTRICT_PATHS).map(([districtName, { province, d }]) => {
          const status = districtStatuses[districtName] ?? { kind: "no-data", province };
          const isProvinceSelected = selectedProvince === province;
          const dimmed = selectedProvince !== "All" && !isProvinceSelected;

          // Determine fill
          let fillHex: string;
          let fillOpacity: number;
          if (status.kind === "leading") {
            const declared = results.filter(
              (r) => r.district === districtName && r.status === "DECLARED"
            );
            fillHex = PARTY_FILL[parties[status.party as keyof typeof parties]?.color] ?? "#94a3b8";
            // Lighter if only vote-leading (no declared seats yet)
            fillOpacity = declared.length > 0 ? 0.75 : 0.30;
          } else if (status.kind === "contested") {
            fillHex = CONTESTED_FILL;
            fillOpacity = 0.70;
          } else {
            fillHex = PROVINCE_TINT[province] ?? "#f1f5f9";
            fillOpacity = 0.80;
          }

          if (dimmed) fillOpacity *= 0.3;
          if (isProvinceSelected) fillOpacity = Math.min(fillOpacity * 1.3, 1);

          const strokeColor = PROVINCE_STROKE[province] ?? "#94a3b8";
          const strokeWidth = isProvinceSelected ? 1.5 : 0.8;

          return (
            <path
              key={districtName}
              d={d}
              fill={fillHex}
              fillOpacity={fillOpacity}
              stroke={strokeColor}
              strokeWidth={strokeWidth}
              strokeLinejoin="round"
              className="cursor-pointer transition-all duration-150 hover:brightness-110"
              onClick={() => onSelect(isProvinceSelected ? "All" : province as Province)}
              role="button"
              aria-label={`${districtName} (${province})${
                status.kind === "leading" ? ` — ${status.party} leading` :
                status.kind === "contested" ? " — contested" : ""
              }`}
              tabIndex={0}
              onKeyDown={(e) =>
                e.key === "Enter" && onSelect(isProvinceSelected ? "All" : province as Province)
              }
              style={{ outline: "none" }}
            />
          );
        })}

        {/* Province name labels on top */}
        {provinceNames.map((prov) => {
          const { x, y } = PROVINCE_LABELS[prov];
          const isSelected = selectedProvince === prov;
          const primaryLabel = provinceName(prov, lang);
          // Show the other script as a small secondary line
          const secondaryLabel = lang === "np" ? provinceName(prov, "en") : provinceName(prov, "np");
          return (
            <g key={prov} className="pointer-events-none select-none">
              <text
                x={x}
                y={y}
                textAnchor="middle"
                fontSize={isSelected ? "11" : "9"}
                fontWeight={isSelected ? "800" : "600"}
                fill={isSelected ? "#0f172a" : "#1e293b"}
                stroke="white"
                strokeWidth="3"
                paintOrder="stroke"
              >
                {primaryLabel}
              </text>
              <text
                x={x}
                y={y + 11}
                textAnchor="middle"
                fontSize="7"
                fontWeight="400"
                fill={isSelected ? "#334155" : "#475569"}
                stroke="white"
                strokeWidth="2"
                paintOrder="stroke"
              >
                {secondaryLabel}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2">
        {Object.entries(parties).map(([key, { color }]) => (
          <div key={key} className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
            <span
              className="h-3 w-3 rounded-sm flex-shrink-0"
              style={{ backgroundColor: PARTY_FILL[color] ?? "#94a3b8" }}
            />
            {partyName(key, lang)}
          </div>
        ))}
        <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
          <span className="h-3 w-3 rounded-sm flex-shrink-0" style={{ backgroundColor: CONTESTED_FILL }} />
          {lang === "np" ? "विवादित" : "Contested"}
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
          <span className="h-3 w-3 rounded-sm flex-shrink-0 opacity-30 bg-slate-400" />
          {lang === "np" ? "फिका = मतगणना जारी" : "Faint = counting (no declared yet)"}
        </div>
      </div>
    </section>
  );
}
