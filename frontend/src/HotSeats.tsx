import { parties } from "./mockData";
import type { ConstituencyResult } from "./mockData";
import { t, partyName, provinceName } from "./i18n";
import type { Lang } from "./i18n";

// Hex colours keyed by Tailwind bg class (for inline style on SVG / non-class contexts)
const PARTY_HEX: Record<string, string> = {
  "bg-red-600":     "#dc2626",
  "bg-blue-600":    "#2563eb",
  "bg-orange-600":  "#ea580c",
  "bg-emerald-600": "#059669",
  "bg-yellow-600":  "#ca8a04",
  "bg-cyan-600":    "#0891b2",
  "bg-violet-500":  "#8b5cf6",
  "bg-slate-500":   "#64748b",
};

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

    if (marginPct < 10) {
      hot.push({ result: r, top1, top2, marginPct });
    }
  }

  return hot.sort((a, b) => a.marginPct - b.marginPct).slice(0, 6);
}

function numberFmt(n: number): string {
  return n.toLocaleString("en-IN");
}

export default function HotSeats({
  results,
  lang = "en",
}: {
  results: ConstituencyResult[];
  lang?: Lang;
}) {
  const hotSeats = computeHotSeats(results);

  return (
    <section aria-label="Hot seats">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            🔥 {t("hotSeats", lang)}
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {t("hotSeatsDesc", lang)}
          </p>
        </div>
        <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-700 dark:bg-red-900/40 dark:text-red-300">
          {hotSeats.length} {lang === "np" ? "सिट" : "seats"}
        </span>
      </div>

      {hotSeats.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center dark:border-slate-700 dark:bg-slate-900">
          <div className="text-4xl mb-3">🗳️</div>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            {t("hotSeatsEmpty", lang)}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {hotSeats.map(({ result, top1, top2, marginPct }) => {
            const p1 = parties[top1.party];
            const p2 = parties[top2.party];
            const p1hex = PARTY_HEX[p1.color] ?? "#888";
            const p2hex = PARTY_HEX[p2.color] ?? "#888";
            const totalVotes = top1.votes + top2.votes;
            const top1Pct = totalVotes > 0 ? (top1.votes / totalVotes) * 100 : 50;

            const constName = lang === "np" ? result.nameNp : result.name;
            const provLabel = provinceName(result.province, lang);
            const provCls = PROVINCE_COLORS[result.province] ?? "bg-slate-100 text-slate-700";

            const statusCls =
              result.status === "DECLARED"
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300";
            const statusLabel = result.status === "DECLARED"
              ? (lang === "np" ? "घोषित" : "Declared")
              : (lang === "np" ? "मतगणना" : "Counting");

            return (
              <div
                key={result.code}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-700 dark:bg-slate-900"
              >
                {/* Header row */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-slate-900 dark:text-slate-100 text-sm leading-tight truncate">
                      {constName}
                    </div>
                    <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${provCls}`}>
                        {provLabel}
                      </span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusCls}`}>
                        {statusLabel}
                      </span>
                    </div>
                  </div>
                  <span className="shrink-0 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700 dark:bg-red-900/40 dark:text-red-300">
                    {t("closelyContested", lang)}
                  </span>
                </div>

                {/* Candidate 1 — leading */}
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="h-3 w-3 shrink-0 rounded-full"
                      style={{ backgroundColor: p1hex }}
                    />
                    <span className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                      {lang === "np" ? top1.nameNp : top1.name}
                    </span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 shrink-0">
                      {partyName(top1.party, lang).split(" (")[0]}
                    </span>
                  </div>
                  <span className="tabular-nums text-sm font-bold text-slate-800 dark:text-slate-100 shrink-0">
                    {numberFmt(top1.votes)}
                  </span>
                </div>

                {/* Vote share bar */}
                <div className="relative h-2 w-full rounded-full overflow-hidden bg-slate-100 dark:bg-slate-700 mb-1.5">
                  <div
                    className="absolute left-0 top-0 h-full rounded-l-full"
                    style={{ width: `${top1Pct}%`, backgroundColor: p1hex }}
                  />
                  <div
                    className="absolute top-0 h-full rounded-r-full"
                    style={{ left: `${top1Pct}%`, right: 0, backgroundColor: p2hex }}
                  />
                </div>

                {/* Candidate 2 — runner-up */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="h-3 w-3 shrink-0 rounded-full"
                      style={{ backgroundColor: p2hex }}
                    />
                    <span className="text-sm text-slate-600 dark:text-slate-300 truncate">
                      {lang === "np" ? top2.nameNp : top2.name}
                    </span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 shrink-0">
                      {partyName(top2.party, lang).split(" (")[0]}
                    </span>
                  </div>
                  <span className="tabular-nums text-sm text-slate-600 dark:text-slate-300 shrink-0">
                    {numberFmt(top2.votes)}
                  </span>
                </div>

                {/* Margin footer */}
                <div className="border-t border-slate-100 dark:border-slate-700 pt-2 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                  <span>{lang === "np" ? "अन्तर" : "Margin"}</span>
                  <span className="font-semibold text-red-600 dark:text-red-400">
                    {numberFmt(top1.votes - top2.votes)} ({marginPct.toFixed(1)}%)
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
