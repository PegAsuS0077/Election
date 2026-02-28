/**
 * Archive data layer — fetches the official upstream JSON, normalises it into
 * canonical ConstituencyResult[] with ALL vote counts zeroed, and caches the
 * result in sessionStorage so repeat navigation doesn't re-download ~3 MB.
 *
 * Used when RESULTS_MODE === "archive" (pre-election browsing).
 * In "live" mode the backend API is used instead (see useElectionSimulation).
 */

import { parseUpstreamCandidates } from "./parseUpstreamData";
import type { ConstituencyResult, UpstreamRecord } from "../types";

const CACHE_KEY = "archive_constituencies_v1";
const UPSTREAM_URL =
  "https://result.election.gov.np/JSONFiles/ElectionResultCentral2082.txt";
const CORS_PROXY = "https://corsproxy.io/?url=";

// ── Fetch helpers ─────────────────────────────────────────────────────────────

async function fetchText(url: string): Promise<string> {
  // Try direct (works when backend proxy or server sets CORS headers)
  try {
    const res = await fetch(url, { mode: "cors" });
    if (res.ok) return res.text();
  } catch {
    // CORS blocked — fall through to proxy
  }
  // CORS proxy fallback
  const proxied = await fetch(`${CORS_PROXY}${encodeURIComponent(url)}`);
  if (!proxied.ok) throw new Error(`Upstream fetch failed: ${proxied.status}`);
  return proxied.text();
}

async function fetchUpstreamRecords(): Promise<UpstreamRecord[]> {
  let text = await fetchText(UPSTREAM_URL);
  // Strip UTF-8 BOM (0xFEFF) present in the official file
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  const parsed: unknown = JSON.parse(text);
  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error("Upstream returned empty or non-array data");
  }
  return parsed as UpstreamRecord[];
}

// ── Vote zeroing ──────────────────────────────────────────────────────────────

/**
 * Forces all vote counts to 0 and all statuses to PENDING.
 * This is the archive-mode guarantee: the UI renders candidate/party/
 * constituency information correctly but shows no vote data.
 */
function zeroVotes(constituencies: ConstituencyResult[]): ConstituencyResult[] {
  return constituencies.map((c) => ({
    ...c,
    status: "PENDING" as const,
    votesCast: 0,
    lastUpdated: new Date().toISOString(),
    candidates: c.candidates.map((cand) => ({
      ...cand,
      votes: 0,
      isWinner: false,
    })),
  }));
}

// ── SessionStorage cache ──────────────────────────────────────────────────────

function readCache(): ConstituencyResult[] | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return null;
    return parsed as ConstituencyResult[];
  } catch {
    return null;
  }
}

function writeCache(data: ConstituencyResult[]): void {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch {
    // sessionStorage quota exceeded — non-fatal
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

let _inFlight: Promise<ConstituencyResult[]> | null = null;

/**
 * Loads the full official candidate list, normalises it into
 * ConstituencyResult[] with all votes zeroed, and caches the result.
 *
 * Returns from sessionStorage cache on subsequent calls within the same page
 * session.  Throws if upstream is unreachable and no cache exists.
 *
 * @param forceRefresh  Bypass cache and re-fetch from upstream.
 */
export async function loadArchiveData(
  forceRefresh = false,
): Promise<ConstituencyResult[]> {
  if (!forceRefresh) {
    const cached = readCache();
    if (cached) return cached;
  }

  // De-duplicate concurrent calls (React StrictMode double-invokes effects)
  if (_inFlight) return _inFlight;

  _inFlight = (async () => {
    try {
      const records = await fetchUpstreamRecords();
      const constituencies = parseUpstreamCandidates(records);
      const zeroed = zeroVotes(constituencies);
      writeCache(zeroed);
      return zeroed;
    } finally {
      _inFlight = null;
    }
  })();

  return _inFlight;
}

/**
 * Clears the sessionStorage cache (useful in AdminPanel / dev tooling).
 */
export function clearArchiveCache(): void {
  try {
    sessionStorage.removeItem(CACHE_KEY);
  } catch {
    // ignore
  }
}
