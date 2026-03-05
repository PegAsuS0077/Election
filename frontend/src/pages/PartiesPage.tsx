import React, { useState, useMemo, useEffect } from "react";
import { Link } from "react-router-dom";
import { useElectionStore } from "../store/electionStore";
import { PROVINCES } from "../types";
import { getParty, partyHex, partySlug } from "../lib/partyRegistry";
import { getPartyMeta } from "../lib/db";
import { provinceName } from "../i18n";
import Layout from "../components/Layout";

function fmt(n: number) { return n.toLocaleString("en-IN"); }

// ── Pagination ─────────────────────────────────────────────────────────────────
function Pagination({ page, total, pageSize, onChange }: { page: number; total: number; pageSize: number; onChange: (p: number) => void }) {
  const pageCount = Math.ceil(total / pageSize);
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
    <div className="flex items-center justify-center gap-1 flex-wrap py-6">
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

// ── Main page ─────────────────────────────────────────────────────────────────
export default function PartiesPage() {
  useEffect(() => {
    document.title = "Political Parties – Nepal Election 2082 Seat Tally | NepalVotes";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", "Live seat tally for all 66+ political parties in Nepal's House of Representatives Election 2082. FPTP wins and proportional representation breakdown.");
    const canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) canonical.setAttribute("href", "https://nepalvotes.live/parties");
    return () => { if (canonical) canonical.setAttribute("href", "https://nepalvotes.live/"); };
  }, []);

  const results          = useElectionStore((s) => s.results);
  const seatTally        = useElectionStore((s) => s.seatTally);
  const lang             = useElectionStore((s) => s.lang);
  const favParties       = useElectionStore((s) => s.favParties);
  const toggleFavParty   = useElectionStore((s) => s.toggleFavParty);

  const totalSeats = 275;

  // Build enriched party data for the cards.
  // We derive party IDs from `results` directly so the memo re-runs whenever
  // results change — getParties() reads a module-level variable and isn't reactive.
  const partyData = useMemo(() => {
    const seenIds = Array.from(
      new Set(results.flatMap((r) => r.candidates.map((c) => c.partyId)))
    ).sort((a, b) => {
      if (a === "IND") return 1;
      if (b === "IND") return -1;
      return 0;
    });

    return seenIds.map((key) => {
      const pInfo = getParty(key);
      const tally  = seatTally[key] ?? { fptp: 0, pr: 0 };
      const total  = tally.fptp;
      const pct    = (total / totalSeats) * 100;

      let totalVotes = 0;
      let partyVotes = 0;
      for (const r of results) {
        for (const c of r.candidates) {
          totalVotes += c.votes;
          if (c.partyId === key) partyVotes += c.votes;
        }
      }
      const voteSharePct = totalVotes > 0 ? (partyVotes / totalVotes) * 100 : 0;

      const winners = results
        .filter((r) => r.status === "DECLARED")
        .filter((r) => {
          const w = [...r.candidates].sort((a, b) => b.votes - a.votes)[0];
          return w?.partyId === key;
        })
        .sort((a, b) => {
          const wa = [...a.candidates].sort((x, y) => y.votes - x.votes)[0];
          const wb = [...b.candidates].sort((x, y) => y.votes - x.votes)[0];
          return wb.votes - wa.votes;
        })
        .slice(0, 3);

      const provBreakdown: Record<string, number> = {};
      for (const prov of PROVINCES) {
        const ct = results
          .filter((r) => r.province === prov && r.status === "DECLARED")
          .filter((r) => [...r.candidates].sort((a, b) => b.votes - a.votes)[0]?.partyId === key)
          .length;
        if (ct > 0) provBreakdown[prov] = ct;
      }

      const hex            = partyHex(key);
      const candidateCount = results.reduce(
        (s, r) => s + r.candidates.filter((c) => c.partyId === key).length, 0
      );

      return { key, pInfo, tally, total, pct, voteSharePct, partyVotes, winners, provBreakdown, hex, candidateCount };
    }).sort((a, b) => {
      // Primary: declared FPTP wins descending; Secondary: votes received descending
      if (b.total !== a.total) return b.total - a.total;
      return b.partyVotes - a.partyVotes;
    });
  }, [results, seatTally]);


  const [searchQuery, setSearchQuery] = useState("");
  const [favOnly, setFavOnly]         = useState(false);
  const [page, setPage]               = useState(1);
  const PARTY_PAGE_SIZE = 20;

  const filteredPartyData = useMemo(() => {
    let data = partyData;
    if (favOnly) data = data.filter(({ key }) => favParties.has(key));
    const q = searchQuery.trim().toLowerCase();
    if (!q) return data;
    return data.filter(({ key, pInfo }) =>
      pInfo.nameEn.toLowerCase().includes(q) ||
      pInfo.partyName.toLowerCase().includes(q) ||
      key.toLowerCase().includes(q)
    );
  }, [partyData, searchQuery, favOnly, favParties]);

  // Reset to page 1 when filters change
  useEffect(() => { setPage(1); }, [searchQuery, favOnly]);

  const paginatedPartyData = useMemo(
    () => filteredPartyData.slice((page - 1) * PARTY_PAGE_SIZE, page * PARTY_PAGE_SIZE),
    [filteredPartyData, page]
  );

  const heroBadge = (
    <span className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-3.5 py-1 text-xs font-semibold text-blue-400 uppercase tracking-widest">
      {lang === "np" ? "दलहरू · सामान्य निर्वाचन २०८२" : "Parties · General Election 2082"}
    </span>
  );

  return (
    <Layout
      title="Political Parties 2082"
      titleNp="राजनीतिक दलहरू २०८२"
      subtitle="Seat tally, vote share, and candidate highlights for all major parties"
      subtitleNp="सबै प्रमुख दलहरूको सिट गणना, मत बांडफांट र उम्मेद्वार विवरण"
      badge={heroBadge}
    >
      {/* ── Search bar + Favorites toggle + inline prev/next ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 pb-2">
        <div className="flex items-center gap-3">
          {/* Search input */}
          <div className="relative flex-1 max-w-sm">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none"
              width="15" height="15" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={lang === "np" ? "दल खोज्नुस्…" : "Search parties…"}
              className="w-full h-9 pl-9 pr-4 rounded-xl border border-slate-200 dark:border-slate-700/80
                         bg-white dark:bg-slate-800/60 text-sm text-slate-900 dark:text-slate-100
                         placeholder:text-slate-400 dark:placeholder:text-slate-500
                         focus:outline-none focus:ring-2 focus:ring-[#2563eb]/40 focus:border-[#2563eb]
                         transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                aria-label="Clear search"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
          </div>

          {/* Favorites toggle */}
          <button
            onClick={() => setFavOnly((v) => !v)}
            className={"h-9 px-3 rounded-xl border text-xs font-semibold flex items-center gap-1.5 shrink-0 transition " +
              (favOnly
                ? "bg-amber-500 border-amber-500 text-white"
                : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 hover:border-amber-400/60 hover:text-amber-500"
              )}
          >
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill={favOnly ? "currentColor" : "none"} stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
            {lang === "np" ? "मनपर्ने" : "Favorites"}
            {favParties.size > 0 && <span className="opacity-70">{favParties.size}</span>}
          </button>

          {/* Inline prev / page indicator / next */}
          {Math.ceil(filteredPartyData.length / PARTY_PAGE_SIZE) > 1 && (
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => { setPage((p) => Math.max(1, p - 1)); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                disabled={page === 1}
                className="h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 text-xs font-semibold text-slate-600 dark:text-slate-300 disabled:opacity-40 disabled:cursor-default hover:border-[#2563eb]/50 hover:text-[#2563eb] transition"
                aria-label="Previous page"
              >
                ← {lang === "np" ? "अघिल्लो" : "Prev"}
              </button>
              <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums px-1 whitespace-nowrap">
                {page} / {Math.ceil(filteredPartyData.length / PARTY_PAGE_SIZE)}
              </span>
              <button
                type="button"
                onClick={() => { setPage((p) => Math.min(Math.ceil(filteredPartyData.length / PARTY_PAGE_SIZE), p + 1)); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                disabled={page === Math.ceil(filteredPartyData.length / PARTY_PAGE_SIZE)}
                className="h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 text-xs font-semibold text-slate-600 dark:text-slate-300 disabled:opacity-40 disabled:cursor-default hover:border-[#2563eb]/50 hover:text-[#2563eb] transition"
                aria-label="Next page"
              >
                {lang === "np" ? "अर्को" : "Next"} →
              </button>
            </div>
          )}
        </div>
        {searchQuery && (
          <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
            {filteredPartyData.length === 0
              ? (lang === "np" ? "कुनै दल फेला परेन" : "No parties found")
              : `${filteredPartyData.length} ${lang === "np" ? "दल फेला पर्यो" : filteredPartyData.length === 1 ? "party found" : "parties found"}`}
          </p>
        )}
      </div>

      {/* ── Result count ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-2 pb-1">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {lang === "np" ? "देखाउँदै" : "Showing"}{" "}
          <span className="font-semibold text-slate-700 dark:text-slate-300">
            {Math.min((page - 1) * PARTY_PAGE_SIZE + 1, filteredPartyData.length)}–{Math.min(page * PARTY_PAGE_SIZE, filteredPartyData.length)}
          </span>{" "}
          {lang === "np" ? "मध्ये" : "of"}{" "}
          <span className="font-semibold text-slate-700 dark:text-slate-300">{filteredPartyData.length}</span>{" "}
          {lang === "np" ? "दलहरू · घोषित सिटको आधारमा क्रमबद्ध" : "parties · sorted by declared seats"}
        </p>
      </div>

      {/* ── Party cards grid ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 grid gap-5 sm:grid-cols-2 xl:grid-cols-2">
        {paginatedPartyData.map(({ key, pInfo, tally, total, pct, voteSharePct, partyVotes, winners, provBreakdown, hex, candidateCount }) => (
          <div
            key={key}
            className="rounded-2xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#0c1525] overflow-hidden shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="h-1.5 w-full" style={{ backgroundColor: hex }} />

            <div className="p-5">
              {/* Header */}
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex items-center gap-3">

                  {pInfo.symbolUrl
                    ? <img src={pInfo.symbolUrl} alt={pInfo.symbol} className="h-10 w-10 object-contain flex-shrink-0" />
                    : <span className="text-3xl leading-none">{pInfo.symbol}</span>}
                  <div>
                    <h2 className="font-bold text-slate-900 dark:text-slate-100 text-base leading-tight" style={{ fontFamily: "'Sora', sans-serif" }}>
                      {lang === "np" ? pInfo.partyName : pInfo.nameEn}
                    </h2>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                      {lang === "np" ? pInfo.nameEn : pInfo.partyName}
                    </p>
                    <Link
                      to={`/party/${partySlug(pInfo.nameEn)}`}
                      onClick={(e) => e.stopPropagation()}
                      className="text-[10px] text-blue-500 dark:text-blue-400 hover:underline mt-0.5 inline-block"
                    >
                      {lang === "np" ? "विस्तृत विवरण →" : "Full details →"}
                    </Link>
                    {(() => {
                      const meta = getPartyMeta(key);
                      if (!meta || meta.founded === 0) return null;
                      return (
                        <p className="text-[10px] text-slate-300 dark:text-slate-600 mt-0.5">
                          {meta.ideology} · Est. {meta.founded}
                        </p>
                      );
                    })()}
                  </div>
                </div>
                <div className="text-right shrink-0 flex flex-col items-end gap-1.5">
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleFavParty(key); }}
                    aria-label={favParties.has(key) ? "Unwatch party" : "Watch party"}
                    title={favParties.has(key) ? "Unwatch party" : "Watch party"}
                    className={`rounded-full p-1 transition-colors focus:outline-none ${favParties.has(key) ? "text-amber-400 hover:text-amber-300" : "text-slate-300 hover:text-amber-400 dark:text-slate-600 dark:hover:text-amber-400"}`}
                  >
                    <svg viewBox="0 0 24 24" className="w-4 h-4" fill={favParties.has(key) ? "currentColor" : "none"} stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                  </button>
                  <div className="text-3xl font-bold tabular-nums leading-none" style={{ color: hex, fontFamily: "'DM Mono', monospace" }}>
                    {total}
                  </div>
                  <div className="text-[10px] text-slate-400 uppercase tracking-wide mt-0.5">
                    {lang === "np" ? "घोषित सिट" : "declared seats"}
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

              {/* Stats row */}
              <div className="flex flex-wrap gap-4 mb-4 text-xs">
                <div>
                  <span className="text-slate-400">FPTP </span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 tabular-nums">{tally.fptp}</span>
                </div>
                <div>
                  <span className="text-slate-400">PR </span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 tabular-nums">{tally.pr}</span>
                </div>
                <div>
                  <span className="text-slate-400">{lang === "np" ? "मत " : "Votes "}</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 tabular-nums">{fmt(partyVotes)}</span>
                  <span className="text-slate-400 ml-1">({voteSharePct.toFixed(1)}%)</span>
                </div>
              </div>

              {/* Top winners */}
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
                          <span className="text-slate-500 tabular-nums text-[11px]" style={{ fontFamily: "'DM Mono', monospace" }}>
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
                <div className="border-t border-slate-100 dark:border-slate-800 pt-3 mb-4">
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

              {/* View candidates button */}
              <Link
                to={`/party/${partySlug(pInfo.nameEn)}`}
                className="flex items-center justify-center w-full h-9 rounded-xl text-xs font-semibold transition-all border border-[#2563eb]/40 text-[#2563eb] dark:text-[#3b82f6] hover:bg-[#2563eb] hover:text-white hover:border-[#2563eb]"
              >
                {`${lang === "np" ? "▼ उम्मेद्वार हेर्नुस्" : "▼ View Candidates"} (${candidateCount})`}
              </Link>
            </div>
          </div>
        ))}
      </div>

      {/* ── Pagination ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <Pagination
          page={page}
          total={filteredPartyData.length}
          pageSize={PARTY_PAGE_SIZE}
          onChange={(p) => { setPage(p); window.scrollTo({ top: 0, behavior: "smooth" }); }}
        />
      </div>

    </Layout>
  );
}
