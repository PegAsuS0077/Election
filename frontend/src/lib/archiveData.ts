/**
 * Archive data layer — fetches the official upstream JSON, normalises it into
 * canonical ConstituencyResult[] with ALL vote counts zeroed, and caches the
 * result in sessionStorage so repeat navigation doesn't re-download ~3 MB.
 *
 * Used when RESULTS_MODE === "archive" (pre-election browsing).
 * In "live" mode the backend API is used instead (see useElectionSimulation).
 *
 * Data source priority:
 *  1. sessionStorage cache (same page session)
 *  2. Backend /api/constituencies — when VITE_API_URL is set (production with backend)
 *  3. /upstream proxy — when running under the Vite dev server
 */

import { parseUpstreamCandidates } from "./parseUpstreamData";
import type { ConstituencyResult, UpstreamRecord } from "../types";

const CACHE_KEY = "archive_constituencies_v1";
const JSON_FILE = "/JSONFiles/ElectionResultCentral2082.txt";

const API_BASE  = (import.meta.env.VITE_API_URL  as string | undefined) ?? "";
// In dev: blank → uses Vite proxy at /upstream.
// In prod without backend: set VITE_UPSTREAM_URL=https://result.election.gov.np
//   BUT note that direct browser fetches to that URL are CORS-blocked.
//   Always prefer deploying with a backend (VITE_API_URL) in production.
const _upstreamBase = (import.meta.env.VITE_UPSTREAM_URL as string | undefined) ?? "";
const UPSTREAM_URL = _upstreamBase
  ? `${_upstreamBase.replace(/\/$/, "")}${JSON_FILE}`
  : `/upstream${JSON_FILE}`;

// ── Fetch helpers ─────────────────────────────────────────────────────────────

async function fetchFromBackend(): Promise<ConstituencyResult[]> {
  const res = await fetch(`${API_BASE}/api/constituencies`);
  if (!res.ok) throw new Error(`Backend fetch failed: ${res.status}`);
  return res.json() as Promise<ConstituencyResult[]>;
}

async function fetchFromUpstream(): Promise<ConstituencyResult[]> {
  const res = await fetch(UPSTREAM_URL);
  if (!res.ok) throw new Error(`Upstream fetch failed: ${res.status}`);
  let text = await res.text();
  // Strip UTF-8 BOM (0xFEFF) present in the official file
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  const parsed: unknown = JSON.parse(text);
  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error("Upstream returned empty or non-array data");
  }
  return parseUpstreamCandidates(parsed as UpstreamRecord[]);
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
 * session.  Throws if all sources are unreachable and no cache exists.
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
      let constituencies: ConstituencyResult[];

      if (API_BASE) {
        // Production with backend: fetch pre-parsed data from our own API.
        // Backend has CORS headers set and serves same canonical shape.
        // Falls back to upstream if backend is unreachable (e.g. sleeping on free tier).
        try {
          constituencies = await fetchFromBackend();
        } catch {
          constituencies = await fetchFromUpstream();
        }
      } else {
        // Dev (Vite proxy) or production with VITE_UPSTREAM_URL set.
        constituencies = await fetchFromUpstream();
      }

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
