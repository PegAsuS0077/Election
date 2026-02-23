import { create } from "zustand";
import { constituencyResults } from "../mockData";
import type { ConstituencyResult, Province, PartyKey } from "../mockData";
import type { Lang } from "../i18n";

type SortKey = "margin" | "province" | "alpha" | "status";
type ViewMode = "table" | "map";

export type SeatTally = Record<PartyKey, { fptp: number; pr: number }>;

function deriveSeatTally(results: ConstituencyResult[]): SeatTally {
  const tally: SeatTally = {
    NC: { fptp: 0, pr: 0 },
    "CPN-UML": { fptp: 0, pr: 0 },
    NCP: { fptp: 0, pr: 0 },
    RSP: { fptp: 0, pr: 0 },
    RPP: { fptp: 0, pr: 0 },
    JSP: { fptp: 0, pr: 0 },
    IND: { fptp: 0, pr: 0 },
    OTH: { fptp: 0, pr: 0 },
  };
  for (const r of results) {
    if (r.status !== "DECLARED") continue;
    const winner = r.candidates.reduce((a, b) => (a.votes > b.votes ? a : b));
    tally[winner.party].fptp += 1;
  }
  // PR seats are fixed allocation (110 seats across parties) — not derived from FPTP winners
  // Distribute PR proportional to FPTP vote share across all results
  const voteShare: Record<PartyKey, number> = {
    NC: 0, "CPN-UML": 0, NCP: 0, RSP: 0, RPP: 0, JSP: 0, IND: 0, OTH: 0,
  };
  let totalVotes = 0;
  for (const r of results) {
    for (const c of r.candidates) {
      voteShare[c.party] += c.votes;
      totalVotes += c.votes;
    }
  }
  const PR_SEATS = 110;
  if (totalVotes > 0) {
    for (const key of Object.keys(tally) as PartyKey[]) {
      tally[key].pr = Math.round((voteShare[key] / totalVotes) * PR_SEATS);
    }
  }
  return tally;
}

interface ElectionStore {
  // State
  results: ConstituencyResult[];
  seatTally: SeatTally;
  baselineTally: SeatTally;
  declaredSeats: number;
  selectedProvince: "All" | Province;
  dark: boolean;
  isLoading: boolean;
  viewMode: ViewMode;
  sortBy: SortKey;
  lang: Lang;

  // Actions
  setResults: (r: ConstituencyResult[]) => void;
  setSelectedProvince: (p: "All" | Province) => void;
  toggleDark: () => void;
  setIsLoading: (v: boolean) => void;
  setViewMode: (v: ViewMode) => void;
  setSortBy: (s: SortKey) => void;
  resetBaseline: () => void;
  toggleLang: () => void;
}

const BASELINE_KEY = "election_baseline_tally";

/** All keys that must be present in a valid SeatTally. */
const ALL_PARTY_KEYS: PartyKey[] = ["NC", "CPN-UML", "NCP", "RSP", "RPP", "JSP", "IND", "OTH"];

/**
 * Merge a stored (potentially stale/partial) tally with the current tally so
 * that every party key is always present.  New keys get { fptp: 0, pr: 0 }.
 * This prevents "Cannot read properties of undefined (reading 'fptp')" when
 * the stored baseline was saved before new party keys were added.
 */
function migrateBaseline(stored: Partial<SeatTally>, current: SeatTally): SeatTally {
  const result = { ...current };
  for (const key of ALL_PARTY_KEYS) {
    if (stored[key]) result[key] = stored[key] as { fptp: number; pr: number };
  }
  return result;
}

function loadOrCreateBaseline(currentTally: SeatTally): SeatTally {
  try {
    const raw = localStorage.getItem(BASELINE_KEY);
    if (raw) {
      const stored = JSON.parse(raw) as Partial<SeatTally>;
      const migrated = migrateBaseline(stored, currentTally);
      // Persist the migrated (complete) baseline so the next load is clean
      localStorage.setItem(BASELINE_KEY, JSON.stringify(migrated));
      return migrated;
    }
  } catch {
    // corrupted — fall through and overwrite
  }
  // First visit: persist current tally as the baseline
  localStorage.setItem(BASELINE_KEY, JSON.stringify(currentTally));
  return currentTally;
}

const initialResults = constituencyResults;
const initialTally = deriveSeatTally(initialResults);
const initialDeclared = initialResults.filter((r) => r.status === "DECLARED").length;
const initialBaseline = loadOrCreateBaseline(initialTally);

export const useElectionStore = create<ElectionStore>((set) => ({
  results: initialResults,
  seatTally: initialTally,
  baselineTally: initialBaseline,
  declaredSeats: initialDeclared,
  selectedProvince: "All",
  dark: localStorage.getItem("theme") === "dark",
  isLoading: true,
  viewMode: "table",
  sortBy: "status",
  lang: (localStorage.getItem("lang") as Lang | null) ?? "en",

  setResults: (results) =>
    set({
      results,
      seatTally: deriveSeatTally(results),
      declaredSeats: results.filter((r) => r.status === "DECLARED").length,
    }),
  setSelectedProvince: (selectedProvince) => set({ selectedProvince }),
  toggleDark: () =>
    set((state) => {
      const next = !state.dark;
      document.documentElement.classList.toggle("dark", next);
      localStorage.setItem("theme", next ? "dark" : "light");
      return { dark: next };
    }),
  setIsLoading: (isLoading) => set({ isLoading }),
  setViewMode: (viewMode) => set({ viewMode }),
  setSortBy: (sortBy) => set({ sortBy }),
  resetBaseline: () =>
    set((state) => {
      localStorage.removeItem(BASELINE_KEY);
      localStorage.setItem(BASELINE_KEY, JSON.stringify(state.seatTally));
      return { baselineTally: state.seatTally };
    }),
  toggleLang: () =>
    set((state) => {
      const next: Lang = state.lang === "en" ? "np" : "en";
      localStorage.setItem("lang", next);
      return { lang: next };
    }),
}));
