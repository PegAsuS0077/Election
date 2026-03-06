/**
 * API layer for live mode — reads static JSON files from the R2 CDN.
 *
 * In live mode (VITE_RESULTS_MODE=live) the Render background worker writes:
 *   snapshot.json       — seat tally + declared count
 *   constituencies.json — all 165 constituency results
 *   parties.json        — per-party seat/vote aggregates
 *
 * to a Cloudflare R2 bucket.  The frontend fetches those files directly
 * from the public CDN URL (VITE_CDN_URL).
 *
 * No backend server. No WebSocket. No VITE_API_URL.
 */

export type {
  Province,
  ConstituencyResult,
  Candidate,
  Snapshot,
  SeatTally,
  PartyInfo,
} from "./types";

import type { ConstituencyResult, Snapshot, PartyInfo } from "./types";

const CDN_BASE = (import.meta.env.VITE_CDN_URL as string | undefined) ?? "";
const CONSTITUENCIES_FALLBACK_FILE = "constituencies.last_good.json";
const LAST_GOOD_CONSTITUENCIES_KEY = "nv_last_good_constituencies_v1";

export type PrPartiesSnapshot = {
  lastUpdated: string;
  totalPrVotes: number;
  parties: Array<{
    partyId: string;
    partyName: string;
    prVotes: number;
    voteShare: number;
  }>;
  sourceFile: string;
};

function isConstituencyArray(data: unknown): data is ConstituencyResult[] {
  if (!Array.isArray(data) || data.length === 0) return false;
  const first = data[0] as Record<string, unknown>;
  return typeof first?.code === "string" && Array.isArray(first?.candidates);
}

function readLastGoodConstituencies(): ConstituencyResult[] | null {
  try {
    const raw = localStorage.getItem(LAST_GOOD_CONSTITUENCIES_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isConstituencyArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function writeLastGoodConstituencies(data: ConstituencyResult[]): void {
  try {
    localStorage.setItem(LAST_GOOD_CONSTITUENCIES_KEY, JSON.stringify(data));
  } catch {
    // storage unavailable or quota exceeded — non-fatal
  }
}

async function fetchConstituenciesFromUrl(url: string): Promise<ConstituencyResult[]> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`GET ${url} → ${res.status}`);
  const payload: unknown = await res.json();
  if (!isConstituencyArray(payload)) throw new Error(`Invalid constituencies payload: ${url}`);
  return payload;
}

/** Returns null if CDN URL is not configured. */
export async function fetchSnapshot(): Promise<Snapshot | null> {
  if (!CDN_BASE) return null;
  const res = await fetch(`${CDN_BASE}/snapshot.json`);
  if (!res.ok) throw new Error(`GET snapshot.json → ${res.status}`);
  return res.json() as Promise<Snapshot>;
}

/** Returns null if CDN URL is not configured. */
export async function fetchConstituencies(): Promise<ConstituencyResult[] | null> {
  if (!CDN_BASE) return null;
  try {
    const primary = await fetchConstituenciesFromUrl(`${CDN_BASE}/constituencies.json`);
    writeLastGoodConstituencies(primary);
    return primary;
  } catch (primaryErr) {
    console.warn("[api] primary constituencies fetch failed, trying backups", primaryErr);
  }

  try {
    const r2Fallback = await fetchConstituenciesFromUrl(`${CDN_BASE}/${CONSTITUENCIES_FALLBACK_FILE}`);
    writeLastGoodConstituencies(r2Fallback);
    return r2Fallback;
  } catch (fallbackErr) {
    console.warn("[api] R2 fallback constituencies fetch failed", fallbackErr);
  }

  const cached = readLastGoodConstituencies();
  if (cached) {
    console.warn("[api] using browser-cached last known good constituencies");
    return cached;
  }

  throw new Error("Unable to fetch constituencies from primary, R2 fallback, or browser cache");
}

/** Returns null if CDN URL is not configured. */
export async function fetchParties(): Promise<PartyInfo[] | null> {
  if (!CDN_BASE) return null;
  const res = await fetch(`${CDN_BASE}/parties.json`);
  if (!res.ok) return null;
  return res.json() as Promise<PartyInfo[]>;
}

/** Optional PR feed. Returns null when unavailable. */
export async function fetchPrParties(): Promise<PrPartiesSnapshot | null> {
  if (!CDN_BASE) return null;
  const res = await fetch(`${CDN_BASE}/pr_parties.json`);
  if (!res.ok) return null;
  return res.json() as Promise<PrPartiesSnapshot>;
}
