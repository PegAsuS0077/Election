import { mockSnapshot, parties, seatChange } from "./mockData";

function seatsToMajority(totalSeats: number) {
  return Math.floor(totalSeats / 2) + 1;
}

function ChangePill({ delta }: { delta: number }) {
  const up = delta > 0;
  const down = delta < 0;

  const cls = up
    ? "bg-emerald-50 text-emerald-800 ring-emerald-200"
    : down
    ? "bg-rose-50 text-rose-800 ring-rose-200"
    : "bg-slate-50 text-slate-700 ring-slate-200";

  const sign = up ? "+" : "";
  const label = `${sign}${delta}`;

  return (
    <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-bold ring-1 ${cls}`}>
      {up ? "▲" : down ? "▼" : "•"} {label}
    </span>
  );
}

export default function SummaryCards() {
  const majority = seatsToMajority(mockSnapshot.totalSeats);

  const totals = Object.entries(mockSnapshot.seatTally).map(([key, v]) => ({
    key,
    total: v.fptp + v.pr,
  }));

  totals.sort((a, b) => b.total - a.total);
  const leader = totals[0];
  const runnerUp = totals[1];

  return (
    <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <Card title="Majority" big={`${majority}`} sub="Seats needed to form government" />

      <Card
        title="Leading party"
        big={parties[leader.key as keyof typeof parties].name.split(" (")[0]}
        sub={`${leader.total} seats`}
        dotColor={parties[leader.key as keyof typeof parties].color}
        right={<ChangePill delta={seatChange[leader.key as keyof typeof seatChange]} />}
      />

      <Card
        title="Runner-up"
        big={parties[runnerUp.key as keyof typeof parties].name.split(" (")[0]}
        sub={`${runnerUp.total} seats`}
        dotColor={parties[runnerUp.key as keyof typeof parties].color}
        right={<ChangePill delta={seatChange[runnerUp.key as keyof typeof seatChange]} />}
      />
    </section>
  );
}

function Card({
  title,
  big,
  sub,
  dotColor,
  right,
}: {
  title: string;
  big: string;
  sub: string;
  dotColor?: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:bg-slate-900 dark:border-slate-800">
      <div className="text-sm font-semibold text-slate-600 dark:text-slate-300 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {dotColor ? <span className={`h-3 w-3 rounded-full ${dotColor}`} /> : null}
          {title}
        </div>
        {right}
      </div>

      <div className="mt-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
        {big}
      </div>
      <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">{sub}</div>
    </div>
  );
}
