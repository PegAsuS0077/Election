/**
 * Central data utilities — no mockData dependency.
 *
 * Party metadata is now derived dynamically from the upstream data via
 * partyRegistry.ts.  Static metadata (ideology, founding year) is still
 * kept here for the PartiesPage detail view.
 */

import type { PartyInfo } from "../types";
import {
  getParties,
  getParty,
  buildRegistry,
  namedPartyCount,
  totalPartyCount,
  partyHex,
  partyColor,
  NEPALI_NAME_TO_ID,
} from "./partyRegistry";

export {
  getParties,
  getParty,
  buildRegistry,
  namedPartyCount,
  totalPartyCount,
  partyHex,
  partyColor,
  NEPALI_NAME_TO_ID,
};

export type { PartyInfo };

// ── Static extended metadata per known party ID ───────────────────────────────
// Used by PartiesPage for ideology / founding year display.

export type PartyMeta = PartyInfo & {
  abbr: string;
  founded: number;
  ideology: string;
};

const EXTRA: Record<string, { abbr: string; founded: number; ideology: string }> = {
  NC:        { abbr: "NC",      founded: 1950, ideology: "Social Democracy" },
  "CPN-UML": { abbr: "UML",    founded: 1991, ideology: "Left-wing Marxism-Leninism" },
  NCP:       { abbr: "NCP-M",  founded: 1994, ideology: "Communist, Maoism" },
  RSP:       { abbr: "RSP",    founded: 2022, ideology: "Liberal, Anti-establishment" },
  RPP:       { abbr: "RPP",    founded: 1990, ideology: "Hindu Nationalism, Conservatism" },
  JSP:       { abbr: "JSP",    founded: 2020, ideology: "Social Democracy, Federalism" },
  "CPN-US":  { abbr: "CPN-US", founded: 2021, ideology: "Democratic Socialism" },
  LSP:       { abbr: "LSP",    founded: 2020, ideology: "Social Democracy" },
  NUP:       { abbr: "NUP",    founded: 2021, ideology: "Liberalism, Federalism" },
  RJM:       { abbr: "RJM",    founded: 1990, ideology: "Left-wing, Agrarianism" },
  NMKP:      { abbr: "NMKP",   founded: 1975, ideology: "Agrarian Socialism" },
  JMP:       { abbr: "JMP",    founded: 2022, ideology: "Federalism, Madhesh Rights" },
  "CPN-ML":  { abbr: "ML",     founded: 1978, ideology: "Marxism-Leninism" },
  NPD:       { abbr: "NPD",    founded: 2008, ideology: "Conservatism, Family Values" },
  IND:       { abbr: "IND",    founded: 0,    ideology: "Non-partisan" },
};

/** Returns extended metadata for a party, augmenting the base PartyInfo. */
export function getPartyMeta(partyId: string): PartyMeta {
  const base = getParty(partyId);
  const extra = EXTRA[partyId] ?? { abbr: partyId, founded: 0, ideology: "" };
  return { ...base, ...extra };
}

/** All parties with extended metadata (registry must be built first). */
export function getAllPartyMeta(): PartyMeta[] {
  return getParties().map((p) => getPartyMeta(p.partyId));
}

// ── Legacy shims ──────────────────────────────────────────────────────────────
// Allow gradual migration of components still using old names.

/** @deprecated Use totalPartyCount() from partyRegistry */
export const TOTAL_CONTESTING_PARTIES_FALLBACK = 20;

/** @deprecated Use getParties() after registry is built */
export const PARTIES_DB: PartyMeta[] = [];
