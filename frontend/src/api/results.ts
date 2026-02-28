/**
 * Legacy API module — kept for backward compatibility.
 * All callers should migrate to importing directly from `../api`.
 *
 * Returns null (not mock data) when no backend is configured.
 */
export { fetchConstituencies, fetchSnapshot } from "../api";
