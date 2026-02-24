/**
 * Parses raw candidate records from the Nepal Election Commission upstream JSON:
 *   https://result.election.gov.np/JSONFiles/ElectionResultCentral2082.txt
 *
 * Mirrors the logic in backend/scraper.py so the frontend can work with real
 * data even when the backend is not running.
 */

import type { ConstituencyResult, Candidate, PartyKey, Province } from "../mockData";

// ── Upstream record shape (subset of fields we use) ───────────────────────────
export type UpstreamRecord = {
  CandidateID: number;
  CandidateName: string;   // Nepali Devanagari
  PoliticalPartyName: string;
  STATE_ID: number;        // 1–7
  DistrictName: string;    // Nepali Devanagari
  SCConstID: number;       // constituency number within district
  TotalVoteReceived: number;
  R: number;               // rank (1 = first pre-election; winner post-election)
  E_STATUS: string | null; // null pre-election; "W" for winner on election day
  Gender?: string;         // "पुरुष" | "महिला" | "अन्य"
};

// ── Party mapping (mirrors backend/scraper.py PARTY_MAP) ──────────────────────
const PARTY_MAP: Record<string, PartyKey> = {
  "नेपाली काँग्रेस":                                                    "NC",
  "नेपाल कम्युनिष्ट पार्टी (एकीकृत मार्क्सवादी लेनिनवादी)":          "CPN-UML",
  "नेपाल कम्युनिस्ट पार्टी (माओवादी)":                                 "NCP",
  "नेपाल कम्युनिष्ट पार्टी (माओवादी केन्द्र)":                         "NCP",
  "राष्ट्रिय स्वतन्त्र पार्टी":                                         "RSP",
  "राष्ट्रिय प्रजातन्त्र पार्टी":                                       "RPP",
  "जनता समाजवादी पार्टी, नेपाल":                                        "JSP",
  "स्वतन्त्र":                                                           "IND",
};

function mapParty(name: string): PartyKey {
  return PARTY_MAP[name] ?? "OTH";
}

// ── Province mapping ──────────────────────────────────────────────────────────
const STATE_TO_PROVINCE: Record<number, Province> = {
  1: "Koshi",
  2: "Madhesh",
  3: "Bagmati",
  4: "Gandaki",
  5: "Lumbini",
  6: "Karnali",
  7: "Sudurpashchim",
};

// Province names in English (for generating the district English name fallback)
const PROVINCE_EN: Record<number, string> = {
  1: "Koshi", 2: "Madhesh", 3: "Bagmati",
  4: "Gandaki", 5: "Lumbini", 6: "Karnali", 7: "Sudurpashchim",
};

// ── Winner detection (mirrors scraper.py is_winner()) ────────────────────────
function isWinner(rec: UpstreamRecord): boolean {
  if (rec.E_STATUS === "W") return true;
  // Fallback: rank 1 with votes — used during partial counting
  if (rec.R === 1 && rec.TotalVoteReceived > 0) return true;
  return false;
}

// ── Gender normalisation ──────────────────────────────────────────────────────
function mapGender(g: string | undefined): "M" | "F" {
  if (g === "महिला") return "F";
  return "M"; // "पुरुष" or anything else
}

// ── Transliterate common Nepali district names to English ─────────────────────
// This is a best-effort lookup. The upstream data provides Nepali district names only.
const DISTRICT_EN: Record<string, string> = {
  "ताप्लेजुङ": "Taplejung",     "पाँचथर": "Panchthar",       "इलाम": "Ilam",
  "सङ्खुवासभा": "Sankhuwasabha","भोजपुर": "Bhojpur",          "धनकुटा": "Dhankuta",
  "तेह्रथुम": "Terhathum",      "खोटाङ": "Khotang",           "सोलुखुम्बु": "Solukhumbu",
  "ओखलढुङ्गा": "Okhaldhunga",   "झापा": "Jhapa",              "मोरङ": "Morang",
  "सुनसरी": "Sunsari",          "उदयपुर": "Udayapur",         "सप्तरी": "Saptari",
  "सिरहा": "Siraha",            "धनुषा": "Dhanusha",          "महोत्तरी": "Mahottari",
  "सर्लाही": "Sarlahi",         "रौतहट": "Rautahat",          "बारा": "Bara",
  "पर्सा": "Parsa",             "सिन्धुली": "Sindhuli",       "रामेछाप": "Ramechhap",
  "दोलखा": "Dolakha",           "सिन्धुपाल्चोक": "Sindhupalchok",
  "काभ्रेपलाञ्चोक": "Kavrepalanchok",
  "भक्तपुर": "Bhaktapur",       "ललितपुर": "Lalitpur",        "काठमाडौँ": "Kathmandu",
  "काठमाडौं": "Kathmandu",
  "नुवाकोट": "Nuwakot",         "मकवानपुर": "Makwanpur",      "चितवन": "Chitwan",
  "गोर्खा": "Gorkha",           "लमजुङ": "Lamjung",           "तनहुँ": "Tanahu",
  "कास्की": "Kaski",            "स्याङ्जा": "Syangja",        "पर्वत": "Parbat",
  "बाग्लुङ": "Baglung",         "म्याग्दी": "Myagdi",         "नवलपुर": "Nawalpur",
  "मुस्ताङ": "Mustang",         "मनाङ": "Manang",
  "रूपन्देही": "Rupandehi",     "कपिलवस्तु": "Kapilvastu",    "अर्घाखाँची": "Arghakhanchi",
  "गुल्मी": "Gulmi",            "पाल्पा": "Palpa",            "दाङ": "Dang",
  "बाँके": "Banke",             "बर्दिया": "Bardiya",          "रोल्पा": "Rolpa",
  "रुकुम पश्चिम": "Rukum-West", "प्युठान": "Pyuthan",
  "डोल्पा": "Dolpa",            "मुगु": "Mugu",               "हुम्ला": "Humla",
  "जुम्ला": "Jumla",            "कालिकोट": "Kalikot",         "दैलेख": "Dailekh",
  "जाजरकोट": "Jajarkot",        "सल्यान": "Salyan",           "रुकुम पूर्व": "Rukum-East",
  "सुर्खेत": "Surkhet",
  "बाजुरा": "Bajura",           "बझाङ": "Bajhang",            "दार्चुला": "Darchula",
  "बैतडी": "Baitadi",           "डडेलधुरा": "Dadeldhura",     "डोटी": "Doti",
  "अछाम": "Achham",             "कैलाली": "Kailali",          "कञ्चनपुर": "Kanchanpur",
};

function districtEn(np: string, stateId: number): string {
  return DISTRICT_EN[np] ?? `${PROVINCE_EN[stateId] ?? "Province"}-District`;
}

// ── Main parser ───────────────────────────────────────────────────────────────
/**
 * Converts the flat upstream candidate array into our ConstituencyResult[] shape.
 * Groups by (STATE_ID, DistrictName, SCConstID) — exactly 165 constituencies.
 */
export function parseUpstreamCandidates(records: UpstreamRecord[]): ConstituencyResult[] {
  // Group records by composite constituency key
  const grouped = new Map<string, UpstreamRecord[]>();
  for (const rec of records) {
    const key = `${rec.STATE_ID}-${rec.DistrictName}-${rec.SCConstID}`;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(rec);
  }

  const results: ConstituencyResult[] = [];

  for (const [key, recs] of grouped) {
    const first = recs[0];
    const province = STATE_TO_PROVINCE[first.STATE_ID];
    if (!province) continue; // safety — ignore unknown provinces

    const districtNp = first.DistrictName;
    const district   = districtEn(districtNp, first.STATE_ID);
    const constNum   = first.SCConstID;

    // Determine constituency status
    const hasWinner  = recs.some(isWinner);
    const hasVotes   = recs.some((r) => r.TotalVoteReceived > 0);
    const status: ConstituencyResult["status"] = hasWinner
      ? "DECLARED"
      : hasVotes
        ? "COUNTING"
        : "PENDING";

    // Build candidates array
    const candidates: Candidate[] = recs.map((rec) => ({
      candidateId: rec.CandidateID,
      name:   rec.CandidateName, // will be Nepali — we use nameNp = same
      nameNp: rec.CandidateName,
      party:  mapParty(rec.PoliticalPartyName),
      votes:  rec.TotalVoteReceived,
      gender: mapGender(rec.Gender),
    }));

    const votesCast = candidates.reduce((s, c) => s + c.votes, 0);

    results.push({
      province,
      district,
      districtNp,
      code:        key,
      name:        `${district}-${constNum}`,
      nameNp:      `${districtNp} क्षेत्र नं. ${constNum}`,
      status,
      lastUpdated: new Date().toISOString(),
      candidates,
      votesCast,
    });
  }

  // Sort: by province (state id) then district then constituency number
  results.sort((a, b) => {
    if (a.province !== b.province) return a.province.localeCompare(b.province);
    if (a.district !== b.district) return a.district.localeCompare(b.district);
    return a.name.localeCompare(b.name);
  });

  return results;
}

// ── Photo URL helper ──────────────────────────────────────────────────────────
const UPSTREAM_BASE = "https://result.election.gov.np";

/** Returns the upstream photo URL for a candidate. May 404 pre-election. */
export function candidatePhotoUrl(candidateId: number): string {
  return `${UPSTREAM_BASE}/Images/Candidate/${candidateId}.jpg`;
}

// ── Upstream fetch (with BOM stripping) ──────────────────────────────────────
const UPSTREAM_URL =
  `${UPSTREAM_BASE}/JSONFiles/ElectionResultCentral2082.txt`;

const CORS_PROXY = "https://corsproxy.io/?url=";

async function fetchWithFallback(url: string): Promise<string> {
  // Try direct first
  try {
    const res = await fetch(url, { mode: "cors" });
    if (res.ok) return res.text();
  } catch {
    // likely CORS — fall through to proxy
  }
  // Try CORS proxy
  const res = await fetch(`${CORS_PROXY}${encodeURIComponent(url)}`);
  if (!res.ok) throw new Error(`Upstream fetch failed: ${res.status}`);
  return res.text();
}

/**
 * Fetches real candidate data from the Election Commission and parses it.
 * Returns null on any error so callers can fall back to mock data silently.
 */
export async function fetchRealConstituencies(): Promise<ConstituencyResult[] | null> {
  try {
    let text = await fetchWithFallback(UPSTREAM_URL);
    // Strip UTF-8 BOM if present
    if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
    const records: UpstreamRecord[] = JSON.parse(text);
    if (!Array.isArray(records) || records.length === 0) return null;
    return parseUpstreamCandidates(records);
  } catch {
    return null;
  }
}
