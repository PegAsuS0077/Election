import { parties } from "./mockData";
import { useElectionStore } from "./store/electionStore";
import type { Snapshot } from "./api";
import Tooltip from "./Tooltip";

function seatsToMajority(totalSeats: number) {
  return Math.floor(totalSeats / 2) + 1;
}

export default function SeatShareBars({ snapshot }: { snapshot?: Snapshot }) {
  // seatTally is always derived from constituency results in the store
  // so that changes in the constituency table are reflected here.
  const seatTally = useElectionStore((s) => s.seatTally);
  const totalSeats = snapshot?.totalSeats ?? 275;
  const majority = seatsToMajority(totalSeats);
  const majorityPct = (majority / totalSeats) * 100;

  const PARTY_ORDER = ["NC", "CPN-UML", "NCP", "RSP", "OTH"];
  const rows = Object.entries(seatTally)
    .map(([key, v]) => {
      const total = v.fptp + v.pr;
      return {
        key,
        total,
        color:   parties[key as keyof typeof parties].color,
        name:    parties[key as keyof typeof parties].name,
        symbol:  parties[key as keyof typeof parties].symbol,
        percent: (total / totalSeats) * 100,
      };
    })
    .sort((a, b) => b.total - a.total || PARTY_ORDER.indexOf(a.key) - PARTY_ORDER.indexOf(b.key));

  return (
    <section
      aria-label="Seat share by party"
      className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm dark:bg-slate-900 dark:border-slate-800"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Seat Share (Out of {totalSeats})
          </h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Majority needed:{" "}
            <span className="font-semibold text-slate-900 dark:text-slate-100">
              {majority}
            </span>
          </p>
        </div>

        <div className="text-xs text-slate-500 dark:text-slate-400">FPTP + PR</div>
      </div>

      <div className="mt-4 flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
        <Tooltip text="A party needs this many seats to form a majority government.">
          <span className="inline-flex items-center gap-2 cursor-default">
            <span className="inline-block h-3 w-[2px] bg-slate-900/60 dark:bg-slate-100/60" />
            <span>Majority line ({majority})</span>
          </span>
        </Tooltip>
      </div>

      <div className="mt-4 space-y-5">
        {rows.map((r) => (
          <div key={r.key}>
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span className={`h-3 w-3 rounded-full ${r.color}`} />
                <span className="text-base leading-none">{r.symbol}</span>
                <span className="font-medium text-slate-900 dark:text-slate-100">
                  {r.name}
                </span>
              </div>
              <Tooltip text={`${r.name}: ${r.total} seats (${r.percent.toFixed(1)}%)`}>
                <span className="font-semibold text-slate-700 tabular-nums dark:text-slate-200 cursor-default">
                  {r.total}
                </span>
              </Tooltip>
            </div>

            <div className="mt-2 relative h-3 w-full rounded-full bg-slate-200 overflow-hidden dark:bg-slate-700">
              <div
                className="absolute top-0 h-full w-[2px] bg-slate-900/60 dark:bg-slate-100/60"
                style={{ left: `${majorityPct}%` }}
                aria-hidden="true"
              />

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
              <div
                className="absolute -translate-x-1/2 text-[10px] text-slate-500 dark:text-slate-400"
                style={{ left: `${majorityPct}%` }}
              >
                {majority}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
