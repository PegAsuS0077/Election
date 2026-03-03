/**
 * PartyPage — /party/:partyId
 *
 * Minimal SEO landing page for a single political party.
 * Renders: party header, seat tally, candidate list for that party.
 * All data from Zustand store — no new fetching.
 */

import React, { useEffect, useMemo, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useElectionStore } from "../store/electionStore";
import { getParty, getPartyBySlug, partyHex } from "../lib/partyRegistry";
import { provinceName } from "../i18n";
import { candidatePhotoUrl } from "../lib/parseUpstreamData";
import Layout from "../components/Layout";
import { PROVINCES } from "../types";
import type { Province } from "../types";

// ── Pagination ─────────────────────────────────────────────────────────────────
const CAND_PAGE_SIZE = 20;

function Pagination({ page, total, onChange }: { page: number; total: number; onChange: (p: number) => void }) {
  const pageCount = Math.ceil(total / CAND_PAGE_SIZE);
  if (pageCount <= 1) return null;

  const pages: (number | "…")[] = [];
  const add = new Set<number>();
  for (let p = 1; p <= pageCount; p++) {
    if (p === 1 || p === pageCount || (p >= page - 2 && p <= page + 2)) add.add(p);
  }
  let prev = 0;
  for (const p of Array.from(add).sort((a, b) => a - b)) {
    if (prev && p - prev > 1) pages.push("…");
    pages.push(p);
    prev = p;
  }

  const btn = (label: React.ReactNode, target: number, disabled: boolean, active = false) => (
    <button
      key={String(label)}
      onClick={() => { if (!disabled) onChange(target); }}
      disabled={disabled}
      className={
        "h-8 min-w-[2rem] px-2 rounded-lg text-xs font-semibold transition border " +
        (active
          ? "bg-[#2563eb] border-[#2563eb] text-white"
          : disabled
            ? "border-slate-200 dark:border-slate-700 text-slate-300 dark:text-slate-600 cursor-default bg-white dark:bg-[#0c1525]"
            : "border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0c1525] text-slate-600 dark:text-slate-400 hover:border-[#2563eb]/50 hover:text-[#2563eb] cursor-pointer")
      }
    >
      {label}
    </button>
  );

  return (
    <div className="flex items-center justify-center gap-1 flex-wrap py-4">
      {btn("←", page - 1, page === 1)}
      {pages.map((p, i) =>
        p === "…"
          ? <span key={`ellipsis-${i}`} className="h-8 flex items-center px-1 text-xs text-slate-400">…</span>
          : btn(p, p, false, p === page)
      )}
      {btn("→", page + 1, page === pageCount)}
    </div>
  );
}

function fmt(n: number) { return n.toLocaleString("en-IN"); }

export default function PartyPage() {
  const { partySlug: slugParam } = useParams<{ partySlug: string }>();
  const results    = useElectionStore((s) => s.results);
  const seatTally  = useElectionStore((s) => s.seatTally);
  const lang       = useElectionStore((s) => s.lang);
  const navigate   = useNavigate();

  const [candPage, setCandPage] = useState(1);
  const [selProv, setSelProv]         = useState<Province | "All">("All");
  const [selDistrict, setSelDistrict] = useState<string>("All");
  const [selConst, setSelConst]       = useState<string>("All");

  const slug   = slugParam ?? "";
  const found  = useMemo(() => getPartyBySlug(slug), [slug, results]);
  const id     = found?.partyId ?? slug;
  const pInfo  = found ?? getParty(id);
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

  // Cascading filter options derived from this party's candidates
  const districtOptions = useMemo(() => {
    const seen = new Set<string>();
    for (const c of candidates) {
      if (selProv === "All" || c.province === selProv) seen.add(c.district);
    }
    return Array.from(seen).sort();
  }, [candidates, selProv]);

  const constOptions = useMemo(() => {
    const seen = new Map<string, string>(); // constName → constName (we use name as key since no separate code field here)
    for (const c of candidates) {
      if (selProv !== "All" && c.province !== selProv) continue;
      if (selDistrict !== "All" && c.district !== selDistrict) continue;
      seen.set(c.constName, c.constName);
    }
    return Array.from(seen.keys()).sort();
  }, [candidates, selProv, selDistrict]);

  const filteredCandidates = useMemo(() => {
    return candidates.filter((c) => {
      if (selProv     !== "All" && c.province  !== selProv)     return false;
      if (selDistrict !== "All" && c.district  !== selDistrict) return false;
      if (selConst    !== "All" && c.constName !== selConst)    return false;
      return true;
    });
  }, [candidates, selProv, selDistrict, selConst]);

  const paginatedCandidates = useMemo(
    () => filteredCandidates.slice((candPage - 1) * CAND_PAGE_SIZE, candPage * CAND_PAGE_SIZE),
    [filteredCandidates, candPage]
  );

  // Reset candidate page when party or filters change
  useEffect(() => { setCandPage(1); }, [id, selProv, selDistrict, selConst]);

  // Redirect to /parties if slug not found after data loads
  useEffect(() => {
    if (results.length > 0 && !found) {
      navigate("/parties", { replace: true });
    }
  }, [results, found, navigate]);

  // Per-page meta
  useEffect(() => {
    const nameEn = pInfo.nameEn;
    document.title = `${nameEn} – Nepal Election 2082 Results | NepalVotes`;
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content",
      `${nameEn} election results in Nepal's House of Representatives Election 2082. Seat tally, vote count, and all candidates.`
    );
    const canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) canonical.setAttribute("href", `https://nepalvotes.live/party/${slug}`);
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
          <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800/80 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                {lang === "np" ? "उम्मेदवारहरू" : "Candidates"}
                <span className="ml-2 text-xs text-slate-400 font-normal tabular-nums">
                  ({filteredCandidates.length}{filteredCandidates.length !== candidates.length ? ` / ${candidates.length}` : ""})
                </span>
              </h2>
              <div className="flex items-center gap-3">
                {filteredCandidates.length > CAND_PAGE_SIZE && (
                  <span className="text-xs text-slate-400 tabular-nums">
                    {(candPage - 1) * CAND_PAGE_SIZE + 1}–{Math.min(candPage * CAND_PAGE_SIZE, filteredCandidates.length)} {lang === "np" ? "मध्ये" : "of"} {filteredCandidates.length}
                  </span>
                )}
                {totalVotes > 0 && (
                  <span className="text-xs text-slate-500">
                    {fmt(totalVotes)} {lang === "np" ? "कुल मत" : "total votes"}
                  </span>
                )}
              </div>
            </div>

            {/* ── Cascading filters: Province → District → Constituency ── */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <select
                value={selProv}
                onChange={(e) => {
                  setSelProv(e.target.value as Province | "All");
                  setSelDistrict("All");
                  setSelConst("All");
                }}
                className="h-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 px-2.5 text-xs text-slate-700 dark:text-slate-300 outline-none focus:border-[#2563eb] transition"
              >
                <option value="All">{lang === "np" ? "सबै प्रदेश" : "All Provinces"}</option>
                {PROVINCES.map((p) => (
                  <option key={p} value={p}>{provinceName(p, lang)}</option>
                ))}
              </select>

              <select
                value={selDistrict}
                onChange={(e) => { setSelDistrict(e.target.value); setSelConst("All"); }}
                disabled={districtOptions.length === 0}
                className="h-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 px-2.5 text-xs text-slate-700 dark:text-slate-300 outline-none focus:border-[#2563eb] transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <option value="All">{lang === "np" ? "सबै जिल्ला" : "All Districts"}</option>
                {districtOptions.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>

              <select
                value={selConst}
                onChange={(e) => setSelConst(e.target.value)}
                disabled={constOptions.length === 0}
                className="h-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 px-2.5 text-xs text-slate-700 dark:text-slate-300 outline-none focus:border-[#2563eb] transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <option value="All">{lang === "np" ? "सबै क्षेत्र" : "All Constituencies"}</option>
                {constOptions.map((cn) => (
                  <option key={cn} value={cn}>{cn}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {filteredCandidates.length === 0 ? (
              <div className="px-5 py-10 text-center text-sm text-slate-400">
                {candidates.length === 0
                  ? (lang === "np" ? "डेटा लोड हुँदैछ…" : "Loading data…")
                  : (lang === "np" ? "कोई उम्मेदवार फेला परेन" : "No candidates match your filters")}
              </div>
            ) : (
              paginatedCandidates.map((c) => (
                <Link
                  key={c.candidateId}
                  to={`/candidate/${c.candidateId}-${c.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
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

          {/* Candidate pagination */}
          <div className="px-5">
            <Pagination
              page={candPage}
              total={filteredCandidates.length}
              onChange={(p) => { setCandPage(p); window.scrollTo({ top: 0, behavior: "smooth" }); }}
            />
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
