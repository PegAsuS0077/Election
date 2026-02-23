import { useEffect, useMemo } from "react";
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
import HotSeats from "./HotSeats";
import Footer from "./Footer";
import { SummaryCardsSkeleton, SeatShareBarsSkeleton } from "./Skeleton";

function formatTime(iso: string) {
  return new Date(iso).toLocaleString();
}

function seatsToMajority(n: number) {
  return Math.floor(n / 2) + 1;
}

function useCountdown(targetDate: string) {
  const ms = new Date(targetDate).getTime() - Date.now();
  const days = Math.max(0, Math.ceil(ms / 86_400_000));
  return days;
}

// ── Stats strip data ─────────────────────────────────────────────────────────
const STATS: { value: string; labelKey: "statsConstituencies" | "statsProvinces" | "statsParties" | "statsTotalSeats" }[] = [
  { value: "165", labelKey: "statsConstituencies" },
  { value: "7",   labelKey: "statsProvinces"      },
  { value: "8",   labelKey: "statsParties"        },
  { value: "275", labelKey: "statsTotalSeats"     },
];

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
    const timer = setTimeout(() => setIsLoading(false), 1500);
    return () => clearTimeout(timer);
  }, [setIsLoading]);

  // Drives results into the store (mock simulation OR live API + WebSocket)
  useElectionSimulation();

  const results    = useElectionStore((s) => s.results);
  const seatTally  = useElectionStore((s) => s.seatTally);
  const declaredSeats = useElectionStore((s) => s.declaredSeats);
  const setResults = useElectionStore((s) => s.setResults);

  // Subscribe to live snapshot updates over WebSocket
  useEffect(() => {
    const wsUrl = getWsUrl();
    if (!wsUrl) return;

    const ws = new WebSocket(wsUrl);
    ws.onmessage = (e: MessageEvent) => {
      try {
        const msg = JSON.parse(e.data as string) as WsMessage;
        if (msg.type === "constituencies" && Array.isArray(msg.data)) {
          setResults(msg.data);
        }
      } catch { /* ignore parse errors */ }
    };
    ws.onerror = () => {};
    return () => ws.close();
  }, [setResults]);

  const totalSeats = 275;
  const majority = seatsToMajority(totalSeats);
  const daysUntil = useCountdown("2026-03-05");

  const tallyRows = Object.entries(seatTally)
    .map(([key, v]) => ({ key: key as PartyKey, total: v.fptp + v.pr }))
    .sort((a, b) => b.total - a.total);
  const lead = tallyRows[0];
  const projected = lead && lead.total >= majority ? lead : null;

  const translatedProvinces = useMemo(
    () => provinces.map((p) => ({ key: p, label: provinceName(p, lang) })),
    [lang]
  );

  const stats = STATS;

  // Determine if voting is live (any constituency has votes counted)
  const hasLiveData = results.some((r) => r.status !== "PENDING" && r.votesCast > 0);
  const lastUpdatedStr = results.length > 0 ? formatTime(results[0].lastUpdated) : "—";

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950">

      {/* ── Sticky header ─────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200 dark:bg-slate-900/95 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-2xl shrink-0" aria-hidden="true">🇳🇵</span>
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 leading-tight truncate">
                {t("appTitle", lang)}
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-tight">
                {t("lastUpdated", lang)}: <span className="font-semibold">{lastUpdatedStr}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Live badge */}
            {hasLiveData && (
              <span className="hidden sm:flex items-center gap-1.5 rounded-full bg-red-600 px-3 py-1 text-xs font-bold text-white animate-pulse">
                <span className="h-1.5 w-1.5 rounded-full bg-white" />
                {t("live", lang)}
              </span>
            )}

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

      {/* ── Projected majority banner ─────────────────────────────────────── */}
      {projected && (
        <div className="border-b border-slate-200 bg-emerald-50 dark:bg-emerald-950 dark:border-slate-800">
          <div className="max-w-7xl mx-auto px-6 py-2.5 text-sm text-emerald-800 dark:text-emerald-200 flex items-center gap-2">
            <span className="text-base">🏆</span>
            <span>
              <strong>{parties[projected.key as keyof typeof parties].name}</strong>{" "}
              {t("projectedGovt", lang).replace("{n}", String(majority))}
            </span>
          </div>
        </div>
      )}

      {/* ── Hero banner ────────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-br from-red-800 via-red-700 to-indigo-800 dark:from-red-950 dark:via-red-900 dark:to-indigo-950 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div className="flex-1">
              {/* Pre-election / Live badge */}
              <div className="mb-3">
                {hasLiveData ? (
                  <span className="inline-flex items-center gap-2 rounded-full bg-white/20 backdrop-blur px-4 py-1 text-sm font-bold">
                    <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
                    {t("live", lang)}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-2 rounded-full bg-white/20 backdrop-blur px-4 py-1 text-sm font-semibold">
                    <span className="h-2 w-2 rounded-full bg-yellow-300" />
                    {t("preElection", lang)}
                  </span>
                )}
              </div>

              <h2 className="text-2xl sm:text-4xl font-extrabold leading-tight tracking-tight drop-shadow">
                {lang === "np"
                  ? "प्रतिनिधि सभा निर्वाचन २०८२"
                  : "Nepal House of Representatives"}
              </h2>
              <p className="mt-1 text-lg sm:text-2xl font-semibold text-white/80">
                {lang === "np" ? "सामान्य निर्वाचन" : "General Election 2026"}
              </p>
              <p className="mt-2 text-sm text-white/60">
                {t("electionDate", lang)}
              </p>
            </div>

            {/* Countdown */}
            <div className="shrink-0 rounded-2xl bg-white/15 backdrop-blur border border-white/20 px-8 py-6 text-center shadow-xl">
              {daysUntil > 0 ? (
                <>
                  <div className="text-5xl font-black tabular-nums leading-none drop-shadow-lg">
                    {daysUntil}
                  </div>
                  <div className="mt-1 text-sm font-semibold text-white/80 uppercase tracking-widest">
                    {t("daysUntilElection", lang)}
                  </div>
                </>
              ) : (
                <>
                  <div className="text-4xl font-black">🗳️</div>
                  <div className="mt-1 text-sm font-bold text-green-300 uppercase tracking-widest">
                    {lang === "np" ? "आज निर्वाचन!" : "Election Day!"}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Stats strip ───────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-8 gap-y-2">
            {stats.map((s, i) => (
              <div key={s.labelKey} className="flex items-center gap-2">
                {i > 0 && <span className="hidden sm:block text-slate-300 dark:text-slate-700 select-none">·</span>}
                <span className="text-lg font-black text-slate-900 dark:text-slate-100 tabular-nums">{s.value}</span>
                <span className="text-sm text-slate-500 dark:text-slate-400">{t(s.labelKey, lang)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Main content ──────────────────────────────────────────────────── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">

        {/* Seat summary cards */}
        {isLoading ? <SummaryCardsSkeleton /> : <SummaryCards lang={lang} />}

        {/* Seat share bars */}
        {isLoading ? <SeatShareBarsSkeleton /> : <SeatShareBars lang={lang} />}

        {/* Declared progress */}
        <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm dark:bg-slate-900 dark:border-slate-800">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-1">
            {t("seatsDeclaredProg", lang)}
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
            {declaredSeats} / 165 {lang === "np" ? "निर्वाचन क्षेत्र घोषित" : "constituencies declared"}
          </p>
          <ProgressBar declared={declaredSeats} total={totalSeats} />
        </section>

        {/* Hot Seats */}
        <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm dark:bg-slate-900 dark:border-slate-800">
          <HotSeats results={results} lang={lang} />
        </section>

        {/* View toggle */}
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

        {/* Map or Province summary + table */}
        {viewMode === "map" ? (
          <>
            <NepalMap
              results={results}
              selectedProvince={selectedProvince}
              onSelect={setSelectedProvince}
              lang={lang}
            />
            <ConstituencyTable
              results={results}
              translatedProvinces={translatedProvinces}
              selectedProvince={selectedProvince}
              onProvinceChange={setSelectedProvince}
              isLoading={isLoading}
              lang={lang}
            />
          </>
        ) : (
          <>
            <ProvinceSummary
              results={results}
              selectedProvince={selectedProvince}
              onSelect={setSelectedProvince}
              lang={lang}
            />
            <ConstituencyTable
              results={results}
              translatedProvinces={translatedProvinces}
              selectedProvince={selectedProvince}
              onProvinceChange={setSelectedProvince}
              isLoading={isLoading}
              lang={lang}
            />
          </>
        )}

        {/* Screen-reader live region */}
        <div aria-live="polite" aria-atomic="false" className="sr-only">
          {results.filter((r) => r.status === "COUNTING").length} {t("stillCounting", lang)}
        </div>
      </main>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <Footer lang={lang} />
    </div>
  );
}
