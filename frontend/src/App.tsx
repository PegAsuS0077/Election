import { mockSnapshot, parties } from "./mockData";
import ProgressBar from "./ProgressBar";
import ConstituencyTable from "./ConstituencyTable";
import SummaryCards from "./SummaryCards";
import SeatShareBars from "./SeatShareBars";



function formatTime(iso: string) {
  return new Date(iso).toLocaleString();
}

export default function App() {
  const entries = Object.entries(mockSnapshot.seatTally) as Array<
    [keyof typeof mockSnapshot.seatTally, { fptp: number; pr: number }]
  >;

  const rows = entries
    .map(([key, v]) => {
      const total = v.fptp + v.pr;

      return {
        key,
        name: parties[key].name,
        color: parties[key].color,
        fptp: v.fptp,
        pr: v.pr,
        total,
      };
    })
    .sort((a, b) => b.total - a.total);

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <h1 className="text-xl font-bold text-slate-900">
            Nepal House of Representatives Election 2026
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Live Results Dashboard · Last updated:{" "}
            <span className="font-semibold text-slate-800">
              {formatTime(mockSnapshot.lastUpdated)}
            </span>
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-6 space-y-6">

        <SummaryCards />

        {/* Leaderboard */}
        <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">
              Party Leaderboard
            </h2>
            <div className="text-sm text-slate-600">
              Declared:{" "}
              <span className="font-bold text-slate-900">
                {mockSnapshot.declaredSeats}
              </span>{" "}
              / {mockSnapshot.totalSeats}
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {rows.map((r) => (
              <div
                key={r.key}
                className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className={`h-3 w-3 rounded-full ${r.color}`} />
                  <div className="min-w-0">
                    <div className="font-semibold text-slate-900 truncate">
                      {r.name}
                    </div>
                    <div className="text-xs text-slate-500">
                      FPTP{" "}
                      <span className="font-semibold text-slate-700">
                        {r.fptp}
                      </span>{" "}
                      · PR{" "}
                      <span className="font-semibold text-slate-700">
                        {r.pr}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="text-2xl font-bold text-slate-900 tabular-nums">
                  {r.total}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Seat Share Bars */}
        <SeatShareBars />

        {/* Progress */}
        <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">
            Seats Declared Progress
          </h2>

          <ProgressBar
            declared={mockSnapshot.declaredSeats}
            total={mockSnapshot.totalSeats}
          />
        </section>

        {/* Constituency Table */}
        <ConstituencyTable />

      </main>
    </div>
  );
}
