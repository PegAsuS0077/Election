/**
 * Shared types and fetch helpers for the live backend API.
 * Mirrors the data shapes from backend/database.py and scraper.py.
 *
 * All functions return null when no backend is configured (VITE_API_URL is
 * unset/blank), so callers must handle null gracefully.
 */

export type {
  Province,
  ConstituencyResult,
  Candidate,
  Snapshot,
  SeatTally,
  WsMessage,
  PartyInfo,
} from "./types";

import type { ConstituencyResult, Snapshot, PartyInfo, Candidate } from "./types";

const API_BASE = import.meta.env.VITE_API_URL ?? "";

/** Returns null if no backend is configured. */
export async function fetchSnapshot(): Promise<Snapshot | null> {
  if (!API_BASE) return null;
  const res = await fetch(`${API_BASE}/api/snapshot`);
  if (!res.ok) throw new Error(`GET /api/snapshot → ${res.status}`);
  return res.json() as Promise<Snapshot>;
}

/** Returns null if no backend is configured. */
export async function fetchConstituencies(): Promise<ConstituencyResult[] | null> {
  if (!API_BASE) return null;
  const res = await fetch(`${API_BASE}/api/constituencies`);
  if (!res.ok) throw new Error(`GET /api/constituencies → ${res.status}`);
  return res.json() as Promise<ConstituencyResult[]>;
}

/** Returns null if no backend is configured. */
export async function fetchConstituency(code: string): Promise<ConstituencyResult | null> {
  if (!API_BASE) return null;
  const res = await fetch(`${API_BASE}/api/constituencies/${encodeURIComponent(code)}`);
  if (!res.ok) return null;
  return res.json() as Promise<ConstituencyResult>;
}

/** Returns null if no backend is configured. */
export async function fetchParties(): Promise<PartyInfo[] | null> {
  if (!API_BASE) return null;
  const res = await fetch(`${API_BASE}/api/parties`);
  if (!res.ok) return null;
  return res.json() as Promise<PartyInfo[]>;
}

/** Returns null if no backend is configured. */
export async function fetchCandidate(candidateId: number): Promise<Candidate | null> {
  if (!API_BASE) return null;
  const res = await fetch(`${API_BASE}/api/candidates/${candidateId}`);
  if (!res.ok) return null;
  return res.json() as Promise<Candidate>;
}

export interface CandidateQuery {
  partyId?: string;
  constituencyId?: string;
  q?: string;
  page?: number;
}

/** Returns null if no backend is configured. */
export async function fetchCandidates(
  query: CandidateQuery = {},
): Promise<{ candidates: Candidate[]; total: number; page: number } | null> {
  if (!API_BASE) return null;
  const params = new URLSearchParams();
  if (query.partyId)        params.set("partyId", query.partyId);
  if (query.constituencyId) params.set("constituencyId", query.constituencyId);
  if (query.q)              params.set("q", query.q);
  if (query.page)           params.set("page", String(query.page));
  const res = await fetch(`${API_BASE}/api/candidates?${params.toString()}`);
  if (!res.ok) return null;
  return res.json() as Promise<{ candidates: Candidate[]; total: number; page: number }>;
}

/** Returns null if WebSocket is not available. */
export function getWsUrl(): string | null {
  if (!API_BASE) return null;
  const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
  try {
    const host = new URL(API_BASE).host;
    return `${proto}//${host}/ws`;
  } catch {
    return `${proto}//${window.location.host}/ws`;
  }
}
