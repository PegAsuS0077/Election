import { useEffect, useMemo, useState } from "react";
import {
  constituencyResults,
  mockSnapshot,
  parties,
  provinces,
  type ConstituencyResult,
  type Province,
} from "./mockData";

import ProgressBar from "./ProgressBar";
import SummaryCards from "./SummaryCards";
import SeatShareBars from "./SeatShareBars";
import ProvinceSummary from "./ProvinceSummary";
import ConstituencyTable from "./ConstituencyTable";

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
  // Dark mode
  const [dark, setDark] = useState<boolean>(() => {
    const saved = localStorage.getItem("theme");
    if (saved === "dark") return true;
    if (saved === "light") return false;
    return false;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (dark) root.classList.add("dark");
    else root.classList.remove("dark");
    localStorage.setItem("theme", dark ? "dark" : "light");
  }, [dark]);

  // Single source of truth for constituency results (live simulation)
  const [results, setResults] = useState<ConstituencyResult[]>(constituencyResults);

  useEffect(() => {
    const interval = setInterval(() => {
      setResults((prev) =>
        prev.map((r) => {
          if (r.status === "DECLARED") return r;

          const nextCandidates = (Array.isArray(r.candidates) ? r.candidates : []).map((c) => {
            const bump = Math.random() < 0.65 ? Math.floor(Math.random() * 220) : Math.floor(Math.random() * 40);
            return { ...c, votes: c.votes + bump };
          });

          const shouldDeclare = Math.random() < 0.08;

          return {
            ...r,
            candidates: nextCandidates,
            status: shouldDeclare ? "DECLARED" : "COUNTING",
            lastUpdated: new Date().toISOString(),
          };
        })
      );
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  // Province filter shared across ProvinceSummary + Table
  const [selectedProvince, setSelectedProvince] = useState<"All" | Province>("All");

  // Projected banner
  const majority = seatsToMajority(mockSnapshot.totalSeats);
  const lead = topPartyKey();
  const projected = lead.total >= majority ? lead : null;

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950">
      <header className="bg-white border-b border-slate-200 dark:bg-slate-900 dark:border-slate-800">
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
            onClick={() => setDark((d) => !d)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700
                       transition hover:bg-slate-50 active:scale-95
                       dark:bg-slate-900 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            {dark ? "☀️ Light" : "🌙 Dark"}
          </button>
        </div>
      </header>

      {projected ? (
        <div className="border-b border-slate-200 bg-slate-50 dark:bg-slate-900 dark:border-slate-800">
          <div className="max-w-6xl mx-auto px-6 py-3 text-sm text-slate-700 dark:text-slate-200">
            <span className="font-bold text-slate-900 dark:text-slate-100">
              {parties[projected.key as keyof typeof parties].name}
            </span>{" "}
            is projected to form government (≥ {majority} seats).
          </div>
        </div>
      ) : null}

      <main className="max-w-6xl mx-auto px-6 py-6 space-y-6">
        <SummaryCards />

        <SeatShareBars />

        <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm dark:bg-slate-900 dark:border-slate-800">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Seats Declared Progress
          </h2>

          <ProgressBar
            declared={mockSnapshot.declaredSeats}
            total={mockSnapshot.totalSeats}
          />
        </section>

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
        />
      </main>
    </div>
  );
}
