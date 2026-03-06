import { useState, useMemo, useEffect } from "react";
import { useElectionStore } from "../store/electionStore";
import { PROVINCES as provinces } from "../types";
import type { ConstituencyResult, Province } from "../types";
import { getParty } from "../lib/partyRegistry";
import { provinceName } from "../i18n";
import type { Lang } from "../i18n";
import { useNavigate, useSearchParams } from "react-router-dom";
import Layout from "../components/Layout";
import { PROVINCE_COLORS } from "../components/Layout";
import PartySymbol from "../components/PartySymbol";
import FavoriteButton from "../components/FavoriteButton";
import FeaturedToggleButton from "../components/FeaturedToggleButton";

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
        <div className="flex items-center gap-1 shrink-0">
          {r.status === "COUNTING" && (
            <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse mt-1" />
          )}
          <FeaturedToggleButton code={r.code} lang={lang} />
          <FavoriteButton code={r.code} name={r.name} lang={lang} />
        </div>
      </div>

      {/* Candidate count */}
      <p className="text-[11px] text-slate-400 dark:text-slate-500">
        {lang === "np" ? "कुल उम्मेद्वार:" : "Total Candidates:"}{" "}
        <span className="font-semibold text-slate-600 dark:text-slate-300">{r.candidates.length}</span>
      </p>

      {/* Top candidates */}
      <div className="space-y-1.5">
        {top3.map((c) => {
          return (
            <div key={c.candidateId} className="flex items-center gap-2">
              <PartySymbol partyId={c.partyId} size="md" />
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
        const topParty = getParty(top.partyId);
        return (
          <div className="h-1.5 w-full rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800">
            <div
              className="h-full rounded-l-full transition-all duration-700"
              style={{ width: `${(top.votes / total) * 100}%`, backgroundColor: topParty.hex }}
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
  useEffect(() => {
    document.title = "Explore Constituencies – Nepal Election Results 2082 | NepalVotes";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", "Browse all 165 constituencies for Nepal's House of Representatives Election 2082. Filter by province, district, or party. Live vote counts.");
    const canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) canonical.setAttribute("href", "https://nepalvotes.live/explore");
    return () => { if (canonical) canonical.setAttribute("href", "https://nepalvotes.live/"); };
  }, []);

  const results       = useElectionStore((s) => s.results);
  const lang          = useElectionStore((s) => s.lang);
  const favorites     = useElectionStore((s) => s.favorites);
  const navigate      = useNavigate();
  const [searchParams] = useSearchParams();

  const initialStatus = (searchParams.get("status") ?? "all") as StatusTab;

  const [search, setSearch]           = useState("");
  const [selProv, setSelProv]         = useState<"All" | Province>("All");
  const [selDistrict, setSelDistrict] = useState("All");
  const [statusTab, setStatusTab]     = useState<StatusTab>(
    STATUS_TABS.includes(initialStatus) ? initialStatus : "all"
  );
  const [favOnly, setFavOnly]         = useState(false);

  // Dynamically build district list based on selected province — en → np
  const districts = useMemo(() => {
    const base = selProv === "All" ? results : results.filter((r) => r.province === selProv);
    const seen = new Map<string, string>();
    for (const r of base) seen.set(r.district, r.districtNp);
    return Array.from(seen.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [results, selProv]);

  // Apply all filters
  const filtered = useMemo(() => {
    return results.filter((r) => {
      if (favOnly && !favorites.has(r.code))            return false;
      if (selProv !== "All" && r.province !== selProv)  return false;
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
  }, [results, favOnly, favorites, selProv, selDistrict, statusTab, search]);

  // Group filtered results by district — value includes [constList, districtNp]
  const grouped = useMemo(() => {
    const map = new Map<string, { list: ConstituencyResult[]; districtNp: string }>();
    for (const r of filtered) {
      if (!map.has(r.district)) map.set(r.district, { list: [], districtNp: r.districtNp });
      map.get(r.district)!.list.push(r);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-4">

        {/* ── Search ── */}
        <input
          type="search"
          enterKeyHint="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
          }}
          placeholder={lang === "np" ? "निर्वाचन क्षेत्र / उम्मेद्वार खोज्नुहोस्…" : "Search constituency or candidate…"}
          className="w-full h-10 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0c1525] px-4 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 outline-none focus:border-[#2563eb] transition"
        />

        {/* ── Cascading dropdowns: Province → District ── */}
        <div className="grid grid-cols-2 gap-2">
          <select
            value={selProv}
            onChange={(e) => { setSelProv(e.target.value as "All" | Province); setSelDistrict("All"); }}
            className="h-9 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0c1525] px-3 text-xs text-slate-700 dark:text-slate-300 outline-none focus:border-[#2563eb] transition min-w-0"
          >
            <option value="All">{lang === "np" ? "सबै प्रदेश" : "All Provinces"}</option>
            {provinces.map((p) => (
              <option key={p} value={p}>{provinceName(p, lang)}</option>
            ))}
          </select>

          <select
            value={selDistrict}
            onChange={(e) => setSelDistrict(e.target.value)}
            className="h-9 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0c1525] px-3 text-xs text-slate-700 dark:text-slate-300 outline-none focus:border-[#2563eb] transition min-w-0"
            disabled={districts.length === 0}
          >
            <option value="All">{lang === "np" ? "सबै जिल्ला" : "All Districts"}</option>
            {districts.map(([en, np]) => (
              <option key={en} value={en}>{lang === "np" ? np : en}</option>
            ))}
          </select>
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
          <button
            onClick={() => setFavOnly((v) => !v)}
            className={"h-8 px-3 rounded-lg text-xs font-semibold transition border flex items-center gap-1.5 " +
              (favOnly
                ? "bg-amber-500 border-amber-500 text-white"
                : "border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0c1525] text-slate-500 dark:text-slate-400 hover:border-amber-400/60 hover:text-amber-500"
              )}
          >
            <svg viewBox="0 0 24 24" className="w-3 h-3" fill={favOnly ? "currentColor" : "none"} stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
            {lang === "np" ? "मनपर्ने" : "Favorites"}
            {favorites.size > 0 && <span className="opacity-70">{favorites.size}</span>}
          </button>
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
            {grouped.map(([district, { list, districtNp }]) => (
              <section key={district}>
                {/* District heading */}
                <div className="flex items-center gap-3 mb-4">
                  <h2 className="text-base font-bold text-slate-800 dark:text-slate-100 capitalize">
                    {lang === "np" ? districtNp : district}
                  </h2>
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                    {list.length}{" "}
                    {lang === "np"
                      ? "निर्वाचन क्षेत्र"
                      : `Constituenc${list.length === 1 ? "y" : "ies"}`}
                  </span>
                  <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
                </div>

                {/* Constituency cards grid */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {list.map((r) => (
                    <ConstituencyCard
                      key={r.code}
                      r={r}
                      lang={lang}
                      onViewDetails={() => { window.scrollTo(0, 0); navigate(`/constituency/${encodeURIComponent(r.name.replace(/\s+/g, "-"))}`); }}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>

    </Layout>
  );
}
