/**
 * ConstituencyPage — /constituency/:code
 *
 * Full-page view for a single constituency.
 * Shows all information from DetailsModal + enriched constituency race table
 * with clickable candidate rows → /candidate/:id.
 */

import { useEffect, useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useElectionStore } from "../store/electionStore";
import { getParty, partyHex } from "../lib/partyRegistry";
import PartySymbol from "../components/PartySymbol";
import { provinceName } from "../i18n";
import type { Lang } from "../i18n";
import type { Candidate } from "../types";
import Layout from "../components/Layout";
import FavoriteButton from "../components/FavoriteButton";
import FeaturedToggleButton from "../components/FeaturedToggleButton";

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number) { return n.toLocaleString("en-IN"); }

function pctStr(votes: number, total: number): string {
  if (total <= 0 || votes <= 0) return "—";
  return `${((votes / total) * 100).toFixed(1)}%`;
}

function topTwo(cands: Candidate[]) {
  const sorted = [...cands].sort((a, b) => b.votes - a.votes);
  return { sorted, leader: sorted[0] ?? null, runnerUp: sorted[1] ?? null };
}

// ── Status badge ──────────────────────────────────────────────────────────────

function StatusChip({ status }: { status: string }) {
  if (status === "DECLARED")
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-200 dark:ring-emerald-900">
        Declared
      </span>
    );
  if (status === "COUNTING")
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700 ring-1 ring-amber-200 dark:bg-amber-900/30 dark:text-amber-200 dark:ring-amber-900">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
        Counting
      </span>
    );
  return (
    <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
      Pending
    </span>
  );
}

// ── Stat box ──────────────────────────────────────────────────────────────────

function StatBox({ value, label, highlight = false }: { value: string; label: string; highlight?: boolean }) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#0c1525] p-4 text-center">
      <div className={`text-2xl font-bold tabular-nums ${highlight ? "text-[#2563eb] dark:text-[#3b82f6]" : "text-slate-800 dark:text-slate-100"}`}
        style={{ fontFamily: "'DM Mono', monospace" }}>
        {value}
      </div>
      <div className="mt-1 text-[11px] text-slate-500 uppercase tracking-wide font-medium">{label}</div>
    </div>
  );
}

// ── Bar row ───────────────────────────────────────────────────────────────────

function BarRow({ label, value, total, barHex }: { label: string; value: number; total: number; barHex: string }) {
  const w = total > 0 ? Math.max(1, Math.round((value / total) * 100)) : 0;
  return (
    <div>
      <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 mb-1">
        <span className="truncate max-w-[70%]">{label}</span>
        <span className="font-semibold tabular-nums shrink-0">{fmt(value)}</span>
      </div>
      <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${w}%`, backgroundColor: barHex }} />
      </div>
    </div>
  );
}

// ── Candidate card (leader / runner-up) ───────────────────────────────────────

function CandidateHeroCard({
  title,
  candidate,
  pctVal,
  lang,
}: {
  title: string;
  candidate: Candidate | null;
  pctVal: number;
  lang: Lang;
}) {
  if (!candidate) {
    return (
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0c1525] p-4">
        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">{title}</div>
        <div className="text-sm text-slate-400">—</div>
      </div>
    );
  }
  const pInfo = getParty(candidate.partyId);
  return (
    <Link
      to={`/candidate/${candidate.candidateId}-${candidate.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
      className="block rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0c1525] p-4 hover:border-[#2563eb]/50 hover:shadow-md transition-all"
    >
      <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">{title}</div>
      <div className="flex items-center gap-2 mb-1">
        <PartySymbol partyId={candidate.partyId} size="md" />
        <div className="font-bold text-slate-900 dark:text-slate-100 text-sm leading-tight">
          {lang === "np" ? candidate.nameNp : candidate.name}
        </div>
        {candidate.isWinner && <span className="text-emerald-500 text-sm">🏆</span>}
      </div>
      <div className="text-xs text-slate-500 mb-3">
        {lang === "np" ? candidate.partyName : pInfo.nameEn}
      </div>
      <div className="text-xl font-bold tabular-nums" style={{ color: pInfo.hex, fontFamily: "'DM Mono', monospace" }}>
        {candidate.votes > 0 ? fmt(candidate.votes) : "—"}
      </div>
      {pctVal > 0 && (
        <div className="text-xs text-slate-400 mt-0.5">{pctVal}% of top-two votes</div>
      )}
    </Link>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ConstituencyPage() {
  const { code } = useParams<{ code: string }>();
  const results  = useElectionStore((s) => s.results);
  const lang     = useElectionStore((s) => s.lang);
  const navigate = useNavigate();

  const r = useMemo(() => {
    const slug = decodeURIComponent(code ?? "");
    return results.find((x) => x.code === slug || x.name.replace(/\s+/g, "-") === slug) ?? null;
  }, [results, code]);

  // Redirect if not found after data loads
  useEffect(() => {
    if (results.length > 0 && !r) navigate("/explore", { replace: true });
  }, [results, r, navigate]);

  // Per-page meta
  useEffect(() => {
    if (!r) return;
    document.title = `${r.name} – Nepal Election 2082 Results | NepalVotes`;
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content",
      `${r.name} constituency results — Nepal House of Representatives Election 2082. ${r.candidates.length} candidates, ${r.district}, ${r.province}.`
    );
    const canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) canonical.setAttribute("href", `https://nepalvotes.live/constituency/${encodeURIComponent(r.name.replace(/\s+/g, "-"))}`);
    return () => {
      document.title = "Nepal Election Results 2082 Live | Real-Time Vote Count – NepalVotes";
      if (canonical) canonical.setAttribute("href", "https://nepalvotes.live/");
    };
  }, [r]);

  const cands = useMemo(() => (r ? topTwo(r.candidates) : { sorted: [], leader: null, runnerUp: null }), [r]);

  if (!r) {
    return (
      <Layout title="Constituency" titleNp="निर्वाचन क्षेत्र" subtitle="Loading…" subtitleNp="लोड हुँदैछ…">
        <div className="max-w-4xl mx-auto px-4 py-16 text-center text-sm text-slate-400">
          {results.length === 0 ? "Loading data…" : "Constituency not found."}
        </div>
      </Layout>
    );
  }

  const totalVotesCast  = r.votesCast > 0 ? r.votesCast : cands.sorted.reduce((s, c) => s + c.votes, 0);
  const topTwoTotal     = (cands.leader?.votes ?? 0) + (cands.runnerUp?.votes ?? 0);
  const leadPct         = topTwoTotal > 0 ? Math.round(((cands.leader?.votes ?? 0) / topTwoTotal) * 100) : 0;
  const runPct          = topTwoTotal > 0 ? Math.round(((cands.runnerUp?.votes ?? 0) / topTwoTotal) * 100) : 0;
  const margin          = (cands.leader?.votes ?? 0) - (cands.runnerUp?.votes ?? 0);

  const heroBadge = (
    <div className="flex items-center gap-2 flex-wrap">
      <Link
        to="/explore"
        className="inline-flex items-center gap-1.5 text-xs text-white/50 hover:text-white/80 transition-colors"
      >
        ← {lang === "np" ? "सबै निर्वाचन क्षेत्र" : "All Constituencies"}
      </Link>
      <span className="text-white/20">·</span>
      <StatusChip status={r.status} />
      <FeaturedToggleButton code={r.code} lang={lang} />
      <FavoriteButton code={r.code} name={r.name} lang={lang} />
    </div>
  );

  return (
    <Layout
      title={r.name}
      titleNp={r.nameNp}
      subtitle={`${r.district} · ${provinceName(r.province, lang)} · Nepal Election 2082`}
      subtitleNp={`${r.districtNp} · ${provinceName(r.province, "np")} · निर्वाचन २०८२`}
      badge={heroBadge}
    >
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        {/* ── Summary stat boxes ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatBox value={String(r.candidates.length)} label={lang === "np" ? "उम्मेदवार" : "Candidates"} />
          <StatBox value={totalVotesCast > 0 ? fmt(totalVotesCast) : "—"} label={lang === "np" ? "कुल मत" : "Votes Cast"} />
          <StatBox value={margin > 0 ? fmt(margin) : "—"} label={lang === "np" ? "अन्तर" : "Margin"} />
          <StatBox
            value={r.totalVoters ? `${((r.votesCast / r.totalVoters) * 100).toFixed(0)}%` : "—"}
            label={lang === "np" ? "मतदान प्रतिशत" : "Turnout"}
            highlight
          />
        </div>

        {/* ── Declared result banner ─────────────────────────────────────────── */}
        {r.status === "DECLARED" && cands.leader && (
          <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-5 dark:bg-emerald-900/20 dark:border-emerald-900/60">
            <div className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 uppercase tracking-wide mb-1">
              {lang === "np" ? "परिणाम घोषित" : "Result Declared"}
            </div>
            <div className="text-lg font-bold text-slate-900 dark:text-slate-100">
              {lang === "np" ? "विजेता: " : "Winner: "}
              <Link
                to={`/candidate/${cands.leader.candidateId}`}
                className="text-emerald-700 dark:text-emerald-300 hover:underline"
              >
                {lang === "np" ? cands.leader.nameNp : cands.leader.name}
              </Link>
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-300 mt-1">
              {lang === "np" ? cands.leader.partyName : getParty(cands.leader.partyId).nameEn}
              {" · "}{fmt(cands.leader.votes)} {lang === "np" ? "मत" : "votes"}
              {" · "}{lang === "np" ? "अन्तर " : "Margin "}<span className="font-semibold">{fmt(margin)}</span>
            </div>
          </div>
        )}

        {r.status === "COUNTING" && (
          <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 dark:bg-amber-900/20 dark:border-amber-900/60">
            <div className="text-sm font-semibold text-amber-800 dark:text-amber-200">
              {lang === "np" ? "मतगणना जारी छ" : "Counting in progress"}
            </div>
            <div className="text-xs text-slate-600 dark:text-slate-300 mt-1">
              {lang === "np" ? "तलको तालिका हालसम्मको मत गणना देखाउँछ।" : "The table below shows current vote counts as counting progresses."}
            </div>
          </div>
        )}

        {/* ── Leader / runner-up cards ───────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <CandidateHeroCard
            title={lang === "np" ? "अग्रणी उम्मेदवार" : "Leading"}
            candidate={cands.leader}
            pctVal={leadPct}
            lang={lang}
          />
          <CandidateHeroCard
            title={lang === "np" ? "दोस्रो स्थान" : "Runner-up"}
            candidate={cands.runnerUp}
            pctVal={runPct}
            lang={lang}
          />
        </div>

        {/* ── Top-two vote share bar ─────────────────────────────────────────── */}
        {topTwoTotal > 0 && (
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#0c1525] p-5">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                {lang === "np" ? "शीर्ष दुई उम्मेदवारको मत अनुपात" : "Top-two vote share"}
              </span>
              <span className="text-xs text-slate-400 tabular-nums">{fmt(topTwoTotal)} {lang === "np" ? "कुल" : "total"}</span>
            </div>
            <div className="space-y-3">
              <BarRow
                label={cands.leader ? `${lang === "np" ? cands.leader.nameNp : cands.leader.name} (${leadPct}%)` : "—"}
                value={cands.leader?.votes ?? 0}
                total={topTwoTotal}
                barHex={cands.leader ? partyHex(cands.leader.partyId) : "#94a3b8"}
              />
              <BarRow
                label={cands.runnerUp ? `${lang === "np" ? cands.runnerUp.nameNp : cands.runnerUp.name} (${runPct}%)` : "—"}
                value={cands.runnerUp?.votes ?? 0}
                total={topTwoTotal}
                barHex={cands.runnerUp ? partyHex(cands.runnerUp.partyId) : "#94a3b8"}
              />
            </div>
            <div className="mt-3 text-xs text-slate-400">
              {lang === "np" ? "अन्तर: " : "Margin: "}
              <span className="font-semibold text-slate-600 dark:text-slate-300">{fmt(margin)}</span>
              {lang === "np" ? " मत" : " votes"}
            </div>
          </div>
        )}

        {/* ── Full constituency race table ───────────────────────────────────── */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#0c1525] overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              {lang === "np" ? "निर्वाचन क्षेत्रको प्रतिस्पर्धा" : "Constituency Race"}
              <span className="ml-2 text-xs text-slate-400 font-normal">
                ({cands.sorted.length} {lang === "np" ? "उम्मेदवार" : "candidates"})
              </span>
            </h2>
            {totalVotesCast > 0 && (
              <span className="text-xs text-slate-400 tabular-nums">{fmt(totalVotesCast)} {lang === "np" ? "कुल मत" : "total votes"}</span>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-[#060d1f] border-b border-slate-100 dark:border-slate-800">
                  <th className="text-left px-4 py-2.5 font-semibold text-slate-500 dark:text-slate-400 w-8">#</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-slate-500 dark:text-slate-400">
                    {lang === "np" ? "उम्मेदवार" : "Candidate"}
                  </th>
                  <th className="text-left px-4 py-2.5 font-semibold text-slate-500 dark:text-slate-400 hidden sm:table-cell">
                    {lang === "np" ? "दल" : "Party"}
                  </th>
                  <th className="text-right px-4 py-2.5 font-semibold text-slate-500 dark:text-slate-400">
                    {lang === "np" ? "मत" : "Votes"}
                  </th>
                  <th className="text-right px-4 py-2.5 font-semibold text-slate-500 dark:text-slate-400 hidden sm:table-cell">%</th>
                </tr>
              </thead>
              <tbody>
                {cands.sorted.map((c, i) => {
                  const pInfo = getParty(c.partyId);
                  const pName = lang === "np" ? c.partyName : pInfo.nameEn;
                  const pBarHex = partyHex(c.partyId);
                  const pct   = pctStr(c.votes, totalVotesCast);
                  const isTop = i === 0;
                  return (
                    <tr
                      key={c.candidateId}
                      className={`border-b border-slate-50 dark:border-slate-800/60 last:border-0 group ${isTop ? "bg-emerald-50/30 dark:bg-emerald-950/10" : ""}`}
                    >
                      <td className="px-4 py-2.5 font-bold text-slate-400 dark:text-slate-600 align-middle">{i + 1}</td>
                      <td className="px-4 py-2.5 align-middle">
                        <Link
                          to={`/candidate/${c.candidateId}-${c.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
                          className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300 hover:text-[#2563eb] dark:hover:text-[#3b82f6] transition-colors group-hover:text-[#2563eb] dark:group-hover:text-[#3b82f6]"
                        >
                          {lang === "np" ? c.nameNp : c.name}
                          {c.isWinner && <span className="text-emerald-500 shrink-0">🏆</span>}
                          <span className="text-slate-300 dark:text-slate-600 text-[10px] shrink-0">›</span>
                        </Link>
                      </td>
                      <td className="px-4 py-2.5 hidden sm:table-cell align-middle">
                        <div className="flex items-center gap-1.5">
                          <PartySymbol partyId={c.partyId} size="sm" />
                          <span className="text-slate-500 dark:text-slate-400 truncate max-w-[180px]">{pName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-right align-middle">
                        <div className="text-slate-700 dark:text-slate-300 font-semibold tabular-nums"
                          style={{ fontFamily: "'DM Mono', monospace" }}>
                          {c.votes > 0 ? fmt(c.votes) : "—"}
                        </div>
                        {c.votes > 0 && totalVotesCast > 0 && (
                          <div className="mt-0.5 h-1 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden max-w-[64px] ml-auto">
                            <div className="h-full rounded-full" style={{ width: pct !== "—" ? pct : "0%", backgroundColor: pBarHex }} />
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right text-slate-400 dark:text-slate-600 hidden sm:table-cell tabular-nums align-middle"
                        style={{ fontFamily: "'DM Mono', monospace" }}>
                        {pct}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Turnout ─────────────────────────────────────────────────────────── */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#0c1525] p-5">
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-3">
            {lang === "np" ? "मतदाता संलग्नता" : "Voter Turnout"}
          </h2>
          <div className="flex items-center justify-between text-sm text-slate-700 dark:text-slate-200 mb-2">
            <span>{lang === "np" ? "खसेका मत" : "Votes cast"}</span>
            <span className="font-semibold tabular-nums">
              {r.totalVoters
                ? `${fmt(r.votesCast)} / ${fmt(r.totalVoters)}`
                : fmt(r.votesCast) || "—"}
            </span>
          </div>
          {r.totalVoters ? (
            <>
              <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div
                  className="h-full rounded-full bg-[#2563eb] transition-[width] duration-700"
                  style={{ width: `${Math.min(100, (r.votesCast / r.totalVoters) * 100).toFixed(1)}%` }}
                />
              </div>
              <div className="mt-1.5 text-xs text-slate-500">
                {`${((r.votesCast / r.totalVoters) * 100).toFixed(1)}% turnout`}
              </div>
            </>
          ) : (
            <div className="text-xs text-slate-400">
              {lang === "np" ? "कुल मतदाता संख्या उपलब्ध छैन" : "Total voter count not available pre-election."}
            </div>
          )}
        </div>

        {/* ── Meta info ────────────────────────────────────────────────────────── */}
        <div className="text-xs text-slate-400 dark:text-slate-600 text-center">
          {lang === "np"
            ? `अन्तिम अपडेट: ${new Date(r.lastUpdated).toLocaleString()} · डेटा स्रोत: result.election.gov.np`
            : `Last updated: ${new Date(r.lastUpdated).toLocaleString()} · Data: result.election.gov.np`}
        </div>

      </div>
    </Layout>
  );
}
