/**
 * useElectionSimulation — data loading hook.
 *
 * ARCHIVE MODE (VITE_RESULTS_MODE=archive, default):
 *   - Fetches the official upstream JSON once.
 *   - All vote counts are zeroed (pre-election archive browsing).
 *   - No polling, no WebSocket — data is static.
 *   - On fetch failure, shows "data unavailable" state (empty results, isLoading=false).
 *
 * LIVE MODE (VITE_RESULTS_MODE=live, requires VITE_API_URL):
 *   - Fetches from backend /api/constituencies immediately.
 *   - Connects to WebSocket /ws for live push updates.
 *   - Falls back to HTTP polling every 30 s if WebSocket fails.
 *
 * The mock vote-increment simulation that was previously here has been removed.
 * Production never invents data.
 */

import { useEffect } from "react";
import { useElectionStore } from "../store/electionStore";
import { fetchConstituencies, getWsUrl } from "../api";
import { loadArchiveData } from "../lib/archiveData";
import { RESULTS_MODE } from "../types";

const API_BASE = import.meta.env.VITE_API_URL ?? "";

export function useElectionSimulation() {
  const setResults    = useElectionStore((s) => s.setResults);
  const setIsLoading  = useElectionStore((s) => s.setIsLoading);

  useEffect(() => {
    let cancelled = false;

    // ── LIVE MODE ─────────────────────────────────────────────────────────────
    if (RESULTS_MODE === "live" && API_BASE) {
      fetchConstituencies()
        .then((data) => {
          if (cancelled || !data) return;
          setResults(data);
          setIsLoading(false);
        })
        .catch((err) => {
          console.error("[api] initial fetch failed:", err);
          if (!cancelled) setIsLoading(false);
        });

      const wsUrl = getWsUrl();
      if (!wsUrl) return;

      const ws = new WebSocket(wsUrl);

      ws.onmessage = (e) => {
        if (cancelled) return;
        try {
          const msg = JSON.parse(e.data as string);
          if (msg.type === "constituencies" && Array.isArray(msg.data)) {
            setResults(msg.data);
          }
        } catch {
          // ignore parse errors
        }
      };

      ws.onerror = () => {
        // Fall back to polling if WebSocket connection fails
        const interval = setInterval(async () => {
          if (cancelled) return;
          try {
            const data = await fetchConstituencies();
            if (data) setResults(data);
          } catch (err) {
            console.error("[api] poll error:", err);
          }
        }, 30_000);
        return () => clearInterval(interval);
      };

      return () => {
        cancelled = true;
        ws.close();
      };
    }

    // ── ARCHIVE MODE (default) ────────────────────────────────────────────────
    // Load the official candidate list with all votes zeroed.
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
        // Leave results as [] — UI should show "data unavailable" state
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [setResults, setIsLoading]);
}
