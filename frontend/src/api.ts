// Shared types and fetch helpers for the live backend API.
// These mirror the data shapes from backend/database.py and scraper.py.
//
// fetchSnapshot() and fetchConstituencies() return null when no backend is
// configured (VITE_API_URL is unset/blank), so callers must handle null and
// fall back to mock data.  This prevents 404 errors on static deployments.

import type { Province, PartyKey } from "./mockData";
export type { Province, PartyKey };

export type SeatTally = Record<PartyKey, { fptp: number; pr: number }>;

export type Snapshot = {
  totalSeats: number;
  declaredSeats: number;
  lastUpdated: string;
  seatTally: SeatTally;
};

export type Candidate = {
  name: string;
  party: PartyKey;
  votes: number;
};

export type ConstituencyResult = {
  province: Province;
  district: string;
  code: string;
  name: string;
  status: "DECLARED" | "COUNTING";
  lastUpdated: string;
  candidates: Candidate[];
  totalVoters: number;
  votesCast: number;
};

export type WsMessage =
  | { type: "snapshot"; data: Snapshot }
  | { type: "constituencies"; data: ConstituencyResult[] };

const API_BASE = import.meta.env.VITE_API_URL ?? "";

/** Returns null if no backend is configured. */
export async function fetchSnapshot(): Promise<Snapshot | null> {
  if (!API_BASE) return null;
  const res = await fetch(`${API_BASE}/api/snapshot`);
  if (!res.ok) throw new Error(`GET /api/snapshot → ${res.status}`);
  return res.json();
}

/** Returns null if no backend is configured. */
export async function fetchConstituencies(): Promise<ConstituencyResult[] | null> {
  if (!API_BASE) return null;
  const res = await fetch(`${API_BASE}/api/constituencies`);
  if (!res.ok) throw new Error(`GET /api/constituencies → ${res.status}`);
  return res.json();
}

/** Returns false if no backend is configured (no WS to connect to). */
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
