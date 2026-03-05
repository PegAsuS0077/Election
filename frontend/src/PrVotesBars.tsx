import { Link } from "react-router-dom";
import { useElectionStore } from "./store/electionStore";
import { getParty, partySlug } from "./lib/partyRegistry";
import type { Lang } from "./i18n";

type Row = {
  partyId: string;
  name: string;
  symbol: string;
  symbolUrl: string;
  hex: string;
  votes: number;
  voteShare: number;
  expectedSeats: number;
  isOthers?: boolean;
};

function fmt(n: number): string {
  return n.toLocaleString("en-IN");
}

const TOP_N = 8;

export default function PrVotesBars({ lang = "en" }: { lang?: Lang }) {
  const prVoteByParty = useElectionStore((s) => s.prVoteByParty);
  const seatTally = useElectionStore((s) => s.seatTally);

  const entries = Object.entries(prVoteByParty).filter(([, votes]) => votes > 0);
  const totalPrVotes = entries.reduce((sum, [, votes]) => sum + votes, 0);

  if (entries.length === 0 || totalPrVotes <= 0) {
    return (
      <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm dark:bg-slate-900 dark:border-slate-800">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          {lang === "np" ? "समानुपातिक मत (PR)" : "Proportional Votes (PR)"}
        </h2>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          {lang === "np"
            ? "PR मतको प्रत्यक्ष फिड उपलब्ध हुँदा यहाँ दल अनुसार मत र अपेक्षित सिट देखिनेछ।"
            : "Party-wise PR votes and expected seats will appear here when the PR feed is available."}
        </p>
      </section>
    );
  }

  const sorted: Row[] = entries
    .map(([partyId, votes]) => {
      const info = getParty(partyId);
      return {
        partyId,
        name: lang === "np" ? info.partyName : info.nameEn,
        symbol: info.symbol,
        symbolUrl: info.symbolUrl,
        hex: info.hex,
        votes,
        voteShare: (votes / totalPrVotes) * 100,
        expectedSeats: seatTally[partyId]?.pr ?? 0,
      };
    })
    .sort((a, b) => b.votes - a.votes);

  const rows = sorted.slice(0, TOP_N);
  if (sorted.length > TOP_N) {
    const others = sorted.slice(TOP_N);
    rows.push({
      partyId: "OTH",
      name: lang === "np" ? "अन्य" : "Others",
      symbol: "🏳️",
      symbolUrl: "",
      hex: "#94a3b8",
      votes: others.reduce((s, r) => s + r.votes, 0),
      voteShare: others.reduce((s, r) => s + r.voteShare, 0),
      expectedSeats: others.reduce((s, r) => s + r.expectedSeats, 0),
      isOthers: true,
    });
  }

  return (
    <section aria-label="PR vote share by party" className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm dark:bg-slate-900 dark:border-slate-800">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            {lang === "np" ? "समानुपातिक मत (PR)" : "Proportional Votes (PR)"}
          </h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            {lang === "np"
              ? `कुल PR मत: ${fmt(totalPrVotes)}`
              : `Total PR votes: ${fmt(totalPrVotes)}`}
          </p>
        </div>
        <div className="text-xs text-slate-500 dark:text-slate-400">
          {lang === "np" ? "अपेक्षित PR सिट (110)" : "Expected PR seats (110)"}
        </div>
      </div>

      <div className="mt-4 space-y-5">
        {rows.map((r) => {
          const canLink = !r.isOthers && r.partyId !== "IND";
          const label = (
            <div className="flex items-center justify-between text-sm gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: r.hex }} />
                {r.symbolUrl
                  ? <img src={r.symbolUrl} alt={r.symbol} className="h-5 w-5 object-contain shrink-0" />
                  : <span className="text-base leading-none shrink-0">{r.symbol}</span>}
                <span className={`font-medium text-slate-900 dark:text-slate-100 truncate${canLink ? " group-hover:underline" : ""}`}>
                  {r.name}
                </span>
              </div>
              <div className="text-right shrink-0">
                <div className="font-semibold text-slate-700 dark:text-slate-200 tabular-nums">
                  {fmt(r.votes)}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
                  {r.expectedSeats} {lang === "np" ? "सिट" : "seats"}
                </div>
              </div>
            </div>
          );

          return (
            <div key={r.partyId} className={canLink ? "group" : ""}>
              {canLink
                ? <Link to={`/party/${partySlug(getParty(r.partyId).nameEn)}`} className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563eb] rounded">{label}</Link>
                : label}
              <div className="mt-2 h-3 w-full rounded-full bg-slate-200 overflow-hidden dark:bg-slate-700">
                <div
                  className="h-3 transition-[width] duration-700 ease-out"
                  style={{ width: `${r.voteShare}%`, backgroundColor: r.hex }}
                  role="progressbar"
                  aria-label={`${r.name}: ${r.voteShare.toFixed(1)}%`}
                  aria-valuenow={r.voteShare}
                  aria-valuemin={0}
                  aria-valuemax={100}
                />
              </div>
              <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
                {r.voteShare.toFixed(1)}%
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
