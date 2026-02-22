// Shared types and fetch helpers for the live backend API.
// These mirror the data shapes from backend/database.py and scraper.py.

export type PartyKey = "NC" | "CPN-UML" | "NCP" | "RSP" | "OTH";

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
  province: string;
  district: string;
  code: string;
  name: string;
  status: "DECLARED" | "COUNTING";
  lastUpdated: string;
  candidates: Candidate[];
};

export type WsMessage =
  | { type: "snapshot"; data: Snapshot }
  | { type: "constituencies"; data: ConstituencyResult[] };

export async function fetchSnapshot(): Promise<Snapshot> {
  const res = await fetch("/api/snapshot");
  if (!res.ok) throw new Error(`GET /api/snapshot → ${res.status}`);
  return res.json();
}

export async function fetchConstituencies(): Promise<ConstituencyResult[]> {
  const res = await fetch("/api/constituencies");
  if (!res.ok) throw new Error(`GET /api/constituencies → ${res.status}`);
  return res.json();
}
