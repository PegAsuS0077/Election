import { Link } from "react-router-dom";
import { useElectionStore } from "./store/electionStore";
import { t } from "./i18n";
import type { Lang } from "./i18n";
import { SummaryCardsSkeleton } from "./Skeleton";
import { getParty, partySlug } from "./lib/partyRegistry";

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
  lang = "en",
}: {
  isLoading?: boolean;
  lang?: Lang;
}) {
  const seatTally    = useElectionStore((s) => s.seatTally);
  const results      = useElectionStore((s) => s.results);
  const baselineTally = useElectionStore((s) => s.baselineTally);

  if (isLoading) return <SummaryCardsSkeleton />;

  const countingLeads: Record<string, number> = {};
  for (const r of results) {
    // Safeguard: if a winner is already marked in this constituency,
    // do not count it as "leading" even if status is stale.
    if (r.status !== "COUNTING" || r.candidates.length === 0 || r.candidates.some((c) => c.isWinner)) continue;
    const maxVotes = Math.max(...r.candidates.map((c) => c.votes));
    if (maxVotes <= 0) continue;
    const lead = r.candidates.find((c) => c.votes === maxVotes);
    if (!lead) continue;
    countingLeads[lead.partyId] = (countingLeads[lead.partyId] ?? 0) + 1;
  }

  const partyIds = Array.from(
    new Set([...Object.keys(seatTally), ...Object.keys(countingLeads)])
  );

  const totals = partyIds.map((partyId) => {
    const declared = seatTally[partyId]?.fptp ?? 0;
    const leading  = countingLeads[partyId] ?? 0;
    const current  = declared + leading;
    const base     = baselineTally[partyId];
    const baseTotal = base ? base.fptp : 0;
    return { partyId, declared, leading, total: current, delta: declared - baseTotal };
  });

  totals.sort((a, b) => (b.total - a.total) || (b.declared - a.declared));
  const namedTotals = totals.filter((t) => t.partyId !== "IND");
  const leader   = namedTotals[0];
  const runnerUp = namedTotals[1];
  const nextThree = namedTotals.slice(2, 5);

  if (!leader || !runnerUp) {
    return (
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title={t("leadingParty", lang)} big="—" sub={t("preElection", lang)} />
        <Card title={t("runnerUp", lang)} big="—" sub={t("preElection", lang)} />
      </section>
    );
  }

  const leaderInfo   = getParty(leader.partyId);
  const runnerUpInfo = getParty(runnerUp.partyId);

  return (
    <section className="space-y-3">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Link to={`/party/${partySlug(leaderInfo.nameEn)}/constituencies`} className="block rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563eb]">
          <Card
            title={t("leadingParty", lang)}
            big={(lang === "np" ? leaderInfo.partyName : leaderInfo.nameEn).split(" (")[0]}
            leadingSeats={leader.leading}
            leadingLabel={t("leading", lang)}
            declaredSeats={leader.declared}
            declaredLabel={t("declared", lang)}
            dotHex={leaderInfo.hex}
            symbol={leaderInfo.symbol}
            symbolUrl={leaderInfo.symbolUrl}
            right={<ChangePill delta={leader.delta} />}
            clickable
          />
        </Link>
        <Link to={`/party/${partySlug(runnerUpInfo.nameEn)}/constituencies`} className="block rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563eb]">
          <Card
            title={t("runnerUp", lang)}
            big={(lang === "np" ? runnerUpInfo.partyName : runnerUpInfo.nameEn).split(" (")[0]}
            leadingSeats={runnerUp.leading}
            leadingLabel={t("leading", lang)}
            declaredSeats={runnerUp.declared}
            declaredLabel={t("declared", lang)}
            dotHex={runnerUpInfo.hex}
            symbol={runnerUpInfo.symbol}
            symbolUrl={runnerUpInfo.symbolUrl}
            right={<ChangePill delta={runnerUp.delta} />}
            clickable
          />
        </Link>
      </div>

      {nextThree.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {nextThree.map((party, idx) => {
            const partyInfo = getParty(party.partyId);
            const partyName = (lang === "np" ? partyInfo.partyName : partyInfo.nameEn).split(" (")[0];
            return (
              <Link
                key={party.partyId}
                to={`/party/${partySlug(partyInfo.nameEn)}/constituencies`}
                className="block rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563eb]"
              >
                <CompactCard
                  rank={idx + 3}
                  name={partyName}
                  leadingSeats={party.leading}
                  leadingLabel={t("leading", lang)}
                  declaredSeats={party.declared}
                  declaredLabel={t("declared", lang)}
                  dotHex={partyInfo.hex}
                  symbol={partyInfo.symbol}
                  symbolUrl={partyInfo.symbolUrl}
                  clickable
                />
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}

function Card({
  title, big, sub, leadingSeats, leadingLabel, declaredSeats, declaredLabel, dotHex, symbol, symbolUrl, right, clickable,
}: {
  title: string; big: string; sub?: string;
  leadingSeats?: number; leadingLabel?: string; declaredSeats?: number; declaredLabel?: string;
  dotHex?: string; symbol?: string; symbolUrl?: string; right?: React.ReactNode; clickable?: boolean;
}) {
  return (
    <div className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:bg-slate-900 dark:border-slate-800${clickable ? " transition hover:-translate-y-0.5 hover:shadow-md hover:border-[#2563eb]/30 active:scale-[0.99]" : ""}`}>
      <div className="text-sm font-semibold text-slate-600 dark:text-slate-300 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {dotHex ? <span className="h-3 w-3 rounded-full" style={{ backgroundColor: dotHex }} /> : null}
          {title}
        </div>
        {right}
      </div>
      <div className="mt-2 flex items-center gap-2">
        {symbolUrl
          ? <img src={symbolUrl} alt={symbol} className="h-8 w-8 object-contain" />
          : symbol
          ? <span className="text-2xl leading-none">{symbol}</span>
          : null}
        <span className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">{big}</span>
      </div>
      {typeof leadingSeats === "number" && typeof declaredSeats === "number" ? (
        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px]">
          <span className="rounded-full bg-blue-50 px-2 py-0.5 font-semibold text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
            {leadingSeats} {leadingLabel}
          </span>
          <span className="rounded-full bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
            {declaredSeats} {declaredLabel}
          </span>
        </div>
      ) : (
        <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">{sub}</div>
      )}
    </div>
  );
}

function CompactCard({
  rank, name, leadingSeats, leadingLabel, declaredSeats, declaredLabel, dotHex, symbol, symbolUrl, clickable,
}: {
  rank: number;
  name: string;
  leadingSeats: number;
  leadingLabel: string;
  declaredSeats: number;
  declaredLabel: string;
  dotHex?: string;
  symbol?: string;
  symbolUrl?: string;
  clickable?: boolean;
}) {
  return (
    <div className={`rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:bg-slate-900 dark:border-slate-800${clickable ? " transition hover:-translate-y-0.5 hover:shadow-md hover:border-[#2563eb]/30 active:scale-[0.99]" : ""}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">#{rank}</span>
          {dotHex ? <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: dotHex }} /> : null}
          <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">{name}</span>
        </div>
      </div>
      <div className="mt-2 flex items-center gap-2">
        {symbolUrl
          ? <img src={symbolUrl} alt={symbol} className="h-5 w-5 object-contain" />
          : symbol
          ? <span className="text-base leading-none">{symbol}</span>
          : null}
        <div className="flex items-center gap-1.5 text-[11px]">
          <span className="rounded-full bg-blue-50 px-2 py-0.5 font-semibold text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
            {leadingSeats} {leadingLabel}
          </span>
          <span className="rounded-full bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
            {declaredSeats} {declaredLabel}
          </span>
        </div>
      </div>
    </div>
  );
}
