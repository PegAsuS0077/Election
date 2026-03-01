import { useState, useMemo } from "react";
import { useElectionStore } from "../store/electionStore";
import { PROVINCES as provinces } from "../types";
import type { ConstituencyResult, Province } from "../types";
import { partyHex } from "../lib/partyRegistry";
import { provinceName } from "../i18n";
import type { Lang } from "../i18n";
import Layout from "../components/Layout";
import { PROVINCE_COLORS } from "../components/Layout";
import { DetailsModal } from "../ConstituencyTable";

const STATUS_TABS = ["all", "DECLARED", "COUNTING", "PENDING"] as const;
type StatusTab = typeof STATUS_TABS[number];

function fmt(n: number) { return n.toLocaleString("en-IN"); }

function StatusBadge({ status, lang }: { status: string; lang: Lang }) {
  const cls =
    status === "DECLARED" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" :
    status === "COUNTING" ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300" :
                             "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400";
  const label =
    status === "DECLARED" ? (lang === "np" ? "घोषित" : "Declared") :
    status === "COUNTING"  ? (lang === "np" ? "मतगणना" : "Counting") :
                              (lang === "np" ? "बांकी" : "Pending");
  return (
    <span className={"text-[10px] font-semibold px-2 py-0.5 rounded-full " + cls}>
      {label}
    </span>
  );
}

function ConstituencyCard({
  r,
  lang,
  onViewDetails,
}: {
  r: ConstituencyResult;
  lang: Lang;
  onViewDetails: () => void;
}) {
  const sorted = useMemo(
    () => [...r.candidates].sort((a, b) => b.votes - a.votes),
    [r.candidates]
  );
  const top3   = sorted.slice(0, 3);
  const extras = sorted.length - 3;
  const provCls = PROVINCE_COLORS[r.province] ?? "bg-slate-100 text-slate-700";

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#0c1525] p-4 flex flex-col gap-3 hover:shadow-md hover:-translate-y-0.5 transition-all">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="font-semibold text-sm text-slate-900 dark:text-slate-100 truncate">
            {lang === "np" ? r.nameNp : r.name}
          </div>
          <div className="mt-1 flex flex-wrap gap-1">
            <span className={"text-[10px] font-semibold px-2 py-0.5 rounded-full " + provCls}>
              {provinceName(r.province, lang)}
            </span>
            <StatusBadge status={r.status} lang={lang} />
          </div>
        </div>
        {r.status === "COUNTING" && (
          <span className="shrink-0 h-2 w-2 rounded-full bg-red-500 animate-pulse mt-1" />
        )}
      </div>

      {/* Candidate count */}
      <p className="text-[11px] text-slate-400 dark:text-slate-500">
        {lang === "np" ? "कुल उम्मेद्वार:" : "Total Candidates:"}{" "}
        <span className="font-semibold text-slate-600 dark:text-slate-300">{r.candidates.length}</span>
      </p>

      {/* Top candidates */}
      <div className="space-y-1.5">
        {top3.map((c) => {
          const hex   = partyHex(c.partyId);
          return (
            <div key={c.candidateId} className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: hex }} />
              <span className="text-xs text-slate-700 dark:text-slate-300 truncate flex-1">
                {lang === "np" ? c.nameNp : c.name}
                <span className="text-[10px] text-slate-400 ml-1">
                  ({(c.partyName ?? "").split(" (")[0]})
                </span>
              </span>
              {c.votes > 0 && (
                <span className="text-xs tabular-nums font-semibold text-slate-600 dark:text-slate-400 shrink-0" style={{ fontFamily: "'DM Mono', monospace" }}>
                  {fmt(c.votes)}
                </span>
              )}
            </div>
          );
        })}
        {extras > 0 && (
          <p className="text-[10px] text-slate-400 dark:text-slate-500 pl-4">
            + {extras} {lang === "np" ? "थप…" : "more…"}
          </p>
        )}
      </div>

      {/* Vote progress bar (top 2) */}
      {sorted[0]?.votes > 0 && sorted[1]?.votes > 0 && (() => {
        const top = sorted[0];
        const sec = sorted[1];
        const total = top.votes + sec.votes;
        const pHex = partyHex(top.partyId);
        return (
          <div className="h-1.5 w-full rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800">
            <div
              className="h-full rounded-l-full transition-all duration-700"
              style={{ width: `${(top.votes / total) * 100}%`, backgroundColor: pHex }}
            />
          </div>
        );
      })()}

      {/* View Details button */}
      <button
        onClick={onViewDetails}
        className="mt-auto w-full h-8 rounded-xl border border-[#2563eb]/40 text-[#2563eb] dark:text-[#3b82f6] text-xs font-semibold hover:bg-[#2563eb] hover:text-white dark:hover:bg-[#2563eb] transition-all"
      >
        {lang === "np" ? "विवरण हेर्नुहोस् →" : "View Details →"}
      </button>
    </div>
  );
}

export default function ExplorePage() {
  const results = useElectionStore((s) => s.results);
  const lang    = useElectionStore((s) => s.lang);

  const [search, setSearch]           = useState("");
  const [selProv, setSelProv]         = useState<"All" | Province>("All");
  const [selDistrict, setSelDistrict] = useState("All");
  const [statusTab, setStatusTab]     = useState<StatusTab>("all");
  const [selectedCode, setSelectedCode] = useState<string | null>(null);

  // Dynamically build district list based on selected province
  const districts = useMemo(() => {
    const base = selProv === "All" ? results : results.filter((r) => r.province === selProv);
    return ["All", ...Array.from(new Set(base.map((r) => r.district))).sort()];
  }, [results, selProv]);

  // Apply all filters
  const filtered = useMemo(() => {
    return results.filter((r) => {
      if (selProv !== "All" && r.province !== selProv) return false;
      if (selDistrict !== "All" && r.district !== selDistrict) return false;
      if (statusTab !== "all" && r.status !== statusTab) return false;
      if (search) {
        const q = search.toLowerCase();
        const hay = `${r.name} ${r.nameNp} ${r.district} ${r.districtNp}`.toLowerCase();
        if (!hay.includes(q) && !r.candidates.some((c) =>
          c.name.toLowerCase().includes(q) || c.nameNp.includes(q)
        )) return false;
      }
      return true;
    });
  }, [results, selProv, selDistrict, statusTab, search]);

  // Group filtered results by district
  const grouped = useMemo(() => {
    const map = new Map<string, ConstituencyResult[]>();
    for (const r of filtered) {
      if (!map.has(r.district)) map.set(r.district, []);
      map.get(r.district)!.push(r);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  // Find selected constituency for modal
  const selectedResult = useMemo(
    () => selectedCode ? results.find((r) => r.code === selectedCode) ?? null : null,
    [results, selectedCode]
  );

  const heroBadge = (
    <span className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-3.5 py-1 text-xs font-semibold text-blue-400 uppercase tracking-widest">
      {filtered.length} {lang === "np" ? "निर्वाचन क्षेत्र" : "constituencies"}
    </span>
  );

  return (
    <Layout
      title="Explore Constituencies"
      titleNp="निर्वाचन क्षेत्र अन्वेषण"
      subtitle="Constituency list by district · Browse all 165 FPTP seats"
      subtitleNp="जिल्ला अनुसार निर्वाचन क्षेत्र सूची"
      badge={heroBadge}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-5">

        {/* ── Filter row: Province + District dropdowns + Search ── */}
        <div className="flex flex-col sm:flex-row gap-3">
          <select
            value={selProv}
            onChange={(e) => { setSelProv(e.target.value as "All" | Province); setSelDistrict("All"); }}
            className="h-9 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0c1525] px-3 text-sm text-slate-700 dark:text-slate-300 outline-none focus:border-[#2563eb] transition"
          >
            <option value="All">{lang === "np" ? "सबै प्रदेश" : "All Provinces"}</option>
            {provinces.map((p) => (
              <option key={p} value={p}>{provinceName(p, lang)}</option>
            ))}
          </select>

          <select
            value={selDistrict}
            onChange={(e) => setSelDistrict(e.target.value)}
            className="h-9 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0c1525] px-3 text-sm text-slate-700 dark:text-slate-300 outline-none focus:border-[#2563eb] transition"
          >
            {districts.map((d) => (
              <option key={d} value={d}>
                {d === "All" ? (lang === "np" ? "सबै जिल्ला" : "All Districts") : d}
              </option>
            ))}
          </select>

          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={lang === "np" ? "निर्वाचन क्षेत्र / उम्मेद्वार खोज्नुहोस्…" : "Search constituency or candidate…"}
            className="flex-1 h-9 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0c1525] px-3 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 outline-none focus:border-[#2563eb] transition"
          />
        </div>

        {/* ── Province pills ── */}
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => { setSelProv("All"); setSelDistrict("All"); }}
            className={"h-7 px-3 rounded-full text-xs font-medium transition border " +
              (selProv === "All"
                ? "bg-[#2563eb] border-[#2563eb] text-white"
                : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-[#2563eb]/50"
              )}
          >
            {lang === "np" ? "सबै" : "All"}
          </button>
          {provinces.map((p) => (
            <button
              key={p}
              onClick={() => { setSelProv(p); setSelDistrict("All"); }}
              className={"h-7 px-3 rounded-full text-xs font-medium transition border " +
                (selProv === p
                  ? "bg-[#2563eb] border-[#2563eb] text-white"
                  : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-[#2563eb]/50"
                )}
            >
              {provinceName(p, lang)}
            </button>
          ))}
        </div>

        {/* ── Status tabs ── */}
        <div className="flex gap-1 flex-wrap">
          {STATUS_TABS.map((tab) => {
            const label =
              tab === "all"       ? (lang === "np" ? "सबै" : "All") :
              tab === "DECLARED"  ? (lang === "np" ? "घोषित" : "Declared") :
              tab === "COUNTING"  ? (lang === "np" ? "मतगणना" : "Counting") :
                                    (lang === "np" ? "बांकी" : "Pending");
            const count = tab === "all"
              ? results.length
              : results.filter((r) => r.status === tab).length;
            return (
              <button
                key={tab}
                onClick={() => setStatusTab(tab)}
                className={"h-8 px-3 rounded-lg text-xs font-semibold transition border " +
                  (statusTab === tab
                    ? "bg-[#2563eb] border-[#2563eb] text-white"
                    : "border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0c1525] text-slate-600 dark:text-slate-400 hover:border-[#2563eb]/40"
                  )}
              >
                {label} <span className="opacity-60 ml-1">{count}</span>
              </button>
            );
          })}
        </div>

        {/* ── Results summary ── */}
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {lang === "np" ? "देखाउँदै" : "Showing"}{" "}
          <span className="font-semibold text-slate-700 dark:text-slate-300">{filtered.length}</span>{" "}
          {lang === "np" ? "निर्वाचन क्षेत्र" : "constituencies"}{" "}
          {lang === "np" ? "" : `across ${grouped.length} district${grouped.length !== 1 ? "s" : ""}`}
        </p>

        {/* ── District-grouped sections ── */}
        {grouped.length === 0 ? (
          <div className="py-16 text-center text-slate-400 dark:text-slate-600">
            <div className="text-4xl mb-3">🔍</div>
            <p className="text-sm">{lang === "np" ? "कोई नतिजा फेला परेन" : "No constituencies match your filters"}</p>
          </div>
        ) : (
          <div className="space-y-8">
            {grouped.map(([district, constList]) => (
              <section key={district}>
                {/* District heading — matches nepalelection.live style */}
                <div className="flex items-center gap-3 mb-4">
                  <h2 className="text-base font-bold text-slate-800 dark:text-slate-100 capitalize">
                    {district}
                  </h2>
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                    {constList.length}{" "}
                    {lang === "np"
                      ? "निर्वाचन क्षेत्र"
                      : `Constituenc${constList.length === 1 ? "y" : "ies"}`}
                  </span>
                  <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
                </div>

                {/* Constituency cards grid */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {constList.map((r) => (
                    <ConstituencyCard
                      key={r.code}
                      r={r}
                      lang={lang}
                      onViewDetails={() => setSelectedCode(r.code)}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>

      {/* ── Details Modal ── */}
      {selectedResult && (
        <DetailsModal
          r={selectedResult}
          onClose={() => setSelectedCode(null)}
          lang={lang}
        />
      )}
    </Layout>
  );
}
