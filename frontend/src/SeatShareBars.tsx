import { mockSnapshot, parties } from "./mockData";

export default function SeatShareBars() {
  const totalSeats = mockSnapshot.totalSeats;

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
      <h2 className="text-lg font-semibold text-slate-900 mb-4">
        Seat Share (Out of {totalSeats})
      </h2>

      <div className="space-y-4">
        {rows.map((r) => (
          <div key={r.key}>
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span className={`h-3 w-3 rounded-full ${r.color}`} />
                <span className="font-medium text-slate-900">
                  {r.name}
                </span>
              </div>

              <span className="font-semibold text-slate-700 tabular-nums">
                {r.total}
              </span>
            </div>

            <div className="mt-2 h-3 w-full rounded-full bg-slate-200 overflow-hidden">
              <div
                className={`h-3 ${r.color} transition-[width] duration-700 ease-out`}
                style={{ width: `${r.percent}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
