import { useEffect } from "react";
import { mockSnapshot, parties, provinces } from "./mockData";
import { useElectionStore } from "./store/electionStore";
import { useElectionSimulation } from "./hooks/useElectionSimulation";

import ProgressBar from "./ProgressBar";
import SummaryCards from "./SummaryCards";
import SeatShareBars from "./SeatShareBars";
import ProvinceSummary from "./ProvinceSummary";
import ConstituencyTable from "./ConstituencyTable";
import NepalMap from "./NepalMap";
import { SummaryCardsSkeleton, SeatShareBarsSkeleton } from "./Skeleton";

function formatTime(iso: string) {
  return new Date(iso).toLocaleString();
}
function seatsToMajority(n: number) {
  return Math.floor(n / 2) + 1;
}

export default function App() {
  const {
    dark, toggleDark,
    isLoading, setIsLoading,
    selectedProvince, setSelectedProvince,
    viewMode, setViewMode,
  } = useElectionStore();

  // Sync initial dark class on mount
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Simulated loading
  useEffect(() => {
    const t = setTimeout(() => setIsLoading(false), 1500);
    return () => clearTimeout(t);
  }, [setIsLoading]);

  // Simulation updates store via hook
  useElectionSimulation();

  const results = useElectionStore((s) => s.results);
  const majority = seatsToMajority(mockSnapshot.totalSeats);
  const tallyRows = Object.entries(mockSnapshot.seatTally)
    .map(([key, v]) => ({ key, total: v.fptp + v.pr }))
    .sort((a, b) => b.total - a.total);
  const lead = tallyRows[0];
  const projected = lead && lead.total >= majority ? lead : null;

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950">
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 dark:bg-slate-900 dark:border-slate-800">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              Nepal House of Representatives Election 2026
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
              Live Results Dashboard · Last updated:{" "}
              <span className="font-semibold text-slate-800 dark:text-slate-100">
                {formatTime(mockSnapshot.lastUpdated)}
              </span>
            </p>
          </div>
          <button
            type="button"
            onClick={toggleDark}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold
                       text-slate-700 transition hover:bg-slate-50 active:scale-95
                       dark:bg-slate-900 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            {dark ? "☀️ Light" : "🌙 Dark"}
          </button>
        </div>
      </header>

      {projected && (
        <div className="border-b border-slate-200 bg-slate-50 dark:bg-slate-900 dark:border-slate-800">
          <div className="max-w-6xl mx-auto px-6 py-3 text-sm text-slate-700 dark:text-slate-200">
            <span className="font-bold text-slate-900 dark:text-slate-100">
              {parties[projected.key as keyof typeof parties].name}
            </span>{" "}
            is projected to form government (≥ {majority} seats).
          </div>
        </div>
      )}

      <main className="max-w-6xl mx-auto px-6 py-6 space-y-6">
        {isLoading ? <SummaryCardsSkeleton /> : <SummaryCards />}
        {isLoading ? <SeatShareBarsSkeleton /> : <SeatShareBars />}

        <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm dark:bg-slate-900 dark:border-slate-800">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Seats Declared Progress</h2>
          <ProgressBar declared={mockSnapshot.declaredSeats} total={mockSnapshot.totalSeats} />
        </section>

        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-200">View:</span>
          {(["table", "map"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setViewMode(mode)}
              className={`rounded-xl border px-3 py-1.5 text-sm font-semibold transition active:scale-95
                ${viewMode === mode
                  ? "border-slate-300 bg-slate-100 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                }`}
            >
              {mode === "table" ? "📋 Table" : "🗺️ Map"}
            </button>
          ))}
        </div>

        {viewMode === "map" ? (
          <NepalMap results={results} selectedProvince={selectedProvince} onSelect={setSelectedProvince} />
        ) : (
          <>
            <ProvinceSummary results={results} selectedProvince={selectedProvince} onSelect={setSelectedProvince} />
            <ConstituencyTable results={results} provinces={provinces} selectedProvince={selectedProvince} onProvinceChange={setSelectedProvince} isLoading={isLoading} />
          </>
        )}
        <div
          aria-live="polite"
          aria-atomic="false"
          className="sr-only"
        >
          {results.filter((r) => r.status === "COUNTING").length} constituencies still counting.
        </div>
      </main>
    </div>
  );
}
