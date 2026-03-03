/**
 * NepalMap — dual-mode interactive SVG map
 * Performance: memoized overlays, JS hover (no CSS transition on paths),
 *              wheel + drag pan/zoom via SVG viewBox transform.
 */

import { useState, useEffect, useRef, useMemo, useCallback, memo } from "react";
import type { ConstituencyResult, Province } from "./types";
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

// Border hierarchy: Nepal outline (darkest) > province > district (lightest)
const NEPAL_OUTLINE_COLOR   = "#1e293b";
const NEPAL_OUTLINE_WIDTH   = 2.5;
const PROVINCE_BORDER_COLOR = "#64748b";
const PROVINCE_BORDER_WIDTH = 1.8;
const DISTRICT_BORDER_COLOR = "#94a3b8";
const DISTRICT_BORDER_WIDTH = 0.6;

const PROVINCE_TINT: Record<string, string> = {
  Koshi:         "#dbeafe",
  Madhesh:       "#fef3c7",
  Bagmati:       "#ccfbf1",
  Gandaki:       "#f3e8ff",
  Lumbini:       "#fce7f3",
  Karnali:       "#dcfce7",
  Sudurpashchim: "#ffedd5",
};

// Hover brightening — applied via fill directly (no CSS filter, avoids repaint storm)
function brighten(hex: string): string {
  // lighten by blending toward white 20%
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const blend = (c: number) => Math.round(c + (255 - c) * 0.22).toString(16).padStart(2, "0");
  return `#${blend(r)}${blend(g)}${blend(b)}`;
}

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

// ── Pan/zoom state ────────────────────────────────────────────────────────────

type Transform = { x: number; y: number; k: number };
const INIT_TRANSFORM: Transform = { x: 0, y: 0, k: 1 };
const MIN_K = 1;
const MAX_K = 8;

function clampTransform(t: Transform): Transform {
  const maxX = W * (t.k - 1);
  const maxY = H * (t.k - 1);
  return {
    k: t.k,
    x: Math.max(-maxX, Math.min(0, t.x)),
    y: Math.max(-maxY, Math.min(0, t.y)),
  };
}

// ── Province border overlay (memoized separately) ─────────────────────────────

const ProvinceBorderOverlay = memo(function ProvinceBorderOverlay({
  features,
  selectedProvince,
}: {
  features: GeoDistrictFeature[];
  selectedProvince: string;
}) {
  return (
    <>
      {features.filter((f) => f.province !== "NP").map((f) => (
        <path key={`pb-${f.district}`} d={f.svgPath}
          fill="none"
          stroke={PROVINCE_STROKE[f.province] ?? PROVINCE_BORDER_COLOR}
          strokeWidth={selectedProvince === f.province ? PROVINCE_BORDER_WIDTH * 1.5 : PROVINCE_BORDER_WIDTH}
          strokeLinejoin="round"
          style={{ pointerEvents: "none" }}
        />
      ))}
    </>
  );
});

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
  selectedDistrict,
  onSelectDistrict,
  hotSeatCodes,
}: {
  results: ConstituencyResult[];
  selectedProvince: "All" | Province;
  onSelect: (p: "All" | Province) => void;
  lang?: Lang;
  mode: MapMode;
  selectedSeat: string | null;
  onSelectSeat: (code: string | null) => void;
  selectedDistrict?: string | null;
  onSelectDistrict?: (d: string | null) => void;
  hotSeatCodes?: Set<string>;
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

  // ── JS hover state (no CSS filter — avoids per-path repaint storm) ────────
  const [hoveredDistrict, setHoveredDistrict]     = useState<string | null>(null);
  const [hoveredConstituency, setHoveredConstituency] = useState<string | null>(null);

  // ── Pan / zoom ────────────────────────────────────────────────────────────
  const [transform, setTransform] = useState<Transform>(INIT_TRANSFORM);
  const svgRef   = useRef<SVGSVGElement>(null);
  const dragRef  = useRef<{ startX: number; startY: number; tx: number; ty: number } | null>(null);
  const isDragging = useRef(false);

  const resetZoom = useCallback(() => setTransform(INIT_TRANSFORM), []);

  // Wheel zoom — centered on cursor
  const onWheel = useCallback((e: React.WheelEvent<SVGSVGElement>) => {
    e.preventDefault();
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    // cursor in SVG coordinate space
    const mx = ((e.clientX - rect.left) / rect.width)  * W;
    const my = ((e.clientY - rect.top)  / rect.height) * H;

    setTransform((prev) => {
      const factor = e.deltaY < 0 ? 1.18 : 1 / 1.18;
      const k = Math.max(MIN_K, Math.min(MAX_K, prev.k * factor));
      // keep cursor point fixed
      const x = mx - (mx - prev.x) * (k / prev.k);
      const y = my - (my - prev.y) * (k / prev.k);
      return clampTransform({ k, x, y });
    });
  }, []);

  // Drag pan
  const onMouseDown = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (e.button !== 0) return;
    isDragging.current = false;
    dragRef.current = { startX: e.clientX, startY: e.clientY, tx: transform.x, ty: transform.y };
  }, [transform]);

  const onMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    if (!isDragging.current && Math.sqrt(dx * dx + dy * dy) > 4) isDragging.current = true;
    if (!isDragging.current) return;
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const scaleX = W / rect.width;
    const scaleY = H / rect.height;
    setTransform((prev) =>
      clampTransform({ k: prev.k, x: dragRef.current!.tx + dx * scaleX, y: dragRef.current!.ty + dy * scaleY })
    );
  }, []);

  const onMouseUp = useCallback(() => { dragRef.current = null; }, []);

  // ── Province labels ───────────────────────────────────────────────────────
  const provinceNames = Object.keys(PROVINCE_LABELS) as Province[];
  const provinceLabels = useMemo(() => (
    <>
      {provinceNames.map((prov) => {
        const { x, y } = PROVINCE_LABELS[prov];
        const isSelected = selectedProvince === prov;
        const primary   = provinceName(prov, lang);
        const secondary = lang === "np" ? provinceName(prov, "en") : provinceName(prov, "np");
        return (
          <g key={prov} style={{ pointerEvents: "none", userSelect: "none" }}>
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
  ), [selectedProvince, lang]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── District mode paths (memoized — only changes when selection changes) ──
  const districtPaths = useMemo(() => (
    <>
      {geoDistFeatures.filter((f) => f.province === "NP").map((f) => (
        <path key={f.district} d={f.svgPath}
          fill="#4ade80" fillOpacity={0.45}
          stroke="#16a34a" strokeWidth={0.6} strokeLinejoin="round"
          style={{ pointerEvents: "none" }}
        />
      ))}
      {geoDistFeatures.filter((f) => f.province !== "NP").map((f) => {
        const isDistrictSelected = selectedDistrict === f.district;
        const isProvinceSelected = selectedProvince === f.province;
        const dimmed = selectedProvince !== "All" && !isProvinceSelected;
        const baseFill = PROVINCE_TINT[f.province] ?? "#f1f5f9";
        const hovered = hoveredDistrict === f.district;
        const fill = hovered && !isDistrictSelected ? brighten(baseFill) : baseFill;
        const fillOpacity = dimmed ? 0.25 : isDistrictSelected ? 1.0 : isProvinceSelected ? 0.85 : 0.75;
        return (
          <path key={f.district} d={f.svgPath}
            fill={fill} fillOpacity={fillOpacity}
            stroke={isDistrictSelected ? "#f59e0b" : DISTRICT_BORDER_COLOR}
            strokeWidth={isDistrictSelected ? 1.8 : DISTRICT_BORDER_WIDTH}
            strokeLinejoin="round"
            style={{ cursor: "pointer" }}
            onMouseEnter={() => setHoveredDistrict(f.district)}
            onMouseLeave={() => setHoveredDistrict(null)}
            onClick={() => {
              if (isDragging.current) return;
              if (onSelectDistrict) onSelectDistrict(isDistrictSelected ? null : f.district);
              onSelect(f.province as Province);
            }}
            role="button"
            aria-label={`${f.district} (${f.province})`}
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                if (onSelectDistrict) onSelectDistrict(isDistrictSelected ? null : f.district);
                onSelect(f.province as Province);
              }
            }}
          >
            <title>{f.district}</title>
          </path>
        );
      })}
    </>
  ), [geoDistFeatures, selectedDistrict, selectedProvince, hoveredDistrict, onSelectDistrict, onSelect]);

  // ── Constituency mode paths (memoized) ────────────────────────────────────
  const constituencyPaths = useMemo(() => (
    <>
      {parkPaths.map((d, i) => (
        <path key={`park-${i}`} d={d}
          fill="#4ade80" fillOpacity={0.45}
          stroke="#16a34a" strokeWidth={0.5} strokeLinejoin="round"
          style={{ pointerEvents: "none" }}
        />
      ))}
      {constFeatures.map((feat) => {
        const isSelected = selectedSeat === feat.seatCode;
        const isHot = hotSeatCodes?.has(feat.seatCode) ?? false;
        const dimmed = selectedProvince !== "All" && feat.province !== selectedProvince;
        const hovered = hoveredConstituency === feat.seatCode;
        const baseFill = isHot ? "#fca5a5" : (PROVINCE_TINT[feat.province] ?? "#f1f5f9");
        const fill = hovered && !isSelected ? brighten(baseFill) : baseFill;
        const fillOpacity = dimmed ? 0.20 : isSelected ? 1.0 : isHot ? 0.85 : 0.80;
        return (
          <path key={feat.seatCode} d={feat.svgPath}
            fill={fill} fillOpacity={fillOpacity}
            stroke={isSelected ? "#f59e0b" : isHot ? "#ef4444" : DISTRICT_BORDER_COLOR}
            strokeWidth={isSelected ? 2.5 : isHot ? 1.2 : DISTRICT_BORDER_WIDTH}
            strokeLinejoin="round"
            style={{ cursor: "pointer" }}
            onMouseEnter={() => setHoveredConstituency(feat.seatCode)}
            onMouseLeave={() => setHoveredConstituency(null)}
            onClick={() => { if (!isDragging.current) onSelectSeat(isSelected ? null : feat.seatCode); }}
            role="button"
            aria-label={feat.seatCode}
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && onSelectSeat(isSelected ? null : feat.seatCode)}
          >
            <title>{feat.seatCode}</title>
          </path>
        );
      })}
      {/* District border overlay */}
      {geoDistFeatures.map((f) => (
        <path key={`db-${f.district}`} d={f.svgPath}
          fill="none"
          stroke={DISTRICT_BORDER_COLOR} strokeWidth={1.2}
          strokeLinejoin="round"
          style={{ pointerEvents: "none" }}
        />
      ))}
    </>
  ), [constFeatures, parkPaths, geoDistFeatures, selectedSeat, selectedProvince, hoveredConstituency, hotSeatCodes, onSelectSeat]);

  const isZoomed = transform.k > 1.05;

  return (
    <div className="relative w-full" style={{ touchAction: "none" }}>
      {/* Zoom controls */}
      <div className="absolute top-2 right-2 z-10 flex flex-col gap-1">
        <button
          onClick={() => setTransform((prev) => clampTransform({ ...prev, k: Math.min(MAX_K, prev.k * 1.4) }))}
          className="w-7 h-7 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-sm font-bold shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center justify-center"
          aria-label="Zoom in"
        >+</button>
        <button
          onClick={() => setTransform((prev) => clampTransform({ ...prev, k: Math.max(MIN_K, prev.k / 1.4) }))}
          className="w-7 h-7 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-sm font-bold shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center justify-center"
          aria-label="Zoom out"
        >−</button>
        {isZoomed && (
          <button
            onClick={resetZoom}
            className="w-7 h-7 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 text-[10px] font-bold shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center justify-center"
            aria-label="Reset zoom"
          >⟲</button>
        )}
      </div>

      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto block"
        style={{ cursor: isDragging.current ? "grabbing" : isZoomed ? "grab" : "default" }}
        aria-label="Nepal map"
        role="img"
        onWheel={onWheel}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
      >
        <g transform={`translate(${transform.x},${transform.y}) scale(${transform.k})`}
           style={{ transformOrigin: "0 0" }}>

          {/* ── DISTRICT MODE ────────────────────────────────────────────── */}
          {mode === "district" && (
            geoDistFeatures.length === 0
              ? <text x={W / 2} y={H / 2} textAnchor="middle" fontSize="14"
                  fill="#94a3b8" style={{ userSelect: "none" }}>Loading map…</text>
              : <>
                {districtPaths}
                <ProvinceBorderOverlay features={geoDistFeatures} selectedProvince={selectedProvince} />
              </>
          )}

          {/* ── CONSTITUENCY MODE ─────────────────────────────────────────── */}
          {mode === "constituency" && (
            constLoading
              ? <text x={W / 2} y={H / 2} textAnchor="middle" fontSize="14"
                  fill="#94a3b8" style={{ userSelect: "none" }}>Loading map…</text>
              : <>
                {constituencyPaths}
                <ProvinceBorderOverlay features={geoDistFeatures} selectedProvince={selectedProvince} />
              </>
          )}

          {/* Province labels — both modes */}
          {provinceLabels}
        </g>

        {/* Nepal outer border — outside transform so it stays sharp at all zoom levels */}
        {nepalOutline && (
          <path d={nepalOutline}
            fill="none"
            stroke={NEPAL_OUTLINE_COLOR} strokeWidth={NEPAL_OUTLINE_WIDTH}
            strokeLinejoin="round" strokeLinecap="round"
            style={{ pointerEvents: "none" }}
          />
        )}
      </svg>

      {isZoomed && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[10px] text-slate-400 dark:text-slate-500 bg-white/80 dark:bg-slate-900/80 px-2 py-0.5 rounded-full pointer-events-none">
          scroll or drag to navigate · ⟲ to reset
        </div>
      )}
    </div>
  );
}
