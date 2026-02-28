import { useState } from "react";
import { useElectionStore } from "../store/electionStore";
import { PROVINCES as provinces } from "../types";
import type { Province } from "../types";
import { provinceName } from "../i18n";
import Layout from "../components/Layout";
import NepalMap from "../NepalMap";

export default function MapPage() {
  const results = useElectionStore((s) => s.results);
  const lang    = useElectionStore((s) => s.lang);
  const [selected, setSelected] = useState<"All" | Province>("All");

  const filtered = selected === "All" ? results : results.filter((r) => r.province === selected);
  const declared = filtered.filter((r) => r.status === "DECLARED").length;
  const counting = filtered.filter((r) => r.status === "COUNTING").length;
  const total    = filtered.length;

  const heroBadge = (
    <span className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-3.5 py-1 text-xs font-semibold text-blue-400 uppercase tracking-widest">
      {lang === "np" ? "१२ प्रदेश · ११ जिल्ला" : "7 provinces · 77 districts"}
    </span>
  );

  return (
    <Layout
      title="Nepal Election Map"
      titleNp="नेपाल निर्वाचन नक्सा"
      subtitle="Interactive map of Nepal · Click a region to explore"
      subtitleNp="नेपालको अन्तरक्रिय नक्सा · क्षेत्र चयन गर्न क्लिक गर्नुहोस्"
      badge={heroBadge}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-4">

        {/* Province filter pills */}
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setSelected("All")}
            className={"h-7 px-3 rounded-full text-xs font-medium transition border " +
              (selected === "All"
                ? "bg-[#2563eb] border-[#2563eb] text-white"
                : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400"
              )}
          >
            {lang === "np" ? "सबै प्रदेश" : "All Provinces"}
          </button>
          {provinces.map((p) => (
            <button
              key={p}
              onClick={() => setSelected(selected === p ? "All" : p)}
              className={"h-7 px-3 rounded-full text-xs font-medium transition border " +
                (selected === p
                  ? "bg-[#2563eb] border-[#2563eb] text-white"
                  : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-[#2563eb]/50"
                )}
            >
              {provinceName(p, lang)}
            </button>
          ))}
        </div>

        {/* Stats row */}
        <div className="flex gap-4 text-xs text-slate-500 dark:text-slate-400">
          <span><span className="font-bold text-emerald-600">{declared}</span> {lang === "np" ? "घोषित" : "declared"}</span>
          <span><span className="font-bold text-amber-600">{counting}</span> {lang === "np" ? "मतगणना" : "counting"}</span>
          <span><span className="font-bold text-slate-600 dark:text-slate-300">{total}</span> {lang === "np" ? "कुल" : "total"}</span>
        </div>

        {/* Full map */}
        <div className="bg-white dark:bg-[#0c1525] rounded-2xl border border-slate-200 dark:border-slate-800/80 p-4 shadow-sm">
          <NepalMap results={results} selectedProvince={selected} onSelect={setSelected} lang={lang} />
        </div>

        {/* Constituency mini-cards for selected province */}
        {selected !== "All" && (
          <div>
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-widest mb-3">
              {provinceName(selected, lang)} — {lang === "np" ? "निर्वाचन क्षेत्र" : "Constituencies"} ({filtered.length})
            </h2>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {filtered.map((r) => {
                const top = [...r.candidates].sort((a, b) => b.votes - a.votes)[0];
                const cls =
                  r.status === "DECLARED" ? "border-l-emerald-500" :
                  r.status === "COUNTING" ? "border-l-amber-400" : "border-l-slate-300";
                return (
                  <div key={r.code} className={"rounded-xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#0c1525] p-3 border-l-2 " + cls}>
                    <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                      {lang === "np" ? r.nameNp : r.name}
                    </div>
                    {top && top.votes > 0 && (
                      <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 truncate">
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
    </Layout>
  );
}
