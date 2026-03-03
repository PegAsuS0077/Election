/**
 * Voter rolls lookup — loads /voter_rolls.json (fetched once) and exposes
 * an O(1) map from constituency name → registered voter count.
 *
 * Key format: "{District}-{N}" e.g. "Kathmandu-1", "Rupandehi-3"
 * This matches the `name` field on every ConstituencyResult.
 *
 * Source: election.nepsebajar.com — 2082 BS official voter registration data
 * (Election Commission final voter list, published 2025-12-27, ~18.9M voters)
 */

// Module-level singleton — fetched exactly once per page session
let _promise: Promise<Map<string, number>> | null = null;

/**
 * Returns (and caches) the voter rolls map keyed by constituency name.
 * Resolves to an empty map on fetch/parse failure — totalVoters is optional.
 */
export function getVoterRolls(): Promise<Map<string, number>> {
  if (_promise) return _promise;

  _promise = (async () => {
    try {
      const res = await fetch("/voter_rolls.json");
      if (!res.ok) throw new Error(`voter_rolls fetch failed: ${res.status}`);
      const raw: Record<string, number> = await res.json();
      const map = new Map<string, number>();
      for (const [k, v] of Object.entries(raw)) {
        if (k.startsWith("_")) continue;
        // "Kathmandu Constituency 1" → "Kathmandu-1"
        const m = k.match(/^(.+?)\s+Constituency\s+(\d+)$/i);
        if (m) map.set(`${m[1]}-${m[2]}`, v);
      }
      return map;
    } catch (err) {
      console.warn("[voterRolls] unavailable — turnout will not be shown:", err);
      return new Map<string, number>();
    }
  })();

  return _promise;
}
