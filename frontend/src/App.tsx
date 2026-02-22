import { useEffect, useState } from "react";
import { parties, provinces, seatChange } from "./mockData";
import type { Province } from "./mockData";
import {
  fetchSnapshot,
  fetchConstituencies,
} from "./api";
import type { Snapshot, ConstituencyResult, WsMessage } from "./api";

import ProgressBar     from "./ProgressBar";
import SummaryCards    from "./SummaryCards";
import SeatShareBars   from "./SeatShareBars";
import ProvinceSummary from "./ProvinceSummary";
import ConstituencyTable from "./ConstituencyTable";

const THEME_KEY = "theme";

function formatTime(iso: string) {
  return iso ? new Date(iso).toLocaleString() : "—";
}

function seatsToMajority(totalSeats: number) {
  return Math.floor(totalSeats / 2) + 1;
}

const EMPTY_SNAPSHOT: Snapshot = {
  totalSeats:    275,
  declaredSeats: 0,
  lastUpdated:   "",
  seatTally: {
    NC:        { fptp: 0, pr: 0 },
    "CPN-UML": { fptp: 0, pr: 0 },
    NCP:       { fptp: 0, pr: 0 },
    RSP:       { fptp: 0, pr: 0 },
    OTH:       { fptp: 0, pr: 0 },
  },
};

export default function App() {
  /* ── Dark mode ── */
  const [dark, setDark] = useState(() => localStorage.getItem(THEME_KEY) === "dark");
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem(THEME_KEY, dark ? "dark" : "light");
  }, [dark]);

  /* ── Live data ── */
  const [snapshot, setSnapshot]   = useState<Snapshot>(EMPTY_SNAPSHOT);
  const [results, setResults]     = useState<ConstituencyResult[]>([]);
  const [selectedProvince, setSelectedProvince] = useState<"All" | Province>("All");

  // Initial HTTP fetch
  useEffect(() => {
    fetchSnapshot().then(setSnapshot).catch(console.error);
    fetchConstituencies().then(setResults).catch(console.error);
  }, []);

  // WebSocket for live updates
  useEffect(() => {
    const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
    const ws = new WebSocket(`${proto}//${window.location.host}/ws`);

    ws.onmessage = (e: MessageEvent) => {
      const msg = JSON.parse(e.data) as WsMessage;
      if (msg.type === "snapshot")      setSnapshot(msg.data);
      if (msg.type === "constituencies") setResults(msg.data);
    };

    ws.onerror = (err) => console.error("[ws] error", err);

    return () => ws.close();
  }, []);

  /* ── Majority banner ── */
  const majority  = seatsToMajority(snapshot.totalSeats);
  const tallyRows = Object.entries(snapshot.seatTally)
    .map(([key, v]) => ({ key, total: v.fptp + v.pr }))
    .sort((a, b) => b.total - a.total);
  const lead      = tallyRows[0];
  const projected = lead && lead.total >= majority ? lead : null;

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 dark:bg-slate-900 dark:border-slate-800">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              Nepal House of Representatives Election 2026
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
              Live Results Dashboard · Last updated:{" "}
              <span className="font-semibold text-slate-800 dark:text-slate-100">
                {formatTime(snapshot.lastUpdated)}
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
        <SummaryCards snapshot={snapshot} />

        <SeatShareBars snapshot={snapshot} />

        <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm dark:bg-slate-900 dark:border-slate-800">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Seats Declared Progress
          </h2>
          <ProgressBar
            declared={snapshot.declaredSeats}
            total={snapshot.totalSeats}
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
