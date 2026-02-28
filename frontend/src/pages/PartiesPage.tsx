import { useState, useMemo, useRef, useEffect } from "react";
import { useElectionStore } from "../store/electionStore";
import { PROVINCES } from "../types";
import { getParty, partyHex } from "../lib/partyRegistry";
import { getPartyMeta } from "../lib/db";
import { provinceName } from "../i18n";
import Layout from "../components/Layout";
import { PROVINCE_COLORS } from "../components/Layout";
import { DetailsModal } from "../ConstituencyTable";
import { candidatePhotoUrl } from "../lib/parseUpstreamData";

function fmt(n: number) { return n.toLocaleString("en-IN"); }

// ── Small photo with initials fallback ────────────────────────────────────────
function CandidateThumb({ id, name }: { id: number; name: string }) {
  const [err, setErr] = useState(false);
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
        className="h-9 w-9 rounded-full object-cover ring-1 ring-slate-200 dark:ring-slate-700 shrink-0"
      />
    );
  }
  return (
    <div className="h-9 w-9 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-[10px] font-bold text-slate-500 dark:text-slate-400 shrink-0">
      {initials}
    </div>
  );
}

// ── Type for party candidate rows ─────────────────────────────────────────────
type CandidateRow = {
  candidateId: number;
  name: string;
  nameNp: string;
  votes: number;
  gender: "M" | "F";
  constCode: string;
  constName: string;
  constNameNp: string;
  district: string;
  province: string;
  constStatus: "DECLARED" | "COUNTING" | "PENDING";
  isWinner: boolean;
};

// ── Party candidates panel ────────────────────────────────────────────────────
function PartyCandidatesPanel({
  partyKey,
  candidates,
  lang,
  onClose,
  onSelectConst,
}: {
  partyKey: string;
  candidates: CandidateRow[];
  lang: "en" | "np";
  onClose: () => void;
  onSelectConst: (code: string) => void;
}) {
  const p   = getParty(partyKey);
  const hex = partyHex(partyKey);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    panelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [partyKey]);

  // Group by province
  const byProvince = useMemo(() => {
    const map = new Map<string, CandidateRow[]>();
    for (const c of candidates) {
      if (!map.has(c.province)) map.set(c.province, []);
      map.get(c.province)!.push(c);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [candidates]);

  const winnerCount = candidates.filter((c) => c.isWinner).length;

  return (
    <div ref={panelRef} className="max-w-7xl mx-auto px-4 sm:px-6 mt-2 mb-10">
      <div
        className="rounded-2xl border-2 bg-white dark:bg-[#0c1525] shadow-xl overflow-hidden"
        style={{ borderColor: hex + "50" }}
      >
        {/* Panel header */}
        <div
          className="flex items-center justify-between gap-4 px-6 py-4 border-b border-slate-100 dark:border-slate-800"
          style={{ borderTopColor: hex, borderTopWidth: 4 }}
        >
          <div className="flex items-center gap-3">
            <span className="text-3xl leading-none">{p.symbol}</span>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-lg">
                {lang === "np" ? p.partyName : p.nameEn}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {candidates.length} {lang === "np" ? "उम्मेद्वार" : "candidates"}
                {winnerCount > 0 && (
                  <span className="ml-2 text-emerald-600 font-semibold">
                    · {winnerCount} {lang === "np" ? "विजेता" : "winner"}{winnerCount !== 1 ? "s" : ""}
                  </span>
                )}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="h-8 px-4 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
          >
            {lang === "np" ? "बन्द ×" : "Close ×"}
          </button>
        </div>

        {/* Rows grouped by province */}
        <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[640px] overflow-y-auto">
          {byProvince.map(([prov, rows]) => {
            const provCls = PROVINCE_COLORS[prov] ?? "bg-slate-100 text-slate-700";
            return (
              <div key={prov}>
                {/* Province sub-heading */}
                <div className="sticky top-0 z-10 flex items-center gap-2 px-6 py-2 bg-slate-50/90 dark:bg-[#080e1a]/90 backdrop-blur-sm border-b border-slate-100 dark:border-slate-800">
                  <span className={"text-[10px] font-bold px-2 py-0.5 rounded-full " + provCls}>
                    {provinceName(prov, lang)}
                  </span>
                  <span className="text-xs text-slate-400">
                    {rows.length} {lang === "np" ? "उम्मेद्वार" : "candidates"}
                  </span>
                </div>

                {/* Candidate rows */}
                {rows.map((c) => {
                  const isWinnerRow = c.isWinner && c.constStatus === "DECLARED";
                  const statusCls =
                    isWinnerRow
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                      : c.constStatus === "COUNTING"
                        ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
                        : c.constStatus === "DECLARED"
                          ? "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                          : "bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500";
                  const statusLabel =
                    isWinnerRow
                      ? (lang === "np" ? "विजेता 🏆" : "Winner 🏆")
                      : c.constStatus === "COUNTING"
                        ? (lang === "np" ? "मतगणना" : "Counting")
                        : c.constStatus === "DECLARED"
                          ? (lang === "np" ? "घोषित" : "Declared")
                          : (lang === "np" ? "बांकी" : "Pending");

                  return (
                    <button
                      key={`${c.candidateId}-${c.constCode}`}
                      type="button"
                      onClick={() => onSelectConst(c.constCode)}
                      className={
                        "w-full text-left flex items-center gap-3 px-6 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors " +
                        (isWinnerRow ? "bg-emerald-50/30 dark:bg-emerald-900/10" : "")
                      }
                    >
                      <CandidateThumb id={c.candidateId} name={c.name} />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                          {lang === "np" ? c.nameNp : c.name}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate mt-0.5">
                          {lang === "np" ? c.constNameNp : c.constName}
                          <span className="mx-1">·</span>
                          {c.district}
                        </div>
                      </div>
                      <div className="shrink-0 flex items-center gap-3">
                        <span className={"text-[10px] font-semibold px-2 py-0.5 rounded-full " + statusCls}>
                          {statusLabel}
                        </span>
                        <span
                          className="text-sm font-bold tabular-nums text-slate-700 dark:text-slate-200 w-20 text-right shrink-0"
                          style={{ fontFamily: "'DM Mono', monospace" }}
                        >
                          {c.votes > 0 ? fmt(c.votes) : "—"}
                        </span>
                        <span className="text-slate-300 dark:text-slate-600 text-sm shrink-0">›</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function PartiesPage() {
  const results   = useElectionStore((s) => s.results);
  const seatTally = useElectionStore((s) => s.seatTally);
  const lang      = useElectionStore((s) => s.lang);

  const [selectedParty, setSelectedParty] = useState<string | null>(null);
  const [selectedCode,  setSelectedCode]  = useState<string | null>(null);

  const totalSeats = 275;

  // Build enriched party data for the cards.
  // We derive party IDs from `results` directly so the memo re-runs whenever
  // results change — getParties() reads a module-level variable and isn't reactive.
  const partyData = useMemo(() => {
    const seenIds = Array.from(
      new Set(results.flatMap((r) => r.candidates.map((c) => c.partyId)))
    ).sort((a, b) => {
      if (a === "IND") return 1;
      if (b === "IND") return -1;
      return 0;
    });

    return seenIds.map((key) => {
      const pInfo = getParty(key);
      const tally  = seatTally[key] ?? { fptp: 0, pr: 0 };
      const total  = tally.fptp + tally.pr;
      const pct    = (total / totalSeats) * 100;

      let totalVotes = 0;
      let partyVotes = 0;
      for (const r of results) {
        for (const c of r.candidates) {
          totalVotes += c.votes;
          if (c.partyId === key) partyVotes += c.votes;
        }
      }
      const voteSharePct = totalVotes > 0 ? (partyVotes / totalVotes) * 100 : 0;

      const winners = results
        .filter((r) => r.status === "DECLARED")
        .filter((r) => {
          const w = [...r.candidates].sort((a, b) => b.votes - a.votes)[0];
          return w?.partyId === key;
        })
        .sort((a, b) => {
          const wa = [...a.candidates].sort((x, y) => y.votes - x.votes)[0];
          const wb = [...b.candidates].sort((x, y) => y.votes - x.votes)[0];
          return wb.votes - wa.votes;
        })
        .slice(0, 3);

      const provBreakdown: Record<string, number> = {};
      for (const prov of PROVINCES) {
        const ct = results
          .filter((r) => r.province === prov && r.status === "DECLARED")
          .filter((r) => [...r.candidates].sort((a, b) => b.votes - a.votes)[0]?.partyId === key)
          .length;
        if (ct > 0) provBreakdown[prov] = ct;
      }

      const hex            = partyHex(key);
      const candidateCount = results.reduce(
        (s, r) => s + r.candidates.filter((c) => c.partyId === key).length, 0
      );

      return { key, pInfo, tally, total, pct, voteSharePct, partyVotes, winners, provBreakdown, hex, candidateCount };
    }).sort((a, b) => b.total - a.total);
  }, [results, seatTally]);

  // Build flat candidate list for selected party
  const partyCandidates = useMemo<CandidateRow[]>(() => {
    if (!selectedParty) return [];
    const flat: CandidateRow[] = [];
    for (const r of results) {
      const sorted   = [...r.candidates].sort((a, b) => b.votes - a.votes);
      const topVotes = sorted[0]?.votes ?? 0;
      const topParty = sorted[0]?.partyId;
      for (const c of r.candidates) {
        if (c.partyId !== selectedParty) continue;
        const isWinner =
          r.status === "DECLARED" &&
          c.partyId === topParty &&
          c.votes === topVotes &&
          topVotes > 0;
        flat.push({
          candidateId:  c.candidateId,
          name:         c.name,
          nameNp:       c.nameNp,
          votes:        c.votes,
          gender:       c.gender,
          constCode:    r.code,
          constName:    r.name,
          constNameNp:  r.nameNp,
          district:     r.district,
          province:     r.province,
          constStatus:  r.status,
          isWinner,
        });
      }
    }
    return flat.sort((a, b) => b.votes - a.votes);
  }, [results, selectedParty]);

  const selectedResult = useMemo(
    () => (selectedCode ? results.find((r) => r.code === selectedCode) ?? null : null),
    [results, selectedCode]
  );

  const heroBadge = (
    <span className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-3.5 py-1 text-xs font-semibold text-blue-400 uppercase tracking-widest">
      {lang === "np" ? "दलहरू · सामान्य निर्वाचन २०८२" : "Parties · General Election 2082"}
    </span>
  );

  return (
    <Layout
      title="Political Parties 2082"
      titleNp="राजनीतिक दलहरू २०८२"
      subtitle="Seat tally, vote share, and candidate highlights for all major parties"
      subtitleNp="सबै प्रमुख दलहरूको सिट गणना, मत बांडफांट र उम्मेद्वार विवरण"
      badge={heroBadge}
    >
      {/* ── Party cards grid ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-2">
        {partyData.map(({ key, pInfo, tally, total, pct, voteSharePct, partyVotes, winners, provBreakdown, hex, candidateCount }) => (
          <div
            key={key}
            className={
              "rounded-2xl border bg-white dark:bg-[#0c1525] overflow-hidden shadow-sm hover:shadow-md transition-shadow " +
              (selectedParty === key
                ? "border-[#2563eb] ring-2 ring-[#2563eb]/30"
                : "border-slate-200 dark:border-slate-800/80")
            }
          >
            <div className="h-1.5 w-full" style={{ backgroundColor: hex }} />

            <div className="p-5">
              {/* Header */}
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex items-center gap-3">
                  <span className="text-3xl leading-none">{pInfo.symbol}</span>
                  <div>
                    <h2 className="font-bold text-slate-900 dark:text-slate-100 text-base leading-tight" style={{ fontFamily: "'Sora', sans-serif" }}>
                      {lang === "np" ? pInfo.partyName : pInfo.nameEn}
                    </h2>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                      {lang === "np" ? pInfo.partyName : pInfo.nameEn}
                    </p>
                    {(() => {
                      const meta = getPartyMeta(key);
                      if (!meta || meta.founded === 0) return null;
                      return (
                        <p className="text-[10px] text-slate-300 dark:text-slate-600 mt-0.5">
                          {meta.ideology} · Est. {meta.founded}
                        </p>
                      );
                    })()}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-3xl font-bold tabular-nums leading-none" style={{ color: hex, fontFamily: "'DM Mono', monospace" }}>
                    {total}
                  </div>
                  <div className="text-[10px] text-slate-400 uppercase tracking-wide mt-0.5">
                    {lang === "np" ? "कुल सिट" : "total seats"}
                  </div>
                </div>
              </div>

              {/* Seat bar */}
              <div className="mb-3">
                <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
                  <span>{lang === "np" ? "सिट बांडफांट" : "Seat share"}</span>
                  <span className="tabular-nums">{pct.toFixed(1)}%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-700" style={{ width: pct + "%", backgroundColor: hex }} />
                </div>
              </div>

              {/* Stats row */}
              <div className="flex flex-wrap gap-4 mb-4 text-xs">
                <div>
                  <span className="text-slate-400">FPTP </span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 tabular-nums">{tally.fptp}</span>
                </div>
                <div>
                  <span className="text-slate-400">PR </span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 tabular-nums">{tally.pr}</span>
                </div>
                <div>
                  <span className="text-slate-400">{lang === "np" ? "मत " : "Votes "}</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 tabular-nums">{fmt(partyVotes)}</span>
                  <span className="text-slate-400 ml-1">({voteSharePct.toFixed(1)}%)</span>
                </div>
              </div>

              {/* Top winners */}
              {winners.length > 0 && (
                <div className="border-t border-slate-100 dark:border-slate-800 pt-3 mb-3">
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-2">
                    {lang === "np" ? "शीर्ष विजेता" : "Top Winners"}
                  </p>
                  <div className="space-y-1">
                    {winners.map((r) => {
                      const w = [...r.candidates].sort((a, b) => b.votes - a.votes)[0];
                      return (
                        <div key={r.code} className="flex items-center justify-between text-xs">
                          <span className="text-slate-700 dark:text-slate-300 truncate max-w-[60%]">
                            {lang === "np" ? w.nameNp : w.name}
                          </span>
                          <span className="text-slate-500 tabular-nums text-[11px]" style={{ fontFamily: "'DM Mono', monospace" }}>
                            {fmt(w.votes)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Province breakdown */}
              {Object.keys(provBreakdown).length > 0 && (
                <div className="border-t border-slate-100 dark:border-slate-800 pt-3 mb-4">
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-2">
                    {lang === "np" ? "प्रदेश अनुसार" : "By Province"}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(provBreakdown).map(([prov, ct]) => (
                      <span key={prov} className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                        {provinceName(prov, lang)} {ct}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* View candidates button */}
              <button
                onClick={() => setSelectedParty(selectedParty === key ? null : key)}
                className={
                  "w-full h-9 rounded-xl text-xs font-semibold transition-all border " +
                  (selectedParty === key
                    ? "bg-[#2563eb] border-[#2563eb] text-white"
                    : "border-[#2563eb]/40 text-[#2563eb] dark:text-[#3b82f6] hover:bg-[#2563eb] hover:text-white")
                }
              >
                {selectedParty === key
                  ? (lang === "np" ? "▲ बन्द गर्नुस्" : "▲ Hide Candidates")
                  : `${lang === "np" ? "▼ उम्मेद्वार हेर्नुस्" : "▼ View Candidates"} (${candidateCount})`}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* ── Party candidates drill-down panel ── */}
      {selectedParty && partyCandidates.length > 0 && (
        <PartyCandidatesPanel
          partyKey={selectedParty}
          candidates={partyCandidates}
          lang={lang}
          onClose={() => setSelectedParty(null)}
          onSelectConst={(code) => setSelectedCode(code)}
        />
      )}

      {/* ── Constituency DetailsModal ── */}
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
