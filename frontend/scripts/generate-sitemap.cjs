#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const SITE_URL = "https://nepalvotes.live";
const ROOT = path.resolve(__dirname, "..");
const PUBLIC_DIR = path.join(ROOT, "public");
const SEED_PATH = path.join(PUBLIC_DIR, "constituencies.seed.json");
const OUT_PATH = path.join(PUBLIC_DIR, "sitemap.xml");

function slugify(value) {
  return String(value)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function xmlEscape(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return new Date().toISOString().slice(0, 10);
  return date.toISOString().slice(0, 10);
}

function absoluteUrl(pathname) {
  return new URL(pathname, SITE_URL).toString();
}

function pushUrl(map, pathname, changefreq, priority, lastmod) {
  if (!pathname || map.has(pathname)) return;
  map.set(pathname, { pathname, changefreq, priority, lastmod });
}

function build() {
  const raw = fs.readFileSync(SEED_PATH, "utf8");
  const constituencies = JSON.parse(raw);
  const urlMap = new Map();

  const staticRoutes = [
    { path: "/", changefreq: "hourly", priority: "1.0" },
    { path: "/explore", changefreq: "hourly", priority: "0.9" },
    { path: "/map", changefreq: "hourly", priority: "0.9" },
    { path: "/parties", changefreq: "hourly", priority: "0.8" },
    { path: "/candidates", changefreq: "hourly", priority: "0.8" },
    { path: "/about", changefreq: "monthly", priority: "0.5" },
    { path: "/privacy-policy", changefreq: "monthly", priority: "0.4" },
    { path: "/contact", changefreq: "monthly", priority: "0.4" },
  ];

  const latestTimestamp = constituencies.reduce((maxTs, seat) => {
    const ts = Date.parse(seat.lastUpdated || "");
    return Number.isFinite(ts) ? Math.max(maxTs, ts) : maxTs;
  }, 0);
  const lastmod = formatDate(latestTimestamp || Date.now());

  for (const route of staticRoutes) {
    pushUrl(urlMap, route.path, route.changefreq, route.priority, lastmod);
  }

  const candidateMap = new Map();
  const partyIds = new Set();

  for (const seat of constituencies) {
    const constituencySlug = encodeURIComponent(String(seat.name || "").replace(/\s+/g, "-"));
    pushUrl(urlMap, `/constituency/${constituencySlug}`, "hourly", "0.7", lastmod);

    for (const c of seat.candidates || []) {
      if (c.partyId) partyIds.add(String(c.partyId));
      if (!candidateMap.has(c.candidateId)) {
        candidateMap.set(c.candidateId, c.name || "");
      }
    }
  }

  const sortedPartyIds = Array.from(partyIds).sort((a, b) => a.localeCompare(b));
  for (const partyId of sortedPartyIds) {
    const safePartyId = encodeURIComponent(partyId);
    pushUrl(urlMap, `/party/${safePartyId}`, "daily", "0.7", lastmod);
    pushUrl(urlMap, `/party/${safePartyId}/constituencies`, "daily", "0.6", lastmod);
  }

  const sortedCandidates = Array.from(candidateMap.entries()).sort((a, b) => a[0] - b[0]);
  for (const [id, rawName] of sortedCandidates) {
    const nameSlug = slugify(rawName);
    const candidatePath = nameSlug
      ? `/candidate/${id}-${nameSlug}`
      : `/candidate/${id}`;
    pushUrl(urlMap, candidatePath, "daily", "0.6", lastmod);
  }

  const entries = Array.from(urlMap.values());
  const lines = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ];

  for (const entry of entries) {
    lines.push("  <url>");
    lines.push(`    <loc>${xmlEscape(absoluteUrl(entry.pathname))}</loc>`);
    lines.push(`    <lastmod>${entry.lastmod}</lastmod>`);
    lines.push(`    <changefreq>${entry.changefreq}</changefreq>`);
    lines.push(`    <priority>${entry.priority}</priority>`);
    lines.push("  </url>");
  }

  lines.push("</urlset>");
  fs.writeFileSync(OUT_PATH, `${lines.join("\n")}\n`, "utf8");

  console.log(
    `[sitemap] wrote ${entries.length} URLs ` +
      `(static=${staticRoutes.length}, constituencies=${constituencies.length}, parties=${sortedPartyIds.length}, candidates=${sortedCandidates.length})`
  );
}

build();
