import { useElectionStore } from "./store/electionStore";
import { t } from "./i18n";
import type { Lang } from "./i18n";
import type { Snapshot } from "./api";
import { SummaryCardsSkeleton } from "./Skeleton";
import { getParty } from "./lib/partyRegistry";

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
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-bold ring-1 ${cls}`}>
      {up ? "▲" : down ? "▼" : "•"} {sign}{delta}
    </span>
  );
}

export default function SummaryCards({
  isLoading,
  snapshot,
  lang = "en",
}: {
  isLoading?: boolean;
  snapshot?: Snapshot;
  lang?: Lang;
}) {
  const seatTally    = useElectionStore((s) => s.seatTally);
  const baselineTally = useElectionStore((s) => s.baselineTally);

  if (isLoading) return <SummaryCardsSkeleton />;

  const totalSeats = snapshot?.totalSeats ?? 275;
  const majority   = seatsToMajority(totalSeats);

  const totals = Object.entries(seatTally).map(([partyId, v]) => {
    const current   = v.fptp + v.pr;
    const base      = baselineTally[partyId];
    const baseTotal = base ? base.fptp + base.pr : 0;
    return { partyId, total: current, delta: current - baseTotal };
  });

  totals.sort((a, b) => b.total - a.total);
  const namedTotals = totals.filter((t) => t.partyId !== "IND");
  const leader   = namedTotals[0];
  const runnerUp = namedTotals[1];

  if (!leader || !runnerUp) {
    return (
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card title={t("majority", lang)} big={`${majority}`} sub={t("majorityDesc", lang)} />
        <Card title={t("leadingParty", lang)} big="—" sub={t("preElection", lang)} />
        <Card title={t("runnerUp", lang)} big="—" sub={t("preElection", lang)} />
      </section>
    );
  }

  const leaderInfo   = getParty(leader.partyId);
  const runnerUpInfo = getParty(runnerUp.partyId);

  return (
    <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <Card title={t("majority", lang)} big={`${majority}`} sub={t("majorityDesc", lang)} />
      <Card
        title={t("leadingParty", lang)}
        big={leaderInfo.nameEn.split(" (")[0]}
        sub={`${leader.total} ${t("seats", lang)}`}
        dotColor={leaderInfo.color}
        symbol={leaderInfo.symbol}
        right={<ChangePill delta={leader.delta} />}
      />
      <Card
        title={t("runnerUp", lang)}
        big={runnerUpInfo.nameEn.split(" (")[0]}
        sub={`${runnerUp.total} ${t("seats", lang)}`}
        dotColor={runnerUpInfo.color}
        symbol={runnerUpInfo.symbol}
        right={<ChangePill delta={runnerUp.delta} />}
      />
    </section>
  );
}

function Card({
  title, big, sub, dotColor, symbol, right,
}: {
  title: string; big: string; sub: string;
  dotColor?: string; symbol?: string; right?: React.ReactNode;
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
