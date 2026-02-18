import { mockSnapshot, parties } from "./mockData";

function seatsToMajority(totalSeats: number) {
  return Math.floor(totalSeats / 2) + 1;
}

export default function SeatShareBars() {
  const totalSeats = mockSnapshot.totalSeats;
  const majority = seatsToMajority(totalSeats);
  const majorityPct = (majority / totalSeats) * 100;

  const rows = Object.entries(mockSnapshot.seatTally)
    .map(([key, v]) => {
      const total = v.fptp + v.pr;
      return {
        key,
        total,
        color: parties[key as keyof typeof parties].color,
        name: parties[key as keyof typeof parties].name,
        percent: (total / totalSeats) * 100,
      };
    })
    .sort((a, b) => b.total - a.total);

  return (
    <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            Seat Share (Out of {totalSeats})
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Majority needed: <span className="font-semibold text-slate-900">{majority}</span>
          </p>
        </div>

        <div className="text-xs text-slate-500">
          FPTP + PR combined
        </div>
      </div>

      {/* Majority marker legend */}
      <div className="mt-4 flex items-center gap-2 text-xs text-slate-600">
        <span className="inline-block h-3 w-[2px] bg-slate-900/60" />
        <span>
          Majority line ({majority})
        </span>
      </div>

      <div className="mt-4 space-y-5">
        {rows.map((r) => (
          <div key={r.key}>
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span className={`h-3 w-3 rounded-full ${r.color}`} />
                <span className="font-medium text-slate-900">{r.name}</span>
              </div>

              <span className="font-semibold text-slate-700 tabular-nums">
                {r.total}
              </span>
            </div>

            {/* Track */}
            <div className="mt-2 relative h-3 w-full rounded-full bg-slate-200 overflow-hidden">
              {/* Majority line */}
              <div
                className="absolute top-0 h-full w-[2px] bg-slate-900/60"
                style={{ left: `${majorityPct}%` }}
                aria-hidden="true"
              />

              {/* Fill */}
              <div
                className={`h-3 ${r.color} transition-[width] duration-700 ease-out`}
                style={{ width: `${r.percent}%` }}
              />
            </div>

            {/* Majority label under bar (optional, subtle) */}
            <div className="mt-1 relative h-4">
              <div
                className="absolute -translate-x-1/2 text-[10px] text-slate-500"
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
