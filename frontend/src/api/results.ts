import { constituencyResults, mockSnapshot } from "../mockData";
import type { ConstituencyResult } from "../mockData";

const API_BASE = import.meta.env.VITE_API_URL ?? "";

export async function fetchConstituencies(): Promise<ConstituencyResult[]> {
  if (!API_BASE) {
    // No API configured — return mock data
    return Promise.resolve(constituencyResults);
  }
  const res = await fetch(`${API_BASE}/api/constituencies`);
  if (!res.ok) throw new Error(`GET /api/constituencies → ${res.status}`);
  return res.json();
}

export async function fetchSnapshot(): Promise<typeof mockSnapshot> {
  if (!API_BASE) {
    return Promise.resolve(mockSnapshot);
  }
  const res = await fetch(`${API_BASE}/api/snapshot`);
  if (!res.ok) throw new Error(`GET /api/snapshot → ${res.status}`);
  return res.json();
}
