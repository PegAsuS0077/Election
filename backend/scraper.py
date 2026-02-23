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


def is_winner(record: dict[str, Any]) -> bool:
    """
    Determine winner status from available fields.
    Pre-election: E_STATUS is null for all records.
    On election day, update logic as actual E_STATUS values appear.
    """
    if record.get("E_STATUS") is not None:
        return True  # any non-null status = declared
    if record.get("R") == 1 and record.get("TotalVoteReceived", 0) > 0:
        return True
    return False


def parse_candidates_json(raw_candidates: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """
    Transform the raw upstream candidate records into constituency-grouped results
    matching the shape consumed by the frontend API.

    Returns a list of constituency dicts, each with:
      code, name, province, district, status, last_updated, candidates[]
    """
    # Group candidates by composite constituency key
    constituencies: dict[str, dict[str, Any]] = {}

    for rec in raw_candidates:
        cid = constituency_id(rec)
        if cid not in constituencies:
            state_id = rec.get("STATE_ID", 0)
            district = rec.get("DistrictName", "")
            const_num = rec.get("SCConstID", 0)
            # Build a human-readable name; on election day the site may supply one
            name = f"Constituency {const_num}"

            constituencies[cid] = {
                "code":         cid,
                "name":         name,
                "province":     _state_id_to_province_key(state_id),
                "province_np":  rec.get("StateName", ""),
                "district":     district,
                "state_id":     state_id,
                "status":       "COUNTING",
                "last_updated": datetime.now(timezone.utc).isoformat(),
                "candidates":   [],
            }

        candidate = {
            "id":    rec.get("CandidateID"),
            "name":  rec.get("CandidateName", ""),
            "party": map_party_key(rec.get("PoliticalPartyName", "")),
            "votes": rec.get("TotalVoteReceived", 0),
            "rank":  rec.get("R", 1),
            "status": rec.get("E_STATUS"),
        }
        constituencies[cid]["candidates"].append(candidate)

    # Determine DECLARED status per constituency
    for c in constituencies.values():
        if any(is_winner(
            {"E_STATUS": cand["status"], "R": cand["rank"], "TotalVoteReceived": cand["votes"]}
        ) for cand in c["candidates"]):
            c["status"] = "DECLARED"

    return list(constituencies.values())


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
    """Derive a snapshot dict from a list of constituency results."""
    seat_tally: dict[str, dict[str, int]] = {
        k: {"fptp": 0, "pr": 0}
        for k in ["NC", "CPN-UML", "NCP", "RSP", "RPP", "JSP", "IND", "OTH"]
    }
    declared = 0
    for c in constituencies:
        if c["status"] == "DECLARED" and c.get("candidates"):
            declared += 1
            winner = max(c["candidates"], key=lambda x: x["votes"])
            party = winner["party"]
            if party in seat_tally:
                seat_tally[party]["fptp"] += 1
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
