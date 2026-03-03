/**
 * useConstituencyMap
 *
 * Loads /public/constituencies.geojson once (cached in module scope),
 * projects each feature into an SVG path string using d3-geo geoIdentity,
 * and returns per-feature metadata needed by NepalMap constituency mode.
 *
 * GeoJSON property names (after minification):
 *   D  – DISTRICT (UPPERCASE, e.g. "KATHMANDU")
 *   C  – CON      (constituency number, e.g. 5)
 *   S  – STATE    (province string, e.g. "Bagmati")
 *
 * Seat code built here: titleCase(D) + "-" + C  → "Kathmandu-5"
 * This matches ConstituencyResult.name produced by parseUpstreamData.ts.
 *
 * District name normalisation table handles the handful of cases where
 * the GeoJSON DISTRICT string differs from the upstream English district name
 * used in ConstituencyResult.district.
 */

import { useState, useEffect, useMemo, useRef } from "react";
import { geoIdentity, geoPath } from "d3-geo";
import type { GeoPermissibleObjects } from "d3-geo";

// ── Types ─────────────────────────────────────────────────────────────────────

export type ConstituencyFeature = {
  /** "Kathmandu-5" — matches ConstituencyResult.name */
  seatCode: string;
  /** English district name (normalised to match upstream data) */
  district: string;
  /** Province string from GeoJSON (already matches our Province type values) */
  province: string;
  /** SVG path string for rendering */
  svgPath: string;
};

/** Merged SVG path for all National Park polygons — rendered green, non-interactive */
export type ParkPaths = { svgPath: string }[];

// ── GeoJSON property shape after minification ─────────────────────────────────

type RawProps = { D: string; C: number; S: string };

// ── Module-level cache ────────────────────────────────────────────────────────
// Avoids re-fetching when the user navigates away and back.

let _cachedGeoData: GeoJSON.FeatureCollection | null = null;
let _fetchPromise: Promise<GeoJSON.FeatureCollection> | null = null;

async function fetchGeoData(): Promise<GeoJSON.FeatureCollection> {
  if (_cachedGeoData) return _cachedGeoData;
  if (_fetchPromise) return _fetchPromise;
  _fetchPromise = fetch("/constituencies.geojson")
    .then((r) => {
      if (!r.ok) throw new Error(`Failed to load constituencies.geojson: ${r.status}`);
      return r.json() as Promise<GeoJSON.FeatureCollection>;
    })
    .then((data) => {
      _cachedGeoData = data;
      _fetchPromise = null;
      return data;
    });
  return _fetchPromise;
}

// ── District name normalisation ───────────────────────────────────────────────
// GeoJSON DISTRICT (title-cased) → upstream English district name.
// Only entries that DIFFER from simple title-case are listed here.

const DISTRICT_NORM: Record<string, string> = {
  Kabhrepalanchok: "Kavrepalanchok",
  Chitawan:        "Chitwan",
  Makawanpur:      "Makwanpur",
  Kapilbastu:      "Kapilvastu",
  Nawalparasi_e:   "Nawalpur",   // Gandaki side (state 4)
  Nawalparasi_w:   "Parasi",     // Lumbini side (state 5)
  Rukum_e:         "Rukum East",
  Rukum_w:         "Rukum West",
  Terhathum:       "Tehrathum",
};

function toTitleCase(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

function normaliseDistrict(raw: string): string {
  const title = toTitleCase(raw);
  return DISTRICT_NORM[title] ?? title;
}

// ── Province normalisation ────────────────────────────────────────────────────
// GeoJSON uses "Sudurpaschim"; our Province type uses "Sudurpashchim".

const PROVINCE_NORM: Record<string, string> = {
  Sudurpaschim: "Sudurpashchim",
};

function normaliseProvince(s: string): string {
  return PROVINCE_NORM[s] ?? s;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export type UseConstituencyMapResult = {
  features: ConstituencyFeature[];
  /** National park polygon paths — rendered green, non-interactive */
  parkPaths: string[];
  loading: boolean;
  error: string | null;
};

/**
 * @param width  SVG viewport width  (must match viewBox)
 * @param height SVG viewport height (must match viewBox)
 */
export function useConstituencyMap(
  width: number,
  height: number,
): UseConstituencyMapResult {
  const [geoData, setGeoData] = useState<GeoJSON.FeatureCollection | null>(
    _cachedGeoData,
  );
  const [loading, setLoading] = useState(_cachedGeoData === null);
  const [error, setError]     = useState<string | null>(null);

  // Keep stable ref to avoid stale-closure issues if width/height change mid-flight
  const sizeRef = useRef({ width, height });
  sizeRef.current = { width, height };

  useEffect(() => {
    if (_cachedGeoData) {
      setGeoData(_cachedGeoData);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetchGeoData()
      .then((data) => {
        if (!cancelled) { setGeoData(data); setLoading(false); }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "GeoJSON load failed");
          setLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, []);

  const { features, parkPaths } = useMemo<{
    features: ConstituencyFeature[];
    parkPaths: string[];
  }>(() => {
    if (!geoData) return { features: [], parkPaths: [] };

    const { width: w, height: h } = sizeRef.current;

    // geoIdentity with reflectY(true) flips the Y axis so that geographic
    // latitude (increasing northward) maps correctly to SVG Y (increasing downward).
    // fitSize scales + translates so the entire FeatureCollection fits within [w, h].
    const projection = geoIdentity().reflectY(true).fitSize([w, h], geoData as GeoPermissibleObjects);
    const gen = geoPath(projection);

    const features: ConstituencyFeature[] = [];
    const parkPaths: string[] = [];

    for (const feat of geoData.features) {
      const p = feat.properties as RawProps;
      const svgPath = gen(feat as GeoPermissibleObjects) ?? "";
      if (!svgPath) continue;

      // National Parks feature (CON === 0) — non-electoral, render separately
      if (p.C === 0) {
        parkPaths.push(svgPath);
        continue;
      }

      const district = normaliseDistrict(p.D);
      const province = normaliseProvince(p.S);
      const seatCode = `${district}-${p.C}`;
      features.push({ seatCode, district, province, svgPath });
    }

    return { features, parkPaths };
  }, [geoData]);

  return { features, parkPaths, loading, error };
}
