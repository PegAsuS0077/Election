import { useEffect, useRef } from "react";
import { constituencyResults } from "../mockData";
import type { ConstituencyResult } from "../mockData";
import { useElectionStore } from "../store/electionStore";
import { fetchConstituencies } from "../api/results";

const HAS_API = Boolean(import.meta.env.VITE_API_URL);

export function useElectionSimulation() {
  const setResults = useElectionStore((s) => s.setResults);
  const resultsRef = useRef<ConstituencyResult[]>(constituencyResults);

  useEffect(() => {
    if (HAS_API) {
      // Poll real API
      const interval = setInterval(async () => {
        try {
          const data = await fetchConstituencies();
          resultsRef.current = data;
          setResults(data);
        } catch (e) {
          console.error("[api] fetch error:", e);
        }
      }, 30_000);
      // Initial fetch
      fetchConstituencies().then((data) => {
        resultsRef.current = data;
        setResults(data);
      }).catch(console.error);
      return () => clearInterval(interval);
    }

    // Mock simulation
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
