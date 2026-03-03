/**
 * fetch-voter-rolls.mjs
 *
 * One-time script to scrape constituency voter registration counts from
 * election.nepsebajar.com and write them to frontend/public/voter_rolls.json.
 *
 * The resulting file maps constituency composite key → total registered voters.
 * The composite key matches the format used in constituencies.json:
 *   "${STATE_ID}-${DistrictName}-${SCConstID}"
 *
 * Usage (from worker/ directory):
 *   node fetch-voter-rolls.mjs
 *
 * Output: frontend/public/voter_rolls.json
 *
 * Re-run if the Election Commission updates the voter roll before election day.
 * The last official voter list was published on 2025-12-27.
 */

import { writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_PATH = join(__dirname, "../frontend/public/voter_rolls.json");

const UPSTREAM_URL =
  "https://result.election.gov.np/JSONFiles/ElectionResultCentral2082.txt";

// nepsebajar constituency IDs go from 1 to some max. We probe 1–200.
const MAX_ID = 200;
const BASE = "https://election.nepsebajar.com/en/pratinidhi";

// Extract total voters from the page HTML
function parseTotalVoters(html) {
  // Looks for patterns like "81,893 registered voters" or "81893 registered voters"
  const m = html.match(/([0-9,]+)\s+registered voters/i);
  if (m) return parseInt(m[1].replace(/,/g, ""), 10);
  // Fallback: look for "Total.*?([0-9,]+)" near "voter"
  const m2 = html.match(/total[^0-9]{0,50}([0-9][0-9,]+)/i);
  if (m2) return parseInt(m2[1].replace(/,/g, ""), 10);
  return null;
}

// Extract constituency name from the page
function parseConstituencyName(html) {
  const m = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
  if (m) return m[1].trim();
  const m2 = html.match(/<title>([^<|]+)/i);
  if (m2) return m2[1].trim();
  return null;
}

// Fetch upstream records to build the code→key mapping
async function loadUpstreamKeys() {
  console.log("[fetch] loading upstream JSON to build constituency key map...");
  const res = await fetch(UPSTREAM_URL);
  if (!res.ok) throw new Error(`Upstream failed: ${res.status}`);
  let text = await res.text();
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  const records = JSON.parse(text);

  // Build: "DistrictName-SCConstID" → "${STATE_ID}-${DistrictName}-${SCConstID}"
  const map = new Map();
  for (const r of records) {
    const key = `${r.STATE_ID}-${r.DistrictName}-${r.SCConstID}`;
    const shortKey = `${r.DistrictName}-${r.SCConstID}`;
    if (!map.has(shortKey)) map.set(shortKey, key);
  }
  console.log(`[fetch] found ${map.size} unique constituencies`);
  return map;
}

async function main() {
  const keyMap = await loadUpstreamKeys();

  // Probe nepsebajar IDs 1..MAX_ID
  console.log(`[fetch] probing nepsebajar IDs 1..${MAX_ID} (with 200ms delay between requests)...`);

  const results = {}; // key → totalVoters
  const nameIndex = {}; // nepsebajar name → totalVoters (for manual review)

  let found = 0;
  for (let id = 1; id <= MAX_ID; id++) {
    try {
      const url = `${BASE}/${id}/`;
      const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 Nepal Election Research" } });
      if (!res.ok) {
        if (res.status === 404) break; // IDs are sequential, stop at first 404
        console.warn(`[fetch] ID ${id}: HTTP ${res.status}, skipping`);
        continue;
      }
      const html = await res.text();
      const totalVoters = parseTotalVoters(html);
      const name = parseConstituencyName(html);

      if (totalVoters && name) {
        nameIndex[name] = totalVoters;
        found++;
        if (id % 20 === 0) {
          console.log(`[fetch] ID ${id}: ${name} → ${totalVoters.toLocaleString()} voters`);
        }
      } else {
        console.warn(`[fetch] ID ${id}: could not parse voters (name="${name}")`);
      }

      // Polite delay
      await new Promise(r => setTimeout(r, 200));
    } catch (err) {
      console.warn(`[fetch] ID ${id}: error — ${err.message}`);
    }
  }

  console.log(`[fetch] found voter counts for ${found} constituencies`);
  console.log("[fetch] NOTE: nepsebajar names must be matched to upstream keys manually.");
  console.log("[fetch] Writing voter_rolls.json with name-based keys for now...");

  // Write as-is with English names — requires manual reconciliation with upstream keys
  // TODO: build a proper name→key bridge once we have the full constituency list
  writeFileSync(OUT_PATH, JSON.stringify({ _note: "Keyed by nepsebajar constituency name. Needs reconciliation with upstream composite keys.", voters: nameIndex }, null, 2));
  console.log(`[fetch] wrote ${OUT_PATH}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
