import { parties } from "./mockData";
import { useElectionStore } from "./store/electionStore";
import type { PartyKey } from "./mockData";
import type { Snapshot } from "./api";
import { SummaryCardsSkeleton } from "./Skeleton";

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

export default function SummaryCards({
  isLoading,
  snapshot,
}: {
  isLoading?: boolean;
  snapshot?: Snapshot;
}) {
  // seatTally is always derived from constituency results in the store
  // so that changes in the constituency table are reflected here.
  const seatTally = useElectionStore((s) => s.seatTally);
  const baselineTally = useElectionStore((s) => s.baselineTally);

  if (isLoading) return <SummaryCardsSkeleton />;

  const totalSeats = snapshot?.totalSeats ?? 275;
  const majority = seatsToMajority(totalSeats);

  const totals = Object.entries(seatTally).map(([key, v]) => {
    const k = key as PartyKey;
    const current = v.fptp + v.pr;
    const baseline = baselineTally[k].fptp + baselineTally[k].pr;
    return { key: k, total: current, delta: current - baseline };
  });

  // Stable sort: by total desc, then by fixed party order as tiebreaker
  const PARTY_ORDER: PartyKey[] = ["NC", "CPN-UML", "NCP", "RSP", "OTH"];
  totals.sort((a, b) => b.total - a.total || PARTY_ORDER.indexOf(a.key) - PARTY_ORDER.indexOf(b.key));
  const leader = totals[0];
  const runnerUp = totals[1];

  return (
    <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <Card title="Majority" big={`${majority}`} sub="Seats needed to form government" />

      <Card
        title="Leading party"
        big={parties[leader.key].name.split(" (")[0]}
        sub={`${leader.total} seats`}
        dotColor={parties[leader.key].color}
        symbol={parties[leader.key].symbol}
        right={<ChangePill delta={leader.delta} />}
      />

      <Card
        title="Runner-up"
        big={parties[runnerUp.key].name.split(" (")[0]}
        sub={`${runnerUp.total} seats`}
        dotColor={parties[runnerUp.key].color}
        symbol={parties[runnerUp.key].symbol}
        right={<ChangePill delta={runnerUp.delta} />}
      />
    </section>
  );
}

function Card({
  title,
  big,
  sub,
  dotColor,
  symbol,
  right,
}: {
  title: string;
  big: string;
  sub: string;
  dotColor?: string;
  symbol?: string;
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

      <div className="mt-2 flex items-center gap-2">
        {symbol && <span className="text-2xl leading-none">{symbol}</span>}
        <span className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">{big}</span>
      </div>
      <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">{sub}</div>
    </div>
  );
}
