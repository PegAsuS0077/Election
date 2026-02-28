import { useState } from "react";
import { useElectionStore } from "../store/electionStore";
import type { ConstituencyResult } from "../types";

const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD ?? "admin2026";

export default function AdminPanel() {
  const [authed, setAuthed] = useState(false);
  const [pw, setPw] = useState("");
  const [error, setError] = useState("");
  const results = useElectionStore((s) => s.results);
  const setResults = useElectionStore((s) => s.setResults);
  const [selectedCode, setSelectedCode] = useState("");

  function handleLogin() {
    if (pw === ADMIN_PASSWORD) {
      setAuthed(true);
      setError("");
    } else {
      setError("Incorrect password.");
    }
  }

  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-950">
        <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-sm dark:bg-slate-900 dark:border-slate-800">
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-6">Admin Login</h1>
          <input
            type="password"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            placeholder="Password"
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm mb-3 outline-none
                       focus:ring-2 focus:ring-slate-200 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-100"
          />
          {error && <p className="text-xs text-red-600 mb-3">{error}</p>}
          <button
            type="button"
            onClick={handleLogin}
            className="w-full rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white
                       hover:bg-slate-800 transition dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
          >
            Login
          </button>
        </div>
      </div>
    );
  }

  function handleDeclare() {
    if (!selectedCode) return;
    setResults(
      results.map((r: ConstituencyResult) =>
        r.code === selectedCode ? { ...r, status: "DECLARED", lastUpdated: new Date().toISOString() } : r
      )
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Admin Panel</h1>
          <a href="/" className="text-sm text-slate-600 underline dark:text-slate-300">← Back to dashboard</a>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:bg-slate-900 dark:border-slate-800">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-4">Declare Result</h2>
          <select
            value={selectedCode}
            onChange={(e) => setSelectedCode(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm mb-3 outline-none
                       dark:bg-slate-900 dark:border-slate-700 dark:text-slate-100"
          >
            <option value="">Select constituency…</option>
            {results
              .filter((r) => r.status === "COUNTING")
              .map((r) => (
                <option key={r.code} value={r.code}>{r.name} ({r.code})</option>
              ))}
          </select>
          <button
            type="button"
            onClick={handleDeclare}
            disabled={!selectedCode}
            className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white
                       hover:bg-emerald-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Mark as Declared
          </button>
        </div>
      </div>
    </div>
  );
}
