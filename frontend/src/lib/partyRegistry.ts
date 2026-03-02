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
// Keyed by partyId abbreviation string (from PARTY_MAP in backend/scraper.py).
// Unknown parties will fall back to their Nepali name from partyName.

const KNOWN_ENGLISH: Record<string, string> = {
  // ── Major national parties ────────────────────────────────────────────────
  "NC":        "Nepali Congress",
  "CPN-UML":   "CPN (Unified Marxist-Leninist)",
  "NCP":       "Nepali Communist Party",
  "CPN-US":    "CPN (Unified Socialist)",
  "RSP":       "Rastriya Swatantra Party",
  "RPP":       "Rastriya Prajatantra Party",
  "JSP":       "Janata Samajwadi Party Nepal",
  "JMP":       "Janamat Party",
  "NUP":       "Nagarik Unmukti Party",
  "NMKP":      "Nepal Workers and Peasants Party",
  "RJM":       "Rastriya Janamorcha",
  "LSP":       "Loktantrik Samajwadi Party",
  "AJP":       "Aam Janata Party",
  // ── Mid-tier parties ──────────────────────────────────────────────────────
  "UNP":       "Ujyalo Nepal Party",
  "SSP":       "Shram Sanskriti Party",
  "CPN-M":     "CPN (Maoist)",
  "MNO":       "Mongol National Organisation",
  "PLP":       "Progressive Democratic Party",
  "RMP-N":     "Rastriya Mukti Party Nepal",
  "RJP-N":     "Rastriya Janata Party Nepal",
  // ── Smaller registered parties ────────────────────────────────────────────
  "CPN-ML":    "CPN (Marxist-Leninist)",
  "CPN-M2":    "CPN (Marxist)",
  "CPN-PL":    "CPN Marxist (Pushpa Lal)",
  "CPN-U":     "CPN (Unified)",
  "NPD":       "Nepal Parivar Dal",
  "NSP":       "Nepal Sadbhavana Party",
  "RSjP":      "Rastriya Sajha Party",
  "FDNF":      "Federal Democratic National Forum",
  "UCP":       "United Citizens Party",
  "NJP":       "Nepal Janata Party",
  "NJMP":      "Nepal Janmukti Party",
  "RPP-N":     "Rastriya Parivartan Party",
  "RJMP":      "Rastriya Janamukti Party",
  "JMP2":      "Jai Matribhumi Party",
  "RND":       "Rastra Nirman Dal Nepal",
  "NFSP":      "Nepal Federal Socialist Party",
  "BEP":       "Bahujan Ekta Party Nepal",
  "NJvP":      "Nepal Janasewa Party",
  "SSjP":      "Samaveshi Samajwadi Party",
  "SNP":       "Sarbabhauma Nagarik Party",
  "JAP":       "Jana Adhikar Party",
  "NMP":       "Nepal Humanist Party",
  "NLP":       "Nepal Loktantrik Party",
  "NJD":       "Nepali Janata Dal",
  "RED":       "Rastriya Ekta Dal",
  "JLPN":      "Janata Loktantrik Party Nepal",
  "JPN":       "Janaadesh Party Nepal",
  "RJMP2":     "Rastriya Janmat Party",
  "PFP":       "People First Party",
  "RUPN":      "Rastriya Urjashil Party Nepal",
  "NSPN":      "Nagarik Sarvochha Party Nepal",
  "NJSP":      "Nepal Janata Sanrakshan Party",
  "BSP":       "Bahujan Shakti Party",
  "RMAN":      "Rastriya Mukti Andolan Nepal",
  "GDP":       "Gatishil Loktantrik Party",
  "PPN":       "Prajatantrik Party Nepal",
  "TMN":       "Trimul Nepal",
  "SWP":       "Swabhiman Party",
  "UNDP":      "United Nepal Democratic Party",
  "IJP":       "Aitihasik Janata Party",
  "RNP":       "Rastriya Nagarik Party",
  "NMP2":      "Nepal Matrubhumi Party",
  "GPN":       "Gandhiwadi Party Nepal",
  "MJF":       "Madhesi Janaadhikar Forum",
  "HNP":       "Hamro Nepali Party",
  "MPN":       "Miteri Party Nepal",
  "NRN":       "National Republic Nepal",
  "NPN":       "Nepali Party for Nepal",
  "NJSKP":     "Nepali Jana Shramdaan Culture Party",
  // ── Independent ───────────────────────────────────────────────────────────
  "IND":       "Independent",
};

// Mapping from official Nepali PoliticalPartyName → partyId abbreviation string
// This mirrors backend/scraper.py PARTY_MAP and is used to resolve string-based IDs.
export const NEPALI_NAME_TO_ID: Record<string, string> = {
  // ── Major national parties ────────────────────────────────────────────────
  "नेपाली काँग्रेस":                                                             "NC",
  "नेपाल कम्युनिष्ट पार्टी (एकीकृत मार्क्सवादी-लेनिनवादी)":                   "CPN-UML",
  "नेपाल कम्युनिष्ट पार्टी (एकीकृत मार्क्सवादी लेनिनवादी)":                    "CPN-UML",
  "नेपाली कम्युनिष्ट पार्टी":                                                    "NCP",
  "नेपाल कम्युनिस्ट पार्टी (माओवादी)":                                           "NCP",
  "नेपाल कम्युनिष्ट पार्टी (माओवादी)":                                           "NCP",
  "नेपाल कम्युनिष्ट पार्टी (माओवादी केन्द्र)":                                   "NCP",
  "नेकपा (एकीकृत समाजवादी)":                                                     "CPN-US",
  "नेपाल कम्युनिष्ट पार्टी (एकीकृत समाजवादी)":                                   "CPN-US",
  "राष्ट्रिय स्वतन्त्र पार्टी":                                                   "RSP",
  "राष्ट्रिय प्रजातन्त्र पार्टी":                                                 "RPP",
  "जनता समाजवादी पार्टी, नेपाल":                                                  "JSP",
  "जनमत पार्टी":                                                                   "JMP",
  "नागरिक उन्मुक्ति पार्टी, नेपाल":                                               "NUP",
  "नागरिक उन्मुक्ति पार्टी":                                                      "NUP",
  "नेपाल मजदुर किसान पार्टी":                                                     "NMKP",
  "राष्ट्रिय जनमोर्चा":                                                            "RJM",
  "लोकतान्त्रिक समाजवादी पार्टी":                                                 "LSP",
  "आम जनता पार्टी":                                                                "AJP",
  // ── Mid-tier parties ──────────────────────────────────────────────────────
  "उज्यालो नेपाल पार्टी":                                                          "UNP",
  "श्रम संस्कृति पार्टी":                                                           "SSP",
  "मंगोल नेशनल अर्गनाइजेसन":                                                      "MNO",
  "प्रगतिशील लोकतान्त्रिक पार्टी":                                                "PLP",
  "राष्ट्रिय मुक्ति पार्टी, नेपाल":                                               "RMP-N",
  "राष्ट्रिय जनता पार्टी नेपाल":                                                   "RJP-N",
  // ── Smaller registered parties ────────────────────────────────────────────
  "नेपाल कम्युनिष्ट पार्टी (मार्क्सवादी-लेनिनवादी)":                             "CPN-ML",
  "नेकपा (मार्क्सवादी-लेनिनवादी)":                                                "CPN-ML",
  "नेपाल कम्युनिष्ट पार्टी (मार्क्सवादी)":                                        "CPN-M2",
  "नेपाल कम्युनिष्ट पार्टी कमार्क्सवादी (पुष्पलाल)":                              "CPN-PL",
  "नेपाल कम्युनिष्ट पार्टी (संयुक्त)":                                             "CPN-U",
  "नेपाल परिवार दल":                                                               "NPD",
  "नेपाल सद्भावना पार्टी":                                                         "NSP",
  "राष्ट्रिय साझा पार्टी":                                                         "RSjP",
  "संघीय लोकतान्त्रिक राष्ट्रिय मञ्च":                                            "FDNF",
  "संयुक्त नागरिक पार्टी":                                                         "UCP",
  "नेपाल जनता पार्टी":                                                             "NJP",
  "नेपाल जनमुक्ति पार्टी":                                                         "NJMP",
  "राष्ट्रिय परिवर्तन पार्टी":                                                     "RPP-N",
  "राष्ट्रिय जनमुक्ति पार्टी":                                                     "RJMP",
  "जय मातृभूमि पार्टी":                                                            "JMP2",
  "राष्ट्र निर्माण दल, नेपाल":                                                     "RND",
  "नेपाल संघीय समाजवादी पार्टी":                                                   "NFSP",
  "बहुजन एकता पार्टी, नेपाल":                                                      "BEP",
  "नेपाल जनसेवा पार्टी":                                                           "NJvP",
  "समावेशी समाजवादी पार्टी":                                                       "SSjP",
  "सार्वभौम नागरिक पार्टी":                                                        "SNP",
  "जन अधिकार पार्टी":                                                              "JAP",
  "नेपाल मानवतावादी पार्टी":                                                       "NMP",
  "नेपाल लोकतान्त्रिक पार्टी":                                                     "NLP",
  "नेपाली जनता दल":                                                                "NJD",
  "राष्ट्रिय एकता दल":                                                             "RED",
  "जनता लोकतान्त्रिक पार्टी, नेपाल":                                              "JLPN",
  "जनादेश पार्टी नेपाल":                                                           "JPN",
  "राष्ट्रिय जनमत पार्टी":                                                         "RJMP2",
  "पिपुल फर्स्ट पार्टी":                                                           "PFP",
  "राष्ट्रिय ऊर्जाशील पार्टी, नेपाल":                                              "RUPN",
  "नागरिक सर्वोच्चता पार्टी, नेपाल":                                               "NSPN",
  "नेपाल जनता संरक्षण पार्टी":                                                     "NJSP",
  "बहुजन शक्ति पार्टी":                                                            "BSP",
  "राष्ट्रिय मुक्ति आन्दोलन, नेपाल":                                              "RMAN",
  "गतिशील लोकतान्त्रिक पार्टी":                                                    "GDP",
  "प्रजातान्त्रिक पार्टी, नेपाल":                                                  "PPN",
  "त्रिमूल नेपाल":                                                                 "TMN",
  "स्वाभिमान पार्टी":                                                              "SWP",
  "युनाइटेड नेपाल डेमोक्रेटिक पार्टी":                                            "UNDP",
  "इतिहासिक जनता पार्टी":                                                          "IJP",
  "राष्ट्रिय नागरिक पार्टी":                                                       "RNP",
  "नेपाल मातृभूमि पार्टी":                                                         "NMP2",
  "गान्धीवादी पार्टी, नेपाल":                                                      "GPN",
  "मधेशी जनअधिकार फोरम":                                                          "MJF",
  "हाम्रो नेपाली पार्टी":                                                          "HNP",
  "मितेरी पार्टी नेपाल":                                                           "MPN",
  "नेशनल रिपब्लिक नेपाल":                                                         "NRN",
  "नेपालका लागि नेपाली पार्टी":                                                    "NPN",
  "नेपाली जनश्रमदान संस्कृति पार्टी":                                              "NJSKP",
  // ── Independent ───────────────────────────────────────────────────────────
  "स्वतन्त्र":                                                                     "IND",
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
      nameEn: KNOWN_ENGLISH[partyId] ?? KNOWN_ENGLISH[NEPALI_NAME_TO_ID[partyId] ?? ""] ?? partyId,
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
    // partyId is SYMBOLCODE string (e.g. "5") or "IND".
    // Resolve English name via: partyId abbrev → KNOWN_ENGLISH,
    // or via Nepali name → abbrev → KNOWN_ENGLISH as fallback.
    const abbrev = NEPALI_NAME_TO_ID[partyName] ?? partyId;
    const nameEn = KNOWN_ENGLISH[partyId] ?? KNOWN_ENGLISH[abbrev] ?? partyName;
    const color = PARTY_COLOR[abbrev] ?? PARTY_COLOR[partyId] ?? "bg-slate-400";
    _registry.set(partyId, {
      partyId,
      partyName,
      nameEn,
      color,
      hex: PARTY_HEX[color] ?? "#94a3b8",
      symbol: PARTY_SYMBOL[abbrev] ?? PARTY_SYMBOL[partyId] ?? "•",
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
