"""
scraper.py — Fetch and parse election results from result.election.gov.np.

Discovery (2026-03-05): The site now requires a browser session (ASP.NET cookie
+ CSRF token) to access the JSON data via SecureJson.ashx handler.
Primary endpoint: GET /Handlers/SecureJson.ashx?file=JSONFiles/ElectionResultCentral2082.txt
  - Requires: ASP.NET_SessionId cookie + CsrfToken cookie + X-CSRF-Token header
  - Returns a UTF-8 (BOM-prefixed) JSON array of 3,406 candidate records.
  - No pagination — always returns full dataset.
  - Update frequency: every ~30 s on election day.

Two-step fetch: GET the page first to establish session cookies, then GET data.
"""

import json
import os
import asyncio
import httpx
from datetime import datetime, timezone
from typing import Any

from district_names import district_name_en


# ── NEU English name lookup ───────────────────────────────────────────────────
# neu_candidates.json lives next to scraper.py in the backend/ directory.
# It is a copy of frontend/public/neu_candidates.json (committed to git).
# Maps CandidateID (int) → {"n": "English name", ...}
def _load_neu_lookup() -> dict[int, dict]:
    path = os.path.join(os.path.dirname(__file__), "neu_candidates.json")
    try:
        with open(path, encoding="utf-8") as f:
            records: list[dict] = json.load(f)
        return {r["id"]: r for r in records if "id" in r}
    except Exception:
        return {}

_NEU: dict[int, dict] = _load_neu_lookup()


# ── Upstream endpoint ────────────────────────────────────────────────────────
# Step 1: GET this page to establish ASP.NET session + CsrfToken cookies
SESSION_PAGE_URL = (
    "https://result.election.gov.np/ElectionResultCentral2082.aspx"
)
SESSION_BOOTSTRAP_URLS = (
    "https://result.election.gov.np/ElectionResultCentral2082.aspx",
    "https://result.election.gov.np/",
)
# Step 2: GET data via secure handler using session cookies
UPSTREAM_URL = (
    "https://result.election.gov.np/Handlers/SecureJson.ashx"
    "?file=JSONFiles/ElectionResultCentral2082.txt"
)
DIRECT_UPSTREAM_URL = "https://result.election.gov.np/JSONFiles/ElectionResultCentral2082.txt"
UPSTREAM_HOR_MERGE_URL = (
    "https://result.election.gov.np/Handlers/SecureJson.ashx"
    "?file=JSONFiles/Election2082/Common/HOR-T5Leader.json"
)
HOR_TOP5_REFERER_URL = "https://result.election.gov.np/FPTPWLChartResult2082.aspx"
_BASE_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/122.0.0.0 Safari/537.36"
    ),
    "Accept": "application/json, text/javascript, */*; q=0.01",
}
RETRYABLE_STATUS = {429, 500, 502, 503, 504, 520, 521, 522, 523, 524}
MAX_FETCH_ATTEMPTS = 3
RETRY_BACKOFF_SECONDS = 0.5
# Keep old name for backwards compat in tests
HEADERS = _BASE_HEADERS

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
    state_id = _state_id(record)
    const_id = _const_id(record)
    district_name = (record.get("DistrictName") or record.get("District") or "").strip()
    if state_id is None or const_id is None or not district_name:
        return ""
    return f"{state_id}-{district_name}-{const_id}"


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
    rank = _to_int(record.get("R"))
    if rank is None:
        rank = _to_int(record.get("Rank"))
    votes = _vote_total(record) or 0
    if rank == 1 and votes > 0:
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
    symbol_code = _to_int(rec.get("SYMBOLCODE"))
    if symbol_code is None:
        symbol_code = _to_int(rec.get("SymbolID"))
    if symbol_code is None:
        symbol_code = _to_int(rec.get("SymbolId"))
    if symbol_code is None:
        symbol_code = _to_int(rec.get("PartyID"))
    if symbol_code is None:
        symbol_code = _to_int(rec.get("PartyId"))
    if symbol_code is None:
        return "0"
    return str(symbol_code)


def _district_en(np_name: str, state_id: int) -> str:
    return district_name_en(np_name, state_id)


def _gender(rec: dict[str, Any]) -> str:
    return "F" if rec.get("Gender") == "महिला" else "M"


def _to_int(value: Any) -> int | None:
    if isinstance(value, bool):
        return None
    if isinstance(value, int):
        return value
    if isinstance(value, float):
        if not value.is_integer():
            return None
        return int(value)
    if isinstance(value, str):
        t = value.strip()
        if not t:
            return None
        try:
            return int(float(t))
        except ValueError:
            return None
    return None


def _state_id(rec: dict[str, Any]) -> int | None:
    state_id = _to_int(rec.get("STATE_ID"))
    if state_id is None:
        state_id = _to_int(rec.get("State"))
    return state_id


def _const_id(rec: dict[str, Any]) -> int | None:
    const_id = _to_int(rec.get("SCConstID"))
    if const_id is None:
        const_id = _to_int(rec.get("ScConstId"))
    return const_id


def _candidate_id(rec: dict[str, Any]) -> int | None:
    candidate_id = _to_int(rec.get("CandidateID"))
    if candidate_id is None:
        candidate_id = _to_int(rec.get("CandidateId"))
    return candidate_id


def _vote_total(rec: dict[str, Any]) -> int | None:
    votes = _to_int(rec.get("TotalVoteReceived"))
    if votes is None:
        votes = _to_int(rec.get("TotalVote"))
    return votes


def _merge_higher_votes(
    base_records: list[dict[str, Any]],
    fresher_rows: list[dict[str, Any]],
) -> dict[str, int]:
    fresher_vote_by_candidate: dict[int, int] = {}
    for row in fresher_rows:
        if not isinstance(row, dict):
            continue
        candidate_id = _to_int(row.get("CandidateID"))
        if candidate_id is None:
            candidate_id = _to_int(row.get("CandidateId"))
        votes = _to_int(row.get("TotalVoteReceived"))
        if votes is None:
            votes = _to_int(row.get("TotalVote"))
        if candidate_id is None or votes is None or votes < 0:
            continue
        prev = fresher_vote_by_candidate.get(candidate_id)
        if prev is None or votes > prev:
            fresher_vote_by_candidate[candidate_id] = votes

    upgraded = 0
    seen_base_candidate_ids: set[int] = set()
    for row in base_records:
        candidate_id = _to_int(row.get("CandidateID"))
        if candidate_id is None:
            continue
        seen_base_candidate_ids.add(candidate_id)
        fresher_votes = fresher_vote_by_candidate.get(candidate_id)
        if fresher_votes is None:
            continue

        current_votes = _to_int(row.get("TotalVoteReceived"))
        if current_votes is None:
            current_votes = 0
        if fresher_votes > current_votes:
            row["TotalVoteReceived"] = fresher_votes
            upgraded += 1

    missing_candidates = sum(
        1 for candidate_id in fresher_vote_by_candidate if candidate_id not in seen_base_candidate_ids
    )
    return {
        "upgraded": upgraded,
        "missing_candidates": missing_candidates,
        "usable_rows": len(fresher_vote_by_candidate),
    }


def _decode_json_bytes(raw: bytes, label: str) -> Any:
    if raw.startswith(b"\xef\xbb\xbf"):   # strip UTF-8 BOM
        raw = raw[3:]
    try:
        return json.loads(raw.decode("utf-8"))
    except Exception as exc:
        raise RuntimeError(f"{label} returned invalid JSON") from exc


async def _get_with_retry(
    client: httpx.AsyncClient,
    url: str,
    *,
    headers: dict[str, str],
    label: str,
) -> httpx.Response:
    last_error: Exception | None = None
    for attempt in range(1, MAX_FETCH_ATTEMPTS + 1):
        try:
            resp = await client.get(url, headers=headers)
        except Exception as exc:
            last_error = exc
            if attempt < MAX_FETCH_ATTEMPTS:
                await asyncio.sleep(RETRY_BACKOFF_SECONDS * (2 ** (attempt - 1)))
                continue
            raise RuntimeError(f"{label} failed after retries") from exc

        if resp.status_code in RETRYABLE_STATUS and attempt < MAX_FETCH_ATTEMPTS:
            await asyncio.sleep(RETRY_BACKOFF_SECONDS * (2 ** (attempt - 1)))
            continue

        try:
            resp.raise_for_status()
        except Exception as exc:
            raise RuntimeError(
                f"{label} returned HTTP {resp.status_code}: {resp.reason_phrase}"
            ) from exc
        return resp

    if last_error:
        raise RuntimeError(f"{label} failed after retries") from last_error
    raise RuntimeError(f"{label} failed after retries")


async def _establish_session(client: httpx.AsyncClient) -> tuple[str, str]:
    last_error: Exception | None = None
    for bootstrap_url in SESSION_BOOTSTRAP_URLS:
        try:
            await _get_with_retry(
                client,
                bootstrap_url,
                headers={
                    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                },
                label=f"session bootstrap via {bootstrap_url}",
            )
        except Exception as exc:
            last_error = exc
            continue

        session_id = client.cookies.get("ASP.NET_SessionId", "")
        csrf = client.cookies.get("CsrfToken", "")
        if session_id and csrf:
            return csrf, bootstrap_url

    if last_error is not None:
        raise RuntimeError("failed to establish upstream session") from last_error
    raise RuntimeError("failed to establish upstream session: cookies missing")


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
        if not cid:
            continue
        grouped.setdefault(cid, []).append(rec)

    results: list[dict[str, Any]] = []
    now = datetime.now(timezone.utc).isoformat()

    for cid, recs in grouped.items():
        first = recs[0]
        state_id    = _state_id(first) or 0
        district_np = first.get("DistrictName") or first.get("District") or ""
        district_en = _district_en(district_np, state_id)
        const_num   = _const_id(first) or 0
        province    = _state_id_to_province_key(state_id)

        candidates: list[dict[str, Any]] = []
        for rec in recs:
            name_np = rec.get("CandidateName") or ""
            cid_int = _candidate_id(rec)
            neu = _NEU.get(cid_int) if cid_int is not None else None
            name_en = neu["n"] if neu and neu.get("n") else name_np
            cand: dict[str, Any] = {
                "candidateId": cid_int,
                "name":        name_en,
                "nameNp":      name_np,
                "partyId":     _derive_party_id(rec),
                "partyName":   rec.get("PoliticalPartyName") or "",
                "votes":       _vote_total(rec) or 0,
                "gender":      _gender(rec),
                "isWinner":    is_winner(rec),
            }
            # Optional biographical fields — omit when absent or placeholder
            age = _to_int(rec.get("AGE_YR"))
            if age is None:
                age = _to_int(rec.get("Age"))
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
    Fetch the full candidate+results array from the upstream secure JSON handler.

    Requires a two-step session establishment:
    1. GET the results page to receive ASP.NET_SessionId + CsrfToken cookies.
    2. GET the data endpoint with those cookies + X-CSRF-Token header.
    """
    async with httpx.AsyncClient(
        timeout=30.0,
        follow_redirects=True,
        headers=_BASE_HEADERS,
    ) as client:
        used_secure = False
        csrf = ""

        try:
            # Step 1 — establish session
            csrf, bootstrap_url = await _establish_session(client)
            # Step 2 — fetch data using session cookies
            resp = await _get_with_retry(
                client,
                url,
                headers={
                    "X-CSRF-Token": csrf,
                    "X-Requested-With": "XMLHttpRequest",
                    "Referer": bootstrap_url,
                },
                label="secure json GET",
            )
            payload = _decode_json_bytes(resp.content, "secure json GET")
            if not isinstance(payload, list):
                raise RuntimeError("secure json GET returned non-list payload")
            candidates = payload
            used_secure = True
        except Exception as secure_exc:
            # Keep this fallback for resilience when the secure handler is flaky.
            # Avoid swallowing errors for custom URLs.
            if url != UPSTREAM_URL:
                raise
            print(f"[scraper] secure handler failed, trying direct JSON fallback: {secure_exc}")
            fallback_resp = await _get_with_retry(
                client,
                DIRECT_UPSTREAM_URL,
                headers={
                    "Referer": SESSION_PAGE_URL,
                },
                label="direct json GET",
            )
            fallback_payload = _decode_json_bytes(fallback_resp.content, "direct json GET")
            if not isinstance(fallback_payload, list):
                raise RuntimeError("direct json GET returned non-list payload")
            candidates = fallback_payload

        # Optional fast streams from the FPTP win/lead chart.
        # Rule: match candidate by ID and keep whichever vote total is higher.
        merged_updates = 0
        merged_rows = 0
        merged_missing = 0
        if used_secure and csrf:
            try:
                top5_resp = await _get_with_retry(
                    client,
                    UPSTREAM_HOR_MERGE_URL,
                    headers={
                        "X-CSRF-Token": csrf,
                        "X-Requested-With": "XMLHttpRequest",
                        "Referer": HOR_TOP5_REFERER_URL,
                    },
                    label="optional HOR leader feed",
                )
                top5_rows = _decode_json_bytes(top5_resp.content, "optional HOR leader feed")
                if isinstance(top5_rows, list) and top5_rows:
                    stats = _merge_higher_votes(candidates, top5_rows)
                    merged_updates += stats["upgraded"]
                    merged_rows += stats["usable_rows"]
                    merged_missing += stats["missing_candidates"]
            except Exception:
                pass

        if merged_rows > 0:
            extra = f", {merged_missing} rows missing in primary feed" if merged_missing > 0 else ""
            print(
                "[scraper] optional HOR leader feed merged: "
                f"{merged_updates} candidate vote updates from "
                f"{merged_rows} usable rows{extra}"
            )

        return candidates


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
