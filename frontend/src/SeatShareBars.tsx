import { useElectionStore } from "./store/electionStore";
import type { Lang } from "./i18n";
import type { Snapshot } from "./api";
import Tooltip from "./Tooltip";
import { getParty } from "./lib/partyRegistry";

function seatsToMajority(totalSeats: number) { return Math.floor(totalSeats / 2) + 1; }

const TOP_N = 5;

export default function SeatShareBars({
  snapshot,
  lang = "en",
}: {
  snapshot?: Snapshot;
  lang?: Lang;
}) {
  const seatTally  = useElectionStore((s) => s.seatTally);
  const totalSeats = snapshot?.totalSeats ?? 275;
  const majority   = seatsToMajority(totalSeats);
  const majorityPct = (majority / totalSeats) * 100;

  const sorted = Object.entries(seatTally)
    .map(([partyId, v]) => ({ partyId, total: v.fptp + v.pr }))
    .sort((a, b) => b.total - a.total);

  const topKeys = sorted
    .filter((r) => r.partyId !== "IND")
    .slice(0, TOP_N)
    .map((r) => r.partyId);

  const shownKeys = new Set([...topKeys, "IND"]);

  const othersTotal = sorted
    .filter((r) => !shownKeys.has(r.partyId))
    .reduce((sum, r) => sum + r.total, 0);

  const rows = sorted
    .filter((r) => shownKeys.has(r.partyId))
    .map(({ partyId, total }) => {
      const info = getParty(partyId);
      return {
        partyId,
        total,
        color:    info.color,
        name:     lang === "np" ? info.partyName : info.nameEn,
        symbol:   info.symbol,
        percent:  (total / totalSeats) * 100,
        isOthers: false,
      };
    });

  if (othersTotal > 0) {
    rows.push({
      partyId:  "OTH",
      total:    othersTotal,
      color:    "bg-slate-400",
      name:     lang === "np" ? "अन्य" : "Others",
      symbol:   "🏳️",
      percent:  (othersTotal / totalSeats) * 100,
      isOthers: true,
    });
  }

  const headingEN = `Seat Share (Out of ${totalSeats})`;
  const headingNP = `सिट बाँडफाँट (${totalSeats} मध्ये)`;
  const majorityLabelEN = `Majority needed: ${majority}`;
  const majorityLabelNP = `बहुमत चाहिने: ${majority}`;
  const majorityLineEN = `Majority line (${majority})`;
  const majorityLineNP = `बहुमत रेखा (${majority})`;

  return (
    <section aria-label="Seat share by party" className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm dark:bg-slate-900 dark:border-slate-800">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            {lang === "np" ? headingNP : headingEN}
          </h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            {lang === "np" ? majorityLabelNP : majorityLabelEN}
          </p>
        </div>
        <div className="text-xs text-slate-500 dark:text-slate-400">FPTP + PR</div>
      </div>

      <div className="mt-4 flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
        <Tooltip text="A party needs this many seats to form a majority government.">
          <span className="inline-flex items-center gap-2 cursor-default">
            <span className="inline-block h-3 w-[2px] bg-slate-900/60 dark:bg-slate-100/60" />
            <span>{lang === "np" ? majorityLineNP : majorityLineEN}</span>
          </span>
        </Tooltip>
      </div>

      <div className="mt-4 space-y-5">
        {rows.length === 0 ? (
          <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-4">
            {lang === "np" ? "मतगणना सुरु भएको छैन" : "No results yet — counting has not started"}
          </p>
        ) : (
          rows.map((r) => (
            <div key={r.partyId}>
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className={`h-3 w-3 rounded-full ${r.color}`} />
                  <span className="text-base leading-none">{r.symbol}</span>
                  <span className="font-medium text-slate-900 dark:text-slate-100">{r.name}</span>
                </div>
                <Tooltip text={`${r.name}: ${r.total} seats (${r.percent.toFixed(1)}%)`}>
                  <span className="font-semibold text-slate-700 tabular-nums dark:text-slate-200 cursor-default">{r.total}</span>
                </Tooltip>
              </div>
              <div className="mt-2 relative h-3 w-full rounded-full bg-slate-200 overflow-hidden dark:bg-slate-700">
                <div className="absolute top-0 h-full w-[2px] bg-slate-900/60 dark:bg-slate-100/60" style={{ left: `${majorityPct}%` }} aria-hidden="true" />
                <div
                  role="progressbar"
                  aria-label={`${r.name}: ${r.total} seats`}
                  aria-valuenow={r.total}
                  aria-valuemin={0}
                  aria-valuemax={totalSeats}
                  className={`h-3 ${r.color} transition-[width] duration-700 ease-out`}
                  style={{ width: `${r.percent}%` }}
                />
              </div>
              <div className="mt-1 relative h-4">
                <div className="absolute -translate-x-1/2 text-[10px] text-slate-500 dark:text-slate-400" style={{ left: `${majorityPct}%` }}>
                  {majority}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
