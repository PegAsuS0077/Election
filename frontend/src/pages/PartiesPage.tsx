import { useElectionStore } from "../store/electionStore";
import { parties, seatChange } from "../mockData";
import type { PartyKey } from "../mockData";
import { provinceName } from "../i18n";
import { provinces } from "../mockData";
import Layout from "../components/Layout";
import { PARTY_HEX } from "../components/Layout";

function fmt(n: number) { return n.toLocaleString("en-IN"); }

export default function PartiesPage() {
  const results   = useElectionStore((s) => s.results);
  const seatTally = useElectionStore((s) => s.seatTally);
  const lang      = useElectionStore((s) => s.lang);

  const totalSeats = 275;

  // Build enriched party data
  const partyData = (Object.keys(parties) as PartyKey[]).map((key) => {
    const p     = parties[key];
    const tally = seatTally[key];
    const total = tally.fptp + tally.pr;
    const pct   = (total / totalSeats) * 100;

    // Total votes across all constituencies
    let totalVotes = 0;
    let partyVotes = 0;
    for (const r of results) {
      for (const c of r.candidates) {
        totalVotes += c.votes;
        if (c.party === key) partyVotes += c.votes;
      }
    }
    const voteSharePct = totalVotes > 0 ? (partyVotes / totalVotes) * 100 : 0;

    // Top 3 winning candidates
    const winners = results
      .filter((r) => r.status === "DECLARED")
      .filter((r) => {
        const w = [...r.candidates].sort((a, b) => b.votes - a.votes)[0];
        return w?.party === key;
      })
      .sort((a, b) => {
        const wa = [...a.candidates].sort((x, y) => y.votes - x.votes)[0];
        const wb = [...b.candidates].sort((x, y) => y.votes - x.votes)[0];
        return wb.votes - wa.votes;
      })
      .slice(0, 3);

    // Province breakdown
    const provBreakdown: Record<string, number> = {};
    for (const prov of provinces) {
      const ct = results
        .filter((r) => r.province === prov && r.status === "DECLARED")
        .filter((r) => [...r.candidates].sort((a, b) => b.votes - a.votes)[0]?.party === key)
        .length;
      if (ct > 0) provBreakdown[prov] = ct;
    }

    const change = seatChange[key] ?? 0;
    const hex    = PARTY_HEX[p.color] ?? "#888";

    return { key, p, tally, total, pct, voteSharePct, partyVotes, winners, provBreakdown, change, hex };
  }).sort((a, b) => b.total - a.total);

  const heroBadge = (
    <span className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-3.5 py-1 text-xs font-semibold text-blue-400 uppercase tracking-widest">
      {lang === "np" ? "२ दलहरू · द्वितीय निर्वाचन" : "8 parties · General Election 2082"}
    </span>
  );

  return (
    <Layout
      title="Political Parties 2082"
      titleNp="राजनीतिक दलहरू ⃦⃨⃨⃨"
      subtitle="Seat tally, vote share, and candidate highlights for all major parties"
      subtitleNp="सबै प्रमुख दलहरूको सिट गणना, मत बांडफांट र उम्मेद्वार विवरण"
      badge={heroBadge}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-2">
        {partyData.map(({ key, p, tally, total, pct, voteSharePct, partyVotes, winners, provBreakdown, change, hex }) => (
          <div key={key} className="rounded-2xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#0c1525] overflow-hidden shadow-sm hover:shadow-md transition-shadow">
            {/* Colour stripe */}
            <div className="h-1.5 w-full" style={{ backgroundColor: hex }} />

            <div className="p-5">
              {/* Header */}
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex items-center gap-3">
                  <span className="text-3xl leading-none">{p.symbol}</span>
                  <div>
                    <h2 className="font-bold text-slate-900 dark:text-slate-100 text-base leading-tight" style={{ fontFamily: "'Sora', sans-serif" }}>
                      {lang === "np" ? p.nameNp : p.name}
                    </h2>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                      {lang === "np" ? p.name : p.nameNp}
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-3xl font-bold tabular-nums leading-none" style={{ color: hex, fontFamily: "'DM Mono', monospace" }}>
                    {total}
                  </div>
                  <div className="text-[10px] text-slate-400 uppercase tracking-wide mt-0.5">
                    {lang === "np" ? "कुल सिट" : "total seats"}
                  </div>
                </div>
              </div>

              {/* Seat bar */}
              <div className="mb-3">
                <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
                  <span>{lang === "np" ? "सिट बांडफांट" : "Seat share"}</span>
                  <span className="tabular-nums">{pct.toFixed(1)}%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-700" style={{ width: pct + "%", backgroundColor: hex }} />
                </div>
              </div>

              {/* FPTP / PR breakdown */}
              <div className="flex gap-4 mb-4 text-xs">
                <div>
                  <span className="text-slate-400">FPTP </span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 tabular-nums">{tally.fptp}</span>
                </div>
                <div>
                  <span className="text-slate-400">PR </span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 tabular-nums">{tally.pr}</span>
                </div>
                <div>
                  <span className="text-slate-400">{lang === "np" ? "मत" : "Votes"} </span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 tabular-nums">{fmt(partyVotes)}</span>
                  <span className="text-slate-400 ml-1">({voteSharePct.toFixed(1)}%)</span>
                </div>
                {change !== 0 && (
                  <div className={"ml-auto font-bold tabular-nums " + (change > 0 ? "text-emerald-600" : "text-red-500")}>
                    {change > 0 ? "+" : ""}{change}
                  </div>
                )}
              </div>

              {/* Top winning candidates */}
              {winners.length > 0 && (
                <div className="border-t border-slate-100 dark:border-slate-800 pt-3 mb-3">
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-2">
                    {lang === "np" ? "शीर्ष विजेता" : "Top Winners"}
                  </p>
                  <div className="space-y-1">
                    {winners.map((r) => {
                      const w = [...r.candidates].sort((a, b) => b.votes - a.votes)[0];
                      return (
                        <div key={r.code} className="flex items-center justify-between text-xs">
                          <span className="text-slate-700 dark:text-slate-300 truncate max-w-[60%]">
                            {lang === "np" ? w.nameNp : w.name}
                          </span>
                          <span className="text-slate-500 dark:text-slate-400 tabular-nums text-[11px]" style={{ fontFamily: "'DM Mono', monospace" }}>
                            {fmt(w.votes)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Province breakdown */}
              {Object.keys(provBreakdown).length > 0 && (
                <div className="border-t border-slate-100 dark:border-slate-800 pt-3">
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-2">
                    {lang === "np" ? "प्रदेश अनुसार" : "By Province"}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(provBreakdown).map(([prov, ct]) => (
                      <span key={prov} className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                        {provinceName(prov, lang)} {ct}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </Layout>
  );
}
