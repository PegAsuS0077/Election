// Reads nepal-geojson district data and outputs SVG path strings
// projected to viewBox 0 0 900 450 with padding.
// Run: node scripts/project-districts.cjs > scripts/district-paths.json

const ng = require("nepal-geojson");

const fc = ng.districts();

// Geographic bounds of Nepal
const MIN_LNG = 80.050926;
const MAX_LNG = 88.204673;
const MIN_LAT = 26.348379;
const MAX_LAT = 30.47146;

const VIEW_W = 900;
const VIEW_H = 450;
const PAD = 10; // px padding on each side

function project(lng, lat) {
  const x = PAD + ((lng - MIN_LNG) / (MAX_LNG - MIN_LNG)) * (VIEW_W - PAD * 2);
  // lat is inverted (SVG y increases downward)
  const y = PAD + ((MAX_LAT - lat) / (MAX_LAT - MIN_LAT)) * (VIEW_H - PAD * 2);
  return [+x.toFixed(1), +y.toFixed(1)];
}

function ringToPath(ring) {
  const pts = ring.map(([lng, lat]) => project(lng, lat));
  return "M " + pts.map(([x, y]) => `${x},${y}`).join(" L ") + " Z";
}

// Province number → name mapping
const PROVINCE_MAP = {
  1: "Koshi",
  2: "Madhesh",
  3: "Bagmati",
  4: "Gandaki",
  5: "Lumbini",
  6: "Karnali",
  7: "Sudurpashchim",
};

const output = {};

for (const feature of fc.features) {
  const name = feature.properties.DISTRICT;
  const provNo = feature.properties.PROVINCE;
  const province = PROVINCE_MAP[provNo] || `Province${provNo}`;
  const geom = feature.geometry;

  let d;
  if (geom.type === "Polygon") {
    // Use outer ring only (index 0)
    d = ringToPath(geom.coordinates[0]);
  } else if (geom.type === "MultiPolygon") {
    // Use largest ring
    let largest = geom.coordinates[0][0];
    for (const poly of geom.coordinates) {
      if (poly[0].length > largest.length) largest = poly[0];
    }
    d = ringToPath(largest);
  } else {
    continue;
  }

  // Compute centroid of bounding box for label placement
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  const ring = geom.type === "Polygon" ? geom.coordinates[0] : geom.coordinates[0][0];
  for (const [lng, lat] of ring) {
    const [x, y] = project(lng, lat);
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  const labelX = +((minX + maxX) / 2).toFixed(1);
  const labelY = +((minY + maxY) / 2).toFixed(1);

  output[name] = { province, d, labelX, labelY };
}

process.stdout.write(JSON.stringify(output, null, 2));
