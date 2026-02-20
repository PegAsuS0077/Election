import { useEffect, useRef } from "react";
import { constituencyResults } from "../mockData";
import type { ConstituencyResult } from "../mockData";
import { useElectionStore } from "../store/electionStore";
import { fetchConstituencies } from "../api/results";

const API_BASE = import.meta.env.VITE_API_URL ?? "";

export function useElectionSimulation() {
  const setResults = useElectionStore((s) => s.setResults);
  const resultsRef = useRef<ConstituencyResult[]>(constituencyResults);

  useEffect(() => {
    if (API_BASE) {
      // Initial fetch
      fetchConstituencies()
        .then((data) => { resultsRef.current = data; setResults(data); })
        .catch(console.error);

      // WebSocket for live updates
      const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${proto}//${new URL(API_BASE).host}/ws`;
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
            resultsRef.current = data;
            setResults(data);
          } catch (err) {
            console.error("[api] poll error:", err);
          }
        }, 30_000);
        return () => clearInterval(interval);
      };

      return () => ws.close();
    }

    // Mock simulation (no API configured)
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
          lastUpdated: new Date().toISOString(),
        };
      });
      resultsRef.current = next;
      setResults(next);
    }, 3000);
    return () => clearInterval(interval);
  }, [setResults]);
}
