import { useEffect, useMemo, useState } from "react";
import { constituencyResults, provinces, parties } from "./mockData";
import type { Candidate, ConstituencyResult, Province } from "./mockData";

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

export default function ConstituencyTable() {
  const [query, setQuery] = useState("");
  const [province, setProvince] = useState<"All" | Province>("All");

  // Live, mutable results (start from mock data)
  const [results, setResults] = useState<ConstituencyResult[]>(constituencyResults);

  // Selected row (by code) for the modal
  const [selectedCode, setSelectedCode] = useState<string | null>(null);

  // Simulate election-night live updates (multi-candidate)
  useEffect(() => {
    const interval = setInterval(() => {
      setResults((prev) =>
        prev.map((r) => {
          if (r.status === "DECLARED") return r;

          const nextCandidates = (Array.isArray(r.candidates) ? r.candidates : []).map((c) => {
            const bump = Math.random() < 0.65 ? Math.floor(Math.random() * 220) : Math.floor(Math.random() * 40);
            return { ...c, votes: c.votes + bump };
          });

          const shouldDeclare = Math.random() < 0.08;

          return {
            ...r,
            candidates: nextCandidates,
            status: shouldDeclare ? "DECLARED" : "COUNTING",
            lastUpdated: new Date().toISOString(),
          };
        })
      );
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    return results
      .filter((r) => (province === "All" ? true : r.province === province))
      .filter((r) => {
        if (!q) return true;
        const names = Array.isArray(r.candidates) ? r.candidates.map((c) => c.name).join(" ") : "";
        const hay = `${r.name} ${r.code} ${r.district} ${names}`.toLowerCase();
        return hay.includes(q);
      })
      .sort((a, b) => {
        if (a.status !== b.status) return a.status === "DECLARED" ? -1 : 1;

        const ta = topCandidates(a.candidates);
        const tb = topCandidates(b.candidates);

        const ma = (ta.leader?.votes ?? 0) - (ta.runnerUp?.votes ?? 0);
        const mb = (tb.leader?.votes ?? 0) - (tb.runnerUp?.votes ?? 0);
        return mb - ma;
      });
  }, [query, province, results]);

  // Always show latest version of selected constituency
  const selected = useMemo(() => {
    if (!selectedCode) return null;
    return results.find((r) => r.code === selectedCode) ?? null;
  }, [results, selectedCode]);

  return (
    <>
      <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Constituency Results</h2>
            <p className="text-sm text-slate-600 mt-1">
              Click a row to view details · Search and filter by province
            </p>
            <p className="text-xs text-slate-500 mt-1">Demo mode: vote totals update every 3 seconds.</p>
          </div>

          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search…"
              className="w-full sm:w-72 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-200"
            />

            <select
              value={province}
              onChange={(e) => setProvince(e.target.value as "All" | Province)}
              className="w-full sm:w-52 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-200"
            >
              <option value="All">All provinces</option>
              {provinces.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-5 overflow-x-auto">
          <table className="min-w-full border-separate border-spacing-0">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="py-3 pr-4">Constituency</th>
                <th className="py-3 pr-4">Province</th>
                <th className="py-3 pr-4">Leading</th>
                <th className="py-3 pr-4">Runner-up</th>
                <th className="py-3 pr-4">Margin</th>
                <th className="py-3 pr-4">Status</th>
                <th className="py-3">Updated</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-sm text-slate-600">
                    No rows match your search.
                  </td>
                </tr>
              ) : (
                filtered.map((r) => <Row key={r.code} r={r} onClick={() => setSelectedCode(r.code)} />)
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-3 text-xs text-slate-500">
          Showing <span className="font-semibold text-slate-700">{filtered.length}</span> constituencies (mock subset)
        </div>
      </section>

      {selected ? <DetailsModal r={selected} onClose={() => setSelectedCode(null)} /> : null}
    </>
  );
}

function Row({ r, onClick }: { r: ConstituencyResult; onClick: () => void }) {
  const t = topCandidates(r.candidates);
  const leader = t.leader;
  const runnerUp = t.runnerUp;

  const leadParty = leader ? parties[leader.party] : null;
  const runParty = runnerUp ? parties[runnerUp.party] : null;

  const margin = (leader?.votes ?? 0) - (runnerUp?.votes ?? 0);

  const statusClass =
    r.status === "DECLARED"
      ? "bg-emerald-50 text-emerald-800 ring-emerald-200"
      : "bg-amber-50 text-amber-800 ring-amber-200";

  return (
    <tr className="group">
      <td colSpan={7} className="p-0">
        <button
          type="button"
          onClick={onClick}
          title="Click to view details"
          className="
            w-full text-left
            transition
            hover:bg-slate-50
            focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300
            active:scale-[0.995]
          "
        >
          <div className="grid grid-cols-7 items-center">
            {/* Constituency */}
            <div className="py-3 pr-4">
              <div className="font-semibold text-slate-900">{r.name}</div>
              <div className="text-xs text-slate-500">
                <span className="font-semibold text-slate-700">{r.code}</span> · {r.district}
              </div>
            </div>

            {/* Province */}
            <div className="py-3 pr-4 text-sm text-slate-700">{r.province}</div>

            {/* Leading */}
            <div className="py-3 pr-4">
              {leader && leadParty ? (
                <div className="flex items-center gap-2">
                  <span className={`h-3 w-3 rounded-full ${leadParty.color}`} />
                  <div>
                    <div className="text-sm font-semibold text-slate-900">{leader.name}</div>
                    <div className="text-xs text-slate-500">
                      {leadParty.name} ·{" "}
                      <span className="font-semibold text-slate-700 tabular-nums">{number(leader.votes)}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <span className="text-sm text-slate-500">—</span>
              )}
            </div>

            {/* Runner-up */}
            <div className="py-3 pr-4">
              {runnerUp && runParty ? (
                <div className="flex items-center gap-2">
                  <span className={`h-3 w-3 rounded-full ${runParty.color}`} />
                  <div>
                    <div className="text-sm font-semibold text-slate-900">{runnerUp.name}</div>
                    <div className="text-xs text-slate-500">
                      {runParty.name} ·{" "}
                      <span className="font-semibold text-slate-700 tabular-nums">{number(runnerUp.votes)}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <span className="text-sm text-slate-500">—</span>
              )}
            </div>

            {/* Margin */}
            <div className="py-3 pr-4 text-sm font-semibold text-slate-900 tabular-nums">{number(margin)}</div>

            {/* Status */}
            <div className="py-3 pr-4">
              <div className="flex items-center gap-2">
                {r.status === "COUNTING" ? (
                  <span className="inline-flex items-center gap-2 rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-red-700 ring-1 ring-red-200">
                    <span className="h-2 w-2 rounded-full bg-red-600 animate-pulse" />
                    LIVE
                  </span>
                ) : null}

                <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ring-1 ${statusClass}`}>
                  {r.status === "DECLARED" ? "Declared" : "Counting"}
                </span>
              </div>
            </div>

            {/* Updated */}
            <div className="py-3 text-xs text-slate-600">{formatTime(r.lastUpdated)}</div>
          </div>
        </button>
      </td>
    </tr>
  );
}

function DetailsModal({ r, onClose }: { r: ConstituencyResult; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const t = topCandidates(r.candidates);
  const leader = t.leader;
  const runnerUp = t.runnerUp;

  const leadParty = leader ? parties[leader.party] : null;

  const topTwoTotal = (leader?.votes ?? 0) + (runnerUp?.votes ?? 0);
  const leadPct = pct(leader?.votes ?? 0, topTwoTotal);
  const runPct = pct(runnerUp?.votes ?? 0, topTwoTotal);
  const margin = (leader?.votes ?? 0) - (runnerUp?.votes ?? 0);

  const statusBadge =
    r.status === "DECLARED"
      ? "bg-emerald-50 text-emerald-800 ring-emerald-200"
      : "bg-amber-50 text-amber-800 ring-amber-200";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-slate-900/50" onClick={onClose} />

      <div className="relative w-full max-w-2xl rounded-2xl border border-slate-200 bg-white shadow-xl">
        <div className="flex items-start justify-between gap-4 p-5 border-b border-slate-200">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-slate-900 truncate">{r.name}</h3>
              <span className="text-xs font-semibold text-slate-500">{r.code}</span>

              <div className="ml-2 flex items-center gap-2">
                {r.status === "COUNTING" ? (
                  <span className="inline-flex items-center gap-2 rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-red-700 ring-1 ring-red-200">
                    <span className="h-2 w-2 rounded-full bg-red-600 animate-pulse" />
                    LIVE
                  </span>
                ) : null}

                <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ring-1 ${statusBadge}`}>
                  {r.status === "DECLARED" ? "Declared" : "Counting"}
                </span>
              </div>
            </div>

            <div className="mt-1 text-sm text-slate-600">
              {r.district} · {r.province} · Updated {formatTime(r.lastUpdated)}
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700
                       transition-transform duration-150 hover:bg-slate-50 active:scale-95"
          >
            Close
          </button>
        </div>

        <div className="p-5 space-y-5">
          {r.status === "DECLARED" && leader && leadParty ? (
            <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4">
              <div className="text-sm font-semibold text-emerald-900">Result declared</div>
              <div className="mt-1 text-lg font-bold text-slate-900">Winner: {leader.name}</div>
              <div className="mt-1 text-sm text-slate-700">
                {leadParty.name} · {number(leader.votes)} votes · Margin{" "}
                <span className="font-semibold">{number(margin)}</span>
              </div>
            </div>
          ) : r.status === "COUNTING" ? (
            <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4">
              <div className="text-sm font-semibold text-amber-900">Counting in progress</div>
              <div className="mt-1 text-sm text-slate-700">
                This chart compares the current top two candidates.
              </div>
            </div>
          ) : null}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <CandidateCard title="Leading" candidate={leader} percent={leadPct} />
            <CandidateCard title="Runner-up" candidate={runnerUp} percent={runPct} />
          </div>

          <div className="rounded-2xl border border-slate-200 p-4">
            <div className="flex items-center justify-between text-sm text-slate-700">
              <span className="font-semibold">Top-two vote share</span>
              <span className="text-slate-500 tabular-nums">Total shown: {number(topTwoTotal)}</span>
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

            <div className="mt-3 text-xs text-slate-500">
              Margin: <span className="font-semibold text-slate-700">{number(margin)}</span> votes
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-slate-900">All candidates</div>
              <div className="text-xs text-slate-500">{t.sorted.length} total</div>
            </div>

            <div className="mt-3 space-y-2">
              {t.sorted.map((c, idx) => {
                const party = parties[c.party];
                const isTop2 = idx < 2;
                return (
                  <div
                    key={`${c.name}-${c.party}`}
                    className={`flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2 ${
                      isTop2 ? "bg-slate-50" : "bg-white"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`h-3 w-3 rounded-full ${party.color}`} />
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-slate-900 truncate">{c.name}</div>
                        <div className="text-xs text-slate-500 truncate">{party.name}</div>
                      </div>
                    </div>

                    <div className="text-sm font-bold text-slate-900 tabular-nums">{number(c.votes)}</div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="text-xs text-slate-500">Tip: bars animate when votes update. Rows “press” on click.</div>
        </div>
      </div>
    </div>
  );
}

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

  return (
    <div className="rounded-2xl border border-slate-200 p-4">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold text-slate-600">{title}</div>
        {party ? <span className={`h-3 w-3 rounded-full ${party.color}`} /> : null}
      </div>

      <div className="mt-2 text-base font-bold text-slate-900">{candidate ? candidate.name : "—"}</div>
      <div className="mt-1 text-sm text-slate-600">{party ? party.name : "—"}</div>

      <div className="mt-2 flex items-baseline justify-between">
        <div className="text-lg font-extrabold text-slate-900 tabular-nums transition-colors duration-300">
          {candidate ? number(candidate.votes) : "—"}
        </div>
        <div className="text-sm font-semibold text-slate-700 tabular-nums">{candidate ? `${percent}%` : ""}</div>
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
        <div className="text-slate-700">{label}</div>
        <div className="font-semibold text-slate-900 tabular-nums">{number(value)}</div>
      </div>

      <div className="mt-2 h-3 w-full rounded-full bg-slate-200 overflow-hidden">
        <div className={`h-3 ${barClass} transition-[width] duration-700 ease-out`} style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}
