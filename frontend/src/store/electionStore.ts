import { create } from "zustand";
import type { ConstituencyResult, Province, SeatTally, SeatEntry } from "../types";
import type { Lang } from "../i18n";
import { buildRegistry, getParties } from "../lib/partyRegistry";

type SortKey = "margin" | "province" | "alpha" | "status";
type ViewMode = "table" | "map";
type PrVoteByParty = Record<string, number>;
const FORCE_DECLARED_CONSTITUENCIES = new Set(["Myagdi-1", "4-म्याग्दी-1"]);

function applyConstituencyOverrides(results: ConstituencyResult[]): ConstituencyResult[] {
  return results.map((r) => {
    if (!FORCE_DECLARED_CONSTITUENCIES.has(r.name) && !FORCE_DECLARED_CONSTITUENCIES.has(r.code)) {
      return r;
    }
    if (r.candidates.length === 0) return { ...r, status: "DECLARED" };

    const hasWinner = r.candidates.some((c) => c.isWinner);
    if (hasWinner) return { ...r, status: "DECLARED" };

    // Force a consistent declared state by marking current top vote-getter as winner.
    const top = r.candidates.reduce((a, b) => (a.votes >= b.votes ? a : b));
    return {
      ...r,
      status: "DECLARED",
      candidates: r.candidates.map((c) => ({ ...c, isWinner: c.candidateId === top.candidateId })),
    };
  });
}

// ── Seat tally derivation ─────────────────────────────────────────────────────

function emptyTally(partyIds: string[]): SeatTally {
  return Object.fromEntries(partyIds.map((k) => [k, { fptp: 0, pr: 0 }]));
}

function deriveSeatTally(results: ConstituencyResult[], prVotes: PrVoteByParty): SeatTally {
  // Collect all partyIds present in results
  const partyIds = Array.from(
    new Set([
      ...results.flatMap((r) => r.candidates.map((c) => c.partyId)),
      ...Object.keys(prVotes),
    ])
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

  // PR: only use official PR party votes feed (pr_parties.json).
  // Never estimate PR from FPTP candidate vote totals.
  let totalVotes = 0;
  const voteShare: Record<string, number> = {};
  for (const [pid, votes] of Object.entries(prVotes)) {
    voteShare[pid] = (voteShare[pid] ?? 0) + votes;
    totalVotes += votes;
  }
  const PR_SEATS = 110;
  const PR_THRESHOLD = 0.03; // 3% minimum PR vote share required for seat eligibility

  if (totalVotes > 0) {
    const eligiblePartyIds = partyIds.filter((pid) => ((voteShare[pid] ?? 0) / totalVotes) >= PR_THRESHOLD);
    const eligiblePartySet = new Set(eligiblePartyIds);
    const eligibleVotes = eligiblePartyIds.reduce((sum, pid) => sum + (voteShare[pid] ?? 0), 0);

    if (eligibleVotes > 0) {
      for (const pid of partyIds) {
        if (!tally[pid]) continue;
        if (!eligiblePartySet.has(pid)) {
          (tally[pid] as SeatEntry).pr = 0;
          continue;
        }
        (tally[pid] as SeatEntry).pr = Math.round(
          ((voteShare[pid] ?? 0) / eligibleVotes) * PR_SEATS
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
  prVoteByParty: PrVoteByParty;
  baselineTally: SeatTally;
  declaredSeats: number;
  selectedProvince: "All" | Province;
  dark: boolean;
  isLoading: boolean;
  viewMode: ViewMode;
  sortBy: SortKey;
  lang: Lang;

  setResults: (r: ConstituencyResult[]) => void;
  /**
   * Merges only dynamic fields (votes, isWinner, status, votesCast,
   * lastUpdated) from `incoming` into the existing results.
   * Static fields (names, party, biographical data) are preserved unchanged.
   * Matched by constituency `code`.
   */
  mergeResults: (incoming: ConstituencyResult[]) => void;
  setPrVotes: (votes: PrVoteByParty) => void;
  setSelectedProvince: (p: "All" | Province) => void;
  toggleDark: () => void;
  setIsLoading: (v: boolean) => void;
  setViewMode: (v: ViewMode) => void;
  setSortBy: (s: SortKey) => void;
  resetBaseline: () => void;
  toggleLang: () => void;
  favorites: Set<string>;          // constituency codes
  featuredFavorites: Set<string>;  // subset of favorites shown in home featured section
  favCandidates: Set<number>;      // candidateIds
  favParties: Set<string>;         // partyIds
  toggleFavorite: (code: string) => void;
  toggleFeaturedFavorite: (code: string) => void;
  toggleFavCandidate: (id: number) => void;
  toggleFavParty: (partyId: string) => void;
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

const FAVORITES_KEY      = "nv_favorites";
const FEATURED_FAVORITES_KEY = "nv_featured_favorites";
const FAV_CANDIDATES_KEY = "nv_fav_candidates";
const FAV_PARTIES_KEY    = "nv_fav_parties";

function loadFavorites(): Set<string> {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    if (raw) return new Set(JSON.parse(raw) as string[]);
  } catch { /* corrupted — start empty */ }
  return new Set();
}

function loadFeaturedFavorites(favorites: Set<string>): Set<string> {
  try {
    const raw = localStorage.getItem(FEATURED_FAVORITES_KEY);
    if (!raw) return new Set();
    const parsed = new Set(JSON.parse(raw) as string[]);
    const cleaned = new Set(Array.from(parsed).filter((code) => favorites.has(code)));
    if (cleaned.size !== parsed.size) {
      localStorage.setItem(FEATURED_FAVORITES_KEY, JSON.stringify([...cleaned]));
    }
    return cleaned;
  } catch { /* corrupted — start empty */ }
  return new Set();
}

function loadFavCandidates(): Set<number> {
  try {
    const raw = localStorage.getItem(FAV_CANDIDATES_KEY);
    if (raw) return new Set(JSON.parse(raw) as number[]);
  } catch { /* corrupted */ }
  return new Set();
}

function loadFavParties(): Set<string> {
  try {
    const raw = localStorage.getItem(FAV_PARTIES_KEY);
    if (raw) return new Set(JSON.parse(raw) as string[]);
  } catch { /* corrupted */ }
  return new Set();
}

// Start with empty results — data is loaded asynchronously by useElectionSimulation
const initialResults: ConstituencyResult[] = [];
const initialPrVotes: PrVoteByParty = {};
const initialTally: SeatTally = {};
const initialBaseline = loadOrCreateBaseline(initialTally);
const initialFavorites = loadFavorites();
const initialFeaturedFavorites = loadFeaturedFavorites(initialFavorites);

export const useElectionStore = create<ElectionStore>((set) => ({
  results:          initialResults,
  seatTally:        initialTally,
  prVoteByParty:    initialPrVotes,
  baselineTally:    initialBaseline,
  declaredSeats:    0,
  selectedProvince: "All",
  dark:             localStorage.getItem("theme") === "dark",
  isLoading:        true,
  viewMode:         "table",
  sortBy:           "status",
  lang:             "en",
  favorites:        initialFavorites,
  featuredFavorites: initialFeaturedFavorites,
  favCandidates:    loadFavCandidates(),
  favParties:       loadFavParties(),

  setResults: (results) => {
    const normalized = applyConstituencyOverrides(results);
    // Rebuild party registry whenever new data arrives
    buildRegistry(normalized);
    set((state) => ({
      results: normalized,
      seatTally:     deriveSeatTally(normalized, state.prVoteByParty),
      declaredSeats: normalized.filter((r) => r.status === "DECLARED").length,
    }));
  },

  mergeResults: (incoming) =>
    set((state) => {
      // Build a lookup from code → incoming constituency
      const byCode = new Map(incoming.map((c) => [c.code, c]));

      const merged = state.results.map((existing) => {
        const update = byCode.get(existing.code);
        if (!update) return existing;

        // Keep existing candidate order where possible, but allow newly
        // appearing candidates from upstream to be appended.
        const byCandidateId = new Map(
          update.candidates.map((c) => [c.candidateId, c])
        );
        const existingIds = new Set(existing.candidates.map((c) => c.candidateId));
        const mergedCandidates = existing.candidates.map((cand) => {
          const incomingCandidate = byCandidateId.get(cand.candidateId);
          return incomingCandidate ?? cand;
        });
        for (const incomingCandidate of update.candidates) {
          if (!existingIds.has(incomingCandidate.candidateId)) {
            mergedCandidates.push(incomingCandidate);
          }
        }

        return {
          ...existing,
          status:       update.status,
          votesCast:    update.votesCast,
          lastUpdated:  update.lastUpdated,
          totalVoters:  update.totalVoters ?? existing.totalVoters,
          candidates:   mergedCandidates,
        };
      });

      const normalized = applyConstituencyOverrides(merged);

      return {
        results:      normalized,
        seatTally:    deriveSeatTally(normalized, state.prVoteByParty),
        declaredSeats: normalized.filter((r) => r.status === "DECLARED").length,
      };
    }),

  setPrVotes: (votes) =>
    set((state) => ({
      prVoteByParty: votes,
      seatTally: deriveSeatTally(state.results, votes),
    })),

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

  toggleFavorite: (code) =>
    set((state) => {
      const next = new Set(state.favorites);
      const nextFeatured = new Set(state.featuredFavorites);
      if (next.has(code)) {
        next.delete(code);
        nextFeatured.delete(code);
      } else {
        next.add(code);
      }
      localStorage.setItem(FAVORITES_KEY, JSON.stringify([...next]));
      localStorage.setItem(FEATURED_FAVORITES_KEY, JSON.stringify([...nextFeatured]));
      return { favorites: next, featuredFavorites: nextFeatured };
    }),

  toggleFeaturedFavorite: (code) =>
    set((state) => {
      const nextFavorites = new Set(state.favorites);
      const nextFeatured = new Set(state.featuredFavorites);

      // Safeguard: featuring a constituency should also keep it in favorites.
      if (!nextFavorites.has(code)) nextFavorites.add(code);

      if (nextFeatured.has(code)) nextFeatured.delete(code);
      else nextFeatured.add(code);

      localStorage.setItem(FAVORITES_KEY, JSON.stringify([...nextFavorites]));
      localStorage.setItem(FEATURED_FAVORITES_KEY, JSON.stringify([...nextFeatured]));
      return { favorites: nextFavorites, featuredFavorites: nextFeatured };
    }),

  toggleFavCandidate: (id) =>
    set((state) => {
      const next = new Set(state.favCandidates);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      localStorage.setItem(FAV_CANDIDATES_KEY, JSON.stringify([...next]));
      return { favCandidates: next };
    }),

  toggleFavParty: (partyId) =>
    set((state) => {
      const next = new Set(state.favParties);
      if (next.has(partyId)) next.delete(partyId);
      else next.add(partyId);
      localStorage.setItem(FAV_PARTIES_KEY, JSON.stringify([...next]));
      return { favParties: next };
    }),
}));

// Re-export for consumers that need party info
export { getParties };
