import { memo, useEffect, useMemo, useRef, useState } from "react";
import { FocusTrap } from "focus-trap-react";
import { parties } from "./mockData";
import type { Candidate, ConstituencyResult, Province } from "./mockData";
import { TableRowsSkeleton } from "./Skeleton";
import Tooltip from "./Tooltip";
import { useElectionStore } from "./store/electionStore";
import { t as i18n, provinceName, partyName, statusLabel } from "./i18n";
import type { Lang } from "./i18n";

type SortKey = "margin" | "province" | "alpha" | "status";

function formatTime(iso: string) {
  return new Date(iso).toLocaleString();
}

function number(n: number) {
  return n.toLocaleString();
}

function pct(n: number, total: number) {
  if (total <= 0) return 0;
  return Math.round((n / total) * 100);
}

function votePct(votes: number, candidates: Candidate[]): string {
  const total = candidates.reduce((s, c) => s + c.votes, 0);
  if (total === 0) return "";
  return `${((votes / total) * 100).toFixed(1)}%`;
}

function topCandidates(cands: Candidate[] | undefined | null) {
  const safe = Array.isArray(cands) ? cands : [];
  const sorted = [...safe].sort((a, b) => b.votes - a.votes);

  return {
    sorted,
    leader: sorted[0] ?? null,
    runnerUp: sorted[1] ?? null,
    others: sorted.slice(2),
  };
}

function useFlash(trigger: string) {
  const [flashing, setFlashing] = useState(false);
  const prevRef = useRef(trigger);

  useEffect(() => {
    if (prevRef.current !== trigger) {
      prevRef.current = trigger;
      setFlashing(true);
      const t = setTimeout(() => setFlashing(false), 900);
      return () => clearTimeout(t);
    }
  }, [trigger]);

  return flashing;
}

// Smooth number animation (count-up)
function useCountUp(target: number, durationMs = 550) {
  const [val, setVal] = useState(target);

  useEffect(() => {
    const start = performance.now();
    const from = val;
    const to = target;
    if (from === to) return;

    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
      setVal(Math.round(from + (to - from) * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  return val;
}

export default function ConstituencyTable({
  results,
  translatedProvinces,
  selectedProvince,
  onProvinceChange,
  isLoading,
  lang = "en",
}: {
  results: ConstituencyResult[];
  /** Pass provinces as { key, label } so the dropdown shows the translated name */
  translatedProvinces: { key: Province; label: string }[];
  selectedProvince: "All" | Province;
  onProvinceChange: (p: "All" | Province) => void;
  isLoading?: boolean;
  lang?: Lang;
}) {
  const [query, setQuery] = useState("");
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const sortBy = useElectionStore((s) => s.sortBy);
  const setSortBy = useElectionStore((s) => s.setSortBy);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    const base = results
      .filter((r) => (selectedProvince === "All" ? true : r.province === selectedProvince))
      .filter((r) => {
        if (!q) return true;
        const names = Array.isArray(r.candidates) ? r.candidates.map((c) => c.name).join(" ") : "";
        const hay = `${r.name} ${r.code} ${r.district} ${names}`.toLowerCase();
        return hay.includes(q);
      });

    return [...base].sort((a, b) => {
      switch (sortBy) {
        case "margin": {
          const ta = topCandidates(a.candidates);
          const tb = topCandidates(b.candidates);
          const ma = (ta.leader?.votes ?? 0) - (ta.runnerUp?.votes ?? 0);
          const mb = (tb.leader?.votes ?? 0) - (tb.runnerUp?.votes ?? 0);
          return mb - ma;
        }
        case "province":
          return a.province.localeCompare(b.province);
        case "alpha":
          return a.name.localeCompare(b.name);
        case "status":
        default: {
          if (a.status !== b.status) return a.status === "DECLARED" ? -1 : 1;
          const ta2 = topCandidates(a.candidates);
          const tb2 = topCandidates(b.candidates);
          const ma2 = (ta2.leader?.votes ?? 0) - (ta2.runnerUp?.votes ?? 0);
          const mb2 = (tb2.leader?.votes ?? 0) - (tb2.runnerUp?.votes ?? 0);
          return mb2 - ma2;
        }
      }
    });
  }, [query, selectedProvince, sortBy, results]);

  const selected = useMemo(() => {
    if (!selectedCode) return null;
    return results.find((r) => r.code === selectedCode) ?? null;
  }, [results, selectedCode]);

  return (
    <>
      <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm dark:bg-slate-900 dark:border-slate-800">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              {i18n("constituencyResults", lang)}
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
              {i18n("clickRowDetails", lang)}
            </p>
          </div>

          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <input
              aria-label={i18n("searchAria", lang)}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={i18n("search", lang)}
              className="w-full sm:w-72 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none
                         focus:ring-2 focus:ring-slate-200 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-100 dark:focus:ring-slate-700"
            />

            <select
              aria-label={i18n("filterByProvince", lang)}
              value={selectedProvince}
              onChange={(e) => onProvinceChange(e.target.value as "All" | Province)}
              className="w-full sm:w-52 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none
                         focus:ring-2 focus:ring-slate-200 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-100 dark:focus:ring-slate-700"
            >
              <option value="All">{i18n("allProvinces", lang)}</option>
              {translatedProvinces.map(({ key, label }) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>

            <select
              aria-label={i18n("sortBy", lang)}
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortKey)}
              className="w-full sm:w-44 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none
                         focus:ring-2 focus:ring-slate-200 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-100 dark:focus:ring-slate-700"
            >
              <option value="status">{i18n("sortStatus", lang)}</option>
              <option value="margin">{i18n("sortMargin", lang)}</option>
              <option value="province">{i18n("sortProvinceAZ", lang)}</option>
              <option value="alpha">{i18n("sortNameAZ", lang)}</option>
            </select>
          </div>
        </div>

        <div className="mt-5 overflow-x-auto">
          <table className="min-w-full border-separate border-spacing-0">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                <th className="py-3 pr-4">{i18n("constituency", lang)}</th>
                <th className="py-3 pr-4">{i18n("province", lang)}</th>
                <th className="py-3 pr-4">{i18n("leading", lang)}</th>
                <th className="py-3 pr-4">{i18n("runnerUpCol", lang)}</th>
                <th className="py-3 pr-4">{i18n("margin", lang)}</th>
                <th className="py-3 pr-4">{i18n("status", lang)}</th>
                <th className="py-3">{i18n("updated", lang)}</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {isLoading ? (
                <TableRowsSkeleton />
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-sm text-slate-600 dark:text-slate-300">
                    {i18n("noRows", lang)}
                  </td>
                </tr>
              ) : (
                filtered.map((r) => (
                  <Row key={r.code} r={r} onClick={() => setSelectedCode(r.code)} lang={lang} />
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-3 text-xs text-slate-500 dark:text-slate-400">
          {i18n("showing", lang)}{" "}
          <span className="font-semibold text-slate-700 dark:text-slate-200">{filtered.length}</span>{" "}
          {i18n("constituenciesCount", lang)} {i18n("mockSubset", lang)}
        </div>
      </section>

      {selected ? <DetailsModal r={selected} onClose={() => setSelectedCode(null)} lang={lang} /> : null}
    </>
  );
}

const Row = memo(function Row({ r, onClick, lang = "en" }: { r: ConstituencyResult; onClick: () => void; lang?: Lang }) {
  const t = topCandidates(r.candidates);
  const leader = t.leader;
  const runnerUp = t.runnerUp;
  const leadParty = leader ? parties[leader.party] : null;
  const runParty = runnerUp ? parties[runnerUp.party] : null;
  const margin = (leader?.votes ?? 0) - (runnerUp?.votes ?? 0);

  const currentLeaderParty = leader?.party ?? "";
  const flashing = useFlash(currentLeaderParty);
  const flashClass = flashing ? "bg-yellow-50 dark:bg-yellow-900/20" : "";

  const statusClass =
    r.status === "DECLARED"
      ? "bg-emerald-50 text-emerald-800 ring-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-200 dark:ring-emerald-900"
      : "bg-amber-50 text-amber-800 ring-amber-200 dark:bg-amber-900/30 dark:text-amber-200 dark:ring-amber-900";

  return (
    <tr>
      <td colSpan={7} className="p-0">
        <button
          type="button"
          onClick={onClick}
          title="Click to view details"
          className={`w-full text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60
                     focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300
                     dark:focus-visible:ring-slate-700 active:scale-[0.995] min-h-[44px] ${flashClass}`}
        >
          {/* Mobile: stacked card */}
          <div className="sm:hidden px-4 py-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="font-semibold text-slate-900 dark:text-slate-100">{r.name}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  {r.code} · {r.district} · {r.province}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {flashing && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-bold text-yellow-800 ring-1 ring-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-200 dark:ring-yellow-800">
                    {i18n("liveUpdated", lang)}
                  </span>
                )}
                {r.status === "COUNTING" && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-xs font-bold text-red-700 ring-1 ring-red-200 dark:bg-red-900/30 dark:text-red-200 dark:ring-red-900">
                    <span className="h-1.5 w-1.5 rounded-full bg-red-600 animate-pulse" />
                    {i18n("live", lang)}
                  </span>
                )}
                <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-bold ring-1 ${statusClass}`}>
                  {statusLabel(r.status, lang)}
                </span>
              </div>
            </div>

            {leader && leadParty && (
              <div className="flex items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-full ${leadParty.color}`} />
                <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">{leader.name}</span>
                <span className="text-xs text-slate-500 dark:text-slate-400">{number(leader.votes)}</span>
                <span className="text-xs text-slate-500 dark:text-slate-400 ml-auto">
                  Margin: <span className="font-semibold text-slate-700 dark:text-slate-200">{number(margin)}</span>
                </span>
              </div>
            )}
          </div>

          {/* Desktop: 7-column grid */}
          <div className="hidden sm:grid grid-cols-7 items-center">
            <div className="py-3 pr-4">
              <div className="font-semibold text-slate-900 dark:text-slate-100">{r.name}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                <span className="font-semibold text-slate-700 dark:text-slate-200">{r.code}</span> · {r.district}
              </div>
            </div>

            <div className="py-3 pr-4 text-sm text-slate-700 dark:text-slate-200">{provinceName(r.province, lang)}</div>

            <div className="py-3 pr-4">
              {leader && leadParty ? (
                <div className="flex items-center gap-2">
                  <span className={`h-3 w-3 rounded-full ${leadParty.color}`} />
                  <div>
                    <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{leader.name}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {partyName(leader.party, lang)} · <span className="font-semibold text-slate-700 dark:text-slate-200 tabular-nums">{number(leader.votes)}</span>{" "}
                      <span className="text-slate-400 dark:text-slate-500">({votePct(leader.votes, r.candidates)})</span>
                    </div>
                  </div>
                </div>
              ) : <span className="text-sm text-slate-500 dark:text-slate-400">—</span>}
            </div>

            <div className="py-3 pr-4">
              {runnerUp && runParty ? (
                <div className="flex items-center gap-2">
                  <span className={`h-3 w-3 rounded-full ${runParty.color}`} />
                  <div>
                    <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{runnerUp.name}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {partyName(runnerUp.party, lang)} · <span className="font-semibold text-slate-700 dark:text-slate-200 tabular-nums">{number(runnerUp.votes)}</span>{" "}
                      <span className="text-slate-400 dark:text-slate-500">({votePct(runnerUp.votes, r.candidates)})</span>
                    </div>
                  </div>
                </div>
              ) : <span className="text-sm text-slate-500 dark:text-slate-400">—</span>}
            </div>

            <div className="py-3 pr-4 text-sm font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
              <Tooltip text="Vote difference between 1st and 2nd place">
                <span className="cursor-default">{number(margin)}</span>
              </Tooltip>
            </div>

            <div className="py-3 pr-4">
              <div className="flex items-center gap-2">
                {r.status === "COUNTING" && (
                  <Tooltip text="Counting in progress — votes are still being tallied">
                    <span className="inline-flex items-center gap-2 rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-red-700 ring-1 ring-red-200 dark:bg-red-900/30 dark:text-red-200 dark:ring-red-900">
                      <span className="h-2 w-2 rounded-full bg-red-600 animate-pulse" />
                      {i18n("live", lang)}
                    </span>
                  </Tooltip>
                )}
                <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ring-1 ${statusClass}`}>
                  {statusLabel(r.status, lang)}
                </span>
              </div>
            </div>

            <div className="py-3 text-xs text-slate-600 dark:text-slate-300">{formatTime(r.lastUpdated)}</div>
          </div>
        </button>
      </td>
    </tr>
  );
});

const DetailsModal = memo(function DetailsModal({ r, onClose, lang = "en" }: { r: ConstituencyResult; onClose: () => void; lang?: Lang }) {
  // open animation
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setOpen(true));
    return () => cancelAnimationFrame(id);
  }, []);

  // close on ESC
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && requestClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const requestClose = () => {
    setOpen(false);
    setTimeout(onClose, 160);
  };

  const cands = topCandidates(r.candidates);
  const leader = cands.leader;
  const runnerUp = cands.runnerUp;

  const leadParty = leader ? parties[leader.party] : null;

  const totalAllVotes = cands.sorted.reduce((s, c) => s + c.votes, 0);
  const topTwoTotal = (leader?.votes ?? 0) + (runnerUp?.votes ?? 0);
  const leadPct = pct(leader?.votes ?? 0, topTwoTotal);
  const runPct = pct(runnerUp?.votes ?? 0, topTwoTotal);
  const margin = (leader?.votes ?? 0) - (runnerUp?.votes ?? 0);

  const statusBadge =
    r.status === "DECLARED"
      ? "bg-emerald-50 text-emerald-800 ring-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-200 dark:ring-emerald-900"
      : "bg-amber-50 text-amber-800 ring-amber-200 dark:bg-amber-900/30 dark:text-amber-200 dark:ring-amber-900";

  const backCls = open ? "opacity-100" : "opacity-0";
  const panelCls = open ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-[0.98] translate-y-1";

  return (
    <FocusTrap focusTrapOptions={{ initialFocus: false, escapeDeactivates: false }}>
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div
        className={`absolute inset-0 bg-slate-900/50 transition-opacity duration-150 ${backCls}`}
        onClick={requestClose}
      />

      <div
        className={`relative w-full max-w-2xl rounded-2xl border border-slate-200 bg-white shadow-xl
                    transition-all duration-150 overflow-y-auto max-h-[90vh] ${panelCls}
                    dark:bg-slate-900 dark:border-slate-800`}
      >
        <div className="flex items-start justify-between gap-4 p-5 border-b border-slate-200 dark:border-slate-800">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 id="modal-title" className="text-lg font-bold text-slate-900 dark:text-slate-100 truncate">{r.name}</h3>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{r.code}</span>

              <div className="ml-2 flex items-center gap-2">
                {r.status === "COUNTING" ? (
                  <span className="inline-flex items-center gap-2 rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-red-700 ring-1 ring-red-200 dark:bg-red-900/30 dark:text-red-200 dark:ring-red-900">
                    <span className="h-2 w-2 rounded-full bg-red-600 animate-pulse" />
                    LIVE
                  </span>
                ) : null}

                <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ring-1 ${statusBadge}`}>
                  {r.status === "DECLARED" ? "Declared" : "Counting"}
                </span>
              </div>
            </div>

            <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              {r.district} · {r.province} · Updated {formatTime(r.lastUpdated)}
            </div>
          </div>

          <button
            onClick={requestClose}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700
                       transition-transform duration-150 hover:bg-slate-50 active:scale-95
                       dark:bg-slate-900 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            {i18n("close", lang)}
          </button>
        </div>

        <div className="p-5 space-y-5">
          {r.status === "DECLARED" && leader && leadParty ? (
            <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 dark:bg-emerald-900/30 dark:border-emerald-900">
              <div className="text-sm font-semibold text-emerald-900 dark:text-emerald-200">Result declared</div>
              <div className="mt-1 text-lg font-bold text-slate-900 dark:text-slate-100">Winner: {leader.name}</div>
              <div className="mt-1 text-sm text-slate-700 dark:text-slate-200">
                {leadParty.name} · {number(leader.votes)} votes · Margin{" "}
                <span className="font-semibold">{number(margin)}</span>
              </div>
            </div>
          ) : r.status === "COUNTING" ? (
            <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 dark:bg-amber-900/30 dark:border-amber-900">
              <div className="text-sm font-semibold text-amber-900 dark:text-amber-200">Counting in progress</div>
              <div className="mt-1 text-sm text-slate-700 dark:text-slate-200">
                This chart compares the current top two candidates.
              </div>
            </div>
          ) : null}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <CandidateCard title="Leading" candidate={leader} percent={leadPct} />
            <CandidateCard title="Runner-up" candidate={runnerUp} percent={runPct} />
          </div>

          <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
            <div className="flex items-center justify-between text-sm text-slate-700 dark:text-slate-200">
              <span className="font-semibold">Top-two vote share</span>
              <span className="text-slate-500 dark:text-slate-400 tabular-nums">
                Total shown: {number(topTwoTotal)}
              </span>
            </div>

            <div className="mt-3 space-y-3">
              <BarRow
                label={leader ? `${leader.name} (${leadPct}%)` : "—"}
                value={leader?.votes ?? 0}
                total={topTwoTotal}
                barClass={leader ? parties[leader.party].color : "bg-slate-400"}
              />
              <BarRow
                label={runnerUp ? `${runnerUp.name} (${runPct}%)` : "—"}
                value={runnerUp?.votes ?? 0}
                total={topTwoTotal}
                barClass={runnerUp ? parties[runnerUp.party].color : "bg-slate-400"}
              />
            </div>

            <div className="mt-3 text-xs text-slate-500 dark:text-slate-400">
              Margin: <span className="font-semibold text-slate-700 dark:text-slate-200">{number(margin)}</span> votes
            </div>
          </div>

          {/* Turnout */}
          <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
            <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">Voter Turnout</div>
            <div className="mt-2 flex items-center justify-between text-sm text-slate-700 dark:text-slate-200">
              <span>Votes cast</span>
              <span className="font-semibold tabular-nums">{number(r.votesCast)} / {number(r.totalVoters)}</span>
            </div>
            <div className="mt-2 h-2 w-full rounded-full bg-slate-200 overflow-hidden dark:bg-slate-700">
              <div
                className="h-2 bg-slate-900 dark:bg-slate-100 transition-[width] duration-700 ease-out"
                style={{ width: `${Math.min(100, (r.votesCast / r.totalVoters) * 100).toFixed(1)}%` }}
              />
            </div>
            <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {r.totalVoters > 0 ? `${((r.votesCast / r.totalVoters) * 100).toFixed(1)}% turnout` : "—"}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">All candidates</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">{cands.sorted.length} total</div>
            </div>

            <div className="mt-3 space-y-2">
              {cands.sorted.map((c, idx) => {
                const party = parties[c.party];
                const isTop2 = idx < 2;
                return (
                  <div
                    key={`${c.name}-${c.party}`}
                    className={`flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2
                      dark:border-slate-800
                      ${isTop2 ? "bg-slate-50 dark:bg-slate-800/60" : "bg-white dark:bg-slate-900"}`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`h-3 w-3 rounded-full ${party.color}`} />
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                          {c.name}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 truncate">{partyName(c.party, lang)}</div>
                      </div>
                    </div>

                    <div className="text-sm font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                      {number(c.votes)}
                      <span className="ml-1 text-xs font-normal text-slate-400 dark:text-slate-500">
                        {totalAllVotes > 0 ? `(${((c.votes / totalAllVotes) * 100).toFixed(1)}%)` : ""}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="text-xs text-slate-500 dark:text-slate-400">
            Bars + modal animate; votes count up smoothly.
          </div>
        </div>
      </div>
    </div>
    </FocusTrap>
  );
});

function CandidateCard({
  title,
  candidate,
  percent,
}: {
  title: string;
  candidate: Candidate | null;
  percent: number;
}) {
  const party = candidate ? parties[candidate.party] : null;
  const animatedVotes = useCountUp(candidate?.votes ?? 0, 650);

  return (
    <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold text-slate-600 dark:text-slate-300">{title}</div>
        {party ? <span className={`h-3 w-3 rounded-full ${party.color}`} /> : null}
      </div>

      <div className="mt-2 text-base font-bold text-slate-900 dark:text-slate-100">
        {candidate ? candidate.name : "—"}
      </div>
      <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">{party ? party.name : "—"}</div>

      <div className="mt-2 flex items-baseline justify-between">
        <div className="text-lg font-extrabold text-slate-900 dark:text-slate-100 tabular-nums">
          {candidate ? number(animatedVotes) : "—"}
        </div>
        <div className="text-sm font-semibold text-slate-700 dark:text-slate-200 tabular-nums">
          {candidate ? `${percent}%` : ""}
        </div>
      </div>
    </div>
  );
}

function BarRow({
  label,
  value,
  total,
  barClass,
}: {
  label: string;
  value: number;
  total: number;
  barClass: string;
}) {
  const width = total > 0 ? (value / total) * 100 : 0;

  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <div className="text-slate-700 dark:text-slate-200">{label}</div>
        <div className="font-semibold text-slate-900 dark:text-slate-100 tabular-nums">{number(value)}</div>
      </div>

      <div className="mt-2 h-3 w-full rounded-full bg-slate-200 overflow-hidden dark:bg-slate-700">
        <div
          className={`h-3 ${barClass} transition-[width] duration-700 ease-out`}
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}
