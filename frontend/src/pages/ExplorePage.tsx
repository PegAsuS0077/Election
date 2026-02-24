import { useState, useMemo } from "react";
import { useElectionStore } from "../store/electionStore";
import { parties, provinces } from "../mockData";
import type { Province, PartyKey } from "../mockData";
import { t, provinceName } from "../i18n";
import type { Lang } from "../i18n";
import Layout from "../components/Layout";
import { PROVINCE_COLORS, PARTY_HEX } from "../components/Layout";

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
  return <span className={"text-[10px] font-semibold px-2 py-0.5 rounded-full " + cls}>{label}</span>;
}

export default function ExplorePage() {
  const results = useElectionStore((s) => s.results);
  const lang    = useElectionStore((s) => s.lang);

  const [search, setSearch]       = useState("");
  const [selProv, setSelProv]     = useState<"All" | Province>("All");
  const [selDistrict, setSelDistrict] = useState("All");
  const [statusTab, setStatusTab] = useState<StatusTab>("all");

  const districts = useMemo(() => {
    const base = selProv === "All" ? results : results.filter((r) => r.province === selProv);
    return ["All", ...Array.from(new Set(base.map((r) => r.district))).sort()];
  }, [results, selProv]);

  const filtered = useMemo(() => {
    return results.filter((r) => {
      if (selProv !== "All" && r.province !== selProv) return false;
      if (selDistrict !== "All" && r.district !== selDistrict) return false;
      if (statusTab !== "all" && r.status !== statusTab) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!r.name.toLowerCase().includes(q) && !r.nameNp.includes(q) && !r.district.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [results, selProv, selDistrict, statusTab, search]);

  const heroBadge = (
    <span className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-3.5 py-1 text-xs font-semibold text-blue-400 uppercase tracking-widest">
      {filtered.length} {lang === "np" ? "निर्वाचन क्षेत्र" : "constituencies"}
    </span>
  );

  return (
    <Layout
      title="Explore Constituencies"
      titleNp="निर्वाचन क्षेत्र अन्वेषण"
      subtitle="Browse all 165 FPTP constituencies · Search, filter, and explore"
      subtitleNp="सबै १३७ एकल निर्वाचन क्षेत्र खोज्नुहोस्"
      badge={heroBadge}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-4">

        {/* Search + District filter row */}
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={lang === "np" ? "निर्वाचन क्षेत्र खोज्नुहोस्…" : "Search constituencies…"}
            className="flex-1 h-9 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0c1525] px-3 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 outline-none focus:border-[#2563eb] transition"
          />
          <select
            value={selDistrict}
            onChange={(e) => setSelDistrict(e.target.value)}
            className="h-9 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0c1525] px-3 text-sm text-slate-700 dark:text-slate-300 outline-none focus:border-[#2563eb] transition"
          >
            {districts.map((d) => (
              <option key={d} value={d}>{d === "All" ? (lang === "np" ? "सबै जिल्ला" : "All Districts") : d}</option>
            ))}
          </select>
        </div>

        {/* Province pills */}
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

        {/* Status tabs */}
        <div className="flex gap-1">
          {STATUS_TABS.map((tab) => {
            const label =
              tab === "all"       ? (lang === "np" ? "सबै" : "All") :
              tab === "DECLARED"  ? (lang === "np" ? "घोषित" : "Declared") :
              tab === "COUNTING"  ? (lang === "np" ? "मतगणना" : "Counting") :
                                    (lang === "np" ? "बांकी" : "Pending");
            const count = tab === "all" ? results.length : results.filter((r) => r.status === tab).length;
            return (
              <button
                key={tab}
                onClick={() => setStatusTab(tab)}
                className={"h-8 px-3 rounded-lg text-xs font-semibold transition border " +
                  (statusTab === tab
                    ? "bg-[#2563eb] border-[#2563eb] text-white"
                    : "border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0c1525] text-slate-600 dark:text-slate-400"
                  )}
              >
                {label} <span className="opacity-60 ml-1">{count}</span>
              </button>
            );
          })}
        </div>

        {/* Results count */}
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {lang === "np" ? "देखाउँदै" : "Showing"} <span className="font-semibold text-slate-700 dark:text-slate-300">{filtered.length}</span> {lang === "np" ? "निर्वाचन क्षेत्र" : "constituencies"}
        </p>

        {/* Constituency grid */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((r) => {
            const sorted = [...r.candidates].sort((a, b) => b.votes - a.votes);
            const top    = sorted[0];
            const second = sorted[1];
            const margin = top && second && top.votes > 0 ? top.votes - second.votes : null;
            const pInfo  = top ? parties[top.party as PartyKey] : null;
            const pHex   = pInfo ? (PARTY_HEX[pInfo.color] ?? "#888") : "#888";
            const provCls = PROVINCE_COLORS[r.province] ?? "bg-slate-100 text-slate-700";

            return (
              <div key={r.code} className="rounded-2xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#0c1525] p-4 hover:-translate-y-0.5 hover:shadow-md transition-all">
                <div className="flex items-start justify-between gap-2 mb-3">
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
                  {r.votesCast > 0 && (
                    <span className="shrink-0 text-[11px] text-slate-400 tabular-nums" style={{ fontFamily: "'DM Mono', monospace" }}>
                      {fmt(r.votesCast)}
                    </span>
                  )}
                </div>

                {top && top.votes > 0 ? (
                  <>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: pHex }} />
                      <span className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                        {lang === "np" ? top.nameNp : top.name}
                      </span>
                      <span className="ml-auto tabular-nums text-xs font-bold text-slate-700 dark:text-slate-300 shrink-0" style={{ fontFamily: "'DM Mono', monospace" }}>
                        {fmt(top.votes)}
                      </span>
                    </div>
                    {second && second.votes > 0 && (
                      <div className="flex items-center gap-2 mb-2">
                        <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: PARTY_HEX[parties[second.party as PartyKey]?.color] ?? "#888" }} />
                        <span className="text-xs text-slate-500 dark:text-slate-400 truncate">
                          {lang === "np" ? second.nameNp : second.name}
                        </span>
                        <span className="ml-auto tabular-nums text-xs text-slate-500 dark:text-slate-400 shrink-0" style={{ fontFamily: "'DM Mono', monospace" }}>
                          {fmt(second.votes)}
                        </span>
                      </div>
                    )}
                    {/* Vote bar */}
                    {second && second.votes > 0 && (
                      <div className="h-1.5 w-full rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800 mb-2">
                        <div className="h-full rounded-l-full" style={{ width: ((top.votes / (top.votes + second.votes)) * 100) + "%", backgroundColor: pHex }} />
                      </div>
                    )}
                    {margin !== null && (
                      <div className="text-[10px] text-slate-400 dark:text-slate-500">
                        {lang === "np" ? "अन्तर" : "Margin"}: <span className="font-semibold text-slate-600 dark:text-slate-300">{fmt(margin)}</span>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-xs text-slate-400 dark:text-slate-600 italic">
                    {lang === "np" ? "नतिजा आउन बांकीछ" : "Results pending"}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <div className="py-16 text-center text-slate-400 dark:text-slate-600">
            <div className="text-4xl mb-3">🔍</div>
            <p className="text-sm">{t("noRows", lang)}</p>
          </div>
        )}
      </div>
    </Layout>
  );
}
