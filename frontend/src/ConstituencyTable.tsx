import { useEffect, useMemo, useState } from "react";
import { constituencyResults, provinces, parties } from "./mockData";
import type { ConstituencyResult, Province } from "./mockData";

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

export default function ConstituencyTable() {
  const [query, setQuery] = useState("");
  const [province, setProvince] = useState<"All" | Province>("All");

  // Live, mutable results (start from mock data)
  const [results, setResults] = useState<ConstituencyResult[]>(constituencyResults);

  // Selected row (by code) for the modal
  const [selectedCode, setSelectedCode] = useState<string | null>(null);

  // Simulate election-night live updates
  useEffect(() => {
    const interval = setInterval(() => {
      setResults((prev) =>
        prev.map((r) => {
          if (r.status === "DECLARED") return r;

          const leadInc = Math.floor(Math.random() * 250);
          const runInc = Math.floor(Math.random() * 230);

          const nextLeadingVotes = r.leadingVotes + leadInc;
          const nextRunnerUpVotes = r.runnerUpVotes + runInc;

          const shouldDeclare = Math.random() < 0.08; // 8% chance every tick

          return {
            ...r,
            leadingVotes: nextLeadingVotes,
            runnerUpVotes: nextRunnerUpVotes,
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
        const hay = `${r.name} ${r.code} ${r.district} ${r.leadingCandidate} ${r.runnerUpCandidate}`.toLowerCase();
        return hay.includes(q);
      })
      .sort((a, b) => {
        if (a.status !== b.status) return a.status === "DECLARED" ? -1 : 1;
        const ma = a.leadingVotes - a.runnerUpVotes;
        const mb = b.leadingVotes - b.runnerUpVotes;
        return mb - ma;
      });
  }, [query, province, results]);

  // Always show the *latest* version of the selected constituency (important because results update)
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
            <p className="text-xs text-slate-500 mt-1">
              Demo mode: vote totals update every 3 seconds.
            </p>
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
                filtered.map((r) => (
                  <Row
                    key={r.code}
                    r={r}
                    onClick={() => setSelectedCode(r.code)}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-3 text-xs text-slate-500">
          Showing <span className="font-semibold text-slate-700">{filtered.length}</span> constituencies (mock subset)
        </div>
      </section>

      {selected ? (
        <DetailsModal
          r={selected}
          onClose={() => setSelectedCode(null)}
        />
      ) : null}
    </>
  );
}

function Row({ r, onClick }: { r: ConstituencyResult; onClick: () => void }) {
  const lead = parties[r.leadingParty];
  const run = parties[r.runnerUpParty];
  const margin = r.leadingVotes - r.runnerUpVotes;

  const statusClass =
    r.status === "DECLARED"
      ? "bg-emerald-50 text-emerald-800 ring-emerald-200"
      : "bg-amber-50 text-amber-800 ring-amber-200";

  return (
    <tr
      className="hover:bg-slate-50 cursor-pointer"
      onClick={onClick}
      title="Click to view details"
    >
      <td className="py-3 pr-4">
        <div className="font-semibold text-slate-900">{r.name}</div>
        <div className="text-xs text-slate-500">
          <span className="font-semibold text-slate-700">{r.code}</span> · {r.district}
        </div>
      </td>

      <td className="py-3 pr-4 text-sm text-slate-700">{r.province}</td>

      <td className="py-3 pr-4">
        <div className="flex items-center gap-2">
          <span className={`h-3 w-3 rounded-full ${lead.color}`} />
          <div>
            <div className="text-sm font-semibold text-slate-900">{r.leadingCandidate}</div>
            <div className="text-xs text-slate-500">
              {lead.name} · <span className="font-semibold text-slate-700">{number(r.leadingVotes)}</span>
            </div>
          </div>
        </div>
      </td>

      <td className="py-3 pr-4">
        <div className="flex items-center gap-2">
          <span className={`h-3 w-3 rounded-full ${run.color}`} />
          <div>
            <div className="text-sm font-semibold text-slate-900">{r.runnerUpCandidate}</div>
            <div className="text-xs text-slate-500">
              {run.name} · <span className="font-semibold text-slate-700">{number(r.runnerUpVotes)}</span>
            </div>
          </div>
        </div>
      </td>

      <td className="py-3 pr-4 text-sm font-semibold text-slate-900 tabular-nums">
        {number(margin)}
      </td>

      <td className="py-3 pr-4">
        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ring-1 ${statusClass}`}>
          {r.status === "DECLARED" ? "Declared" : "Counting"}
        </span>
      </td>

      <td className="py-3 text-xs text-slate-600">{formatTime(r.lastUpdated)}</td>
    </tr>
  );
}

function DetailsModal({ r, onClose }: { r: ConstituencyResult; onClose: () => void }) {
  // Close on ESC
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const lead = parties[r.leadingParty];
  const run = parties[r.runnerUpParty];

  const totalTwo = r.leadingVotes + r.runnerUpVotes;
  const leadPct = pct(r.leadingVotes, totalTwo);
  const runPct = pct(r.runnerUpVotes, totalTwo);

  const margin = r.leadingVotes - r.runnerUpVotes;

  const statusBadge =
    r.status === "DECLARED"
      ? "bg-emerald-50 text-emerald-800 ring-emerald-200"
      : "bg-amber-50 text-amber-800 ring-amber-200";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Constituency details"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-2xl rounded-2xl border border-slate-200 bg-white shadow-xl">
        <div className="flex items-start justify-between gap-4 p-5 border-b border-slate-200">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-slate-900 truncate">{r.name}</h3>
              <span className="text-xs font-semibold text-slate-500">{r.code}</span>
              <span className={`ml-2 inline-flex rounded-full px-3 py-1 text-xs font-bold ring-1 ${statusBadge}`}>
                {r.status === "DECLARED" ? "Declared" : "Counting"}
              </span>
            </div>
            <div className="mt-1 text-sm text-slate-600">
              {r.district} · {r.province} · Updated {formatTime(r.lastUpdated)}
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Close
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Declared summary */}
          {r.status === "DECLARED" ? (
            <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4">
              <div className="text-sm font-semibold text-emerald-900">Result declared</div>
              <div className="mt-1 text-lg font-bold text-slate-900">
                Winner: {r.leadingCandidate}
              </div>
              <div className="mt-1 text-sm text-slate-700">
                {lead.name} · {number(r.leadingVotes)} votes · Margin{" "}
                <span className="font-semibold">{number(margin)}</span>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4">
              <div className="text-sm font-semibold text-amber-900">Counting in progress</div>
              <div className="mt-1 text-sm text-slate-700">
                This chart compares the current top two candidates.
              </div>
            </div>
          )}

          {/* Candidate cards */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <CandidateCard
              title="Leading"
              dotColor={lead.color}
              candidate={r.leadingCandidate}
              partyName={lead.name}
              votes={r.leadingVotes}
              percent={leadPct}
            />
            <CandidateCard
              title="Runner-up"
              dotColor={run.color}
              candidate={r.runnerUpCandidate}
              partyName={run.name}
              votes={r.runnerUpVotes}
              percent={runPct}
            />
          </div>

          {/* Bar “chart” */}
          <div className="rounded-2xl border border-slate-200 p-4">
            <div className="flex items-center justify-between text-sm text-slate-700">
              <span className="font-semibold">Top-two vote share</span>
              <span className="text-slate-500 tabular-nums">
                Total shown: {number(totalTwo)}
              </span>
            </div>

            <div className="mt-3 space-y-3">
              <BarRow
                label={`${r.leadingCandidate} (${leadPct}%)`}
                value={r.leadingVotes}
                total={totalTwo}
                barClass={lead.color}
              />
              <BarRow
                label={`${r.runnerUpCandidate} (${runPct}%)`}
                value={r.runnerUpVotes}
                total={totalTwo}
                barClass={run.color}
              />
            </div>

            <div className="mt-3 text-xs text-slate-500">
              Margin: <span className="font-semibold text-slate-700">{number(margin)}</span> votes
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CandidateCard({
  title,
  dotColor,
  candidate,
  partyName,
  votes,
  percent,
}: {
  title: string;
  dotColor: string;
  candidate: string;
  partyName: string;
  votes: number;
  percent: number;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 p-4">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold text-slate-600">{title}</div>
        <span className={`h-3 w-3 rounded-full ${dotColor}`} />
      </div>
      <div className="mt-2 text-base font-bold text-slate-900">{candidate}</div>
      <div className="mt-1 text-sm text-slate-600">{partyName}</div>
      <div className="mt-2 flex items-baseline justify-between">
      <div className="text-lg font-extrabold text-slate-900 tabular-nums transition-colors duration-300">
        {number(votes)}
      </div>
      <div className="text-sm font-semibold text-slate-700 tabular-nums">{percent}%</div>
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
        <div
            className={`h-3 ${barClass} transition-[width] duration-700 ease-out`}
            style={{ width: `${width}%` }}
        />

      </div>
    </div>
  );
}
