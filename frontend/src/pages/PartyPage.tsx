/**
 * PartyPage — /party/:partyId
 *
 * Minimal SEO landing page for a single political party.
 * Renders: party header, seat tally, candidate list for that party.
 * All data from Zustand store — no new fetching.
 */

import { useEffect, useMemo, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useElectionStore } from "../store/electionStore";
import { getParty, partyHex } from "../lib/partyRegistry";
import { provinceName } from "../i18n";
import { candidatePhotoUrl } from "../lib/parseUpstreamData";
import Layout from "../components/Layout";

function fmt(n: number) { return n.toLocaleString("en-IN"); }

export default function PartyPage() {
  const { partyId } = useParams<{ partyId: string }>();
  const results    = useElectionStore((s) => s.results);
  const seatTally  = useElectionStore((s) => s.seatTally);
  const lang       = useElectionStore((s) => s.lang);
  const navigate   = useNavigate();

  const id     = partyId ?? "";
  const pInfo  = getParty(id);
  const tally  = seatTally[id] ?? { fptp: 0, pr: 0 };
  const total  = tally.fptp + tally.pr;
  const hex    = partyHex(id);

  // All candidates for this party, sorted by votes desc
  const candidates = useMemo(() => {
    const flat: {
      candidateId: number;
      name: string;
      nameNp: string;
      votes: number;
      constName: string;
      district: string;
      province: string;
      isWinner: boolean;
      status: string;
    }[] = [];
    for (const r of results) {
      for (const c of r.candidates) {
        if (c.partyId !== id) continue;
        const topVotes = Math.max(...r.candidates.map((x) => x.votes));
        const isWinner = r.status === "DECLARED" && c.votes === topVotes && topVotes > 0;
        flat.push({
          candidateId: c.candidateId,
          name: c.name,
          nameNp: c.nameNp,
          votes: c.votes,
          constName: r.name,
          district: r.district,
          province: r.province,
          isWinner,
          status: r.status,
        });
      }
    }
    return flat.sort((a, b) => b.votes - a.votes);
  }, [results, id]);

  const totalVotes = useMemo(
    () => candidates.reduce((s, c) => s + c.votes, 0),
    [candidates]
  );

  // Redirect to /parties if partyId not found after data loads
  useEffect(() => {
    if (results.length > 0 && candidates.length === 0) {
      navigate("/parties", { replace: true });
    }
  }, [results, candidates, navigate]);

  // Per-page meta
  useEffect(() => {
    const nameEn = pInfo.nameEn;
    document.title = `${nameEn} – Nepal Election 2082 Results | NepalVotes`;
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content",
      `${nameEn} election results in Nepal's House of Representatives Election 2082. Seat tally, vote count, and all candidates.`
    );
    const canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) canonical.setAttribute("href", `https://nepalvotes.live/party/${id}`);
    return () => {
      document.title = "Nepal Election Results 2082 Live | Real-Time Vote Count – NepalVotes";
      if (canonical) canonical.setAttribute("href", "https://nepalvotes.live/");
    };
  }, [id, pInfo.nameEn]);

  const heroBadge = (
    <Link
      to="/parties"
      className="inline-flex items-center gap-1.5 text-xs text-white/50 hover:text-white/80 transition-colors"
    >
      ← {lang === "np" ? "सबै दलहरू" : "All Parties"}
    </Link>
  );

  return (
    <Layout
      title={pInfo.nameEn}
      titleNp={pInfo.partyName}
      subtitle={`Nepal House of Representatives Election 2082`}
      subtitleNp={`प्रतिनिधि सभा निर्वाचन २०८२`}
      badge={heroBadge}
    >
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        {/* ── Seat tally cards ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: lang === "np" ? "कुल सिट" : "Total Seats",    value: total },
            { label: lang === "np" ? "प्रत्यक्ष"  : "FPTP Wins",  value: tally.fptp },
            { label: lang === "np" ? "समानुपातिक" : "PR Seats",    value: tally.pr },
            { label: lang === "np" ? "उम्मेदवार"  : "Candidates",  value: candidates.length },
          ].map(({ label, value }) => (
            <div
              key={label}
              className="rounded-2xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#0c1525] p-4 text-center"
            >
              <div
                className="text-3xl font-bold tabular-nums"
                style={{ color: hex, fontFamily: "'DM Mono', monospace" }}
              >
                {value}
              </div>
              <div className="mt-1 text-[11px] text-slate-500 uppercase tracking-wide font-medium">
                {label}
              </div>
            </div>
          ))}
        </div>

        {/* ── Candidate list ───────────────────────────────────────────────── */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#0c1525] overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              {lang === "np" ? "उम्मेदवारहरू" : "Candidates"}
              <span className="ml-2 text-xs text-slate-400 font-normal tabular-nums">
                ({candidates.length})
              </span>
            </h2>
            {totalVotes > 0 && (
              <span className="text-xs text-slate-500">
                {fmt(totalVotes)} {lang === "np" ? "कुल मत" : "total votes"}
              </span>
            )}
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {candidates.length === 0 ? (
              <div className="px-5 py-10 text-center text-sm text-slate-400">
                {lang === "np" ? "डेटा लोड हुँदैछ…" : "Loading data…"}
              </div>
            ) : (
              candidates.map((c) => (
                <Link
                  key={c.candidateId}
                  to={`/candidate/${c.candidateId}`}
                  className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <CandidateThumb id={c.candidateId} name={c.name} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
                        {c.name}
                      </span>
                      {c.isWinner && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 shrink-0">
                          🏆 {lang === "np" ? "विजेता" : "Winner"}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 truncate">
                      {c.constName} · {provinceName(c.province as never, lang)}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    {c.votes > 0 ? (
                      <div className="text-sm font-semibold tabular-nums text-slate-700 dark:text-slate-300"
                        style={{ fontFamily: "'DM Mono', monospace" }}>
                        {fmt(c.votes)}
                      </div>
                    ) : (
                      <div className="text-xs text-slate-400">
                        {c.status === "PENDING" ? (lang === "np" ? "बांकी" : "Pending") : "—"}
                      </div>
                    )}
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* ── Back link ────────────────────────────────────────────────────── */}
        <div className="text-center">
          <Link
            to="/parties"
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            ← {lang === "np" ? "सबै दलहरू हेर्नुहोस्" : "View all parties"}
          </Link>
        </div>

      </div>
    </Layout>
  );
}

// ── Candidate thumbnail with initials fallback ─────────────────────────────

function CandidateThumb({ id, name }: { id: number; name: string }) {
  const [err, setErr] = useState(false);
  const initials = name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  if (!err) {
    return (
      <img
        src={candidatePhotoUrl(id)}
        alt={name}
        onError={() => setErr(true)}
        className="h-9 w-9 rounded-full object-cover ring-1 ring-slate-200 dark:ring-slate-700 shrink-0"
      />
    );
  }
  return (
    <div className="h-9 w-9 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-[10px] font-bold text-slate-500 dark:text-slate-400 ring-1 ring-slate-200 dark:ring-slate-700 shrink-0">
      {initials}
    </div>
  );
}
