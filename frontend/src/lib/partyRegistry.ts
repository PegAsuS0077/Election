/**
 * Party registry — derives PartyInfo[] from live constituency data.
 *
 * Party identity uses partyId (SYMBOLCODE string or "IND"), not a closed enum.
 * Display names always come from PoliticalPartyName (official Nepali text).
 * English names are derived from a known mapping; unrecognised parties use
 * their Nepali name as-is.
 *
 * This registry is built once from the first available constituency results
 * and exported for use by all components.
 */

import type { ConstituencyResult, PartyInfo } from "../types";
import { PARTY_HEX } from "./constants";

// ── Known English display names ───────────────────────────────────────────────
// Keyed by partyId (SYMBOLCODE string or "IND").
// This is a display aid only — new parties will show their Nepali name if not listed.

const KNOWN_ENGLISH: Record<string, string> = {
  // Major parties (SYMBOLCODE approximations — will be accurate after first real load)
  "NC":        "Nepali Congress",
  "CPN-UML":   "CPN (Unified Marxist-Leninist)",
  "NCP":       "NCP (Maoist Centre)",
  "RSP":       "Rastriya Swatantra Party",
  "RPP":       "Rastriya Prajatantra Party",
  "JSP":       "Janata Samajwadi Party Nepal",
  "CPN-US":    "CPN (Unified Socialist)",
  "LSP":       "Loktantrik Samajwadi Party",
  "NUP":       "Nagarik Unmukti Party",
  "RJM":       "Rastriya Janamorcha",
  "NMKP":      "Nepal Majdoor Kisan Party",
  "JMP":       "Janamat Party",
  "CPN-ML":    "CPN (Marxist-Leninist)",
  "NPD":       "Nepal Parivar Dal",
  "IND":       "Independent",
};

// Mapping from official Nepali PoliticalPartyName → partyId abbreviation string
// This is only used to resolve legacy string-based IDs before SYMBOLCODE is available.
export const NEPALI_NAME_TO_ID: Record<string, string> = {
  "नेपाली काँग्रेस":                                                    "NC",
  "नेपाल कम्युनिष्ट पार्टी (एकीकृत मार्क्सवादी लेनिनवादी)":          "CPN-UML",
  "नेपाल कम्युनिस्ट पार्टी (माओवादी)":                                 "NCP",
  "नेपाल कम्युनिष्ट पार्टी (माओवादी केन्द्र)":                         "NCP",
  "राष्ट्रिय स्वतन्त्र पार्टी":                                         "RSP",
  "राष्ट्रिय प्रजातन्त्र पार्टी":                                       "RPP",
  "जनता समाजवादी पार्टी, नेपाल":                                        "JSP",
  "नेकपा (एकीकृत समाजवादी)":                                            "CPN-US",
  "नेपाल कम्युनिष्ट पार्टी (एकीकृत समाजवादी)":                         "CPN-US",
  "लोकतान्त्रिक समाजवादी पार्टी":                                       "LSP",
  "नागरिक उन्मुक्ति पार्टी":                                            "NUP",
  "राष्ट्रिय जनमोर्चा":                                                  "RJM",
  "नेपाल मजदुर किसान पार्टी":                                           "NMKP",
  "जनमत पार्टी":                                                          "JMP",
  "नेपाल कम्युनिष्ट पार्टी (मार्क्सवादी-लेनिनवादी)":                   "CPN-ML",
  "नेकपा (मार्क्सवादी-लेनिनवादी)":                                       "CPN-ML",
  "नेपाल परिवार दल":                                                      "NPD",
  "स्वतन्त्र":                                                            "IND",
};

// ── Colour / symbol assignments per partyId ───────────────────────────────────
// These are display choices only. New parties get a deterministic grey shade.

const PARTY_COLOR: Record<string, string> = {
  NC:        "bg-red-600",
  "CPN-UML": "bg-blue-600",
  NCP:       "bg-orange-600",
  RSP:       "bg-emerald-600",
  RPP:       "bg-yellow-600",
  JSP:       "bg-cyan-600",
  "CPN-US":  "bg-purple-600",
  LSP:       "bg-teal-600",
  NUP:       "bg-amber-600",
  RJM:       "bg-rose-700",
  NMKP:      "bg-green-700",
  JMP:       "bg-indigo-600",
  "CPN-ML":  "bg-red-800",
  NPD:       "bg-stone-600",
  IND:       "bg-violet-500",
};

const PARTY_SYMBOL: Record<string, string> = {
  NC:        "🌳",
  "CPN-UML": "☀️",
  NCP:       "🌙",
  RSP:       "⚡",
  RPP:       "👑",
  JSP:       "⚙️",
  "CPN-US":  "✊",
  LSP:       "🌿",
  NUP:       "🕊️",
  RJM:       "⚒️",
  NMKP:      "🌾",
  JMP:       "🗳️",
  "CPN-ML":  "⭐",
  NPD:       "🏠",
  IND:       "🧑",
};

// ── Registry state ────────────────────────────────────────────────────────────

let _registry: Map<string, PartyInfo> = new Map();

/** Returns the registry as a sorted array (by candidate count desc, IND last) */
export function getParties(): PartyInfo[] {
  return Array.from(_registry.values()).sort((a, b) => {
    if (a.partyId === "IND") return 1;
    if (b.partyId === "IND") return -1;
    return b.candidateCount - a.candidateCount;
  });
}

/** Lookup a single party by partyId. Returns a placeholder if not found. */
export function getParty(partyId: string): PartyInfo {
  return (
    _registry.get(partyId) ?? {
      partyId,
      partyName: partyId,
      nameEn: KNOWN_ENGLISH[partyId] ?? partyId,
      color: "bg-slate-400",
      hex: "#94a3b8",
      symbol: "•",
      candidateCount: 0,
    }
  );
}

/** Returns the hex colour for a party. */
export function partyHex(partyId: string): string {
  return _registry.get(partyId)?.hex ?? "#94a3b8";
}

/** Returns the Tailwind bg class for a party. */
export function partyColor(partyId: string): string {
  return _registry.get(partyId)?.color ?? "bg-slate-400";
}

/**
 * Builds the registry from constituency results.
 * Call this once after loading constituency data.
 * Safe to call multiple times — subsequent calls update the registry.
 */
export function buildRegistry(constituencies: ConstituencyResult[]): void {
  const counts = new Map<string, { partyName: string; count: number }>();

  for (const c of constituencies) {
    for (const cand of c.candidates) {
      const existing = counts.get(cand.partyId);
      if (existing) {
        existing.count += 1;
      } else {
        counts.set(cand.partyId, { partyName: cand.partyName, count: 1 });
      }
    }
  }

  _registry = new Map();
  for (const [partyId, { partyName, count }] of counts) {
    const color = PARTY_COLOR[partyId] ?? "bg-slate-400";
    _registry.set(partyId, {
      partyId,
      partyName,
      nameEn: KNOWN_ENGLISH[partyId] ?? partyName,
      color,
      hex: PARTY_HEX[color] ?? "#94a3b8",
      symbol: PARTY_SYMBOL[partyId] ?? "•",
      candidateCount: count,
    });
  }
}

/** Total number of parties (excluding IND) */
export function namedPartyCount(): number {
  return Array.from(_registry.keys()).filter((k) => k !== "IND").length;
}

/** Total contesting parties including IND */
export function totalPartyCount(): number {
  return _registry.size;
}
