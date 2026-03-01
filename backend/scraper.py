"""
scraper.py — Fetch and parse election results from result.election.gov.np.

Discovery (2026-02-23): The site serves a flat JSON file, not HTML.
Primary endpoint: GET /JSONFiles/ElectionResultCentral2082.txt
  - Returns a UTF-8 (BOM-prefixed) JSON array of 3,406 candidate records.
  - No authentication, no pagination — always returns full dataset.
  - Update frequency: every ~30 s on election day.

No Playwright required — plain httpx async client is sufficient.
"""

import json
import httpx
from datetime import datetime, timezone
from typing import Any


# ── Upstream endpoint ────────────────────────────────────────────────────────
UPSTREAM_URL = (
    "https://result.election.gov.np/JSONFiles/ElectionResultCentral2082.txt"
)
HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (compatible; NepalElectionBot/1.0; +https://localhost)"
    ),
    "Accept": "application/json, text/plain, */*",
}


# ── Party name → frontend PartyKey mapping ───────────────────────────────────
# Exact Nepali strings from the upstream JSON field "PoliticalPartyName".
# All other parties → "OTH".
# NOTE: Verify the NCP string on election day — two similar names exist.
PARTY_MAP: dict[str, str] = {
    "नेपाली काँग्रेस":                                                    "NC",
    "नेपाल कम्युनिष्ट पार्टी (एकीकृत मार्क्सवादी लेनिनवादी)":          "CPN-UML",
    "नेपाल कम्युनिस्ट पार्टी (माओवादी)":                                 "NCP",
    "नेपाल कम्युनिष्ट पार्टी (माओवादी)":                                 "NCP",   # alternate spelling
    "राष्ट्रिय स्वतन्त्र पार्टी":                                         "RSP",
    "राष्ट्रिय प्रजातन्त्र पार्टी":                                       "RPP",
    "जनता समाजवादी पार्टी, नेपाल":                                        "JSP",
    "स्वतन्त्र":                                                           "IND",
}


def map_party_key(party_name: str) -> str:
    """Map upstream PoliticalPartyName to a frontend PartyKey."""
    return PARTY_MAP.get(party_name.strip(), "OTH")


def constituency_id(record: dict[str, Any]) -> str:
    """Derive a stable global constituency key from the composite fields."""
    return f"{record['STATE_ID']}-{record['DistrictName']}-{record['SCConstID']}"


# Confirmed winner value from live upstream JSON (validated 2026-02-23).
# Update if the site uses a different string on election day.
_WINNER_STATUS = {"W"}


def is_winner(record: dict[str, Any]) -> bool:
    """
    Determine winner status from available fields.
    Pre-election: E_STATUS is null for all records → fallback to rank+votes.
    On election day: E_STATUS == "W" for the declared winner of each seat.
    """
    status = record.get("E_STATUS")
    if status is not None:
        return status in _WINNER_STATUS
    # Fallback for partial counts before official declaration
    if record.get("R") == 1 and record.get("TotalVoteReceived", 0) > 0:
        return True
    return False


def _derive_party_id(rec: dict[str, Any]) -> str:
    """
    Derive a stable partyId matching the frontend convention:
      - "IND" for independent candidates (PoliticalPartyName == "स्वतन्त्र")
      - str(SYMBOLCODE) for all other parties
    Mirrors parseUpstreamData.ts derivePartyId().
    """
    if (rec.get("PoliticalPartyName") or "") == "स्वतन्त्र":
        return "IND"
    return str(rec.get("SYMBOLCODE", "0"))


_DISTRICT_EN: dict[str, str] = {
    "ताप्लेजुङ": "Taplejung",      "पाँचथर": "Panchthar",         "इलाम": "Ilam",
    "सङ्खुवासभा": "Sankhuwasabha", "भोजपुर": "Bhojpur",           "धनकुटा": "Dhankuta",
    "तेह्रथुम": "Terhathum",        "खोटाङ": "Khotang",            "सोलुखुम्बु": "Solukhumbu",
    "ओखलढुङ्गा": "Okhaldhunga",    "झापा": "Jhapa",               "मोरङ": "Morang",
    "सुनसरी": "Sunsari",            "उदयपुर": "Udayapur",          "सप्तरी": "Saptari",
    "सिरहा": "Siraha",              "धनुषा": "Dhanusha",           "महोत्तरी": "Mahottari",
    "सर्लाही": "Sarlahi",           "रौतहट": "Rautahat",           "बारा": "Bara",
    "पर्सा": "Parsa",               "सिन्धुली": "Sindhuli",        "रामेछाप": "Ramechhap",
    "दोलखा": "Dolakha",             "सिन्धुपाल्चोक": "Sindhupalchok",
    "काभ्रेपलाञ्चोक": "Kavrepalanchok",
    "भक्तपुर": "Bhaktapur",         "ललितपुर": "Lalitpur",         "काठमाडौँ": "Kathmandu",
    "काठमाडौं": "Kathmandu",
    "नुवाकोट": "Nuwakot",           "मकवानपुर": "Makwanpur",       "चितवन": "Chitwan",
    "गोर्खा": "Gorkha",             "लमजुङ": "Lamjung",            "तनहुँ": "Tanahu",
    "कास्की": "Kaski",              "स्याङ्जा": "Syangja",         "पर्वत": "Parbat",
    "बाग्लुङ": "Baglung",           "म्याग्दी": "Myagdi",          "नवलपुर": "Nawalpur",
    "मुस्ताङ": "Mustang",           "मनाङ": "Manang",
    "रूपन्देही": "Rupandehi",       "कपिलवस्तु": "Kapilvastu",     "अर्घाखाँची": "Arghakhanchi",
    "गुल्मी": "Gulmi",              "पाल्पा": "Palpa",             "दाङ": "Dang",
    "बाँके": "Banke",               "बर्दिया": "Bardiya",           "रोल्पा": "Rolpa",
    "रुकुम पश्चिम": "Rukum-West",  "प्युठान": "Pyuthan",
    "डोल्पा": "Dolpa",              "मुगु": "Mugu",                "हुम्ला": "Humla",
    "जुम्ला": "Jumla",              "कालिकोट": "Kalikot",          "दैलेख": "Dailekh",
    "जाजरकोट": "Jajarkot",          "सल्यान": "Salyan",            "रुकुम पूर्व": "Rukum-East",
    "सुर्खेत": "Surkhet",
    "बाजुरा": "Bajura",             "बझाङ": "Bajhang",             "दार्चुला": "Darchula",
    "बैतडी": "Baitadi",             "डडेलधुरा": "Dadeldhura",      "डोटी": "Doti",
    "अछाम": "Achham",               "कैलाली": "Kailali",           "कञ्चनपुर": "Kanchanpur",
}


def _district_en(np_name: str, state_id: int) -> str:
    province_en = _state_id_to_province_key(state_id)
    return _DISTRICT_EN.get(np_name, f"{province_en}-District")


def _gender(rec: dict[str, Any]) -> str:
    return "F" if rec.get("Gender") == "महिला" else "M"


def parse_candidates_json(raw_candidates: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """
    Transform the raw upstream candidate records into ConstituencyResult[] shape
    as defined in frontend/src/types.ts.

    Emits camelCase keys that match the TypeScript type exactly so
    constituencies.json can be consumed by the frontend without transformation.

    Each constituency dict:
      code, province, district, districtNp, name, nameNp,
      status, lastUpdated, votesCast, candidates[]

    Each candidate dict:
      candidateId, name, nameNp, partyId, partyName, votes, gender, isWinner
      + optional: age, fatherName, spouseName, qualification, institution,
                  experience, address
    """
    grouped: dict[str, list[dict[str, Any]]] = {}
    for rec in raw_candidates:
        cid = constituency_id(rec)
        grouped.setdefault(cid, []).append(rec)

    results: list[dict[str, Any]] = []
    now = datetime.now(timezone.utc).isoformat()

    for cid, recs in grouped.items():
        first = recs[0]
        state_id    = first.get("STATE_ID", 0)
        district_np = first.get("DistrictName", "")
        district_en = _district_en(district_np, state_id)
        const_num   = first.get("SCConstID", 0)
        province    = _state_id_to_province_key(state_id)

        candidates: list[dict[str, Any]] = []
        for rec in recs:
            cand: dict[str, Any] = {
                "candidateId": rec.get("CandidateID"),
                "name":        rec.get("CandidateName") or "",
                "nameNp":      rec.get("CandidateName") or "",
                "partyId":     _derive_party_id(rec),
                "partyName":   rec.get("PoliticalPartyName") or "",
                "votes":       rec.get("TotalVoteReceived", 0),
                "gender":      _gender(rec),
                "isWinner":    is_winner(rec),
            }
            # Optional biographical fields — omit when absent or placeholder
            age = rec.get("AGE_YR")
            if age:
                cand["age"] = age
            father = rec.get("FATHER_NAME", "")
            if father and father != "-":
                cand["fatherName"] = father
            spouse = rec.get("SPOUCE_NAME", "")
            if spouse and spouse != "-":
                cand["spouseName"] = spouse
            qual = rec.get("QUALIFICATION", "")
            if qual and qual != "0":
                cand["qualification"] = qual
            inst = rec.get("NAMEOFINST", "")
            if inst and inst != "0":
                cand["institution"] = inst
            exp = rec.get("EXPERIENCE", "")
            if exp and exp != "0":
                cand["experience"] = exp
            addr = rec.get("ADDRESS", "")
            if addr and addr != "0":
                cand["address"] = addr
            candidates.append(cand)

        has_winner = any(c["isWinner"] for c in candidates)
        has_votes  = any(c["votes"] > 0 for c in candidates)
        status     = "DECLARED" if has_winner else ("COUNTING" if has_votes else "PENDING")
        votes_cast = sum(c["votes"] for c in candidates)

        results.append({
            "code":        cid,
            "province":    province,
            "district":    district_en,
            "districtNp":  district_np,
            "name":        f"{district_en}-{const_num}",
            "nameNp":      f"{district_np} क्षेत्र नं. {const_num}",
            "status":      status,
            "lastUpdated": now,
            "votesCast":   votes_cast,
            "candidates":  candidates,
        })

    return results


def _state_id_to_province_key(state_id: int) -> str:
    """Map STATE_ID (1–7) to the English province key used by the frontend."""
    return {
        1: "Koshi",
        2: "Madhesh",
        3: "Bagmati",
        4: "Gandaki",
        5: "Lumbini",
        6: "Karnali",
        7: "Sudurpashchim",
    }.get(state_id, "Unknown")


def build_snapshot_from_constituencies(
    constituencies: list[dict[str, Any]],
) -> dict[str, Any]:
    """Derive a snapshot dict from a list of ConstituencyResult dicts."""
    seat_tally: dict[str, dict[str, int]] = {
        k: {"fptp": 0, "pr": 0}
        for k in ["NC", "CPN-UML", "NCP", "RSP", "RPP", "JSP", "IND", "OTH"]
    }
    declared = 0
    for c in constituencies:
        if c["status"] == "DECLARED" and c.get("candidates"):
            declared += 1
            # Use isWinner flag first; fall back to highest vote-getter
            winners = [cand for cand in c["candidates"] if cand.get("isWinner")]
            winner = winners[0] if winners else max(c["candidates"], key=lambda x: x["votes"])
            party_id = winner.get("partyId", "OTH")
            # Map SYMBOLCODE-based partyId back to legacy key for snapshot tally.
            # The snapshot uses the old NC/CPN-UML/… keys consumed by SummaryCards.
            legacy = map_party_key(winner.get("partyName", ""))
            key = legacy if legacy != "OTH" else party_id
            if key in seat_tally:
                seat_tally[key]["fptp"] += 1
            else:
                seat_tally["OTH"]["fptp"] += 1

    return {
        "taken_at":       datetime.now(timezone.utc).isoformat(),
        "total_seats":    275,
        "declared_seats": declared,
        "seat_tally":     seat_tally,
    }


async def fetch_candidates(url: str = UPSTREAM_URL) -> list[dict[str, Any]]:
    """
    Fetch the full candidate+results array from the upstream static JSON file.

    The file is served as text/plain with a UTF-8 BOM prefix.
    httpx handles TLS; no browser/Playwright required.
    """
    async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
        resp = await client.get(url, headers=HEADERS)
        resp.raise_for_status()
        raw = resp.content
        if raw.startswith(b"\xef\xbb\xbf"):   # strip UTF-8 BOM
            raw = raw[3:]
        return json.loads(raw.decode("utf-8"))


async def scrape_results(url: str = UPSTREAM_URL) -> tuple[list[dict], dict]:
    """
    Main entry point for the background scraper loop.

    Returns (constituency_results, snapshot_data).

    On election day:
    1. Confirm UPSTREAM_URL still returns live data (TotalVoteReceived > 0).
    2. Update PARTY_MAP with any corrected NCP / Maoist party name strings.
    3. Update is_winner() based on observed E_STATUS values.
    4. Check for a PR results file: /JSONFiles/ElectionResultPR2082.txt
    """
    raw_candidates = await fetch_candidates(url)
    constituencies = parse_candidates_json(raw_candidates)
    snapshot = build_snapshot_from_constituencies(constituencies)
    return constituencies, snapshot
