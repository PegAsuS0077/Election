/**
 * NEU candidate lookup — loads /neu_candidates.json (~200 KB, fetched once)
 * and exposes an O(1) map from CandidateID → enrichment record.
 *
 * Record fields (short keys for file size):
 *   id  CandidateID (int)              always present — used as map key
 *   n   English name (from Ekantipur)  omitted when not reliable
 *   f   father's English name          omitted when absent
 *   s   spouse's English name          omitted when absent/placeholder
 *   h   hometown (citizenship district) omitted when absent/contaminated
 *
 * Only 'n' is omitted for unreliable records (~943/3406).
 * In those cases parseUpstreamData keeps the transliterated fallback name.
 */

export type NeuRecord = {
  id: number;
  n?: string;   // English name (reliable Ekantipur match only)
  f?: string;   // father's English name
  s?: string;   // spouse's English name
  h?: string;   // hometown
};

// Module-level singleton — fetched exactly once per page session
let _promise: Promise<Map<number, NeuRecord>> | null = null;

/**
 * Returns (and caches) the NEU lookup map keyed by CandidateID.
 * Resolves to an empty map on fetch/parse failure — enrichment is optional.
 */
export function getNeuLookup(): Promise<Map<number, NeuRecord>> {
  if (_promise) return _promise;

  _promise = (async () => {
    try {
      const res = await fetch("/neu_candidates.json");
      if (!res.ok) throw new Error(`NEU fetch failed: ${res.status}`);
      const records: NeuRecord[] = await res.json();
      const map = new Map<number, NeuRecord>();
      for (const r of records) {
        map.set(r.id, r);
      }
      return map;
    } catch (err) {
      console.warn("[neu] lookup unavailable — enrichment skipped:", err);
      return new Map<number, NeuRecord>();
    }
  })();

  return _promise;
}
