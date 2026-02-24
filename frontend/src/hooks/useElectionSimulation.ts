import { useEffect, useRef } from "react";
import { constituencyResults } from "../mockData";
import type { ConstituencyResult } from "../mockData";
import { useElectionStore } from "../store/electionStore";
import { fetchConstituencies, getWsUrl } from "../api";
import { fetchRealConstituencies } from "../lib/parseUpstreamData";

const API_BASE = import.meta.env.VITE_API_URL ?? "";

export function useElectionSimulation() {
  const setResults = useElectionStore((s) => s.setResults);
  const resultsRef = useRef<ConstituencyResult[]>(constituencyResults);

  useEffect(() => {
    if (API_BASE) {
      // ── Live backend mode ────────────────────────────────────────────────
      fetchConstituencies()
        .then((data) => {
          if (data) { resultsRef.current = data; setResults(data); }
        })
        .catch(console.error);

      const wsUrl = getWsUrl();
      if (!wsUrl) return;

      const ws = new WebSocket(wsUrl);

      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data as string);
          if (msg.type === "constituencies" && Array.isArray(msg.data)) {
            resultsRef.current = msg.data;
            setResults(msg.data);
          }
        } catch {
          // ignore parse errors
        }
      };

      ws.onerror = () => {
        // Fall back to polling if WS fails
        const interval = setInterval(async () => {
          try {
            const data = await fetchConstituencies();
            if (data) { resultsRef.current = data; setResults(data); }
          } catch (err) {
            console.error("[api] poll error:", err);
          }
        }, 30_000);
        return () => clearInterval(interval);
      };

      return () => ws.close();
    }

    // ── No backend: try real upstream data first ─────────────────────────
    // Attempt to fetch real candidate data from result.election.gov.np.
    // If CORS blocks it, fetchRealConstituencies() returns null silently.
    let cancelled = false;

    fetchRealConstituencies().then((real) => {
      if (cancelled) return;
      if (real && real.length > 0) {
        console.info(`[upstream] loaded ${real.length} real constituencies`);
        resultsRef.current = real;
        setResults(real);
      } else {
        console.info("[upstream] CORS blocked or no data — using mock data");
      }
    });

    // ── Mock simulation (runs regardless — increments votes every 3 s) ───
    // This gives the demo a live-counting feel whether real data loaded or not.
    const interval = setInterval(() => {
      const next = resultsRef.current.map((r) => {
        if (r.status === "DECLARED") return r;
        const nextCandidates = r.candidates.map((c) => ({
          ...c,
          votes: c.votes + (Math.random() < 0.65
            ? Math.floor(Math.random() * 220)
            : Math.floor(Math.random() * 40)),
        }));
        return {
          ...r,
          candidates: nextCandidates,
          status: (Math.random() < 0.08 ? "DECLARED" : "COUNTING") as ConstituencyResult["status"],
          votesCast: nextCandidates.reduce((s, c) => s + c.votes, 0),
          lastUpdated: new Date().toISOString(),
        };
      });
      resultsRef.current = next;
      setResults(next);
    }, 3000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [setResults]);
}
