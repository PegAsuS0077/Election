import { useNavigate } from "react-router-dom";
import type { ConstituencyResult } from "./types";
import { t, provinceName } from "./i18n";
import type { Lang } from "./i18n";
import { getParty } from "./lib/partyRegistry";
import { SPONSORED_GATE_KEY, SPONSORED_LINK_URL } from "./lib/sponsoredGate";
import PartySymbol from "./components/PartySymbol";

const PROVINCE_COLORS: Record<string, string> = {
  Koshi:          "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300",
  Madhesh:        "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  Bagmati:        "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  Gandaki:        "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300",
  Lumbini:        "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300",
  Karnali:        "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300",
  Sudurpashchim:  "bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300",
};

type HotSeat = {
  result: ConstituencyResult;
  top1: ConstituencyResult["candidates"][0];
  top2: ConstituencyResult["candidates"][0];
  marginVotes: number;
  marginPct: number;
  isTight: boolean;
};

function computeHotSeats(results: ConstituencyResult[]): HotSeat[] {
  const races: HotSeat[] = [];
  for (const r of results) {
    if (r.status === "PENDING") continue;
    if (r.candidates.length < 2) continue;
    const sorted = [...r.candidates].sort((a, b) => b.votes - a.votes);
    const top1 = sorted[0];
    const top2 = sorted[1];
    if (!top1 || !top2 || top1.votes <= 0) continue;

    const marginVotes = top1.votes - top2.votes;
    const topTwoTotal = top1.votes + top2.votes;
    const marginPct = topTwoTotal > 0 ? (marginVotes / topTwoTotal) * 100 : 100;
    const isTight = marginPct <= 10;

    races.push({ result: r, top1, top2, marginVotes, marginPct, isTight });
  }

  races.sort((a, b) => {
    const statusRank = (x: HotSeat) => (x.result.status === "COUNTING" ? 0 : 1);
    return (
      statusRank(a) - statusRank(b) ||
      a.marginPct - b.marginPct ||
      a.marginVotes - b.marginVotes
    );
  });

  const tight = races.filter((x) => x.isTight);
  return (tight.length >= 6 ? tight : races).slice(0, 6);
}

function numberFmt(n: number): string { return n.toLocaleString("en-IN"); }

// ── Main Component ────────────────────────────────────────────────────────────
export default function HotSeats({
  results,
  lang = "en",
}: {
  results: ConstituencyResult[];
  lang?: Lang;
}) {
  const hotSeats = computeHotSeats(results);
  const navigate = useNavigate();
  const handleHotSeatClick = (code: string) => {
    if (typeof window !== "undefined") {
      const isUnlocked = window.localStorage.getItem(SPONSORED_GATE_KEY) === "1";
      if (!isUnlocked) {
        window.localStorage.setItem(SPONSORED_GATE_KEY, "1");
        const gtag = (window as Window & { gtag?: (...args: unknown[]) => void }).gtag;
        gtag?.("event", "hot_seat_gate_redirect", {
          event_category: "advertising",
          event_label: "hot_seats_first_click",
          value: 1,
        });
        window.location.assign(SPONSORED_LINK_URL);
        return;
      }
    }

    navigate(`/constituency/${encodeURIComponent(code)}`);
  };

  return (
    <>
      <section aria-label="Hot seats">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              🔥 {t("hotSeats", lang)}
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t("hotSeatsDesc", lang)}</p>
          </div>
          <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-700 dark:bg-red-900/40 dark:text-red-300">
            {hotSeats.length} {lang === "np" ? "सिट" : "seats"}
          </span>
        </div>

        {hotSeats.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center dark:border-slate-700 dark:bg-slate-900">
            <div className="text-4xl mb-3">🗳️</div>
            <p className="text-slate-500 dark:text-slate-400 text-sm">{t("hotSeatsEmpty", lang)}</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {hotSeats.map(({ result, top1, top2, marginVotes, marginPct, isTight }) => {
              const p1hex = getParty(top1.partyId).hex;
              const p2hex = getParty(top2.partyId).hex;
              const totalVotes = top1.votes + top2.votes;
              const top1Pct = totalVotes > 0 ? (top1.votes / totalVotes) * 100 : 50;
              const constName = lang === "np" ? result.nameNp : result.name;
              const provLabel = provinceName(result.province, lang);
              const provCls = PROVINCE_COLORS[result.province] ?? "bg-slate-100 text-slate-700";
              const statusCls = result.status === "DECLARED"
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300";
              const statusLabel = result.status === "DECLARED"
                ? (lang === "np" ? "घोषित" : "Declared")
                : (lang === "np" ? "मतगणना" : "Counting");

              return (
                <button key={result.code} type="button" onClick={() => handleHotSeatClick(result.code)}
                  className="w-full text-left rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md hover:border-[#2563eb]/30 active:scale-[0.99] cursor-pointer dark:border-slate-700 dark:bg-slate-900 dark:hover:border-[#3b82f6]/40"
                >
                  <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-slate-900 dark:text-slate-100 text-sm leading-tight truncate">{constName}</div>
                      <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${provCls}`}>{provLabel}</span>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusCls}`}>{statusLabel}</span>
                      </div>
                    </div>
                    <span className="self-start rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700 dark:bg-red-900/40 dark:text-red-300 whitespace-normal">
                      {isTight
                        ? t("closelyContested", lang)
                        : (lang === "np" ? "शीर्ष २ प्रतिस्पर्धा" : "Top-2 race")}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <PartySymbol partyId={top1.partyId} size="md" />
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{lang === "np" ? top1.nameNp : top1.name}</div>
                        <div className="text-[10px] text-slate-400 dark:text-slate-500 truncate">{(lang === "np" ? top1.partyName : getParty(top1.partyId).nameEn).split(" (")[0]}</div>
                      </div>
                    </div>
                    <span className="tabular-nums text-sm font-bold text-slate-800 dark:text-slate-100 shrink-0">{numberFmt(top1.votes)}</span>
                  </div>

                  <div className="relative h-2 w-full rounded-full overflow-hidden bg-slate-100 dark:bg-slate-700 mb-1.5">
                    <div className="absolute left-0 top-0 h-full rounded-l-full" style={{ width: `${top1Pct}%`, backgroundColor: p1hex }} />
                    <div className="absolute top-0 h-full rounded-r-full" style={{ left: `${top1Pct}%`, right: 0, backgroundColor: p2hex }} />
                  </div>

                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <PartySymbol partyId={top2.partyId} size="md" />
                      <div className="min-w-0">
                        <div className="text-sm text-slate-600 dark:text-slate-300 truncate">{lang === "np" ? top2.nameNp : top2.name}</div>
                        <div className="text-[10px] text-slate-400 dark:text-slate-500 truncate">{(lang === "np" ? top2.partyName : getParty(top2.partyId).nameEn).split(" (")[0]}</div>
                      </div>
                    </div>
                    <span className="tabular-nums text-sm text-slate-600 dark:text-slate-300 shrink-0">{numberFmt(top2.votes)}</span>
                  </div>

                  <div className="border-t border-slate-100 dark:border-slate-700 pt-2 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                    <span>{lang === "np" ? "अन्तर" : "Margin"}</span>
                    <span className="font-semibold text-red-600 dark:text-red-400">
                      {numberFmt(marginVotes)} ({marginPct.toFixed(1)}% {lang === "np" ? "शीर्ष २ मध्ये" : "of top-2"})
                    </span>
                  </div>

                  <div className="mt-2 text-center text-[10px] text-slate-400 dark:text-slate-600">
                    {lang === "np" ? "विस्तृत हेर्नुहोस् ↗" : "Click for details ↗"}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>
    </>
  );
}
