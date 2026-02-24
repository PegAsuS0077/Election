import { useEffect, useMemo } from "react";
import { parties, provinces } from "./mockData";
import { useElectionStore } from "./store/electionStore";
import { useElectionSimulation } from "./hooks/useElectionSimulation";
import { t, provinceName } from "./i18n";
import type { PartyKey } from "./mockData";
import { getWsUrl } from "./api";
import type { WsMessage } from "./api";

import SummaryCards from "./SummaryCards";
import SeatShareBars from "./SeatShareBars";
import ProvinceSummary from "./ProvinceSummary";
import ConstituencyTable from "./ConstituencyTable";
import NepalMap from "./NepalMap";
import HotSeats from "./HotSeats";
import { SummaryCardsSkeleton, SeatShareBarsSkeleton } from "./Skeleton";
import Layout from "./components/Layout";

const STATS: {
  value: string;
  labelKey: "statsConstituencies" | "statsProvinces" | "statsParties" | "statsTotalSeats";
  icon: string;
}[] = [
  { value: "165", labelKey: "statsConstituencies", icon: "⬡" },
  { value: "7",   labelKey: "statsProvinces",      icon: "◈" },
  { value: "8",   labelKey: "statsParties",        icon: "◉" },
  { value: "275", labelKey: "statsTotalSeats",     icon: "◆" },
];

function seatsToMajority(n: number) { return Math.floor(n / 2) + 1; }
function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
function useCountdown(targetDate: string) {
  const ms = new Date(targetDate).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / 86_400_000));
}

export default function App() {
  const { isLoading, setIsLoading, selectedProvince, setSelectedProvince, viewMode, setViewMode, lang } = useElectionStore();

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 1500);
    return () => clearTimeout(timer);
  }, [setIsLoading]);

  useElectionSimulation();

  const results       = useElectionStore((s) => s.results);
  const seatTally     = useElectionStore((s) => s.seatTally);
  const declaredSeats = useElectionStore((s) => s.declaredSeats);
  const setResults    = useElectionStore((s) => s.setResults);

  useEffect(() => {
    const wsUrl = getWsUrl();
    if (!wsUrl) return;
    const ws = new WebSocket(wsUrl);
    ws.onmessage = (e: MessageEvent) => {
      try {
        const msg = JSON.parse(e.data as string) as WsMessage;
        if (msg.type === "constituencies" && Array.isArray(msg.data)) setResults(msg.data);
      } catch { /* ignore */ }
    };
    ws.onerror = () => {};
    return () => ws.close();
  }, [setResults]);

  const totalSeats = 275;
  const majority   = seatsToMajority(totalSeats);
  const daysUntil  = useCountdown("2026-03-05");

  const tallyRows = Object.entries(seatTally)
    .map(([key, v]) => ({ key: key as PartyKey, total: v.fptp + v.pr }))
    .sort((a, b) => b.total - a.total);
  const lead      = tallyRows[0];
  const projected = lead && lead.total >= majority ? lead : null;

  const translatedProvinces = useMemo(
    () => provinces.map((p) => ({ key: p, label: provinceName(p, lang) })),
    [lang]
  );

  const hasLiveData    = results.some((r) => r.status !== "PENDING" && r.votesCast > 0);
  const lastUpdatedStr = results.length > 0 ? formatTime(results[0].lastUpdated) : "—";
  const declaredPct    = Math.round((declaredSeats / 165) * 100);

  const statsContent = (
    <div className="max-w-7xl mx-auto px-4 sm:px-6">
      <div className="flex items-stretch divide-x divide-slate-100 dark:divide-slate-800">
        {STATS.map((s) => (
          <div key={s.labelKey} className="flex-1 flex flex-col items-center justify-center py-3.5 gap-0.5 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-bold text-slate-900 dark:text-slate-100 tabular-nums" style={{ fontFamily: "'DM Mono', monospace" }}>{s.value}</span>
              <span className="text-[10px] text-[#2563eb] dark:text-[#3b82f6] font-medium hidden sm:block">{s.icon}</span>
            </div>
            <span className="text-[11px] text-slate-500 uppercase tracking-wide font-medium">{t(s.labelKey, lang)}</span>
          </div>
        ))}
      </div>
    </div>
  );

  const heroBadge = (
    <div className="flex items-center gap-3 flex-wrap">
      {hasLiveData ? (
        <span className="inline-flex items-center gap-2 rounded-full border border-green-500/30 bg-green-500/10 px-3.5 py-1 text-xs font-semibold text-green-400 uppercase tracking-widest">
          <span className="h-1.5 w-1.5 rounded-full bg-green-400" style={{ animation: "live-pulse 1.4s ease-in-out infinite" }} />
          {t("live", lang)}
        </span>
      ) : (
        <span className="inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-400/10 px-3.5 py-1 text-xs font-semibold text-amber-400 uppercase tracking-widest">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
          {t("preElection", lang)}
        </span>
      )}
      <span className="text-[11px] text-white/30 tabular-nums">{t("lastUpdated", lang)} {lastUpdatedStr}</span>
    </div>
  );

  return (
    <Layout
      title="Nepal House of Representatives"
      titleNp="प्रतिनिधि सभा निर्वाचन ⃦⃨⃨⃨"
      subtitle={"General Election · " + t("electionDate", lang)}
      subtitleNp={"सामान्य निर्वाचन · " + t("electionDate", lang)}
      badge={heroBadge}
      showStats
      statsContent={statsContent}
    >
      {projected && (
        <div className="bg-emerald-600 dark:bg-emerald-700">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2 flex items-center gap-2.5 text-white text-xs font-medium">
            <span className="shrink-0">🏆</span>
            <span>
              <span className="font-bold">{parties[projected.key as keyof typeof parties].name}</span>
              {" "}{t("projectedGovt", lang).replace("{n}", String(majority))}
            </span>
          </div>
        </div>
      )}

      <div className="bg-[#060d1f] dark:bg-[#030810] border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <div className="flex-1 max-w-sm">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] text-white/40 uppercase tracking-widest">
                  {lang === "np" ? "घोषित निर्वाचन क्षेत्र" : "Declared Constituencies"}
                </span>
                <span className="text-[11px] text-white/50 tabular-nums" style={{ fontFamily: "'DM Mono', monospace" }}>
                  {declaredSeats} / 165
                </span>
              </div>
              <div className="h-1 w-full rounded-full bg-white/10 overflow-hidden">
                <div className="h-full rounded-full bg-[#2563eb] transition-all duration-700" style={{ width: declaredPct + "%" }} />
              </div>
            </div>
            <div className="flex items-stretch gap-3 shrink-0">
              <div className="glass rounded-xl px-5 py-3.5 text-center min-w-[100px]">
                {daysUntil > 0 ? (
                  <>
                    <div className="text-3xl font-bold leading-none tabular-nums text-white" style={{ fontFamily: "'DM Mono', monospace", letterSpacing: "-0.04em" }}>
                      {String(daysUntil).padStart(2, "0")}
                    </div>
                    <div className="mt-1 text-[9px] font-semibold text-white/40 uppercase tracking-[0.15em]">
                      {t("daysUntilElection", lang)}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-2xl">🗳️</div>
                    <div className="mt-1 text-[9px] font-bold text-green-400 uppercase tracking-[0.15em]">
                      {lang === "np" ? "आज निर्वाचन!" : "Election Day!"}
                    </div>
                  </>
                )}
              </div>
              <div className="glass rounded-xl px-5 py-3.5 text-center min-w-[100px]">
                <div className="text-3xl font-bold leading-none tabular-nums text-[#3b82f6]" style={{ fontFamily: "'DM Mono', monospace", letterSpacing: "-0.04em" }}>
                  {majority}
                </div>
                <div className="mt-1 text-[9px] font-semibold text-white/40 uppercase tracking-[0.15em]">
                  {lang === "np" ? "बहुमत सिट" : "seats needed"}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {isLoading ? <SummaryCardsSkeleton /> : <SummaryCards lang={lang} />}

        <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm dark:bg-[#0c1525] dark:border-slate-800/80">
          <HotSeats results={results} lang={lang} />
        </section>

        {isLoading ? <SeatShareBarsSkeleton /> : <SeatShareBars lang={lang} />}

        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-widest mr-1">{t("view", lang)}</span>
          {(["table", "map"] as const).map((mode) => (
            <button key={mode} type="button" onClick={() => setViewMode(mode)}
              className={"h-8 px-3 rounded-lg text-xs font-semibold transition-all active:scale-95 border " +
                (viewMode === mode
                  ? "bg-[#2563eb] border-[#2563eb] text-white shadow-sm"
                  : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 hover:border-[#2563eb]/40 hover:text-[#2563eb]"
                )}
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
    </Layout>
  );
}
