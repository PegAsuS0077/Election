/**
 * build-districts-geojson.cjs
 *
 * Phase B: derives district polygons from constituencies.geojson by dissolving
 * (unioning) all constituency features that share the same DISTRICT property.
 *
 * Input:  public/constituencies.geojson
 *         Properties used: { D: DISTRICT (UPPERCASE), C: CON, S: STATE/province }
 *
 * Output: public/districts.geojson
 *         Properties written: { district: string, province: string }
 *         (77 features — one per district, same projection as input)
 *
 * Usage (from frontend/):
 *   node scripts/build-districts-geojson.cjs
 *
 * ── Union pitfalls ──────────────────────────────────────────────────────────
 *
 * 1. @turf/union accumulates a running union feature-by-feature. This is
 *    O(n²) in the worst case for districts with many constituencies, but
 *    since Nepal's max is ~10 per district it's fast enough.
 *
 * 2. @turf/union v6 requires BOTH arguments to be Feature<Polygon|MultiPolygon>.
 *    Passing null / undefined crashes it, so we guard on the first iteration.
 *
 * 3. Slivers: shared boundaries between constituencies are not always perfectly
 *    aligned, leaving hairline gaps. These are visually invisible at map scale
 *    and do not affect correctness.
 *
 * 4. Split districts (Nawalparasi, Rukum): the GeoJSON uses NAWALPARASI_E,
 *    NAWALPARASI_W, RUKUM_E, RUKUM_W — these are treated as separate districts
 *    intentionally, matching the upstream data model.
 *
 * 5. Province mapping: GeoJSON uses "Sudurpaschim"; we normalise to
 *    "Sudurpashchim" to match the Province type in types.ts.
 */

"use strict";

const fs   = require("fs");
const path = require("path");

// @turf/union v6 exports: { default: unionFn } or just a function
const turfUnionMod = require("@turf/union");
const turfUnion = typeof turfUnionMod === "function"
  ? turfUnionMod
  : (turfUnionMod.default ?? turfUnionMod.union ?? turfUnionMod);

const INPUT  = path.resolve(__dirname, "../public/constituencies.geojson");
const OUTPUT = path.resolve(__dirname, "../public/districts.geojson");

if (!fs.existsSync(INPUT)) {
  console.error("ERROR: constituencies.geojson not found at", INPUT);
  process.exit(1);
}

const PROVINCE_NORM = { Sudurpaschim: "Sudurpashchim" };
function normProvince(s) { return PROVINCE_NORM[s] ?? s; }

function toTitleCase(s) {
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

// ── Load input ────────────────────────────────────────────────────────────────
console.log("Reading", INPUT, "...");
const geojson = JSON.parse(fs.readFileSync(INPUT, "utf8"));
console.log("  Features:", geojson.features.length);

// ── Group features by DISTRICT ────────────────────────────────────────────────
/** @type {Map<string, { province: string, features: object[] }>} */
const byDistrict = new Map();

for (const feat of geojson.features) {
  const { D, S } = feat.properties;
  const key = D; // UPPERCASE district name — used as grouping key
  if (!byDistrict.has(key)) {
    byDistrict.set(key, { province: normProvince(S), features: [] });
  }
  byDistrict.get(key).features.push(feat);
}

console.log("  Distinct districts:", byDistrict.size);

// ── Dissolve each district ────────────────────────────────────────────────────
const outputFeatures = [];
let errors = 0;

for (const [districtKey, { province, features }] of byDistrict) {
  const districtName = toTitleCase(districtKey);

  if (features.length === 1) {
    // Single constituency district — just relabel properties
    outputFeatures.push({
      type:       "Feature",
      properties: { district: districtName, province },
      geometry:   features[0].geometry,
    });
    continue;
  }

  // Union all constituency polygons
  let union = features[0];
  let ok = true;
  for (let i = 1; i < features.length; i++) {
    try {
      const result = turfUnion(union, features[i]);
      if (!result) throw new Error("turfUnion returned null");
      union = result;
    } catch (err) {
      console.warn(`  WARN: union failed for ${districtName} at step ${i}:`, err.message);
      ok = false;
      break;
    }
  }

  if (!ok) {
    errors++;
    // Fallback: use a GeometryCollection of all constituent geometries
    outputFeatures.push({
      type:       "Feature",
      properties: { district: districtName, province },
      geometry: {
        type:       "GeometryCollection",
        geometries: features.map((f) => f.geometry),
      },
    });
  } else {
    outputFeatures.push({
      type:       "Feature",
      properties: { district: districtName, province },
      geometry:   union.geometry,
    });
  }
}

// ── Write output ──────────────────────────────────────────────────────────────
const outputGeoJSON = {
  type:     "FeatureCollection",
  features: outputFeatures,
};

fs.writeFileSync(OUTPUT, JSON.stringify(outputGeoJSON));
const stat = fs.statSync(OUTPUT);
console.log("\nWrote", OUTPUT);
console.log("  Features:", outputFeatures.length, "(expected 77)");
console.log("  Size:    ", (stat.size / 1024).toFixed(0), "KB raw");
if (errors > 0) {
  console.warn("  WARN:", errors, "districts fell back to GeometryCollection (check output)");
} else {
  console.log("  Union:   all districts dissolved successfully");
}
