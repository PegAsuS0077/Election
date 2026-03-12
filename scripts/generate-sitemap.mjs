/**
 * generate-sitemap.mjs
 *
 * Generates frontend/public/sitemap.xml with:
 *   - All static routes
 *   - All 3,406 candidate pages (/candidate/:id)
 *
 * Run from repo root:
 *   node scripts/generate-sitemap.mjs
 */

import { readdirSync, readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CANDIDATES_JSON = join(__dirname, "../frontend/public/neu_candidates.json");
const OUT             = join(__dirname, "../frontend/public/sitemap.xml");
const NEWS_DIR        = join(__dirname, "../frontend/src/content/posts");

const BASE    = "https://nepalvotes.live";
const TODAY   = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

// ── Static pages ──────────────────────────────────────────────────────────────
const STATIC = [
  { loc: "/",               changefreq: "always",  priority: "1.0" },
  { loc: "/analysis",       changefreq: "weekly",  priority: "0.9" },
  { loc: "/news",           changefreq: "weekly",  priority: "0.9" },
  { loc: "/explore",        changefreq: "weekly",  priority: "0.8" },
  { loc: "/map",            changefreq: "weekly",  priority: "0.8" },
  { loc: "/parties",        changefreq: "weekly",  priority: "0.8" },
  { loc: "/candidates",     changefreq: "weekly",  priority: "0.8" },
  { loc: "/about",          changefreq: "monthly", priority: "0.5" },
  { loc: "/privacy-policy", changefreq: "monthly", priority: "0.4" },
  { loc: "/contact",        changefreq: "monthly", priority: "0.4" },
];
const NEWS_POSTS = readdirSync(NEWS_DIR)
  .filter((file) => file.endsWith(".md"))
  .map((file) => file.replace(/\.md$/, ""))
  .sort();

// ── Load candidate IDs ────────────────────────────────────────────────────────
const candidates = JSON.parse(readFileSync(CANDIDATES_JSON, "utf8"));

// ── Build XML ─────────────────────────────────────────────────────────────────
function urlEntry({ loc, changefreq, priority, lastmod = TODAY }) {
  return [
    "  <url>",
    `    <loc>${BASE}${loc}</loc>`,
    `    <lastmod>${lastmod}</lastmod>`,
    `    <changefreq>${changefreq}</changefreq>`,
    `    <priority>${priority}</priority>`,
    "  </url>",
  ].join("\n");
}

const staticEntries  = STATIC.map((p) => urlEntry(p));
const newsEntries = NEWS_POSTS.map((slug) =>
  urlEntry({ loc: `/news/${slug}`, changefreq: "monthly", priority: "0.7" })
);
const candidateEntries = candidates.map((c) =>
  urlEntry({ loc: `/candidate/${c.id}`, changefreq: "daily", priority: "0.6" })
);

const xml = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ...staticEntries,
  ...newsEntries,
  ...candidateEntries,
  "</urlset>",
].join("\n");

writeFileSync(OUT, xml, "utf8");
console.log(`✓ sitemap.xml written → ${OUT}`);
console.log(`  Static pages : ${staticEntries.length}`);
console.log(`  News pages   : ${newsEntries.length}`);
console.log(`  Candidate pages: ${candidateEntries.length}`);
console.log(`  Total URLs   : ${staticEntries.length + newsEntries.length + candidateEntries.length}`);
console.log(`  File size    : ${(xml.length / 1024).toFixed(1)} KB`);
