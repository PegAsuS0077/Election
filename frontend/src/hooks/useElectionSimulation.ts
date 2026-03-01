/**
 * useElectionSimulation — data loading hook.
 *
 * ARCHIVE MODE (VITE_RESULTS_MODE=archive, default):
 *   - Fetches the official upstream JSON once (client-side, via Vite proxy in dev).
 *   - All vote counts are zeroed (pre-election archive browsing).
 *   - No polling — data is static for the session.
 *   - On fetch failure, shows "data unavailable" state (empty results, isLoading=false).
 *
 * LIVE MODE (VITE_RESULTS_MODE=live, requires VITE_CDN_URL):
 *   - Fetches constituencies.json from the R2 CDN immediately.
 *   - Polls every 30 s for updates.
 *   - No WebSocket — the CDN is a static file store with no push capability.
 */

import { useEffect } from "react";
import { useElectionStore } from "../store/electionStore";
import { loadArchiveData } from "../lib/archiveData";
import { RESULTS_MODE } from "../types";
import type { ConstituencyResult } from "../types";

const CDN_BASE = (import.meta.env.VITE_CDN_URL as string | undefined) ?? "";
const POLL_INTERVAL_MS = 30_000;

async function fetchConstituenciesFromCDN(): Promise<ConstituencyResult[]> {
  const res = await fetch(`${CDN_BASE}/constituencies.json`);
  if (!res.ok) throw new Error(`CDN fetch failed: ${res.status}`);
  return res.json() as Promise<ConstituencyResult[]>;
}

export function useElectionSimulation() {
  const setResults   = useElectionStore((s) => s.setResults);
  const setIsLoading = useElectionStore((s) => s.setIsLoading);

  useEffect(() => {
    let cancelled = false;

    // ── LIVE MODE ─────────────────────────────────────────────────────────────
    if (RESULTS_MODE === "live" && CDN_BASE) {
      // Initial fetch
      fetchConstituenciesFromCDN()
        .then((data) => {
          if (cancelled) return;
          setResults(data);
          setIsLoading(false);
        })
        .catch((err) => {
          console.error("[cdn] initial fetch failed:", err);
          if (!cancelled) setIsLoading(false);
        });

      // Poll every 30 s
      const interval = setInterval(async () => {
        if (cancelled) return;
        try {
          const data = await fetchConstituenciesFromCDN();
          if (!cancelled) setResults(data);
        } catch (err) {
          console.error("[cdn] poll error:", err);
        }
      }, POLL_INTERVAL_MS);

      return () => {
        cancelled = true;
        clearInterval(interval);
      };
    }

    // ── ARCHIVE MODE (default) ────────────────────────────────────────────────
    loadArchiveData()
      .then((data) => {
        if (cancelled) return;
        setResults(data);
        setIsLoading(false);
        console.info(
          `[archive] loaded ${data.length} constituencies (${
            data.reduce((n, c) => n + c.candidates.length, 0)
          } candidates)`
        );
      })
      .catch((err) => {
        console.error("[archive] upstream fetch failed:", err);
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [setResults, setIsLoading]);
}
