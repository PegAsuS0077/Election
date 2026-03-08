import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useElectionStore } from "../store/electionStore";
import { PROVINCES } from "../types";
import type { ConstituencyStatus, Province } from "../types";
import { provinceName } from "../i18n";
import { getParty, partyHex } from "../lib/partyRegistry";
import Layout from "../components/Layout";
import PartySymbol from "../components/PartySymbol";

const THRESHOLD_PCT = 10;

type JamanatRow = {
  candidateId: number;
  candidateName: string;
  candidateNameNp: string;
  partyId: string;
  constCode: string;
  constName: string;
  constNameNp: string;
  district: string;
  districtNp: string;
  province: Province;
  constStatus: ConstituencyStatus;
  votes: number;
  totalVotesCounted: number;
  voteSharePct: number;
};

function fmt(n: number) { return n.toLocaleString("en-IN"); }
function candidateSlug(candidateId: number, name: string) {
  return `${candidateId}-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
}

export default function JamanatJafatPage() {
  const results = useElectionStore((s) => s.results);
  const seatTally = useElectionStore((s) => s.seatTally);
  const lang = useElectionStore((s) => s.lang);

  const [search, setSearch] = useState("");
  const [selProv, setSelProv] = useState<"All" | Province>("All");
  const [selDistrict, setSelDistrict] = useState("All");
  const [selConst, setSelConst] = useState("All");
  const [selParty, setSelParty] = useState("All");

  const openPartyTopList = (partyId: string) => {
    setSelParty(partyId);
    setTimeout(() => {
      const list = document.getElementById("jamanat-top-list");
      if (list) list.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  };

  useEffect(() => {
    document.title = "Jamanat Jafat – Candidates below 10% vote share | NepalVotes";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) {
      meta.setAttribute(
        "content",
        "Track candidates with less than 10% votes in their constituencies. Filter by province, district, constituency and party.",
      );
    }
    const canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) canonical.setAttribute("href", "https://nepalvotes.live/jamanat-jafat");
    return () => {
      if (canonical) canonical.setAttribute("href", "https://nepalvotes.live/");
    };
  }, []);

  const allRows = useMemo<JamanatRow[]>(() => {
    const rows: JamanatRow[] = [];
    for (const r of results) {
      const totalVotesCounted = r.votesCast > 0
        ? r.votesCast
        : r.candidates.reduce((sum, c) => sum + c.votes, 0);
      if (totalVotesCounted <= 0) continue;

      for (const c of r.candidates) {
        const voteSharePct = (c.votes / totalVotesCounted) * 100;
        if (voteSharePct >= THRESHOLD_PCT) continue;
        rows.push({
          candidateId: c.candidateId,
          candidateName: c.name,
          candidateNameNp: c.nameNp,
          partyId: c.partyId,
          constCode: r.code,
          constName: r.name,
          constNameNp: r.nameNp,
          district: r.district,
          districtNp: r.districtNp,
          province: r.province,
          constStatus: r.status,
          votes: c.votes,
          totalVotesCounted,
          voteSharePct,
        });
      }
    }
    return rows;
  }, [results]);

  const districtOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const row of allRows) {
      if (selProv === "All" || row.province === selProv) seen.set(row.district, row.districtNp);
    }
    return Array.from(seen.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [allRows, selProv]);

  const constOptions = useMemo(() => {
    const seen = new Map<string, [string, string]>();
    for (const row of allRows) {
      if (selProv !== "All" && row.province !== selProv) continue;
      if (selDistrict !== "All" && row.district !== selDistrict) continue;
      seen.set(row.constCode, [row.constName, row.constNameNp]);
    }
    return Array.from(seen.entries()).sort((a, b) => a[1][0].localeCompare(b[1][0]));
  }, [allRows, selProv, selDistrict]);

  const partyRanking = useMemo(() => {
    const votesByParty = new Map<string, number>();
    for (const r of results) {
      for (const c of r.candidates) {
        votesByParty.set(c.partyId, (votesByParty.get(c.partyId) ?? 0) + c.votes);
      }
    }

    return Array.from(votesByParty.entries())
      .map(([partyId, partyVotes]) => ({
        partyId,
        partyVotes,
        declaredSeats: seatTally[partyId]?.fptp ?? 0,
      }))
      .sort((a, b) => {
        if (b.declaredSeats !== a.declaredSeats) return b.declaredSeats - a.declaredSeats;
        return b.partyVotes - a.partyVotes;
      });
  }, [results, seatTally]);

  const scopedRows = useMemo(() => {
    return allRows.filter((row) => {
      if (selProv !== "All" && row.province !== selProv) return false;
      if (selDistrict !== "All" && row.district !== selDistrict) return false;
      if (selConst !== "All" && row.constCode !== selConst) return false;
      if (search) {
        const q = search.trim().toLowerCase();
        const haystack = `${row.candidateName} ${row.candidateNameNp} ${row.constName} ${row.constNameNp} ${row.district} ${row.districtNp}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [allRows, selProv, selDistrict, selConst, search]);

  const partyCards = useMemo(() => {
    const partiesPageRank = new Map(partyRanking.map((p, idx) => [p.partyId, idx + 1]));
    const grouped = new Map<string, { count: number; voteShareTotal: number; candidates: JamanatRow[] }>();
    for (const row of scopedRows) {
      const prev = grouped.get(row.partyId);
      if (prev) {
        prev.count += 1;
        prev.voteShareTotal += row.voteSharePct;
        prev.candidates.push(row);
      } else {
        grouped.set(row.partyId, { count: 1, voteShareTotal: row.voteSharePct, candidates: [row] });
      }
    }

    return Array.from(grouped.entries())
      .map(([partyId, values]) => ({
        partyId,
        count: values.count,
        avgVoteSharePct: values.voteShareTotal / values.count,
        topCandidates: [...values.candidates]
          .sort((a, b) => (a.voteSharePct - b.voteSharePct) || (b.votes - a.votes))
          .slice(0, 3),
        partiesPageRank: partiesPageRank.get(partyId) ?? null,
        declaredSeats: seatTally[partyId]?.fptp ?? 0,
        partyVotes: partyRanking.find((p) => p.partyId === partyId)?.partyVotes ?? 0,
        partyName: getParty(partyId).nameEn,
      }))
      .sort((a, b) => {
        if (a.partiesPageRank !== null && b.partiesPageRank !== null && a.partiesPageRank !== b.partiesPageRank) {
          return a.partiesPageRank - b.partiesPageRank;
        }
        if (a.partiesPageRank !== null && b.partiesPageRank === null) return -1;
        if (a.partiesPageRank === null && b.partiesPageRank !== null) return 1;
        if (b.count !== a.count) return b.count - a.count;
        if (a.avgVoteSharePct !== b.avgVoteSharePct) return a.avgVoteSharePct - b.avgVoteSharePct;
        return a.partyName.localeCompare(b.partyName);
      });
  }, [scopedRows, partyRanking, seatTally]);

  const filteredRows = useMemo(() => {
    return scopedRows
      .filter((row) => selParty === "All" || row.partyId === selParty)
      .sort((a, b) => {
        if (a.voteSharePct !== b.voteSharePct) return a.voteSharePct - b.voteSharePct;
        if (b.votes !== a.votes) return b.votes - a.votes;
        return a.candidateName.localeCompare(b.candidateName);
      });
  }, [scopedRows, selParty]);

  const openedPartyRows = selParty === "All" ? [] : filteredRows;
  const totalConstituencies = new Set(allRows.map((r) => r.constCode)).size;

  const heroBadge = (
    <span className="inline-flex items-center gap-2 rounded-full border border-amber-400/40 bg-amber-400/10 px-3.5 py-1 text-xs font-semibold text-amber-300 uppercase tracking-widest">
      {allRows.length} {lang === "np" ? "जमानत जफत उम्मेदवार" : "Jamanat Jafat candidates"}
    </span>
  );

  return (
    <Layout
      title="Jamanat Jafat"
      titleNp="जमानत जफत"
      subtitle="Candidates below 10% vote share in their constituencies"
      subtitleNp="आफ्नो क्षेत्रमा १०% भन्दा कम मत पाएका उम्मेदवार"
      badge={heroBadge}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-4">
        <div className="rounded-2xl border border-amber-200/70 bg-amber-50/70 p-4 dark:border-amber-900/40 dark:bg-amber-950/20">
          <p className="text-sm text-slate-700 dark:text-slate-200">
            {lang === "np"
              ? "थ्रेसहोल्ड: निर्वाचन क्षेत्रमा हाल गणना/खसेको कुल मतको १०% भन्दा कम मत पाएमा जमानत जफत मानिएको छ।"
              : "Threshold rule: candidates with less than 10% of total counted/cast votes in their constituency are marked as Jamanat Jafat."}
          </p>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            {lang === "np"
              ? `${allRows.length} उम्मेदवार · ${totalConstituencies} निर्वाचन क्षेत्र`
              : `${allRows.length} candidates · ${totalConstituencies} constituencies`}
          </p>
        </div>

        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
          }}
          placeholder={lang === "np" ? "उम्मेदवार वा निर्वाचन क्षेत्र खोज्नुहोस्…" : "Search candidate or constituency…"}
          className="w-full h-10 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0c1525] px-4 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 outline-none focus:border-[#2563eb] transition"
        />

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <select
            value={selProv}
            onChange={(e) => {
              setSelProv(e.target.value as "All" | Province);
              setSelDistrict("All");
              setSelConst("All");
            }}
            className="h-9 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0c1525] px-3 text-xs text-slate-700 dark:text-slate-300 outline-none focus:border-[#2563eb] transition min-w-0"
          >
            <option value="All">{lang === "np" ? "सबै प्रदेश" : "All Provinces"}</option>
            {PROVINCES.map((p) => (
              <option key={p} value={p}>{provinceName(p, lang)}</option>
            ))}
          </select>

          <select
            value={selDistrict}
            onChange={(e) => {
              setSelDistrict(e.target.value);
              setSelConst("All");
            }}
            className="h-9 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0c1525] px-3 text-xs text-slate-700 dark:text-slate-300 outline-none focus:border-[#2563eb] transition min-w-0"
            disabled={districtOptions.length === 0}
          >
            <option value="All">{lang === "np" ? "सबै जिल्ला" : "All Districts"}</option>
            {districtOptions.map(([en, np]) => (
              <option key={en} value={en}>{lang === "np" ? np : en}</option>
            ))}
          </select>

          <select
            value={selConst}
            onChange={(e) => setSelConst(e.target.value)}
            className="h-9 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0c1525] px-3 text-xs text-slate-700 dark:text-slate-300 outline-none focus:border-[#2563eb] transition min-w-0"
            disabled={constOptions.length === 0}
          >
            <option value="All">{lang === "np" ? "सबै क्षेत्र" : "All Constituencies"}</option>
            {constOptions.map(([code, [nameEn, nameNp]]) => (
              <option key={code} value={code}>{lang === "np" ? nameNp : nameEn}</option>
            ))}
          </select>

          <select
            value={selParty}
            onChange={(e) => setSelParty(e.target.value)}
            className="h-9 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0c1525] px-3 text-xs text-slate-700 dark:text-slate-300 outline-none focus:border-[#2563eb] transition min-w-0"
          >
            <option value="All">{lang === "np" ? "सबै दल" : "All Parties"}</option>
            {partyCards.map((p) => (
              <option key={p.partyId} value={p.partyId}>
                {lang === "np" ? getParty(p.partyId).partyName : getParty(p.partyId).nameEn}
              </option>
            ))}
          </select>
        </div>

        {selParty !== "All" && (
          <section id="jamanat-top-list" className="rounded-2xl border border-rose-200 bg-rose-50/60 overflow-hidden dark:border-rose-900/50 dark:bg-rose-950/20">
            <div className="border-b border-rose-200/70 px-4 py-3 dark:border-rose-900/40">
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                {lang === "np" ? "शीर्ष जमानत जफत उम्मेदवार" : "Top Jamanat Jafat Candidates"}
              </p>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                {lang === "np" ? getParty(selParty).partyName : getParty(selParty).nameEn} · {openedPartyRows.length} {lang === "np" ? "उम्मेदवार" : "candidates"}
              </p>
            </div>

            {openedPartyRows.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-slate-400">
                {lang === "np" ? "यो फिल्टरमा कुनै उम्मेदवार छैन।" : "No candidates for this filter."}
              </div>
            ) : (
              <div className="divide-y divide-rose-100 dark:divide-rose-900/30">
                {openedPartyRows.map((row) => (
                  <Link
                    key={`top-${row.constCode}-${row.candidateId}`}
                    to={`/candidate/${candidateSlug(row.candidateId, row.candidateName)}`}
                    className="grid grid-cols-[1fr_auto_auto] items-center gap-3 px-4 py-2.5 hover:bg-white/80 dark:hover:bg-slate-900/40 transition-colors"
                  >
                    <span className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">
                      {lang === "np" ? row.candidateNameNp : row.candidateName}
                    </span>
                    <span className="text-xs tabular-nums text-slate-600 dark:text-slate-300" style={{ fontFamily: "'DM Mono', monospace" }}>
                      {fmt(row.votes)}
                    </span>
                    <span className="text-xs tabular-nums font-bold text-rose-700 dark:text-rose-300" style={{ fontFamily: "'DM Mono', monospace" }}>
                      {row.voteSharePct.toFixed(2)}%
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </section>
        )}

        <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800/80 dark:bg-[#0c1525]">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
              {lang === "np" ? "दल अनुसार जमानत जफत" : "Jamanat Jafat by Party"}
            </h2>
            <span className="text-xs text-slate-400">{partyCards.length} {lang === "np" ? "दल" : "parties"}</span>
          </div>
          {partyCards.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-6 text-center text-xs text-slate-400 dark:border-slate-700 dark:bg-slate-900/50">
              {lang === "np" ? "यो फिल्टरमा कुनै नतिजा छैन।" : "No party data for the current filters."}
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {partyCards.map((party, idx) => {
                const selected = selParty === party.partyId;
                const rank = party.partiesPageRank ?? idx + 1;
                return (
                  <div
                    key={party.partyId}
                    className={"overflow-hidden rounded-xl border transition " +
                      (selected
                        ? "border-[#2563eb]/50 bg-blue-50/60 dark:border-[#3b82f6]/50 dark:bg-blue-950/20"
                        : "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900/40")}
                  >
                    <div className="h-1.5 w-full" style={{ backgroundColor: partyHex(party.partyId) }} />
                    <div className="p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              className="inline-flex h-6 min-w-[2.1rem] items-center justify-center rounded-full bg-blue-100 px-1.5 text-[10px] font-extrabold text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 tabular-nums"
                              style={{ fontFamily: "'DM Mono', monospace" }}
                            >
                              #{rank}
                            </span>
                            <PartySymbol partyId={party.partyId} size="md" />
                            <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                              {lang === "np" ? getParty(party.partyId).partyName : getParty(party.partyId).nameEn}
                            </p>
                          </div>
                          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                            {lang === "np" ? "पार्टी र्याङ्क" : "Parties rank"}: #{rank}
                            {party.partiesPageRank === null ? ` (${lang === "np" ? "नयाँ" : "new"})` : ""}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSelParty((prev) => prev === party.partyId ? "All" : party.partyId)}
                          className={"rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition " +
                            (selected
                              ? "border-[#2563eb] bg-[#2563eb] text-white"
                              : "border-slate-300 text-slate-600 hover:border-[#2563eb]/40 hover:text-[#2563eb] dark:border-slate-600 dark:text-slate-300 dark:hover:border-[#3b82f6]/40 dark:hover:text-[#3b82f6]")}
                        >
                          {selected
                            ? (lang === "np" ? "हटाउनुहोस्" : "Clear")
                            : (lang === "np" ? "हेर्नुहोस्" : "Show")}
                        </button>
                      </div>

                      <div className="mt-3 grid grid-cols-3 gap-2 text-[11px]">
                        <div className="rounded-lg bg-slate-50 px-2 py-1.5 text-center dark:bg-slate-800/70">
                          <div className="font-bold tabular-nums text-slate-800 dark:text-slate-200">{party.count}</div>
                          <div className="text-slate-400">{lang === "np" ? "जफत" : "Jafat"}</div>
                        </div>
                        <div className="rounded-lg bg-slate-50 px-2 py-1.5 text-center dark:bg-slate-800/70">
                          <div className="font-bold tabular-nums text-slate-800 dark:text-slate-200">{party.avgVoteSharePct.toFixed(2)}%</div>
                          <div className="text-slate-400">{lang === "np" ? "औसत" : "Avg"}</div>
                        </div>
                        <div className="rounded-lg bg-slate-50 px-2 py-1.5 text-center dark:bg-slate-800/70">
                          <div className="font-bold tabular-nums text-slate-800 dark:text-slate-200">{party.declaredSeats}</div>
                          <div className="text-slate-400">{lang === "np" ? "सिट" : "Seats"}</div>
                        </div>
                      </div>

                      <div className="mt-3 border-t border-slate-100 pt-2 dark:border-slate-700">
                        <p className="mb-1 text-[10px] uppercase tracking-wide text-slate-400">
                          {lang === "np" ? "शीर्ष जमानत जफत उम्मेदवार" : "Top Jamanat Jafat Candidates"}
                        </p>
                        <div className="space-y-1.5">
                          {party.topCandidates.map((cand) => (
                            <div key={`${party.partyId}-${cand.candidateId}-${cand.constCode}`} className="flex items-center justify-between gap-2">
                              <Link
                                to={`/candidate/${candidateSlug(cand.candidateId, cand.candidateName)}`}
                                className="truncate text-xs text-slate-700 hover:text-[#2563eb] dark:text-slate-200 dark:hover:text-[#3b82f6]"
                              >
                                {lang === "np" ? cand.candidateNameNp : cand.candidateName}
                              </Link>
                              <span className="shrink-0 text-[11px] tabular-nums font-semibold text-rose-600 dark:text-rose-300">
                                {cand.voteSharePct.toFixed(2)}%
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                    <div className="mt-3 flex items-center justify-between text-[11px]">
                        <span className="font-medium text-slate-500 dark:text-slate-400">
                          {lang === "np" ? "दल अनुसार सूची" : "Party-wise candidate list"}
                        </span>
                        <button
                          type="button"
                          onClick={() => openPartyTopList(party.partyId)}
                          className="font-medium text-slate-500 hover:text-[#2563eb] dark:text-slate-400 dark:hover:text-[#3b82f6]"
                        >
                          {lang === "np" ? "शीर्ष सूची हेर्नुहोस्" : "See top list"}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

      </div>
    </Layout>
  );
}
