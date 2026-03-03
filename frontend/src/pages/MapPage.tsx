import { useState, useEffect, useMemo } from "react";
import { useElectionStore } from "../store/electionStore";
import { PROVINCES as provinces } from "../types";
import type { Province } from "../types";
import { provinceName } from "../i18n";
import Layout from "../components/Layout";
import NepalMap from "../NepalMap";
import type { MapMode } from "../NepalMap";

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

  const results = useElectionStore((s) => s.results);
  const lang    = useElectionStore((s) => s.lang);

  const [mode, setMode]                 = useState<MapMode>("district");
  const [selected, setSelected]         = useState<"All" | Province>("All");
  const [selectedSeat, setSelectedSeat] = useState<string | null>(null);

  function handleModeSwitch(m: MapMode) {
    setMode(m);
    if (m === "district") setSelectedSeat(null);
  }

  // ── Derived ───────────────────────────────────────────────────────────────
  const filtered   = selected === "All" ? results : results.filter((r) => r.province === selected);
  const declared   = filtered.filter((r) => r.status === "DECLARED").length;
  const counting   = filtered.filter((r) => r.status === "COUNTING").length;
  const total      = filtered.length;
  const competitive = useMemo(() => computeCompetitive(results), [results]);
  const selectedResult = selectedSeat ? results.find((r) => r.name === selectedSeat) ?? null : null;

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
            <button onClick={() => setSelected("All")}
              className={"h-6 px-3 rounded-full text-[11px] font-medium transition border " +
                (selected === "All"
                  ? "bg-[#2563eb] border-[#2563eb] text-white"
                  : "border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-[#2563eb]/40"
                )}
            >
              {lang === "np" ? "सबै" : "All"}
            </button>
            {provinces.map((p) => (
              <button key={p} onClick={() => setSelected(selected === p ? "All" : p)}
                className={"h-6 px-3 rounded-full text-[11px] font-medium transition border " +
                  (selected === p
                    ? "bg-[#2563eb] border-[#2563eb] text-white"
                    : "border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-[#2563eb]/40"
                  )}
              >
                {provinceName(p, lang)}
              </button>
            ))}
            {/* Clear seat selection pill */}
            {selectedSeat && (
              <button onClick={() => setSelectedSeat(null)}
                className="h-6 px-3 rounded-full text-[11px] font-medium transition border border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20"
              >
                {lang === "np" ? "× क्षेत्र हटाउनुहोस्" : "× clear seat"}
              </button>
            )}
          </div>
        </div>

        {/* ── Main content: map + sidebar ───────────────────────────────────── */}
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_288px] gap-4">

          {/* Map card */}
          <div className="bg-white dark:bg-[#0c1525] rounded-2xl border border-slate-200 dark:border-slate-800/80 p-4 shadow-sm">

            {/* Mode toggle — inside map card, above the SVG */}
            <div className="flex items-center gap-1.5 mb-3">
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
            </div>

            <NepalMap
              results={results}
              selectedProvince={selected}
              onSelect={setSelected}
              lang={lang}
              mode={mode}
              selectedSeat={selectedSeat}
              onSelectSeat={(code) => {
                setSelectedSeat(code);
                if (code && mode !== "constituency") setMode("constituency");
              }}
            />
          </div>

          {/* Sidebar */}
          <div className="space-y-3">

            {/* ── Selected seat detail ──────────────────────────────────── */}
            {selectedResult && (
              <div className="bg-white dark:bg-[#0c1525] rounded-2xl border border-amber-400/50 p-4 shadow-sm">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <div className="text-[10px] font-semibold text-amber-500 uppercase tracking-widest mb-0.5">
                      {lang === "np" ? "चयनित क्षेत्र" : "Selected Seat"}
                    </div>
                    <div className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      {lang === "np" ? selectedResult.nameNp : selectedResult.name}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
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
                <div className="space-y-1">
                  {[...selectedResult.candidates]
                    .sort((a, b) => b.votes - a.votes)
                    .slice(0, 5)
                    .map((c) => (
                      <div key={c.candidateId}
                        className={"flex items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-xs " +
                          (c.isWinner
                            ? "bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800"
                            : "bg-slate-50 dark:bg-slate-800/50")}
                      >
                        <span className="truncate font-medium text-slate-800 dark:text-slate-200">
                          {lang === "np" ? c.nameNp : c.name}
                          {c.isWinner && <span className="ml-1 text-emerald-600">✓</span>}
                        </span>
                        <span className="shrink-0 tabular-nums text-slate-500 dark:text-slate-400">
                          {c.votes > 0 ? c.votes.toLocaleString() : "—"}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* ── Competitive seats ─────────────────────────────────────── */}
            {competitive.length > 0 && (
              <div className="bg-white dark:bg-[#0c1525] rounded-2xl border border-slate-200 dark:border-slate-800/80 p-4 shadow-sm">
                <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-2">
                  {lang === "np" ? "कडा प्रतिस्पर्धा (शीर्ष २०)" : "Closest Races (top 20)"}
                </div>
                <div className="space-y-0.5">
                  {competitive.map((seat: CompetitiveSeat) => (
                    <button key={seat.name}
                      onClick={() => { setSelectedSeat(seat.name); setMode("constituency"); }}
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

            {/* ── Province constituency list (district mode, province selected) */}
            {mode === "district" && selected !== "All" && (
              <div className="bg-white dark:bg-[#0c1525] rounded-2xl border border-slate-200 dark:border-slate-800/80 p-4 shadow-sm">
                <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-2">
                  {provinceName(selected, lang)} — {lang === "np" ? "क्षेत्रहरू" : "Constituencies"} ({filtered.length})
                </div>
                <div className="space-y-1">
                  {filtered.map((r) => {
                    const top = [...r.candidates].sort((a, b) => b.votes - a.votes)[0];
                    const accent =
                      r.status === "DECLARED" ? "border-l-emerald-500" :
                      r.status === "COUNTING"  ? "border-l-amber-400"   : "border-l-slate-300";
                    return (
                      <div key={r.code}
                        className={"rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 px-3 py-1.5 border-l-2 " + accent}
                      >
                        <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                          {lang === "np" ? r.nameNp : r.name}
                        </div>
                        {top && top.votes > 0 && (
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                            {lang === "np" ? top.nameNp : top.name}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </Layout>
  );
}
