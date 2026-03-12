/**
 * useElectionSimulation — data loading hook.
 *
 * ARCHIVE MODE (VITE_RESULTS_MODE=archive, default):
 *   - Fetches the final saved dataset from Cloudflare R2 / CDN once.
 *   - Preserves recorded votes, winner flags, and status values.
 *   - No polling — this is the post-election analysis/archive experience.
 *   - Requires VITE_CDN_URL so archive pages use the same R2 source of truth.
 *   - On fetch failure, shows "data unavailable" state (empty results, isLoading=false).
 *
 * LIVE MODE (VITE_RESULTS_MODE=live, requires VITE_CDN_URL):
 *   - Fetches constituencies.json from the R2 CDN immediately.
 *   - Polls every 2 minutes for updates.
 *   - After each poll, fires browser notifications for favorited constituencies
 *     that newly transitioned to DECLARED status.
 */

import { useEffect, useRef } from "react";
import { useElectionStore } from "../store/electionStore";
import { RESULTS_MODE } from "../types";
import { notifyDeclared } from "./useConstituencyNotifications";
import { fetchConstituencies, fetchPrParties } from "../api";

const CDN_BASE = (import.meta.env.VITE_CDN_URL as string | undefined) ?? "";
const POLL_INTERVAL_MS = 120_000;

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

    if (!CDN_BASE) {
      console.error("[r2] VITE_CDN_URL is required so results load from Cloudflare R2.");
      setIsLoading(false);
      return () => {
        cancelled = true;
      };
    }

    const loadFromR2 = async () => {
      const [data, prSnapshot] = await Promise.all([fetchConstituencies(), fetchPrParties()]);
      if (!data) {
        throw new Error("R2 constituencies.json is unavailable");
      }
      return { data, prSnapshot };
    };

    // ── LIVE MODE ─────────────────────────────────────────────────────────────
    if (RESULTS_MODE === "live") {
      // Initial fetch — full replace to seed static candidate data + party registry
      loadFromR2()
        .then(({ data, prSnapshot }) => {
          if (cancelled) return;
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
          console.error("[r2] initial fetch failed:", err);
          if (!cancelled) setIsLoading(false);
        });

      // Poll every 2 minutes — merge only dynamic fields (votes, status, isWinner)
      const interval = setInterval(async () => {
        if (cancelled) return;
        try {
          const { data, prSnapshot } = await loadFromR2();
          if (cancelled) return;

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
          console.error("[r2] poll error:", err);
        }
      }, POLL_INTERVAL_MS);

      return () => {
        cancelled = true;
        clearInterval(interval);
      };
    }

    // ── ARCHIVE MODE (default) ────────────────────────────────────────────────
    loadFromR2()
      .then(({ data, prSnapshot }) => {
        if (cancelled) return;
        setResults(data);
        setPrVotes(toPrVoteMap(prSnapshot));
        setIsLoading(false);
        console.info(
          `[r2] archive mode loaded ${data.length} constituencies (${
            data.reduce((n, c) => n + c.candidates.length, 0)
          } candidates)`
        );
      })
      .catch((err) => {
        console.error("[r2] archive fetch failed:", err);
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [setResults, setPrVotes, setIsLoading, mergeResults]);
}
