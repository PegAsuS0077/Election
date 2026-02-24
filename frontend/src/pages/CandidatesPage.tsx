import { useState, useMemo } from "react";
import { useElectionStore } from "../store/electionStore";
import { parties, provinces } from "../mockData";
import type { PartyKey, Province } from "../mockData";
import { partyName, provinceName } from "../i18n";
import type { Lang } from "../i18n";
import Layout from "../components/Layout";
import { PARTY_HEX, PROVINCE_COLORS } from "../components/Layout";

function fmt(n: number) { return n.toLocaleString("en-IN"); }

type FlatCandidate = {
  candidateId: number;
  name: string;
  nameNp: string;
  party: PartyKey;
  votes: number;
  gender: "M" | "F";
  constName: string;
  constNameNp: string;
  province: Province;
  district: string;
  constStatus: "DECLARED" | "COUNTING" | "PENDING";
  isWinner: boolean;
};

function StatusBadge({ status, isWinner, lang }: { status: string; isWinner: boolean; lang: Lang }) {
  if (isWinner && status === "DECLARED") {
    return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">{lang === "np" ? "विजेता" : "Winner"}</span>;
  }
  const cls =
    status === "COUNTING" ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300" :
    status === "DECLARED" ? "bg-slate-100 text-slate-500" :
                             "bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500";
  const label =
    status === "COUNTING"  ? (lang === "np" ? "मतगणना" : "Counting") :
    status === "DECLARED"  ? (lang === "np" ? "घोषित" : "Declared") :
                              (lang === "np" ? "बांकी" : "Pending");
  return <span className={"text-[10px] font-semibold px-2 py-0.5 rounded-full " + cls}>{label}</span>;
}

export default function CandidatesPage() {
  const results = useElectionStore((s) => s.results);
  const lang    = useElectionStore((s) => s.lang);

  const [search, setSearch]     = useState("");
  const [selParty, setSelParty] = useState<PartyKey | "All">("All");
  const [selProv, setSelProv]   = useState<Province | "All">("All");
  const [selGender, setSelGender] = useState<"All" | "M" | "F">("All");
  const [modal, setModal]       = useState<FlatCandidate | null>(null);

  // Flatten all candidates
  const allCandidates = useMemo<FlatCandidate[]>(() => {
    const flat: FlatCandidate[] = [];
    for (const r of results) {
      const sorted = [...r.candidates].sort((a, b) => b.votes - a.votes);
      const topParty = sorted[0]?.party;
      for (const c of r.candidates) {
        const isWinner = r.status === "DECLARED" && c.party === topParty && c.votes === sorted[0].votes;
        flat.push({
          candidateId: c.candidateId,
          name: c.name,
          nameNp: c.nameNp,
          party: c.party,
          votes: c.votes,
          gender: c.gender,
          constName: r.name,
          constNameNp: r.nameNp,
          province: r.province,
          district: r.district,
          constStatus: r.status,
          isWinner,
        });
      }
    }
    return flat.sort((a, b) => b.votes - a.votes);
  }, [results]);

  const filtered = useMemo(() => {
    return allCandidates.filter((c) => {
      if (selParty !== "All" && c.party !== selParty) return false;
      if (selProv !== "All" && c.province !== selProv) return false;
      if (selGender !== "All" && c.gender !== selGender) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!c.name.toLowerCase().includes(q) && !c.nameNp.includes(q)) return false;
      }
      return true;
    });
  }, [allCandidates, selParty, selProv, selGender, search]);

  const heroBadge = (
    <span className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-3.5 py-1 text-xs font-semibold text-blue-400 uppercase tracking-widest">
      {allCandidates.length} {lang === "np" ? "उम्मेद्वार" : "candidates"}
    </span>
  );

  const modalResult = modal ? results.find((r) => r.name === modal.constName) : null;

  return (
    <Layout
      title="Candidates 2082"
      titleNp="उम्मेद्वार ⃦⃨⃨⃨"
      subtitle="All candidates across 165 constituencies · Search by name or party"
      subtitleNp="सबै १३७ निर्वाचन क्षेत्रका उम्मेद्वारहरू"
      badge={heroBadge}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-4">

        {/* Search */}
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={lang === "np" ? "उम्मेद्वारको नाम खोज्नुहोस्…" : "Search candidates by name…"}
          className="w-full h-9 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0c1525] px-3 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 outline-none focus:border-[#2563eb] transition"
        />

        {/* Party filter */}
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setSelParty("All")}
            className={"h-7 px-3 rounded-full text-xs font-medium transition border " +
              (selParty === "All" ? "bg-[#2563eb] border-[#2563eb] text-white" : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400")}
          >
            {lang === "np" ? "सबै दल" : "All Parties"}
          </button>
          {(Object.keys(parties) as PartyKey[]).map((pk) => {
            const hex = PARTY_HEX[parties[pk].color] ?? "#888";
            return (
              <button
                key={pk}
                onClick={() => setSelParty(selParty === pk ? "All" : pk)}
                className={"h-7 px-3 rounded-full text-xs font-medium transition border flex items-center gap-1.5 " +
                  (selParty === pk ? "text-white border-transparent" : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400")}
                style={selParty === pk ? { backgroundColor: hex, borderColor: hex } : {}}
              >
                <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: hex }} />
                {partyName(pk, lang).split(" (")[0]}
              </button>
            );
          })}
        </div>

        {/* Province + Gender filters */}
        <div className="flex flex-wrap gap-2">
          <select
            value={selProv}
            onChange={(e) => setSelProv(e.target.value as Province | "All")}
            className="h-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0c1525] px-2.5 text-xs text-slate-700 dark:text-slate-300 outline-none focus:border-[#2563eb] transition"
          >
            <option value="All">{lang === "np" ? "सबै प्रदेश" : "All Provinces"}</option>
            {provinces.map((p) => <option key={p} value={p}>{provinceName(p, lang)}</option>)}
          </select>
          {(["All", "M", "F"] as const).map((g) => (
            <button
              key={g}
              onClick={() => setSelGender(g)}
              className={"h-8 px-3 rounded-lg text-xs font-medium transition border " +
                (selGender === g ? "bg-[#2563eb] border-[#2563eb] text-white" : "border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0c1525] text-slate-600 dark:text-slate-400")}
            >
              {g === "All" ? (lang === "np" ? "सबै" : "All") : g === "M" ? (lang === "np" ? "पुरुष" : "Male") : (lang === "np" ? "महिला" : "Female")}
            </button>
          ))}
          <span className="ml-auto text-xs text-slate-500 dark:text-slate-400 self-center">
            {filtered.length} {lang === "np" ? "उम्मेद्वार" : "candidates"}
          </span>
        </div>

        {/* Virtualised list */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#0c1525] overflow-hidden shadow-sm">
          {/* Header */}
          <div className="grid grid-cols-[1fr_auto_auto_auto] gap-3 px-4 py-2.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-[#080e1a] text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
            <span>{lang === "np" ? "उम्मेद्वार" : "Candidate"}</span>
            <span className="hidden sm:block">{lang === "np" ? "निर्वाचन क्षेत्र" : "Constituency"}</span>
            <span>{lang === "np" ? "मत" : "Votes"}</span>
            <span>{lang === "np" ? "स्थिति" : "Status"}</span>
          </div>
          {filtered.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <div className="text-3xl mb-2">🔍</div>
              <p className="text-sm">{lang === "np" ? "कोई उम्मेद्वार फेला पर्दैन" : "No candidates match your filters"}</p>
            </div>
          ) : (
            <div className="overflow-y-auto max-h-[560px]">
              {filtered.map((c, index) => {
                const p = parties[c.party];
                const hex = PARTY_HEX[p.color] ?? "#888";
                const provCls = PROVINCE_COLORS[c.province] ?? "bg-slate-100 text-slate-600";
                return (
                  <div
                    key={c.candidateId}
                    onClick={() => setModal(c)}
                    className={"grid grid-cols-[1fr_auto_auto_auto] gap-3 px-4 h-16 items-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors " +
                      (index % 2 === 0 ? "" : "bg-slate-50/40 dark:bg-slate-800/10")}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: hex }} />
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                          {lang === "np" ? c.nameNp : c.name}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[10px] text-slate-400">{partyName(c.party, lang).split(" (")[0]}</span>
                          <span className={"text-[9px] font-semibold px-1.5 py-0.5 rounded-full hidden sm:block " + provCls}>
                            {provinceName(c.province, lang)}
                          </span>
                          <span className="text-[9px] text-slate-400">{c.gender === "M" ? "♂" : "♀"}</span>
                        </div>
                      </div>
                    </div>
                    <div className="hidden sm:block text-xs text-slate-500 dark:text-slate-400 truncate max-w-[150px]">
                      {lang === "np" ? c.constNameNp : c.constName}
                    </div>
                    <div className="text-sm font-mono tabular-nums text-slate-800 dark:text-slate-200 text-right">
                      {c.votes > 0 ? fmt(c.votes) : "—"}
                    </div>
                    <div className="flex justify-end">
                      <StatusBadge status={c.constStatus} isWinner={c.isWinner} lang={lang} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {modal && modalResult && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={() => setModal(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white dark:bg-[#0c1525] border border-slate-200 dark:border-slate-800 shadow-xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">{lang === "np" ? modal.constNameNp : modal.constName}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{modal.district} · {provinceName(modal.province, lang)}</p>
              </div>
              <button onClick={() => setModal(null)} className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 text-xl leading-none">×</button>
            </div>
            <div className="space-y-2">
              {[...modalResult.candidates].sort((a, b) => b.votes - a.votes).map((c, i) => {
                const p = parties[c.party];
                const hex = PARTY_HEX[p.color] ?? "#888";
                return (
                  <div key={c.candidateId} className={"flex items-center justify-between py-2 " + (i < modalResult.candidates.length - 1 ? "border-b border-slate-100 dark:border-slate-800" : "")}>
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: hex }} />
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                          {lang === "np" ? c.nameNp : c.name}
                        </div>
                        <div className="text-[10px] text-slate-400">{partyName(c.party, lang).split(" (")[0]}</div>
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="font-mono text-sm font-bold text-slate-800 dark:text-slate-200">{c.votes > 0 ? fmt(c.votes) : "—"}</div>
                      {i === 0 && modalResult.status === "DECLARED" && (
                        <div className="text-[10px] text-emerald-600 font-semibold">{lang === "np" ? "विजेता" : "Winner"}</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
