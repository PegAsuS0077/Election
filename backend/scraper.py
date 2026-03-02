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

from district_names import district_name_en


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
# Unknown parties → their own Nepali name (no "OTH" collapse).
# NOTE: Verify NCP/Maoist strings on election day — multiple spellings exist.
PARTY_MAP: dict[str, str] = {
    # ── Major national parties ────────────────────────────────────────────────
    "नेपाली काँग्रेस":                                                            "NC",
    "नेपाल कम्युनिष्ट पार्टी (एकीकृत मार्क्सवादी-लेनिनवादी)":                  "CPN-UML",
    "नेपाल कम्युनिष्ट पार्टी (एकीकृत मार्क्सवादी लेनिनवादी)":                   "CPN-UML",  # alternate spacing
    # NCP — new merger party (Kartik 2082) combining Maoist Centre + CPN-US + others
    "नेपाली कम्युनिष्ट पार्टी":                                                   "NCP",
    "नेपाल कम्युनिस्ट पार्टी (माओवादी)":                                          "NCP",      # old Maoist Centre spelling
    "नेपाल कम्युनिष्ट पार्टी (माओवादी)":                                          "NCP",      # alternate spelling
    "नेपाल कम्युनिष्ट पार्टी (माओवादी केन्द्र)":                                  "NCP",      # another variant
    "नेकपा (एकीकृत समाजवादी)":                                                    "CPN-US",
    "नेपाल कम्युनिष्ट पार्टी (एकीकृत समाजवादी)":                                  "CPN-US",
    "राष्ट्रिय स्वतन्त्र पार्टी":                                                  "RSP",
    "राष्ट्रिय प्रजातन्त्र पार्टी":                                                "RPP",
    "जनता समाजवादी पार्टी, नेपाल":                                                 "JSP",
    "जनमत पार्टी":                                                                  "JMP",
    "नागरिक उन्मुक्ति पार्टी, नेपाल":                                              "NUP",
    "नागरिक उन्मुक्ति पार्टी":                                                     "NUP",      # alternate
    "नेपाल मजदुर किसान पार्टी":                                                    "NMKP",
    "राष्ट्रिय जनमोर्चा":                                                           "RJM",
    "लोकतान्त्रिक समाजवादी पार्टी":                                                "LSP",
    # ── Mid-tier parties ──────────────────────────────────────────────────────
    "उज्यालो नेपाल पार्टी":                                                         "UNP",
    "श्रम संस्कृति पार्टी":                                                          "SSP",
    "नेपाल कम्युनिस्ट पार्टी (माओवादी)":                                           "CPN-M",    # separate from NCP merger
    "मंगोल नेशनल अर्गनाइजेसन":                                                     "MNO",
    "प्रगतिशील लोकतान्त्रिक पार्टी":                                               "PLP",
    "राष्ट्रिय मुक्ति पार्टी, नेपाल":                                              "RMP-N",
    "राष्ट्रिय जनता पार्टी नेपाल":                                                  "RJP-N",
    "आम जनता पार्टी":                                                               "AJP",
    # ── Smaller registered parties ────────────────────────────────────────────
    "नेपाल कम्युनिष्ट पार्टी (मार्क्सवादी-लेनिनवादी)":                            "CPN-ML",
    "नेकपा (मार्क्सवादी-लेनिनवादी)":                                               "CPN-ML",
    "नेपाल कम्युनिष्ट पार्टी (मार्क्सवादी)":                                       "CPN-M2",
    "नेपाल कम्युनिष्ट पार्टी कमार्क्सवादी (पुष्पलाल)":                             "CPN-PL",
    "नेपाल परिवार दल":                                                              "NPD",
    "नेपाल सद्भावना पार्टी":                                                        "NSP",
    "राष्ट्रिय साझा पार्टी":                                                        "RSjP",
    "संघीय लोकतान्त्रिक राष्ट्रिय मञ्च":                                           "FDNF",
    "संयुक्त नागरिक पार्टी":                                                        "UCP",
    "नेपाल जनता पार्टी":                                                            "NJP",
    "नेपाल जनमुक्ति पार्टी":                                                        "NJMP",
    "राष्ट्रिय परिवर्तन पार्टी":                                                    "RPP-N",
    "राष्ट्रिय जनमुक्ति पार्टी":                                                    "RJMP",
    "जय मातृभूमि पार्टी":                                                           "JMP2",
    "राष्ट्र निर्माण दल, नेपाल":                                                    "RND",
    "नेपाल संघीय समाजवादी पार्टी":                                                  "NFSP",
    "बहुजन एकता पार्टी, नेपाल":                                                     "BEP",
    "नेपाल जनसेवा पार्टी":                                                          "NJvP",
    "समावेशी समाजवादी पार्टी":                                                      "SSjP",
    "सार्वभौम नागरिक पार्टी":                                                       "SNP",
    "जन अधिकार पार्टी":                                                             "JAP",
    "नेपाल मानवतावादी पार्टी":                                                      "NMP",
    "नेपाल लोकतान्त्रिक पार्टी":                                                    "NLP",
    "नेपाली जनता दल":                                                               "NJD",
    "राष्ट्रिय एकता दल":                                                            "RED",
    "जनता लोकतान्त्रिक पार्टी, नेपाल":                                             "JLPN",
    "जनादेश पार्टी नेपाल":                                                          "JPN",
    "राष्ट्रिय जनमत पार्टी":                                                        "RJMP2",
    "पिपुल फर्स्ट पार्टी":                                                          "PFP",
    "राष्ट्रिय ऊर्जाशील पार्टी, नेपाल":                                             "RUPN",
    "नागरिक सर्वोच्चता पार्टी, नेपाल":                                              "NSPN",
    "नेपाल जनता संरक्षण पार्टी":                                                    "NJSP",
    "बहुजन शक्ति पार्टी":                                                           "BSP",
    "राष्ट्रिय मुक्ति आन्दोलन, नेपाल":                                             "RMAN",
    "गतिशील लोकतान्त्रिक पार्टी":                                                   "GDP",
    "प्रजातान्त्रिक पार्टी, नेपाल":                                                 "PPN",
    "त्रिमूल नेपाल":                                                                "TMN",
    "स्वाभिमान पार्टी":                                                             "SWP",
    "युनाइटेड नेपाल डेमोक्रेटिक पार्टी":                                           "UNDP",
    "इतिहासिक जनता पार्टी":                                                         "IJP",
    "राष्ट्रिय नागरिक पार्टी":                                                      "RNP",
    "नेपाल मातृभूमि पार्टी":                                                        "NMP2",
    "गान्धीवादी पार्टी, नेपाल":                                                     "GPN",
    "मधेशी जनअधिकार फोरम":                                                         "MJF",
    "हाम्रो नेपाली पार्टी":                                                         "HNP",
    "मितेरी पार्टी नेपाल":                                                          "MPN",
    "नेशनल रिपब्लिक नेपाल":                                                        "NRN",
    "नेकपा (एकीकृत) / नेपाल कम्युनिष्ट पार्टी (संयुक्त)":                         "CPN-U",
    "नेपाल कम्युनिष्ट पार्टी (संयुक्त)":                                            "CPN-U",
    "नेपालका लागि नेपाली पार्टी":                                                   "NPN",
    "नेपाली जनश्रमदान संस्कृति पार्टी":                                             "NJSKP",
    # ── Independent ───────────────────────────────────────────────────────────
    "स्वतन्त्र":                                                                    "IND",
}


def map_party_key(party_name: str) -> str:
    """Map upstream PoliticalPartyName to a frontend PartyKey.
    Falls back to the Nepali name itself so no party is lost in an OTH bucket."""
    name = party_name.strip()
    return PARTY_MAP.get(name, name)


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


def _district_en(np_name: str, state_id: int) -> str:
    return district_name_en(np_name, state_id)


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
    """Derive a snapshot dict from a list of ConstituencyResult dicts.
    The seat_tally is built dynamically — every party gets its own entry."""
    seat_tally: dict[str, dict[str, int]] = {}
    declared = 0
    for c in constituencies:
        if c["status"] == "DECLARED" and c.get("candidates"):
            declared += 1
            # Use isWinner flag first; fall back to highest vote-getter
            winners = [cand for cand in c["candidates"] if cand.get("isWinner")]
            winner = winners[0] if winners else max(c["candidates"], key=lambda x: x["votes"])
            # Prefer the mapped abbreviation key; fall back to raw partyName
            key = map_party_key(winner.get("partyName", "")) or winner.get("partyId", "UNK")
            if key not in seat_tally:
                seat_tally[key] = {"fptp": 0, "pr": 0}
            seat_tally[key]["fptp"] += 1

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
