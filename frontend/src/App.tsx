import { useEffect, useState } from "react";
import {
  mockSnapshot,
  parties,
  provinces,
  type Province,
} from "./mockData";
import { useElectionSimulation } from "./hooks/useElectionSimulation";

import ProgressBar from "./ProgressBar";
import SummaryCards from "./SummaryCards";
import SeatShareBars from "./SeatShareBars";
import ProvinceSummary from "./ProvinceSummary";
import ConstituencyTable from "./ConstituencyTable";
import NepalMap from "./NepalMap";
import {
  SummaryCardsSkeleton,
  SeatShareBarsSkeleton,
} from "./Skeleton";

const THEME_KEY = "theme";

function formatTime(iso: string) {
  return new Date(iso).toLocaleString();
}

function seatsToMajority(totalSeats: number) {
  return Math.floor(totalSeats / 2) + 1;
}

function topPartyKey() {
  const entries = Object.entries(mockSnapshot.seatTally) as Array<
    [keyof typeof mockSnapshot.seatTally, { fptp: number; pr: number }]
  >;

  const rows = entries
    .map(([key, v]) => ({ key, total: v.fptp + v.pr }))
    .sort((a, b) => b.total - a.total);

  return rows[0];
}

export default function App() {
  /* ---------------- Dark Mode ---------------- */

  const [dark, setDark] = useState<boolean>(() => {
    return localStorage.getItem(THEME_KEY) === "dark";
  });

  useEffect(() => {
    // This guarantees correct add/remove behavior
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem(THEME_KEY, dark ? "dark" : "light");
  }, [dark]);

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setIsLoading(false), 1500);
    return () => clearTimeout(t);
  }, []);

  /* ---------------- Live Constituency Data ---------------- */

  const results = useElectionSimulation();

  /* ---------------- Province Filter ---------------- */

  const [selectedProvince, setSelectedProvince] =
    useState<"All" | Province>("All");

  const [viewMode, setViewMode] = useState<"table" | "map">("table");

  /* ---------------- Majority Banner ---------------- */

  const majority = seatsToMajority(mockSnapshot.totalSeats);
  const lead = topPartyKey();
  const projected =
    lead.total >= majority ? lead : null;

  /* ---------------- Render ---------------- */

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950">
      {/* Header */}
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

          {/* Dark Mode Toggle */}
          <button
            type="button"
            onClick={() => setDark((d) => !d)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700
                       transition hover:bg-slate-50 active:scale-95
                       dark:bg-slate-900 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            {dark ? "☀️ Light" : "🌙 Dark"}
          </button>
        </div>
      </header>

      {/* Projected Government Banner */}
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

      {/* Main */}
      <main className="max-w-6xl mx-auto px-6 py-6 space-y-6">
        {isLoading ? <SummaryCardsSkeleton /> : <SummaryCards />}

        {isLoading ? <SeatShareBarsSkeleton /> : <SeatShareBars />}

        <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm dark:bg-slate-900 dark:border-slate-800">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Seats Declared Progress
          </h2>

          <ProgressBar
            declared={mockSnapshot.declaredSeats}
            total={mockSnapshot.totalSeats}
          />
        </section>

        {/* View toggle */}
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
          <NepalMap
            results={results}
            selectedProvince={selectedProvince}
            onSelect={setSelectedProvince}
          />
        ) : (
          <>
            <ProvinceSummary
              results={results}
              selectedProvince={selectedProvince}
              onSelect={setSelectedProvince}
            />
            <ConstituencyTable
              results={results}
              provinces={provinces}
              selectedProvince={selectedProvince}
              onProvinceChange={setSelectedProvince}
              isLoading={isLoading}
            />
          </>
        )}
      </main>
    </div>
  );
}
