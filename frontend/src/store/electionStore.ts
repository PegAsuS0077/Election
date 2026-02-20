import { create } from "zustand";
import { constituencyResults } from "../mockData";
import type { ConstituencyResult, Province } from "../mockData";

type SortKey = "margin" | "province" | "alpha" | "status";
type ViewMode = "table" | "map";

interface ElectionStore {
  // State
  results: ConstituencyResult[];
  selectedProvince: "All" | Province;
  dark: boolean;
  isLoading: boolean;
  viewMode: ViewMode;
  sortBy: SortKey;

  // Actions
  setResults: (r: ConstituencyResult[]) => void;
  setSelectedProvince: (p: "All" | Province) => void;
  toggleDark: () => void;
  setIsLoading: (v: boolean) => void;
  setViewMode: (v: ViewMode) => void;
  setSortBy: (s: SortKey) => void;
}

export const useElectionStore = create<ElectionStore>((set) => ({
  results: constituencyResults,
  selectedProvince: "All",
  dark: localStorage.getItem("theme") === "dark",
  isLoading: true,
  viewMode: "table",
  sortBy: "status",

  setResults: (results) => set({ results }),
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
}));
