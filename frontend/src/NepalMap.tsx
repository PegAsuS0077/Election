/**
 * NepalMap — dual-mode interactive SVG map
 * Fills use province tint only (no party colours).
 * districtPaths.ts is no longer used.
 */

import { useState, useEffect, useRef } from "react";
import type { ConstituencyResult, Province } from "./types";
// import { DISTRICT_PATHS } from "./districtPaths"; // superseded by /districts.geojson
import { provinceName } from "./i18n";
import type { Lang } from "./i18n";
import { useConstituencyMap } from "./hooks/useConstituencyMap";
import { geoIdentity, geoPath } from "d3-geo";
import type { GeoPermissibleObjects } from "d3-geo";

// ── SVG viewport ──────────────────────────────────────────────────────────────

const W = 900;
const H = 450;

// ── Colours ───────────────────────────────────────────────────────────────────

const PROVINCE_STROKE: Record<string, string> = {
  Koshi:         "#1e40af",
  Madhesh:       "#92400e",
  Bagmati:       "#134e4a",
  Gandaki:       "#581c87",
  Lumbini:       "#9d174d",
  Karnali:       "#14532d",
  Sudurpashchim: "#7c2d12",
};

const DISTRICT_BORDER_COLOR = "#78909c";
const DISTRICT_BORDER_WIDTH = 0.7;
const PROVINCE_BORDER_WIDTH = 2.2;

const PROVINCE_TINT: Record<string, string> = {
  Koshi:         "#dbeafe",
  Madhesh:       "#fef3c7",
  Bagmati:       "#ccfbf1",
  Gandaki:       "#f3e8ff",
  Lumbini:       "#fce7f3",
  Karnali:       "#dcfce7",
  Sudurpashchim: "#ffedd5",
};

const PROVINCE_LABELS: Record<string, { x: number; y: number }> = {
  Koshi:         { x: 790, y: 330 },
  Madhesh:       { x: 630, y: 415 },
  Bagmati:       { x: 600, y: 295 },
  Gandaki:       { x: 432, y: 220 },
  Lumbini:       { x: 295, y: 255 },
  Karnali:       { x: 230, y: 128 },
  Sudurpashchim: { x: 103, y: 118 },
};

// ── Geo-district loader ───────────────────────────────────────────────────────

type GeoDistrictFeature = { district: string; province: string; svgPath: string };
let _geoDistCache: GeoDistrictFeature[] | null = null;
let _geoDistFetch: Promise<GeoDistrictFeature[]> | null = null;

function loadGeoDistricts(w: number, h: number): Promise<GeoDistrictFeature[]> {
  if (_geoDistCache) return Promise.resolve(_geoDistCache);
  if (_geoDistFetch) return _geoDistFetch;
  _geoDistFetch = fetch("/districts.geojson")
    .then((r) => r.json() as Promise<GeoJSON.FeatureCollection>)
    .then((data) => {
      const proj = geoIdentity().reflectY(true).fitSize([w, h], data as GeoPermissibleObjects);
      const gen  = geoPath(proj);
      const feats: GeoDistrictFeature[] = data.features
        .map((feat) => {
          const p = feat.properties as { district: string; province: string };
          return { district: p.district, province: p.province, svgPath: gen(feat as GeoPermissibleObjects) ?? "" };
        })
        .filter((f) => f.svgPath !== "");
      _geoDistCache = feats;
      _geoDistFetch = null;
      return feats;
    });
  return _geoDistFetch;
}

// ── Nepal outer-border loader ─────────────────────────────────────────────────

let _outlineCache: string | null = null;
let _outlineFetch: Promise<string> | null = null;

function loadNepalOutline(w: number, h: number): Promise<string> {
  if (_outlineCache !== null) return Promise.resolve(_outlineCache);
  if (_outlineFetch) return _outlineFetch;
  _outlineFetch = Promise.all([
    fetch("/nepal-outline.geojson").then((r) => r.json() as Promise<GeoJSON.FeatureCollection>),
    fetch("/districts.geojson").then((r) => r.json() as Promise<GeoJSON.FeatureCollection>),
  ]).then(([outlineData, distData]) => {
    const proj = geoIdentity().reflectY(true).fitSize([w, h], distData as GeoPermissibleObjects);
    const gen  = geoPath(proj);
    const d    = gen(outlineData.features[0] as GeoPermissibleObjects) ?? "";
    _outlineCache = d;
    _outlineFetch = null;
    return d;
  });
  return _outlineFetch;
}

// ── Props ─────────────────────────────────────────────────────────────────────

export type MapMode = "district" | "constituency";

export default function NepalMap({
  results: _results,
  selectedProvince,
  onSelect,
  lang = "en",
  mode,
  selectedSeat,
  onSelectSeat,
}: {
  results: ConstituencyResult[];
  selectedProvince: "All" | Province;
  onSelect: (p: "All" | Province) => void;
  lang?: Lang;
  mode: MapMode;
  selectedSeat: string | null;
  onSelectSeat: (code: string | null) => void;
}) {
  // ── Constituency GeoJSON paths ────────────────────────────────────────────
  const { features: constFeatures, parkPaths, loading: constLoading } = useConstituencyMap(W, H);

  // ── District GeoJSON paths ────────────────────────────────────────────────
  const [geoDistFeatures, setGeoDistFeatures] = useState<GeoDistrictFeature[]>(_geoDistCache ?? []);
  const geoDistRequested = useRef(false);
  useEffect(() => {
    if (_geoDistCache) { setGeoDistFeatures(_geoDistCache); return; }
    if (geoDistRequested.current) return;
    geoDistRequested.current = true;
    loadGeoDistricts(W, H).then(setGeoDistFeatures).catch(() => {});
  }, []);

  // ── Nepal outer border ────────────────────────────────────────────────────
  const [nepalOutline, setNepalOutline] = useState<string>(_outlineCache ?? "");
  const outlineRequested = useRef(false);
  useEffect(() => {
    if (_outlineCache) { setNepalOutline(_outlineCache); return; }
    if (outlineRequested.current) return;
    outlineRequested.current = true;
    loadNepalOutline(W, H).then(setNepalOutline).catch(() => {});
  }, []);

  const provinceNames = Object.keys(PROVINCE_LABELS) as Province[];

  // ── Province label overlay ────────────────────────────────────────────────
  const provinceLabels = (
    <>
      {provinceNames.map((prov) => {
        const { x, y } = PROVINCE_LABELS[prov];
        const isSelected = selectedProvince === prov;
        const primary   = provinceName(prov, lang);
        const secondary = lang === "np" ? provinceName(prov, "en") : provinceName(prov, "np");
        return (
          <g key={prov} className="pointer-events-none select-none">
            <text x={x} y={y} textAnchor="middle"
              fontSize={isSelected ? "11" : "9"} fontWeight={isSelected ? "800" : "600"}
              fill={isSelected ? "#0f172a" : "#1e293b"}
              stroke="white" strokeWidth="3" paintOrder="stroke"
            >{primary}</text>
            <text x={x} y={y + 11} textAnchor="middle"
              fontSize="7" fontWeight="400"
              fill={isSelected ? "#334155" : "#475569"}
              stroke="white" strokeWidth="2" paintOrder="stroke"
            >{secondary}</text>
          </g>
        );
      })}
    </>
  );

  // ── Province border overlay ───────────────────────────────────────────────
  const provinceBorderOverlay = (
    <>
      {geoDistFeatures.filter((f) => f.province !== "NP").map((f) => {
        const isProvinceSelected = selectedProvince === f.province;
        return (
          <path key={`pb-${f.district}`} d={f.svgPath}
            fill="none"
            stroke={PROVINCE_STROKE[f.province] ?? "#64748b"}
            strokeWidth={isProvinceSelected ? PROVINCE_BORDER_WIDTH * 1.6 : PROVINCE_BORDER_WIDTH}
            strokeLinejoin="round"
            className="pointer-events-none"
          />
        );
      })}
    </>
  );

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" aria-label="Nepal map" role="img">

        {/* ── DISTRICT MODE ──────────────────────────────────────────────────── */}
        {mode === "district" && (
          geoDistFeatures.length === 0
            ? <text x={W / 2} y={H / 2} textAnchor="middle" fontSize="14"
                fill="#94a3b8" className="select-none">Loading map…</text>
            : <>
              {/* National Parks — green, non-interactive */}
              {geoDistFeatures.filter((f) => f.province === "NP").map((f) => (
                <path key={f.district} d={f.svgPath}
                  fill="#4ade80" fillOpacity={0.45}
                  stroke="#16a34a" strokeWidth={0.6} strokeLinejoin="round"
                  className="pointer-events-none select-none"
                >
                  <title>National Parks</title>
                </path>
              ))}

              {/* District fills — province tint, grey border */}
              {geoDistFeatures.filter((f) => f.province !== "NP").map((f) => {
                const isProvinceSelected = selectedProvince === f.province;
                const dimmed = selectedProvince !== "All" && !isProvinceSelected;
                const fillHex = PROVINCE_TINT[f.province] ?? "#f1f5f9";
                const fillOpacity = dimmed ? 0.25 : isProvinceSelected ? 1.0 : 0.80;
                return (
                  <path key={f.district} d={f.svgPath}
                    fill={fillHex} fillOpacity={fillOpacity}
                    stroke={DISTRICT_BORDER_COLOR} strokeWidth={DISTRICT_BORDER_WIDTH}
                    strokeLinejoin="round"
                    className="cursor-pointer transition-all duration-150 hover:brightness-95"
                    onClick={() => onSelect(isProvinceSelected ? "All" : f.province as Province)}
                    role="button"
                    aria-label={`${f.district} (${f.province})`}
                    tabIndex={0}
                    onKeyDown={(e) => e.key === "Enter" && onSelect(isProvinceSelected ? "All" : f.province as Province)}
                    style={{ outline: "none" }}
                  >
                    <title>{f.district}</title>
                  </path>
                );
              })}

              {/* Province border overlay — coloured, thick */}
              {provinceBorderOverlay}
            </>
        )}

        {/* ── CONSTITUENCY MODE ──────────────────────────────────────────────── */}
        {mode === "constituency" && (
          constLoading
            ? <text x={W / 2} y={H / 2} textAnchor="middle" fontSize="14"
                fill="#94a3b8" className="select-none">Loading map…</text>
            : <>
              {/* National Parks — green, non-interactive */}
              {parkPaths.map((d, i) => (
                <path key={`park-${i}`} d={d}
                  fill="#4ade80" fillOpacity={0.45}
                  stroke="#16a34a" strokeWidth={0.5} strokeLinejoin="round"
                  className="pointer-events-none select-none"
                />
              ))}

              {/* Constituency fills — province tint, selected gets amber stroke */}
              {constFeatures.map((feat) => {
                const isSelected = selectedSeat === feat.seatCode;
                const dimmed = selectedProvince !== "All" && feat.province !== selectedProvince;
                const fillHex = PROVINCE_TINT[feat.province] ?? "#f1f5f9";
                const fillOpacity = dimmed ? 0.20 : isSelected ? 1.0 : 0.80;
                return (
                  <path key={feat.seatCode} d={feat.svgPath}
                    fill={fillHex} fillOpacity={fillOpacity}
                    stroke={isSelected ? "#f59e0b" : DISTRICT_BORDER_COLOR}
                    strokeWidth={isSelected ? 2.5 : DISTRICT_BORDER_WIDTH}
                    strokeLinejoin="round"
                    className="cursor-pointer transition-all duration-150 hover:brightness-95"
                    onClick={() => onSelectSeat(isSelected ? null : feat.seatCode)}
                    role="button"
                    aria-label={feat.seatCode}
                    tabIndex={0}
                    onKeyDown={(e) => e.key === "Enter" && onSelectSeat(isSelected ? null : feat.seatCode)}
                    style={{ outline: "none" }}
                  >
                    <title>{feat.seatCode}</title>
                  </path>
                );
              })}

              {/* District border overlay — grey, non-interactive */}
              {geoDistFeatures.map((f) => (
                <path key={`db-${f.district}`} d={f.svgPath}
                  fill="none"
                  stroke={DISTRICT_BORDER_COLOR} strokeWidth={1.2}
                  strokeLinejoin="round"
                  className="pointer-events-none"
                />
              ))}

              {/* Province border overlay — coloured, thick */}
              {provinceBorderOverlay}
            </>
        )}

        {/* Province labels — both modes */}
        {provinceLabels}

        {/* Nepal outer border — always on top */}
        {nepalOutline && (
          <path d={nepalOutline}
            fill="none"
            stroke="#334155" strokeWidth={1.8}
            strokeLinejoin="round" strokeLinecap="round"
            className="pointer-events-none"
          />
        )}
      </svg>
    </div>
  );
}
