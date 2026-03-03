import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useElectionStore } from "../store/electionStore";
import { PROVINCES as provinces } from "../types";
import type { Province } from "../types";
import { provinceName } from "../i18n";
import Layout from "../components/Layout";
import NepalMap from "../NepalMap";
import type { MapMode } from "../NepalMap";

const SELECT_CLS =
  "h-8 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0c1525] " +
  "px-3 text-[11px] text-slate-700 dark:text-slate-300 outline-none focus:border-[#2563eb] transition min-w-0";

// ── Competitive-seat calculation ───────────────────────────────────────────────

type CompetitiveSeat = {
  name: string;
  nameNp: string;
  province: string;
  marginVotes: number;
  leader: string;
  leaderParty: string;
};

function computeCompetitive(
  results: import("../types").ConstituencyResult[],
): CompetitiveSeat[] {
  const seats: CompetitiveSeat[] = [];
  for (const r of results) {
    if (r.candidates.length < 2) continue;
    const sorted = [...r.candidates].sort((a, b) => b.votes - a.votes);
    const top1 = sorted[0];
    const top2 = sorted[1];
    if (top1.votes === 0) continue;
    const margin = top1.votes - top2.votes;
    if (margin <= 1500) {
      seats.push({
        name:        r.name,
        nameNp:      r.nameNp,
        province:    r.province,
        marginVotes: margin,
        leader:      top1.name,
        leaderParty: top1.partyId,
      });
    }
  }
  return seats.sort((a, b) => a.marginVotes - b.marginVotes).slice(0, 20);
}

export default function MapPage() {
  useEffect(() => {
    document.title = "Nepal Election Map 2082 – Province & Constituency Results | NepalVotes";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", "Interactive map showing Nepal's 2082 election results by province and constituency.");
    const canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) canonical.setAttribute("href", "https://nepalvotes.live/map");
    return () => { if (canonical) canonical.setAttribute("href", "https://nepalvotes.live/"); };
  }, []);

  const results  = useElectionStore((s) => s.results);
  const lang     = useElectionStore((s) => s.lang);
  const navigate = useNavigate();

  const [mode, setMode]                   = useState<MapMode>("district");
  const [selected, setSelected]           = useState<"All" | Province>("All");
  const [selectedDistrict, setSelectedDistrict] = useState<string | null>(null);
  const [selectedConst, setSelectedConst] = useState<string>("All");
  const [selectedSeat, setSelectedSeat]   = useState<string | null>(null);

  function handleModeSwitch(m: MapMode) {
    setMode(m);
    if (m === "district") setSelectedSeat(null);
  }

  // ── Cascading district options ─────────────────────────────────────────────
  const districtOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const r of results) {
      if (selected === "All" || r.province === selected) seen.set(r.district, r.districtNp ?? r.district);
    }
    return Array.from(seen.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [results, selected]);

  // ── Cascading constituency options ─────────────────────────────────────────
  const constOptions = useMemo(() => {
    const seen = new Map<string, [string, string]>();
    for (const r of results) {
      if (selected !== "All" && r.province !== selected) continue;
      if (selectedDistrict && r.district !== selectedDistrict) continue;
      seen.set(r.code, [r.name, r.nameNp]);
    }
    return Array.from(seen.entries()).sort((a, b) => a[1][0].localeCompare(b[1][0]));
  }, [results, selected, selectedDistrict]);

  // ── Derived ───────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = selected === "All" ? results : results.filter((r) => r.province === selected);
    if (selectedDistrict) list = list.filter((r) => r.district === selectedDistrict);
    if (selectedConst !== "All") list = list.filter((r) => r.code === selectedConst);
    return list;
  }, [results, selected, selectedDistrict, selectedConst]);
  const declared = filtered.filter((r) => r.status === "DECLARED").length;
  const counting = filtered.filter((r) => r.status === "COUNTING").length;
  const total    = filtered.length;
  const competitive = useMemo(() => computeCompetitive(results), [results]);
  const selectedResult = selectedSeat ? results.find((r) => r.name === selectedSeat) ?? null : null;

  // Hot seat codes — constituencies with margin < 10% (matches HotSeats component logic)
  const hotSeatCodes = useMemo<Set<string>>(() => {
    const s = new Set<string>();
    for (const r of results) {
      if (r.status === "PENDING") continue;
      const withVotes = r.candidates.filter((c) => c.votes > 0);
      if (withVotes.length < 2) continue;
      const sorted = [...withVotes].sort((a, b) => b.votes - a.votes);
      const marginPct = sorted[0].votes > 0
        ? ((sorted[0].votes - sorted[1].votes) / sorted[0].votes) * 100
        : 100;
      if (marginPct < 10) s.add(r.name);
    }
    return s;
  }, [results]);

  function candidateSlug(id: number, name: string) {
    return `${id}-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  }

  const heroBadge = (
    <span className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-3.5 py-1 text-xs font-semibold text-blue-400 uppercase tracking-widest">
      {lang === "np" ? "७ प्रदेश · ७७ जिल्ला · १६५ क्षेत्र" : "7 provinces · 77 districts · 165 constituencies"}
    </span>
  );

  return (
    <Layout
      title="Nepal Election Map"
      titleNp="नेपाल निर्वाचन नक्सा"
      subtitle="Interactive map · Click a region to explore"
      subtitleNp="अन्तरक्रिय नक्सा · क्षेत्र चयन गर्न क्लिक गर्नुहोस्"
      badge={heroBadge}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-4">

        {/* ── Province + stats toolbar ──────────────────────────────────────── */}
        <div className="bg-white dark:bg-[#0c1525] rounded-2xl border border-slate-200 dark:border-slate-800/80 px-4 py-3 shadow-sm space-y-3">

          {/* Stats row */}
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span className="font-bold text-emerald-600">{declared}</span>
                <span className="text-slate-500 dark:text-slate-400">{lang === "np" ? "घोषित" : "declared"}</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-amber-500" />
                <span className="font-bold text-amber-600">{counting}</span>
                <span className="text-slate-500 dark:text-slate-400">{lang === "np" ? "मतगणना" : "counting"}</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="font-bold text-slate-700 dark:text-slate-200">{total}</span>
                <span className="text-slate-500 dark:text-slate-400">{lang === "np" ? "कुल" : "total"}</span>
              </span>
            </div>
          </div>

          {/* Province pills */}
          <div className="flex flex-wrap gap-1.5">
            <button onClick={() => { setSelected("All"); setSelectedDistrict(null); setSelectedConst("All"); }}
              className={"h-6 px-3 rounded-full text-[11px] font-medium transition border " +
                (selected === "All"
                  ? "bg-[#2563eb] border-[#2563eb] text-white"
                  : "border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-[#2563eb]/40"
                )}
            >
              {lang === "np" ? "सबै" : "All"}
            </button>
            {provinces.map((p) => (
              <button key={p} onClick={() => {
                setSelected(selected === p ? "All" : p);
                setSelectedDistrict(null);
                setSelectedConst("All");
              }}
                className={"h-6 px-3 rounded-full text-[11px] font-medium transition border " +
                  (selected === p
                    ? "bg-[#2563eb] border-[#2563eb] text-white"
                    : "border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-[#2563eb]/40"
                  )}
              >
                {provinceName(p, lang)}
              </button>
            ))}
            {selectedSeat && (
              <button onClick={() => setSelectedSeat(null)}
                className="h-6 px-3 rounded-full text-[11px] font-medium transition border border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20"
              >
                {lang === "np" ? "× क्षेत्र हटाउनुहोस्" : "× clear seat"}
              </button>
            )}
          </div>

          {/* District + Constituency dropdowns */}
          <div className="flex flex-wrap gap-2">
            <select
              value={selectedDistrict ?? "All"}
              onChange={(e) => {
                const v = e.target.value;
                setSelectedDistrict(v === "All" ? null : v);
                setSelectedConst("All");
              }}
              className={SELECT_CLS}
              disabled={districtOptions.length === 0}
            >
              <option value="All">{lang === "np" ? "सबै जिल्ला" : "All Districts"}</option>
              {districtOptions.map(([en, np]) => (
                <option key={en} value={en}>{lang === "np" ? np : en}</option>
              ))}
            </select>

            <select
              value={selectedConst}
              onChange={(e) => {
                setSelectedConst(e.target.value);
                if (e.target.value !== "All" && mode !== "constituency") setMode("constituency");
              }}
              className={SELECT_CLS}
              disabled={constOptions.length === 0}
            >
              <option value="All">{lang === "np" ? "सबै क्षेत्र" : "All Constituencies"}</option>
              {constOptions.map(([code, [nameEn, nameNp]]) => (
                <option key={code} value={code}>{lang === "np" ? nameNp : nameEn}</option>
              ))}
            </select>
          </div>
        </div>

        {/* ── Map card — full width ─────────────────────────────────────────── */}
        <div className="bg-white dark:bg-[#0c1525] rounded-2xl border border-slate-200 dark:border-slate-800/80 p-3 shadow-sm">

          {/* Mode toggle */}
          <div className="flex items-center gap-1.5 mb-2">
            {(["district", "constituency"] as MapMode[]).map((m) => (
              <button key={m} onClick={() => handleModeSwitch(m)}
                className={"h-7 px-4 rounded-full text-xs font-semibold transition border " +
                  (mode === m
                    ? "bg-[#2563eb] border-[#2563eb] text-white"
                    : "border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-[#2563eb]/50"
                  )}
              >
                {m === "district"
                  ? (lang === "np" ? "जिल्ला" : "Districts")
                  : (lang === "np" ? "निर्वाचन क्षेत्र" : "Constituencies")}
              </button>
            ))}
            {mode === "constituency" && (
              <span className="ml-auto flex items-center gap-1.5 text-[10px] text-slate-400 dark:text-slate-500">
                <span className="inline-block w-3 h-3 rounded-sm bg-[#fca5a5] border border-[#ef4444]" />
                {lang === "np" ? "कडा प्रतिस्पर्धा" : "Hot seat"}
              </span>
            )}
          </div>

          <NepalMap
              results={results}
              selectedProvince={selected}
              onSelect={setSelected}
              lang={lang}
              mode={mode}
              selectedSeat={selectedSeat ?? (selectedConst !== "All" ? selectedConst : null)}
              onSelectSeat={(code) => {
                setSelectedSeat(code);
                setSelectedConst(code ?? "All");
                if (code && mode !== "constituency") setMode("constituency");
              }}
              selectedDistrict={selectedDistrict}
              onSelectDistrict={(d) => {
                setSelectedDistrict(d);
                setSelectedConst("All");
                setSelectedSeat(null);
              }}
              hotSeatCodes={hotSeatCodes}
            />
        </div>

        {/* ── Sidebar panels — horizontal scroll row below map ──────────────── */}
        <div className="flex gap-3 overflow-x-auto pb-1" style={{ scrollSnapType: "x mandatory" }}>
          <div className="flex gap-3 min-w-0" style={{ scrollSnapAlign: "start" }}>

            {/* ── Selected constituency detail (constituency mode) ───────── */}
            {selectedResult && (
              <div className="w-80 shrink-0 bg-white dark:bg-[#0c1525] rounded-2xl border border-amber-400/50 p-4 shadow-sm">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0">
                    <div className="text-[10px] font-semibold text-amber-500 uppercase tracking-widest mb-0.5">
                      {lang === "np" ? "चयनित क्षेत्र" : "Selected Constituency"}
                    </div>
                    <div className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                      {lang === "np" ? selectedResult.nameNp : selectedResult.name}
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                      {selectedResult.province} · {selectedResult.district}
                    </div>
                  </div>
                  <span className={"text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 " +
                    (selectedResult.status === "DECLARED" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400" :
                     selectedResult.status === "COUNTING" ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400" :
                     "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400")}
                  >
                    {selectedResult.status}
                  </span>
                </div>

                {/* Top 5 candidates — clickable */}
                <div className="space-y-1 mb-3">
                  {[...selectedResult.candidates]
                    .sort((a, b) => b.votes - a.votes)
                    .slice(0, 5)
                    .map((c, rank) => (
                      <button key={c.candidateId}
                        onClick={() => navigate(`/candidate/${candidateSlug(c.candidateId, c.name)}`)}
                        className={"w-full flex items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-xs text-left transition " +
                          (c.isWinner
                            ? "bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/40"
                            : "bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-700/60")}
                      >
                        <span className="flex items-center gap-1.5 min-w-0">
                          <span className="shrink-0 text-[10px] font-bold text-slate-400 dark:text-slate-500 w-3">
                            {rank + 1}
                          </span>
                          <span className="truncate font-medium text-slate-800 dark:text-slate-200">
                            {lang === "np" ? c.nameNp : c.name}
                            {c.isWinner && <span className="ml-1 text-emerald-600">✓</span>}
                          </span>
                        </span>
                        <span className="shrink-0 tabular-nums text-slate-500 dark:text-slate-400">
                          {c.votes > 0 ? c.votes.toLocaleString() : "—"}
                        </span>
                      </button>
                    ))}
                </div>

                {/* View full race button */}
                <button
                  onClick={() => navigate(`/constituency/${encodeURIComponent(selectedResult.code)}`)}
                  className="w-full rounded-lg border border-[#2563eb]/30 bg-[#2563eb]/5 hover:bg-[#2563eb]/10 px-3 py-1.5 text-[11px] font-semibold text-[#2563eb] dark:text-blue-400 transition text-center"
                >
                  {lang === "np" ? "पूर्ण दौड हेर्नुहोस् →" : "View full race →"}
                </button>
              </div>
            )}

            {/* ── Competitive seats ─────────────────────────────────────── */}
            {competitive.length > 0 && (
              <div className="w-72 shrink-0 bg-white dark:bg-[#0c1525] rounded-2xl border border-slate-200 dark:border-slate-800/80 p-4 shadow-sm">
                <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-2">
                  {lang === "np" ? "कडा प्रतिस्पर्धा (शीर्ष २०)" : "Closest Races (top 20)"}
                </div>
                <div className="space-y-0.5">
                  {competitive.map((seat: CompetitiveSeat) => (
                    <button key={seat.name}
                      onClick={() => { setSelectedSeat(seat.name); setSelectedConst(seat.name); setMode("constituency"); }}
                      className={"w-full text-left rounded-lg px-2.5 py-1.5 transition " +
                        (selectedSeat === seat.name
                          ? "bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700"
                          : "hover:bg-slate-50 dark:hover:bg-slate-800/50")}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                          {lang === "np" ? seat.nameNp : seat.name}
                        </span>
                        <span className="shrink-0 text-[10px] font-bold tabular-nums text-rose-600 dark:text-rose-400">
                          ±{seat.marginVotes.toLocaleString()}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                        {seat.leader} · {seat.province}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ── District constituency list (district mode, district selected) */}
            {mode === "district" && selectedDistrict && (
              <div className="w-72 shrink-0 bg-white dark:bg-[#0c1525] rounded-2xl border border-slate-200 dark:border-slate-800/80 p-4 shadow-sm">
                <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-2">
                  {selectedDistrict} — {lang === "np" ? "क्षेत्रहरू" : "Constituencies"} ({filtered.length})
                </div>
                <div className="space-y-1">
                  {filtered.map((r) => {
                    const top = [...r.candidates].sort((a, b) => b.votes - a.votes)[0];
                    const isHot = hotSeatCodes.has(r.name);
                    const accent =
                      r.status === "DECLARED" ? "border-l-emerald-500" :
                      r.status === "COUNTING"  ? "border-l-amber-400"   : "border-l-slate-300";
                    return (
                      <button key={r.code}
                        onClick={() => navigate(`/constituency/${encodeURIComponent(r.code)}`)}
                        className={"w-full text-left rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 px-3 py-1.5 border-l-2 transition hover:bg-slate-100 dark:hover:bg-slate-700/60 " + accent}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                            {lang === "np" ? r.nameNp : r.name}
                          </div>
                          {isHot && (
                            <span className="shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400">
                              🔥
                            </span>
                          )}
                        </div>
                        {top && top.votes > 0 ? (
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                            {lang === "np" ? top.nameNp : top.name}
                          </div>
                        ) : (
                          <div className="text-[10px] text-slate-400 dark:text-slate-600">
                            {lang === "np" ? "मत अद्यावधिक छैन" : "No votes yet"}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── Province constituency list (district mode, province selected, no district) */}
            {mode === "district" && selected !== "All" && !selectedDistrict && (
              <div className="w-72 shrink-0 bg-white dark:bg-[#0c1525] rounded-2xl border border-slate-200 dark:border-slate-800/80 p-4 shadow-sm">
                <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-2">
                  {provinceName(selected, lang)} — {lang === "np" ? "क्षेत्रहरू" : "Constituencies"} ({filtered.length})
                </div>
                <div className="space-y-1">
                  {filtered.map((r) => {
                    const top = [...r.candidates].sort((a, b) => b.votes - a.votes)[0];
                    const isHot = hotSeatCodes.has(r.name);
                    const accent =
                      r.status === "DECLARED" ? "border-l-emerald-500" :
                      r.status === "COUNTING"  ? "border-l-amber-400"   : "border-l-slate-300";
                    return (
                      <button key={r.code}
                        onClick={() => navigate(`/constituency/${encodeURIComponent(r.code)}`)}
                        className={"w-full text-left rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 px-3 py-1.5 border-l-2 transition hover:bg-slate-100 dark:hover:bg-slate-700/60 " + accent}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                            {lang === "np" ? r.nameNp : r.name}
                          </div>
                          {isHot && (
                            <span className="shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400">
                              🔥
                            </span>
                          )}
                        </div>
                        {top && top.votes > 0 ? (
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                            {lang === "np" ? top.nameNp : top.name} · {r.district}
                          </div>
                        ) : (
                          <div className="text-[10px] text-slate-400 dark:text-slate-600">
                            {r.district}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

          </div>{/* end inner flex */}
        </div>{/* end scroll row */}
      </div>
    </Layout>
  );
}
