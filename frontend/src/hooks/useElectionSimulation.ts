import { useState, useEffect } from "react";
import { constituencyResults } from "../mockData";
import type { ConstituencyResult } from "../mockData";

export function useElectionSimulation() {
  const [results, setResults] = useState<ConstituencyResult[]>(constituencyResults);

  useEffect(() => {
    const interval = setInterval(() => {
      setResults((prev) =>
        prev.map((r) => {
          if (r.status === "DECLARED") return r;

          const nextCandidates = r.candidates.map((c) => {
            const bump =
              Math.random() < 0.65
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
  }, []);

  return results;
}
