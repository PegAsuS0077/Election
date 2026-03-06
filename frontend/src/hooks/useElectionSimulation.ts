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
 *   - After each poll, fires browser notifications for favorited constituencies
 *     that newly transitioned to DECLARED status.
 */

import { useEffect, useRef } from "react";
import { useElectionStore } from "../store/electionStore";
import { loadArchiveData } from "../lib/archiveData";
import { RESULTS_MODE } from "../types";
import { notifyDeclared } from "./useConstituencyNotifications";
import { fetchConstituencies, fetchPrParties } from "../api";

const CDN_BASE = (import.meta.env.VITE_CDN_URL as string | undefined) ?? "";
const POLL_INTERVAL_MS = 30_000;

function toPrVoteMap(snapshot: Awaited<ReturnType<typeof fetchPrParties>>): Record<string, number> {
  if (!snapshot?.parties) return {};
  const map: Record<string, number> = {};
  for (const p of snapshot.parties) {
    map[p.partyId] = p.prVotes;
  }
  return map;
}

export function useElectionSimulation() {
  const setResults   = useElectionStore((s) => s.setResults);
  const mergeResults = useElectionStore((s) => s.mergeResults);
  const setPrVotes   = useElectionStore((s) => s.setPrVotes);
  const setIsLoading = useElectionStore((s) => s.setIsLoading);

  // Track which constituencies we've already notified to avoid duplicates
  const notifiedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;

    // ── LIVE MODE ─────────────────────────────────────────────────────────────
    if (RESULTS_MODE === "live" && CDN_BASE) {
      // Initial fetch — full replace to seed static candidate data + party registry
      Promise.all([fetchConstituencies(), fetchPrParties()])
        .then(([data, prSnapshot]) => {
          if (cancelled || !data) return;
          setResults(data);
          setPrVotes(toPrVoteMap(prSnapshot));
          setIsLoading(false);
          // Seed notifiedRef with already-declared constituencies so we don't
          // fire spurious notifications for results that existed on first load
          data.forEach((r) => {
            if (r.status === "DECLARED") notifiedRef.current.add(r.code);
          });
        })
        .catch((err) => {
          console.error("[cdn] initial fetch failed:", err);
          if (!cancelled) setIsLoading(false);
        });

      // Poll every 30 s — merge only dynamic fields (votes, status, isWinner)
      const interval = setInterval(async () => {
        if (cancelled) return;
        try {
          const [data, prSnapshot] = await Promise.all([fetchConstituencies(), fetchPrParties()]);
          if (cancelled || !data) return;

          // Snapshot status BEFORE merge to detect transitions
          const prevByCode = new Map(
            useElectionStore.getState().results.map((r) => [r.code, r.status])
          );

          mergeResults(data);
          if (prSnapshot) {
            setPrVotes(toPrVoteMap(prSnapshot));
          }

          // Notify for favorited constituencies newly declared this poll
          const { favorites } = useElectionStore.getState();
          for (const incoming of data) {
            if (
              incoming.status === "DECLARED" &&
              !notifiedRef.current.has(incoming.code) &&
              favorites.has(incoming.code) &&
              prevByCode.get(incoming.code) !== "DECLARED"
            ) {
              notifiedRef.current.add(incoming.code);
              notifyDeclared(incoming);
            }
          }
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
  }, [setResults, setPrVotes, setIsLoading, mergeResults]);
}
