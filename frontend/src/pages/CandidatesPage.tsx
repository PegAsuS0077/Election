import { useState, useMemo } from "react";
import { useElectionStore } from "../store/electionStore";
import { PROVINCES as provinces } from "../types";
import type { Province } from "../types";
import { getParties, partyHex } from "../lib/partyRegistry";
import { partyName, provinceName } from "../i18n";
import type { Lang } from "../i18n";
import Layout from "../components/Layout";
import { PROVINCE_COLORS } from "../components/Layout";
import { DetailsModal } from "../ConstituencyTable";
import { candidatePhotoUrl } from "../lib/parseUpstreamData";

function fmt(n: number) { return n.toLocaleString("en-IN"); }

// ── Types ─────────────────────────────────────────────────────────────────────
type SortKey = "votes" | "name" | "constituency";

type FlatCandidate = {
  candidateId: number;
  name: string;
  nameNp: string;
  partyId: string;
  partyName: string;
  votes: number;
  gender: "M" | "F";
  constCode: string;
  constName: string;
  constNameNp: string;
  province: Province;
  district: string;
  constStatus: "DECLARED" | "COUNTING" | "PENDING";
  isWinner: boolean;
};

// ── Photo with initials fallback ──────────────────────────────────────────────
function CandidatePhoto({ id, name, size = "lg" }: { id: number; name: string; size?: "sm" | "lg" }) {
  const [err, setErr] = useState(false);
  const dim = size === "sm" ? "h-10 w-10 text-xs" : "h-20 w-20 text-lg";
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  if (!err) {
    return (
      <img
        src={candidatePhotoUrl(id)}
        alt={name}
        onError={() => setErr(true)}
        className={`${dim} rounded-full object-cover ring-2 ring-slate-100 dark:ring-slate-700`}
      />
    );
  }
  return (
    <div
      className={`${dim} rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center font-bold text-slate-500 dark:text-slate-400 shrink-0`}
    >
      {initials}
    </div>
  );
}

// ── Status badge ──────────────────────────────────────────────────────────────
function StatusBadge({ status, isWinner, lang }: { status: string; isWinner: boolean; lang: Lang }) {
  if (isWinner && status === "DECLARED") {
    return (
      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
        {lang === "np" ? "विजेता 🏆" : "Winner 🏆"}
      </span>
    );
  }
  const cls =
    status === "COUNTING"
      ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
      : status === "DECLARED"
        ? "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
        : "bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500";
  const label =
    status === "COUNTING" ? (lang === "np" ? "मतगणना" : "Counting") :
    status === "DECLARED" ? (lang === "np" ? "घोषित" : "Declared") :
                             (lang === "np" ? "बांकी" : "Pending");
  return <span className={"text-[10px] font-semibold px-2 py-0.5 rounded-full " + cls}>{label}</span>;
}

// ── Candidate card ────────────────────────────────────────────────────────────
function CandidateCard({ c, lang, onClick }: { c: FlatCandidate; lang: Lang; onClick: () => void }) {
  const hex = partyHex(c.partyId);
  const provCls = PROVINCE_COLORS[c.province] ?? "bg-slate-100 text-slate-700";

  return (
    <button
      type="button"
      onClick={onClick}
      className="text-left w-full rounded-2xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#0c1525] p-4 flex flex-col gap-3 hover:shadow-lg hover:-translate-y-0.5 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563eb]"
    >
      {/* Photo + winner badge */}
      <div className="flex items-start gap-3">
        <div className="relative shrink-0">
          <CandidatePhoto id={c.candidateId} name={c.name} size="lg" />
          {c.isWinner && (
            <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-emerald-500 flex items-center justify-center text-[10px]">
              🏆
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          {/* Name */}
          <div className="font-bold text-sm text-slate-900 dark:text-slate-100 leading-tight truncate">
            {lang === "np" ? c.nameNp : c.name}
          </div>
          <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 truncate">
            {lang === "np" ? c.name : c.nameNp}
          </div>

          {/* Party */}
          <div className="flex items-center gap-1.5 mt-1.5">
            <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: hex }} />
            <span className="text-[11px] font-medium text-slate-700 dark:text-slate-300 truncate">
              {partyName(c.partyId, lang)}
            </span>
          </div>
        </div>
      </div>

      {/* Location */}
      <div className="space-y-1">
        <div className="flex flex-wrap gap-1">
          <span className={"text-[10px] font-semibold px-2 py-0.5 rounded-full " + provCls}>
            {provinceName(c.province, lang)}
          </span>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
            {c.district}
          </span>
        </div>
        <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
          {lang === "np" ? c.constNameNp : c.constName}
        </div>
      </div>

      {/* Gender + Status + Votes */}
      <div className="flex items-center justify-between gap-2 mt-auto pt-2 border-t border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-400">
            {c.gender === "M"
              ? (lang === "np" ? "♂ पुरुष" : "♂ Male")
              : (lang === "np" ? "♀ महिला" : "♀ Female")}
          </span>
          <StatusBadge status={c.constStatus} isWinner={c.isWinner} lang={lang} />
        </div>
        <div className="text-sm font-bold tabular-nums text-slate-800 dark:text-slate-200 shrink-0" style={{ fontFamily: "'DM Mono', monospace" }}>
          {c.votes > 0 ? fmt(c.votes) : "—"}
        </div>
      </div>
    </button>
  );
}

// ── Shared dropdown style ──────────────────────────────────────────────────────
const SELECT_CLS =
  "h-9 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0c1525] " +
  "px-3 text-xs text-slate-700 dark:text-slate-300 outline-none focus:border-[#2563eb] transition min-w-0";

// ── Main page ─────────────────────────────────────────────────────────────────
export default function CandidatesPage() {
  const results = useElectionStore((s) => s.results);
  const lang    = useElectionStore((s) => s.lang);

  const [search, setSearch]           = useState("");
  const [selParty, setSelParty]       = useState<string>("All");
  const [selProv, setSelProv]         = useState<Province | "All">("All");
  const [selDistrict, setSelDistrict] = useState<string>("All");
  const [selConst, setSelConst]       = useState<string>("All");
  const [selGender, setSelGender]     = useState<"All" | "M" | "F">("All");
  const [sortKey, setSortKey]         = useState<SortKey>("votes");
  const [selectedCode, setSelectedCode] = useState<string | null>(null);

  // Flatten all candidates from all results
  const allCandidates = useMemo<FlatCandidate[]>(() => {
    const flat: FlatCandidate[] = [];
    for (const r of results) {
      const sorted  = [...r.candidates].sort((a, b) => b.votes - a.votes);
      const topVotes = sorted[0]?.votes ?? 0;
      const topParty = sorted[0]?.partyId;
      for (const c of r.candidates) {
        const isWinner =
          r.status === "DECLARED" &&
          (c.isWinner || (c.partyId === topParty && c.votes === topVotes && topVotes > 0));
        flat.push({
          candidateId:  c.candidateId,
          name:         c.name,
          nameNp:       c.nameNp,
          partyId:      c.partyId,
          partyName:    c.partyName,
          votes:        c.votes,
          gender:       c.gender,
          constCode:    r.code,
          constName:    r.name,
          constNameNp:  r.nameNp,
          province:     r.province,
          district:     r.district,
          constStatus:  r.status,
          isWinner,
        });
      }
    }
    return flat;
  }, [results]);

  // Cascading options derived from data
  const districtOptions = useMemo(() => {
    const seen = new Set<string>();
    for (const c of allCandidates) {
      if (selProv === "All" || c.province === selProv) seen.add(c.district);
    }
    return Array.from(seen).sort();
  }, [allCandidates, selProv]);

  const constOptions = useMemo(() => {
    const seen = new Map<string, string>(); // code → name
    for (const c of allCandidates) {
      if (selProv !== "All" && c.province !== selProv) continue;
      if (selDistrict !== "All" && c.district !== selDistrict) continue;
      seen.set(c.constCode, c.constName);
    }
    return Array.from(seen.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [allCandidates, selProv, selDistrict]);

  const partyOptions = useMemo(() => getParties(), []);

  const filtered = useMemo(() => {
    let list = allCandidates.filter((c) => {
      if (selProv     !== "All" && c.province  !== selProv)     return false;
      if (selDistrict !== "All" && c.district  !== selDistrict) return false;
      if (selConst    !== "All" && c.constCode !== selConst)    return false;
      if (selParty    !== "All" && c.partyId   !== selParty)    return false;
      if (selGender   !== "All" && c.gender    !== selGender)   return false;
      if (search) {
        const q = search.toLowerCase();
        if (
          !c.name.toLowerCase().includes(q) &&
          !c.nameNp.includes(q) &&
          !c.constName.toLowerCase().includes(q) &&
          !c.district.toLowerCase().includes(q)
        ) return false;
      }
      return true;
    });

    list = [...list].sort((a, b) => {
      if (sortKey === "votes") return b.votes - a.votes;
      if (sortKey === "name")  return a.name.localeCompare(b.name);
      return a.constName.localeCompare(b.constName);
    });

    return list;
  }, [allCandidates, selParty, selProv, selDistrict, selConst, selGender, search, sortKey]);

  const selectedResult = useMemo(
    () => (selectedCode ? results.find((r) => r.code === selectedCode) ?? null : null),
    [results, selectedCode]
  );

  const heroBadge = (
    <span className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-3.5 py-1 text-xs font-semibold text-blue-400 uppercase tracking-widest">
      {allCandidates.length} {lang === "np" ? "उम्मेद्वार" : "candidates"}
    </span>
  );

  return (
    <Layout
      title="Candidates 2082"
      titleNp="उम्मेद्वार २०८२"
      subtitle="All candidates across 165 constituencies · Photos load on election day"
      subtitleNp="सबै १६५ निर्वाचन क्षेत्रका उम्मेद्वारहरू"
      badge={heroBadge}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-4">

        {/* ── Search ── */}
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={lang === "np" ? "नाम, निर्वाचन क्षेत्र वा जिल्ला खोज्नुहोस्…" : "Search by name, constituency or district…"}
          className="w-full h-10 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0c1525] px-4 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 outline-none focus:border-[#2563eb] transition"
        />

        {/* ── Cascading dropdowns: Province → District → Constituency → Party ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {/* Province */}
          <select
            value={selProv}
            onChange={(e) => {
              setSelProv(e.target.value as Province | "All");
              setSelDistrict("All");
              setSelConst("All");
            }}
            className={SELECT_CLS}
          >
            <option value="All">{lang === "np" ? "सबै प्रदेश" : "All Provinces"}</option>
            {provinces.map((p) => (
              <option key={p} value={p}>{provinceName(p, lang)}</option>
            ))}
          </select>

          {/* District */}
          <select
            value={selDistrict}
            onChange={(e) => { setSelDistrict(e.target.value); setSelConst("All"); }}
            className={SELECT_CLS}
            disabled={districtOptions.length === 0}
          >
            <option value="All">{lang === "np" ? "सबै जिल्ला" : "All Districts"}</option>
            {districtOptions.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>

          {/* Constituency */}
          <select
            value={selConst}
            onChange={(e) => setSelConst(e.target.value)}
            className={SELECT_CLS}
            disabled={constOptions.length === 0}
          >
            <option value="All">{lang === "np" ? "सबै क्षेत्र" : "All Constituencies"}</option>
            {constOptions.map(([code, name]) => (
              <option key={code} value={code}>{name}</option>
            ))}
          </select>

          {/* Party */}
          <select
            value={selParty}
            onChange={(e) => setSelParty(e.target.value)}
            className={SELECT_CLS}
          >
            <option value="All">{lang === "np" ? "सबै दल" : "All Parties"}</option>
            {partyOptions.map((p) => (
              <option key={p.partyId} value={p.partyId}>
                {(lang === "np" ? p.partyName : p.nameEn).split(" (")[0]}
              </option>
            ))}
          </select>
        </div>

        {/* ── Gender + Sort row ── */}
        <div className="flex flex-wrap gap-2 items-center">
          {(["All", "M", "F"] as const).map((g) => (
            <button
              key={g}
              onClick={() => setSelGender(g)}
              className={"h-8 px-3 rounded-lg text-xs font-medium transition border " +
                (selGender === g
                  ? "bg-[#2563eb] border-[#2563eb] text-white"
                  : "border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0c1525] text-slate-600 dark:text-slate-400 hover:border-[#2563eb]/50")}
            >
              {g === "All"
                ? (lang === "np" ? "सबै" : "All")
                : g === "M"
                  ? (lang === "np" ? "♂ पुरुष" : "♂ Male")
                  : (lang === "np" ? "♀ महिला" : "♀ Female")}
            </button>
          ))}

          <div className="flex items-center gap-1.5 ml-auto">
            <span className="text-xs text-slate-400 hidden sm:block">{lang === "np" ? "क्रम:" : "Sort:"}</span>
            {(["votes", "name", "constituency"] as SortKey[]).map((sk) => (
              <button
                key={sk}
                onClick={() => setSortKey(sk)}
                className={"h-8 px-3 rounded-lg text-xs font-medium transition border " +
                  (sortKey === sk
                    ? "bg-slate-800 dark:bg-slate-200 border-transparent text-white dark:text-slate-900"
                    : "border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0c1525] text-slate-600 dark:text-slate-400")}
              >
                {sk === "votes"
                  ? (lang === "np" ? "मत ↓" : "Votes ↓")
                  : sk === "name"
                    ? (lang === "np" ? "नाम A–Z" : "Name A–Z")
                    : (lang === "np" ? "क्षेत्र" : "Constituency")}
              </button>
            ))}
          </div>
        </div>

        {/* ── Result count ── */}
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {lang === "np" ? "देखाउँदै" : "Showing"}{" "}
          <span className="font-semibold text-slate-700 dark:text-slate-300">{filtered.length}</span>{" "}
          {lang === "np" ? "उम्मेद्वार" : "candidates"}
          {selParty !== "All" && (
            <span className="ml-1 text-slate-400">
              · {partyName(selParty, lang)}
            </span>
          )}
        </p>

        {/* ── Card grid ── */}
        {filtered.length === 0 ? (
          <div className="py-20 text-center text-slate-400 dark:text-slate-600">
            <div className="text-4xl mb-3">🔍</div>
            <p className="text-sm">{lang === "np" ? "कोई उम्मेद्वार फेला पर्दैन" : "No candidates match your filters"}</p>
          </div>
        ) : (
          <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {filtered.map((c) => (
              <CandidateCard
                key={`${c.candidateId}-${c.constCode}`}
                c={c}
                lang={lang}
                onClick={() => setSelectedCode(c.constCode)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Full DetailsModal on card click ── */}
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
