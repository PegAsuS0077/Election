import { useEffect } from "react";
import { parties, provinces } from "./mockData";
import { useElectionStore } from "./store/electionStore";
import { useElectionSimulation } from "./hooks/useElectionSimulation";
import { t, provinceName } from "./i18n";
import type { PartyKey } from "./mockData";
import { getWsUrl } from "./api";
import type { WsMessage } from "./api";

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
    lang, toggleLang,
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

  // Drives results into the store (mock simulation OR live API + WebSocket)
  useElectionSimulation();

  const results = useElectionStore((s) => s.results);
  const seatTally = useElectionStore((s) => s.seatTally);
  const declaredSeats = useElectionStore((s) => s.declaredSeats);

  // Subscribe to live snapshot updates over WebSocket (only when backend is configured)
  const setResults = useElectionStore((s) => s.setResults);
  useEffect(() => {
    const wsUrl = getWsUrl();
    if (!wsUrl) return; // no backend configured — mock simulation handles updates

    const ws = new WebSocket(wsUrl);

    ws.onmessage = (e: MessageEvent) => {
      try {
        const msg = JSON.parse(e.data as string) as WsMessage;
        if (msg.type === "constituencies" && Array.isArray(msg.data)) {
          setResults(msg.data);
        }
      } catch {
        // ignore parse errors
      }
    };

    ws.onerror = () => {}; // useElectionSimulation handles fallback polling

    return () => ws.close();
  }, [setResults]);

  const totalSeats = 275;
  const majority = seatsToMajority(totalSeats);
  const tallyRows = Object.entries(seatTally)
    .map(([key, v]) => ({ key: key as PartyKey, total: v.fptp + v.pr }))
    .sort((a, b) => b.total - a.total);
  const lead = tallyRows[0];
  const projected = lead && lead.total >= majority ? lead : null;

  // Map provinces to their translated names for dropdowns / province summary
  const translatedProvinces = provinces.map((p) => ({
    key: p,
    label: provinceName(p, lang),
  }));

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950">
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 dark:bg-slate-900 dark:border-slate-800">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              {t("appTitle", lang)}
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
              {t("appSubtitle", lang)} · {t("lastUpdated", lang)}:{" "}
              <span className="font-semibold text-slate-800 dark:text-slate-100">
                {results.length > 0 ? formatTime(results[0].lastUpdated) : "—"}
              </span>
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {/* Language toggle */}
            <button
              type="button"
              onClick={toggleLang}
              title={lang === "en" ? "Switch to Nepali" : "अंग्रेजीमा जानुस्"}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold
                         text-slate-700 transition hover:bg-slate-50 active:scale-95
                         dark:bg-slate-900 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              {lang === "en" ? "🇳🇵 NP" : "🇬🇧 EN"}
            </button>
            {/* Dark mode toggle */}
            <button
              type="button"
              onClick={toggleDark}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold
                         text-slate-700 transition hover:bg-slate-50 active:scale-95
                         dark:bg-slate-900 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              {dark ? t("lightMode", lang) : t("darkMode", lang)}
            </button>
          </div>
        </div>
      </header>

      {projected && (
        <div className="border-b border-slate-200 bg-slate-50 dark:bg-slate-900 dark:border-slate-800">
          <div className="max-w-6xl mx-auto px-6 py-3 text-sm text-slate-700 dark:text-slate-200">
            <span className="font-bold text-slate-900 dark:text-slate-100">
              {parties[projected.key as keyof typeof parties].name}
            </span>{" "}
            {t("projectedGovt", lang).replace("{n}", String(majority))}
          </div>
        </div>
      )}

      <main className="max-w-6xl mx-auto px-6 py-6 space-y-6">
        {isLoading ? <SummaryCardsSkeleton /> : <SummaryCards lang={lang} />}
        {isLoading ? <SeatShareBarsSkeleton /> : <SeatShareBars lang={lang} />}

        <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm dark:bg-slate-900 dark:border-slate-800">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            {t("seatsDeclaredProg", lang)}
          </h2>
          <ProgressBar declared={declaredSeats} total={totalSeats} />
        </section>

        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
            {t("view", lang)}
          </span>
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
              {mode === "table" ? t("viewTable", lang) : t("viewMap", lang)}
            </button>
          ))}
        </div>

        {viewMode === "map" ? (
          <>
            <NepalMap results={results} selectedProvince={selectedProvince} onSelect={setSelectedProvince} lang={lang} />
            <ConstituencyTable results={results} translatedProvinces={translatedProvinces} selectedProvince={selectedProvince} onProvinceChange={setSelectedProvince} isLoading={isLoading} lang={lang} />
          </>
        ) : (
          <>
            <ProvinceSummary results={results} selectedProvince={selectedProvince} onSelect={setSelectedProvince} lang={lang} />
            <ConstituencyTable results={results} translatedProvinces={translatedProvinces} selectedProvince={selectedProvince} onProvinceChange={setSelectedProvince} isLoading={isLoading} lang={lang} />
          </>
        )}

        <div aria-live="polite" aria-atomic="false" className="sr-only">
          {results.filter((r) => r.status === "COUNTING").length} {t("stillCounting", lang)}
        </div>
      </main>
    </div>
  );
}
