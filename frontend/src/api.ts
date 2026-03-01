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
  const res = await fetch(`${CDN_BASE}/constituencies.json`);
  if (!res.ok) throw new Error(`GET constituencies.json → ${res.status}`);
  return res.json() as Promise<ConstituencyResult[]>;
}

/** Returns null if CDN URL is not configured. */
export async function fetchParties(): Promise<PartyInfo[] | null> {
  if (!CDN_BASE) return null;
  const res = await fetch(`${CDN_BASE}/parties.json`);
  if (!res.ok) return null;
  return res.json() as Promise<PartyInfo[]>;
}
