import { useEffect, useState } from "react";
import { FocusTrap } from "focus-trap-react";
import type { ConstituencyResult } from "./types";
import { t, provinceName } from "./i18n";
import type { Lang } from "./i18n";
import { partyHex, getParty } from "./lib/partyRegistry";

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
  marginPct: number;
};

function computeHotSeats(results: ConstituencyResult[]): HotSeat[] {
  const hot: HotSeat[] = [];
  for (const r of results) {
    if (r.status === "PENDING") continue;
    const withVotes = r.candidates.filter((c) => c.votes > 0);
    if (withVotes.length < 2) continue;
    const sorted = [...withVotes].sort((a, b) => b.votes - a.votes);
    const top1 = sorted[0];
    const top2 = sorted[1];
    const marginPct = top1.votes > 0 ? ((top1.votes - top2.votes) / top1.votes) * 100 : 100;
    if (marginPct < 10) hot.push({ result: r, top1, top2, marginPct });
  }
  return hot.sort((a, b) => a.marginPct - b.marginPct).slice(0, 6);
}

function numberFmt(n: number): string { return n.toLocaleString("en-IN"); }
function pct(n: number, total: number) { return total <= 0 ? 0 : Math.round((n / total) * 100); }

// ── Detail Modal ──────────────────────────────────────────────────────────────
function HotSeatModal({
  result,
  lang,
  onClose,
}: {
  result: ConstituencyResult;
  lang: Lang;
  onClose: () => void;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setOpen(true));
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") requestClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const requestClose = () => { setOpen(false); setTimeout(onClose, 160); };

  const sorted = [...result.candidates].sort((a, b) => b.votes - a.votes);
  const leader = sorted[0] ?? null;
  const runnerUp = sorted[1] ?? null;
  const totalVotes = sorted.reduce((s, c) => s + c.votes, 0);
  const topTwoTotal = (leader?.votes ?? 0) + (runnerUp?.votes ?? 0);
  const margin = (leader?.votes ?? 0) - (runnerUp?.votes ?? 0);
  const leadPct = pct(leader?.votes ?? 0, topTwoTotal);
  const runPct = pct(runnerUp?.votes ?? 0, topTwoTotal);

  const leadHex = leader ? partyHex(leader.partyId) : "#888";
  const runHex = runnerUp ? partyHex(runnerUp.partyId) : "#888";
  const constName = lang === "np" ? result.nameNp : result.name;
  const provLabel = provinceName(result.province, lang);

  const statusBadge =
    result.status === "DECLARED"
      ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-200 dark:ring-emerald-900"
      : "bg-amber-50 text-amber-800 ring-1 ring-amber-200 dark:bg-amber-900/30 dark:text-amber-200 dark:ring-amber-900";
  const statusText = result.status === "DECLARED"
    ? (lang === "np" ? "घोषित" : "Declared")
    : (lang === "np" ? "मतगणना" : "Counting");

  const backCls  = open ? "opacity-100" : "opacity-0";
  const panelCls = open ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-[0.98] translate-y-2";

  function displayParty(partyId: string, partyName: string) {
    const name = lang === "np" ? partyName : getParty(partyId).nameEn;
    return name.split(" (")[0];
  }

  return (
    <FocusTrap focusTrapOptions={{ initialFocus: false, escapeDeactivates: false }}>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="hotseats-modal-title">
        <div className={`absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-150 ${backCls}`} onClick={requestClose} />
        <div className={`relative w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-2xl transition-all duration-150 overflow-y-auto max-h-[90vh] dark:bg-[#0c1525] dark:border-slate-800 ${panelCls}`}>
          <div className="flex items-start justify-between gap-4 p-5 border-b border-slate-200 dark:border-slate-800">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 id="hotseats-modal-title" className="text-base font-bold text-slate-900 dark:text-slate-100 truncate">{constName}</h3>
                <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">{result.code}</span>
                {result.status === "COUNTING" && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-0.5 text-[11px] font-bold text-red-700 ring-1 ring-red-200 dark:bg-red-900/30 dark:text-red-200 dark:ring-red-900">
                    <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
                    {lang === "np" ? "लाइभ" : "LIVE"}
                  </span>
                )}
                <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-bold ${statusBadge}`}>{statusText}</span>
              </div>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{result.district} · {provLabel}</p>
            </div>
            <button onClick={requestClose} className="shrink-0 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 active:scale-95 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-700">
              {t("close", lang)}
            </button>
          </div>

          <div className="p-5 space-y-4">
            {result.status === "DECLARED" && leader ? (
              <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3.5 dark:bg-emerald-900/20 dark:border-emerald-800">
                <div className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 uppercase tracking-wide">
                  {lang === "np" ? "नतिजा घोषित" : "Result Declared"}
                </div>
                <div className="mt-1 text-sm font-bold text-slate-900 dark:text-slate-100">
                  {lang === "np" ? "विजेता:" : "Winner:"} {lang === "np" ? leader.nameNp : leader.name}
                </div>
                <div className="mt-0.5 text-xs text-slate-600 dark:text-slate-300">
                  {displayParty(leader.partyId, leader.partyName)} · {numberFmt(leader.votes)} {lang === "np" ? "मत" : "votes"} · {lang === "np" ? "अन्तर" : "Margin"}{" "}
                  <span className="font-semibold">{numberFmt(margin)}</span>
                </div>
              </div>
            ) : result.status === "COUNTING" ? (
              <div className="rounded-xl bg-amber-50 border border-amber-200 p-3.5 dark:bg-amber-900/20 dark:border-amber-800">
                <div className="text-xs font-semibold text-amber-700 dark:text-amber-300 uppercase tracking-wide">
                  {lang === "np" ? "मतगणना जारी छ" : "Counting in Progress"}
                </div>
                <div className="mt-0.5 text-xs text-slate-600 dark:text-slate-300">
                  {lang === "np" ? "यो नतिजा अन्तिम होइन।" : "Results may change as counting continues."}
                </div>
              </div>
            ) : null}

            {leader && runnerUp && (
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 space-y-3">
                <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                  {lang === "np" ? "शीर्ष दुई उम्मेद्वार" : "Top Two Candidates"}
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: leadHex }} />
                      <span className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">{lang === "np" ? leader.nameNp : leader.name}</span>
                      <span className="text-[11px] text-slate-400 shrink-0">{displayParty(leader.partyId, leader.partyName)}</span>
                    </div>
                    <span className="tabular-nums text-sm font-bold text-slate-800 dark:text-slate-100 shrink-0">{numberFmt(leader.votes)}</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${leadPct}%`, backgroundColor: leadHex }} />
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: runHex }} />
                      <span className="text-sm text-slate-700 dark:text-slate-300 truncate">{lang === "np" ? runnerUp.nameNp : runnerUp.name}</span>
                      <span className="text-[11px] text-slate-400 shrink-0">{displayParty(runnerUp.partyId, runnerUp.partyName)}</span>
                    </div>
                    <span className="tabular-nums text-sm text-slate-600 dark:text-slate-300 shrink-0">{numberFmt(runnerUp.votes)}</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${runPct}%`, backgroundColor: runHex }} />
                  </div>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-700 text-xs text-slate-500 dark:text-slate-400">
                  <span>{lang === "np" ? "अन्तर" : "Margin"}</span>
                  <span className="font-bold text-red-600 dark:text-red-400">
                    {numberFmt(margin)} ({totalVotes > 0 ? ((margin / totalVotes) * 100).toFixed(1) : "0.0"}%)
                  </span>
                </div>
              </div>
            )}

            {sorted.length > 0 && (
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                    {lang === "np" ? "सबै उम्मेद्वार" : "All Candidates"}
                  </span>
                </div>
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {sorted.map((c, i) => {
                    const cpHex = partyHex(c.partyId);
                    const sharePct = totalVotes > 0 ? ((c.votes / totalVotes) * 100).toFixed(1) : "0.0";
                    return (
                      <div key={c.candidateId} className="flex items-center gap-3 px-4 py-2.5">
                        <span className="text-xs text-slate-400 dark:text-slate-500 w-4 shrink-0 tabular-nums">{i + 1}</span>
                        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: cpHex }} />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{lang === "np" ? c.nameNp : c.name}</div>
                          <div className="text-[11px] text-slate-400 dark:text-slate-500">{displayParty(c.partyId, c.partyName)}</div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="tabular-nums text-sm font-semibold text-slate-800 dark:text-slate-100">{numberFmt(c.votes)}</div>
                          <div className="text-[11px] text-slate-400 dark:text-slate-500">{sharePct}%</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {result.totalVoters != null && result.totalVoters > 0 && (
              <div className="flex items-center justify-between rounded-xl bg-slate-50 dark:bg-slate-800/40 px-4 py-3 text-sm">
                <span className="text-slate-600 dark:text-slate-300">{lang === "np" ? "मतदाता संख्या" : "Voter Turnout"}</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
                  {numberFmt(result.votesCast)} / {numberFmt(result.totalVoters)}{" "}
                  <span className="text-slate-500 font-normal">({pct(result.votesCast, result.totalVoters)}%)</span>
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </FocusTrap>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function HotSeats({
  results,
  lang = "en",
}: {
  results: ConstituencyResult[];
  lang?: Lang;
}) {
  const hotSeats = computeHotSeats(results);
  const [selected, setSelected] = useState<ConstituencyResult | null>(null);

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
            {hotSeats.map(({ result, top1, top2, marginPct }) => {
              const p1hex = partyHex(top1.partyId);
              const p2hex = partyHex(top2.partyId);
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
                <button key={result.code} type="button" onClick={() => setSelected(result)}
                  className="w-full text-left rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md hover:border-[#2563eb]/30 active:scale-[0.99] cursor-pointer dark:border-slate-700 dark:bg-slate-900 dark:hover:border-[#3b82f6]/40"
                >
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-slate-900 dark:text-slate-100 text-sm leading-tight truncate">{constName}</div>
                      <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${provCls}`}>{provLabel}</span>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusCls}`}>{statusLabel}</span>
                      </div>
                    </div>
                    <span className="shrink-0 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700 dark:bg-red-900/40 dark:text-red-300">
                      {t("closelyContested", lang)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: p1hex }} />
                      <span className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{lang === "np" ? top1.nameNp : top1.name}</span>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 shrink-0">{(lang === "np" ? top1.partyName : getParty(top1.partyId).nameEn).split(" (")[0]}</span>
                    </div>
                    <span className="tabular-nums text-sm font-bold text-slate-800 dark:text-slate-100 shrink-0">{numberFmt(top1.votes)}</span>
                  </div>

                  <div className="relative h-2 w-full rounded-full overflow-hidden bg-slate-100 dark:bg-slate-700 mb-1.5">
                    <div className="absolute left-0 top-0 h-full rounded-l-full" style={{ width: `${top1Pct}%`, backgroundColor: p1hex }} />
                    <div className="absolute top-0 h-full rounded-r-full" style={{ left: `${top1Pct}%`, right: 0, backgroundColor: p2hex }} />
                  </div>

                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: p2hex }} />
                      <span className="text-sm text-slate-600 dark:text-slate-300 truncate">{lang === "np" ? top2.nameNp : top2.name}</span>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 shrink-0">{(lang === "np" ? top2.partyName : getParty(top2.partyId).nameEn).split(" (")[0]}</span>
                    </div>
                    <span className="tabular-nums text-sm text-slate-600 dark:text-slate-300 shrink-0">{numberFmt(top2.votes)}</span>
                  </div>

                  <div className="border-t border-slate-100 dark:border-slate-700 pt-2 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                    <span>{lang === "np" ? "अन्तर" : "Margin"}</span>
                    <span className="font-semibold text-red-600 dark:text-red-400">
                      {numberFmt(top1.votes - top2.votes)} ({marginPct.toFixed(1)}%)
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

      {selected && <HotSeatModal result={selected} lang={lang} onClose={() => setSelected(null)} />}
    </>
  );
}
