import { mockSnapshot, parties } from "./mockData";

function seatsToMajority(totalSeats: number) {
  return Math.floor(totalSeats / 2) + 1;
}

export default function SummaryCards() {
  const majority = seatsToMajority(mockSnapshot.totalSeats);

  const totals = Object.entries(mockSnapshot.seatTally).map(([key, v]) => {
    const total = v.fptp + v.pr;
    return { key, total };
  });

  totals.sort((a, b) => b.total - a.total);
  const leader = totals[0];
  const runnerUp = totals[1];

  return (
    <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <Card
        title="Majority"
        big={`${majority}`}
        sub={`Seats needed to form government`}
      />

      <Card
        title="Leading party"
        big={`${parties[leader.key as keyof typeof parties].name.split(" (")[0]}`}
        sub={`${leader.total} seats`}
        dotColor={parties[leader.key as keyof typeof parties].color}
      />

      <Card
        title="Runner-up"
        big={`${parties[runnerUp.key as keyof typeof parties].name.split(" (")[0]}`}
        sub={`${runnerUp.total} seats`}
        dotColor={parties[runnerUp.key as keyof typeof parties].color}
      />
    </section>
  );
}

function Card({
  title,
  big,
  sub,
  dotColor,
}: {
  title: string;
  big: string;
  sub: string;
  dotColor?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="text-sm font-semibold text-slate-600 flex items-center gap-2">
        {dotColor ? <span className={`h-3 w-3 rounded-full ${dotColor}`} /> : null}
        {title}
      </div>
      <div className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
        {big}
      </div>
      <div className="mt-1 text-sm text-slate-600">{sub}</div>
    </div>
  );
}
