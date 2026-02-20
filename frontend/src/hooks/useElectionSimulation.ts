import { useEffect } from "react";
import type { ConstituencyResult } from "../mockData";
import { useElectionStore } from "../store/electionStore";

export function useElectionSimulation() {
  const setResults = useElectionStore((s) => s.setResults);
  const results = useElectionStore((s) => s.results);

  useEffect(() => {
    const interval = setInterval(() => {
      setResults(
        results.map((r: ConstituencyResult) => {
          if (r.status === "DECLARED") return r;
          const nextCandidates = r.candidates.map((c) => {
            const bump = Math.random() < 0.65
              ? Math.floor(Math.random() * 220)
              : Math.floor(Math.random() * 40);
            return { ...c, votes: c.votes + bump };
          });
          const shouldDeclare = Math.random() < 0.08;
          return {
            ...r,
            candidates: nextCandidates,
            status: shouldDeclare ? "DECLARED" : ("COUNTING" as const),
            lastUpdated: new Date().toISOString(),
          };
        })
      );
    }, 3000);
    return () => clearInterval(interval);
  }, [results, setResults]);
}
