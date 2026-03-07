import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useElectionStore } from "../store/electionStore";
import { PROVINCES as provinces } from "../types";
import type { Province, ConstituencyResult, Candidate } from "../types";
import { provinceName } from "../i18n";
import { getParty, partyHex } from "../lib/partyRegistry";
import Layout from "../components/Layout";
import PartySymbol from "../components/PartySymbol";
import NepalMap from "../NepalMap";
import type { MapMode } from "../NepalMap";

const SELECT_CLS =
  "h-8 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0c1525] " +
  "px-3 text-[11px] text-slate-700 dark:text-slate-300 outline-none focus:border-[#2563eb] transition min-w-0";

function getDeclaredOrLeadingCandidate(r: ConstituencyResult): Candidate | null {
  if (r.status === "PENDING" || r.candidates.length === 0) return null;
  if (r.status === "DECLARED") {
    const winner = r.candidates.find((c) => c.isWinner);
    if (winner && winner.votes > 0) return winner;
  }
  const leader = [...r.candidates].sort((a, b) => b.votes - a.votes)[0] ?? null;
  return leader && leader.votes > 0 ? leader : null;
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

  const [mode, setMode]                   = useState<MapMode>("constituency");
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
  const selectedResult = selectedSeat ? results.find((r) => r.name === selectedSeat) ?? null : null;
  const partyLegend = useMemo(() => {
    const scope = selected === "All" ? results : results.filter((r) => r.province === selected);
    const counts = new Map<string, number>();
    for (const r of scope) {
      const leader = getDeclaredOrLeadingCandidate(r);
      if (!leader) continue;
      counts.set(leader.partyId, (counts.get(leader.partyId) ?? 0) + 1);
    }

    const sorted = Array.from(counts.entries())
      .sort((a, b) => {
        if (b[1] !== a[1]) return b[1] - a[1];
        return getParty(a[0]).nameEn.localeCompare(getParty(b[0]).nameEn);
      });

    const visibleItems = sorted.slice(0, 14).map(([partyId, count]) => ({ partyId, count }));
    return {
      items: visibleItems,
      hiddenCount: Math.max(0, sorted.length - visibleItems.length),
    };
  }, [results, selected]);

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
      <div className="max-w-[96rem] mx-auto px-2 sm:px-6 py-6 space-y-4">

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

          {/* Province + District + Constituency dropdowns */}
          <div className="flex flex-wrap gap-2">
            <select
              value={selected}
              onChange={(e) => {
                const v = e.target.value as "All" | Province;
                setSelected(v);
                setSelectedDistrict(null);
                setSelectedConst("All");
                setSelectedSeat(null);
              }}
              className={SELECT_CLS}
            >
              <option value="All">{lang === "np" ? "सबै प्रदेश" : "All Provinces"}</option>
              {provinces.map((p) => (
                <option key={p} value={p}>{provinceName(p, lang)}</option>
              ))}
            </select>

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
                const nextCode = e.target.value;
                setSelectedConst(nextCode);
                setSelectedSeat(nextCode === "All" ? null : (results.find((r) => r.code === nextCode)?.name ?? null));
                if (nextCode !== "All" && mode !== "constituency") setMode("constituency");
              }}
              className={SELECT_CLS}
              disabled={constOptions.length === 0}
            >
              <option value="All">{lang === "np" ? "सबै क्षेत्र" : "All Constituencies"}</option>
              {constOptions.map(([code, [nameEn, nameNp]]) => (
                <option key={code} value={code}>{lang === "np" ? nameNp : nameEn}</option>
              ))}
            </select>

            {selectedSeat && (
              <button
                onClick={() => setSelectedSeat(null)}
                className="h-8 px-3 rounded-xl text-[11px] font-medium transition border border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20"
              >
                {lang === "np" ? "× क्षेत्र हटाउनुहोस्" : "× clear seat"}
              </button>
            )}
          </div>
        </div>

        {/* ── Map card — full width ─────────────────────────────────────────── */}
        <div className="bg-white dark:bg-[#0c1525] rounded-2xl border border-slate-200 dark:border-slate-800/80 p-2 sm:p-3 shadow-sm">

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
          </div>
          <div className="mb-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-900 px-2 py-1 text-[10px] text-slate-600 dark:text-slate-300">
              <span className="inline-block h-2.5 w-2.5 rounded-sm border border-emerald-600/80 bg-emerald-400" />
              {lang === "np" ? "राष्ट्रिय निकुञ्ज क्षेत्र" : "National Park Area"}
            </span>
          </div>
          {mode === "constituency" && partyLegend.items.length > 0 && (
            <div className="mb-2 rounded-xl border border-slate-200 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-900/40 px-2.5 py-2">
              <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                {lang === "np" ? "दल रंग / चिन्ह मार्गदर्शिका" : "Party Color & Symbol Legend"}
              </div>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {partyLegend.items.map(({ partyId, count }) => {
                  const party = getParty(partyId);
                  const label = (lang === "np" ? party.partyName : party.nameEn).split(" (")[0];
                  return (
                    <span
                      key={partyId}
                      className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-900 px-2 py-1 text-[10px] text-slate-700 dark:text-slate-300"
                    >
                      <span className="inline-block h-2.5 w-2.5 rounded-sm border border-slate-300/80 dark:border-slate-600/80" style={{ backgroundColor: partyHex(partyId) }} />
                      <PartySymbol partyId={partyId} size="sm" />
                      <span className="font-medium">{label}</span>
                      <span className="tabular-nums text-slate-400 dark:text-slate-500">({count})</span>
                    </span>
                  );
                })}
                {partyLegend.hiddenCount > 0 && (
                  <span className="inline-flex items-center rounded-full border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-900 px-2 py-1 text-[10px] text-slate-500 dark:text-slate-400">
                    +{partyLegend.hiddenCount} {lang === "np" ? "थप" : "more"}
                  </span>
                )}
              </div>
            </div>
          )}

          <NepalMap
              results={results}
              selectedProvince={selected}
              onSelect={setSelected}
              lang={lang}
              mode={mode}
              selectedSeat={
                selectedSeat ??
                (selectedConst !== "All" ? (results.find((r) => r.code === selectedConst)?.name ?? null) : null)
              }
              onSelectSeat={(seatName) => {
                setSelectedSeat(seatName);
                setSelectedConst(seatName ? (results.find((r) => r.name === seatName)?.code ?? "All") : "All");
                if (seatName && mode !== "constituency") setMode("constituency");
              }}
              selectedDistrict={selectedDistrict}
              onSelectDistrict={(d) => {
                setSelectedDistrict(d);
                setSelectedConst("All");
                setSelectedSeat(null);
              }}
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

            {/* ── District constituency list (district mode, district selected) */}
            {mode === "district" && selectedDistrict && (
              <div className="w-72 shrink-0 bg-white dark:bg-[#0c1525] rounded-2xl border border-slate-200 dark:border-slate-800/80 p-4 shadow-sm">
                <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-2">
                  {selectedDistrict} — {lang === "np" ? "क्षेत्रहरू" : "Constituencies"} ({filtered.length})
                </div>
                <div className="space-y-1">
                  {filtered.map((r) => {
                    const top = [...r.candidates].sort((a, b) => b.votes - a.votes)[0];
                    const leader = getDeclaredOrLeadingCandidate(r);
                    const leaderHex = leader ? partyHex(leader.partyId) : null;
                    const accentClass = leaderHex
                      ? "border-l-[3px]"
                      : r.status === "DECLARED"
                        ? "border-l-emerald-500"
                        : r.status === "COUNTING"
                          ? "border-l-amber-400"
                          : "border-l-slate-300";
                    return (
                      <button key={r.code}
                        onClick={() => navigate(`/constituency/${encodeURIComponent(r.code)}`)}
                        className={"w-full text-left rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 px-3 py-1.5 border-l-2 transition hover:bg-slate-100 dark:hover:bg-slate-700/60 " + accentClass}
                        style={leaderHex ? { borderLeftColor: leaderHex } : undefined}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                            {lang === "np" ? r.nameNp : r.name}
                          </div>
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
                    const leader = getDeclaredOrLeadingCandidate(r);
                    const leaderHex = leader ? partyHex(leader.partyId) : null;
                    const accentClass = leaderHex
                      ? "border-l-[3px]"
                      : r.status === "DECLARED"
                        ? "border-l-emerald-500"
                        : r.status === "COUNTING"
                          ? "border-l-amber-400"
                          : "border-l-slate-300";
                    return (
                      <button key={r.code}
                        onClick={() => navigate(`/constituency/${encodeURIComponent(r.code)}`)}
                        className={"w-full text-left rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 px-3 py-1.5 border-l-2 transition hover:bg-slate-100 dark:hover:bg-slate-700/60 " + accentClass}
                        style={leaderHex ? { borderLeftColor: leaderHex } : undefined}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                            {lang === "np" ? r.nameNp : r.name}
                          </div>
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
