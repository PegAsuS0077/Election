/**
 * Parses raw candidate records from the Nepal Election Commission upstream JSON:
 *   https://result.election.gov.np/JSONFiles/ElectionResultCentral2082.txt
 *
 * Key rules:
 *  - partyId = String(SYMBOLCODE) for all parties, or "IND" when PoliticalPartyName
 *    is "स्वतन्त्र" (independent). Never invented or hardcoded.
 *  - partyName = raw PoliticalPartyName — passed through unchanged.
 *  - constituencyId = `${STATE_ID}-${DistrictName}-${SCConstID}`
 *  - votes = TotalVoteReceived (may be 0 pre-election)
 *  - isWinner = E_STATUS === "W" (or rank-1 fallback during partial counting)
 *
 * Mirrors backend/scraper.py logic so the frontend can work with real data
 * even when the backend is not running.
 */

import type {
  ConstituencyResult,
  Candidate,
  Province,
  UpstreamRecord,
} from "../types";

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

const PROVINCE_EN: Record<number, string> = {
  1: "Koshi", 2: "Madhesh", 3: "Bagmati",
  4: "Gandaki", 5: "Lumbini", 6: "Karnali", 7: "Sudurpashchim",
};

// ── Party ID derivation ───────────────────────────────────────────────────────

const INDEPENDENT_NP = "स्वतन्त्र";

/**
 * Derives a stable partyId from a raw candidate record.
 * Rule: if PoliticalPartyName is "स्वतन्त्र" → "IND"
 *       else String(SYMBOLCODE)
 * SYMBOLCODE is the Election Commission's own numeric party identifier.
 */
function derivePartyId(rec: UpstreamRecord): string {
  if ((rec.PoliticalPartyName ?? "") === INDEPENDENT_NP) return "IND";
  // SYMBOLCODE is always present and numeric in the upstream data
  return String(rec.SYMBOLCODE);
}

// ── Winner detection ──────────────────────────────────────────────────────────

function isWinner(rec: UpstreamRecord): boolean {
  if (rec.E_STATUS === "W") return true;
  // Fallback: rank 1 with votes > 0 — used during partial counting before
  // E_STATUS is set
  if (rec.R === 1 && rec.TotalVoteReceived > 0) return true;
  return false;
}

// ── Gender normalisation ──────────────────────────────────────────────────────

function mapGender(g: string | undefined): "M" | "F" {
  if (g === "महिला") return "F";
  return "M"; // "पुरुष" or anything else
}

// ── English district name lookup ──────────────────────────────────────────────

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
 * Converts the flat upstream candidate array into ConstituencyResult[].
 * Groups by composite key (STATE_ID, DistrictName, SCConstID) — exactly 165 constituencies.
 *
 * Vote counts are preserved as-is from the upstream data.
 * Call zeroVotes (from archiveData.ts) if you need archive mode behaviour.
 */
export function parseUpstreamCandidates(records: UpstreamRecord[]): ConstituencyResult[] {
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
    if (!province) continue;

    const districtNp = first.DistrictName;
    const district   = districtEn(districtNp, first.STATE_ID);
    const constNum   = first.SCConstID;

    const hasWinner = recs.some(isWinner);
    const hasVotes  = recs.some((r) => r.TotalVoteReceived > 0);
    const status: ConstituencyResult["status"] = hasWinner
      ? "DECLARED"
      : hasVotes
        ? "COUNTING"
        : "PENDING";

    const candidates: Candidate[] = recs.map((rec) => {
      const c: Candidate = {
        candidateId: rec.CandidateID,
        nameNp:      rec.CandidateName ?? "",
        name:        rec.CandidateName ?? "",
        partyName:   rec.PoliticalPartyName ?? "",
        partyId:     derivePartyId(rec),
        votes:       rec.TotalVoteReceived,
        gender:      mapGender(rec.Gender),
        isWinner:    isWinner(rec),
      };
      // Biographical fields — include only when present and meaningful
      if (rec.AGE_YR)                                    c.age          = rec.AGE_YR;
      if (rec.FATHER_NAME && rec.FATHER_NAME !== "-")    c.fatherName   = rec.FATHER_NAME;
      if (rec.SPOUCE_NAME  && rec.SPOUCE_NAME  !== "-")  c.spouseName   = rec.SPOUCE_NAME;
      if (rec.QUALIFICATION && rec.QUALIFICATION !== "0") c.qualification = rec.QUALIFICATION;
      if (rec.NAMEOFINST   && rec.NAMEOFINST   !== "0")  c.institution  = rec.NAMEOFINST;
      if (rec.EXPERIENCE   && rec.EXPERIENCE   !== "0")  c.experience   = rec.EXPERIENCE;
      if (rec.ADDRESS      && rec.ADDRESS      !== "0")  c.address      = rec.ADDRESS;
      return c;
    });

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

const UPSTREAM_URL = `${UPSTREAM_BASE}/JSONFiles/ElectionResultCentral2082.txt`;
const CORS_PROXY = "https://corsproxy.io/?url=";

async function fetchWithFallback(url: string): Promise<string> {
  try {
    const res = await fetch(url, { mode: "cors" });
    if (res.ok) return res.text();
  } catch {
    // CORS blocked — fall through to proxy
  }
  const res = await fetch(`${CORS_PROXY}${encodeURIComponent(url)}`);
  if (!res.ok) throw new Error(`Upstream fetch failed: ${res.status}`);
  return res.text();
}

/**
 * Fetches real candidate data from the Election Commission and parses it.
 * Returns null on any error so callers can fall back gracefully.
 *
 * NOTE: Use archiveData.loadArchiveData() for archive mode — it zeroes votes
 * and caches the result. This function preserves raw vote counts.
 */
export async function fetchRealConstituencies(): Promise<ConstituencyResult[] | null> {
  try {
    let text = await fetchWithFallback(UPSTREAM_URL);
    if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
    const records: UpstreamRecord[] = JSON.parse(text);
    if (!Array.isArray(records) || records.length === 0) return null;
    return parseUpstreamCandidates(records);
  } catch {
    return null;
  }
}
