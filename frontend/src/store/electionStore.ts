import { create } from "zustand";
import type { ConstituencyResult, Province, SeatTally, SeatEntry } from "../types";
import type { Lang } from "../i18n";
import { buildRegistry, getParties } from "../lib/partyRegistry";

type SortKey = "margin" | "province" | "alpha" | "status";
type ViewMode = "table" | "map";

// ── Seat tally derivation ─────────────────────────────────────────────────────

function emptyTally(partyIds: string[]): SeatTally {
  return Object.fromEntries(partyIds.map((k) => [k, { fptp: 0, pr: 0 }]));
}

function deriveSeatTally(results: ConstituencyResult[]): SeatTally {
  // Collect all partyIds present in results
  const partyIds = Array.from(
    new Set(results.flatMap((r) => r.candidates.map((c) => c.partyId)))
  );
  const tally = emptyTally(partyIds);

  // FPTP: winner of each declared constituency gets +1
  for (const r of results) {
    if (r.status !== "DECLARED") continue;
    const declared = r.candidates.filter((c) => c.isWinner);
    const winner =
      declared.length > 0
        ? declared[0]
        : r.candidates.reduce((a, b) => (a.votes > b.votes ? a : b));
    if (tally[winner.partyId]) {
      (tally[winner.partyId] as SeatEntry).fptp += 1;
    } else {
      tally[winner.partyId] = { fptp: 1, pr: 0 };
    }
  }

  // PR: distribute 110 seats proportionally by total vote share
  let totalVotes = 0;
  const voteShare: Record<string, number> = {};
  for (const r of results) {
    for (const c of r.candidates) {
      voteShare[c.partyId] = (voteShare[c.partyId] ?? 0) + c.votes;
      totalVotes += c.votes;
    }
  }
  const PR_SEATS = 110;
  if (totalVotes > 0) {
    for (const pid of partyIds) {
      if (tally[pid]) {
        (tally[pid] as SeatEntry).pr = Math.round(
          ((voteShare[pid] ?? 0) / totalVotes) * PR_SEATS
        );
      }
    }
  }
  return tally;
}

// ── Store interface ───────────────────────────────────────────────────────────

interface ElectionStore {
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

  setResults: (r: ConstituencyResult[]) => void;
  setSelectedProvince: (p: "All" | Province) => void;
  toggleDark: () => void;
  setIsLoading: (v: boolean) => void;
  setViewMode: (v: ViewMode) => void;
  setSortBy: (s: SortKey) => void;
  resetBaseline: () => void;
  toggleLang: () => void;
}

const BASELINE_KEY = "election_baseline_tally_v2";

function migrateBaseline(stored: Partial<SeatTally>, current: SeatTally): SeatTally {
  const result = { ...current };
  for (const key of Object.keys(current)) {
    if (stored[key]) result[key] = stored[key] as SeatEntry;
  }
  return result;
}

function loadOrCreateBaseline(currentTally: SeatTally): SeatTally {
  try {
    const raw = localStorage.getItem(BASELINE_KEY);
    if (raw) {
      const stored = JSON.parse(raw) as Partial<SeatTally>;
      const migrated = migrateBaseline(stored, currentTally);
      localStorage.setItem(BASELINE_KEY, JSON.stringify(migrated));
      return migrated;
    }
  } catch {
    // corrupted — fall through and overwrite
  }
  localStorage.setItem(BASELINE_KEY, JSON.stringify(currentTally));
  return currentTally;
}

// Start with empty results — data is loaded asynchronously by useElectionSimulation
const initialResults: ConstituencyResult[] = [];
const initialTally: SeatTally = {};
const initialBaseline = loadOrCreateBaseline(initialTally);

export const useElectionStore = create<ElectionStore>((set) => ({
  results:          initialResults,
  seatTally:        initialTally,
  baselineTally:    initialBaseline,
  declaredSeats:    0,
  selectedProvince: "All",
  dark:             localStorage.getItem("theme") === "dark",
  isLoading:        true,
  viewMode:         "table",
  sortBy:           "status",
  lang:             (localStorage.getItem("lang") as Lang | null) ?? "en",

  setResults: (results) => {
    // Rebuild party registry whenever new data arrives
    buildRegistry(results);
    set({
      results,
      seatTally:     deriveSeatTally(results),
      declaredSeats: results.filter((r) => r.status === "DECLARED").length,
    });
  },

  setSelectedProvince: (selectedProvince) => set({ selectedProvince }),

  toggleDark: () =>
    set((state) => {
      const next = !state.dark;
      document.documentElement.classList.toggle("dark", next);
      localStorage.setItem("theme", next ? "dark" : "light");
      return { dark: next };
    }),

  setIsLoading: (isLoading) => set({ isLoading }),
  setViewMode:  (viewMode)  => set({ viewMode }),
  setSortBy:    (sortBy)    => set({ sortBy }),

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

// Re-export for consumers that need party info
export { getParties };
