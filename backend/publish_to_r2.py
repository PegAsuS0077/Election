"""
publish_to_r2.py — Single-shot script run by GitHub Actions every minute.

Flow:
  1. Fetch upstream election JSON from result.election.gov.np (server-side — no CORS)
  2. Validate minimum record count
  3. Parse raw records directly into the exact JSON shapes the frontend expects:
       constituencies.json  →  ConstituencyResult[]
       snapshot.json        →  Snapshot
       parties.json         →  { party, seatsWon, totalVotes }[]
  4. Upload to Cloudflare R2

The parser here mirrors frontend/src/lib/parseUpstreamData.ts exactly.
Do NOT use scraper.py's parse_candidates_json — its output shape is wrong for
direct frontend consumption (snake_case keys, missing fields, wrong partyId).

Required environment variables (set as GitHub Actions secrets):
  R2_ACCOUNT_ID         Cloudflare account ID (hex string)
  R2_ACCESS_KEY_ID      R2 API token — Access Key ID
  R2_SECRET_ACCESS_KEY  R2 API token — Secret Access Key
  R2_BUCKET             R2 bucket name

Exit codes:
  0 — success
  1 — fetch / validation / parse / upload failed
"""

import asyncio
import json
import os
import sys
from datetime import datetime, timezone
from typing import Any

import boto3
import httpx
from botocore.config import Config

# ── Config ────────────────────────────────────────────────────────────────────

UPSTREAM_URL = (
    "https://result.election.gov.np/JSONFiles/ElectionResultCentral2082.txt"
)
HEADERS = {
    "User-Agent": "Mozilla/5.0 (compatible; NepalElectionBot/1.0; +https://nepalvotes.live)",
    "Accept": "application/json, text/plain, */*",
}
MIN_RECORDS = 3000
CACHE_CONTROL = "public, max-age=25"

# ── Province + district lookup tables (mirrors parseUpstreamData.ts) ──────────

STATE_TO_PROVINCE: dict[int, str] = {
    1: "Koshi",
    2: "Madhesh",
    3: "Bagmati",
    4: "Gandaki",
    5: "Lumbini",
    6: "Karnali",
    7: "Sudurpashchim",
}

PROVINCE_EN: dict[int, str] = {
    1: "Koshi", 2: "Madhesh", 3: "Bagmati",
    4: "Gandaki", 5: "Lumbini", 6: "Karnali", 7: "Sudurpashchim",
}

DISTRICT_EN: dict[str, str] = {
    "ताप्लेजुङ": "Taplejung",      "पाँचथर": "Panchthar",        "इलाम": "Ilam",
    "सङ्खुवासभा": "Sankhuwasabha", "भोजपुर": "Bhojpur",           "धनकुटा": "Dhankuta",
    "तेह्रथुम": "Terhathum",       "खोटाङ": "Khotang",            "सोलुखुम्बु": "Solukhumbu",
    "ओखलढुङ्गा": "Okhaldhunga",    "झापा": "Jhapa",               "मोरङ": "Morang",
    "सुनसरी": "Sunsari",           "उदयपुर": "Udayapur",          "सप्तरी": "Saptari",
    "सिरहा": "Siraha",             "धनुषा": "Dhanusha",           "महोत्तरी": "Mahottari",
    "सर्लाही": "Sarlahi",          "रौतहट": "Rautahat",           "बारा": "Bara",
    "पर्सा": "Parsa",              "सिन्धुली": "Sindhuli",        "रामेछाप": "Ramechhap",
    "दोलखा": "Dolakha",            "सिन्धुपाल्चोक": "Sindhupalchok",
    "काभ्रेपलाञ्चोक": "Kavrepalanchok",
    "भक्तपुर": "Bhaktapur",        "ललितपुर": "Lalitpur",         "काठमाडौँ": "Kathmandu",
    "काठमाडौं": "Kathmandu",
    "नुवाकोट": "Nuwakot",          "मकवानपुर": "Makwanpur",       "चितवन": "Chitwan",
    "गोर्खा": "Gorkha",            "लमजुङ": "Lamjung",            "तनहुँ": "Tanahu",
    "कास्की": "Kaski",             "स्याङ्जा": "Syangja",         "पर्वत": "Parbat",
    "बाग्लुङ": "Baglung",          "म्याग्दी": "Myagdi",          "नवलपुर": "Nawalpur",
    "मुस्ताङ": "Mustang",          "मनाङ": "Manang",
    "रूपन्देही": "Rupandehi",      "कपिलवस्तु": "Kapilvastu",     "अर्घाखाँची": "Arghakhanchi",
    "गुल्मी": "Gulmi",             "पाल्पा": "Palpa",             "दाङ": "Dang",
    "बाँके": "Banke",              "बर्दिया": "Bardiya",           "रोल्पा": "Rolpa",
    "रुकुम पश्चिम": "Rukum-West",  "प्युठान": "Pyuthan",
    "डोल्पा": "Dolpa",             "मुगु": "Mugu",                "हुम्ला": "Humla",
    "जुम्ला": "Jumla",             "कालिकोट": "Kalikot",          "दैलेख": "Dailekh",
    "जाजरकोट": "Jajarkot",         "सल्यान": "Salyan",            "रुकुम पूर्व": "Rukum-East",
    "सुर्खेत": "Surkhet",
    "बाजुरा": "Bajura",            "बझाङ": "Bajhang",             "दार्चुला": "Darchula",
    "बैतडी": "Baitadi",            "डडेलधुरा": "Dadeldhura",      "डोटी": "Doti",
    "अछाम": "Achham",              "कैलाली": "Kailali",           "कञ्चनपुर": "Kanchanpur",
}

INDEPENDENT_NP = "स्वतन्त्र"


# ── Helpers (mirror parseUpstreamData.ts) ─────────────────────────────────────

def district_en(np_name: str, state_id: int) -> str:
    return DISTRICT_EN.get(np_name, f"{PROVINCE_EN.get(state_id, 'Province')}-District")


def derive_party_id(rec: dict[str, Any]) -> str:
    """String(SYMBOLCODE), or 'IND' for independents."""
    if rec.get("PoliticalPartyName") == INDEPENDENT_NP:
        return "IND"
    return str(rec.get("SYMBOLCODE", "0"))


def is_winner(rec: dict[str, Any]) -> bool:
    if rec.get("E_STATUS") == "W":
        return True
    if rec.get("R") == 1 and rec.get("TotalVoteReceived", 0) > 0:
        return True
    return False


def map_gender(g: str | None) -> str:
    return "F" if g == "महिला" else "M"


def optional_str(val: Any, empty_sentinels: tuple = ("-", "0", "")) -> str | None:
    if val is None:
        return None
    s = str(val).strip()
    return s if s not in empty_sentinels else None


# ── Parser (produces ConstituencyResult[] matching frontend types.ts) ──────────

def parse_raw_records(records: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """
    Converts the flat upstream candidate array into ConstituencyResult[].

    Output shape matches frontend ConstituencyResult type exactly:
      code, name, nameNp, province, district, districtNp,
      status, lastUpdated, votesCast, candidates[]

    Each candidate matches frontend Candidate type:
      candidateId, name, nameNp, partyName, partyId,
      votes, gender, isWinner, + optional bio fields
    """
    grouped: dict[str, list[dict[str, Any]]] = {}
    for rec in records:
        key = f"{rec['STATE_ID']}-{rec['DistrictName']}-{rec['SCConstID']}"
        grouped.setdefault(key, []).append(rec)

    now = datetime.now(timezone.utc).isoformat()
    results: list[dict[str, Any]] = []

    for key, recs in grouped.items():
        first = recs[0]
        state_id   = first["STATE_ID"]
        province   = STATE_TO_PROVINCE.get(state_id)
        if not province:
            continue

        district_np = first["DistrictName"]
        district    = district_en(district_np, state_id)
        const_num   = first["SCConstID"]

        has_winner = any(is_winner(r) for r in recs)
        has_votes  = any(r.get("TotalVoteReceived", 0) > 0 for r in recs)
        status = "DECLARED" if has_winner else ("COUNTING" if has_votes else "PENDING")

        candidates: list[dict[str, Any]] = []
        for rec in recs:
            cand: dict[str, Any] = {
                "candidateId": rec.get("CandidateID"),
                "nameNp":      rec.get("CandidateName", ""),
                "name":        rec.get("CandidateName", ""),
                "partyName":   rec.get("PoliticalPartyName", ""),
                "partyId":     derive_party_id(rec),
                "votes":       rec.get("TotalVoteReceived", 0),
                "gender":      map_gender(rec.get("Gender")),
                "isWinner":    is_winner(rec),
            }
            # Biographical fields — only include when present and meaningful
            if (v := optional_str(rec.get("AGE_YR"))):       cand["age"]           = int(v)
            if (v := optional_str(rec.get("FATHER_NAME"))): cand["fatherName"]    = v
            if (v := optional_str(rec.get("SPOUCE_NAME"))): cand["spouseName"]    = v
            if (v := optional_str(rec.get("QUALIFICATION"))): cand["qualification"] = v
            if (v := optional_str(rec.get("NAMEOFINST"))):  cand["institution"]   = v
            if (v := optional_str(rec.get("EXPERIENCE"))):  cand["experience"]    = v
            if (v := optional_str(rec.get("ADDRESS"))):     cand["address"]       = v
            candidates.append(cand)

        votes_cast = sum(c["votes"] for c in candidates)

        results.append({
            "province":    province,
            "district":    district,
            "districtNp":  district_np,
            "code":        key,
            "name":        f"{district}-{const_num}",
            "nameNp":      f"{district_np} क्षेत्र नं. {const_num}",
            "status":      status,
            "lastUpdated": now,
            "votesCast":   votes_cast,
            "candidates":  candidates,
        })

    # Sort: province → district → name (mirrors TypeScript sort)
    results.sort(key=lambda r: (r["province"], r["district"], r["name"]))
    return results


# ── Snapshot builder ───────────────────────────────────────────────────────────

def build_snapshot(constituencies: list[dict[str, Any]]) -> dict[str, Any]:
    """
    Produces a Snapshot matching frontend types.ts:
      totalSeats, declaredSeats, lastUpdated, seatTally
    seatTally keys are partyId strings (SYMBOLCODE or "IND").
    """
    tally: dict[str, dict[str, int]] = {}
    declared = 0

    for c in constituencies:
        if c["status"] != "DECLARED" or not c["candidates"]:
            continue
        declared += 1
        winner = max(c["candidates"], key=lambda x: x["votes"])
        pid = winner["partyId"]
        if pid not in tally:
            tally[pid] = {"fptp": 0, "pr": 0}
        tally[pid]["fptp"] += 1

    return {
        "totalSeats":    275,
        "declaredSeats": declared,
        "lastUpdated":   datetime.now(timezone.utc).isoformat(),
        "seatTally":     tally,
    }


# ── Party aggregation ──────────────────────────────────────────────────────────

def build_parties(constituencies: list[dict[str, Any]]) -> list[dict[str, Any]]:
    seat_counts: dict[str, int] = {}
    total_votes: dict[str, int] = {}

    for c in constituencies:
        for cand in c.get("candidates", []):
            pid = cand["partyId"]
            total_votes[pid] = total_votes.get(pid, 0) + cand["votes"]
        if c["status"] == "DECLARED" and c.get("candidates"):
            winner = max(c["candidates"], key=lambda x: x["votes"])
            pid = winner["partyId"]
            seat_counts[pid] = seat_counts.get(pid, 0) + 1

    all_pids = set(seat_counts) | set(total_votes)
    parties = [
        {"party": p, "seatsWon": seat_counts.get(p, 0), "totalVotes": total_votes.get(p, 0)}
        for p in all_pids
    ]
    parties.sort(key=lambda x: (-x["seatsWon"], -x["totalVotes"]))
    return parties


# ── Fetch ─────────────────────────────────────────────────────────────────────

async def fetch_raw(url: str) -> list[dict[str, Any]]:
    async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
        resp = await client.get(url, headers=HEADERS)
        resp.raise_for_status()
        raw = resp.content
        if raw.startswith(b"\xef\xbb\xbf"):  # strip UTF-8 BOM
            raw = raw[3:]
        return json.loads(raw.decode("utf-8"))


# ── R2 upload ─────────────────────────────────────────────────────────────────

def make_r2_client():
    account_id = os.environ["R2_ACCOUNT_ID"]
    return boto3.client(
        "s3",
        endpoint_url=f"https://{account_id}.r2.cloudflarestorage.com",
        aws_access_key_id=os.environ["R2_ACCESS_KEY_ID"],
        aws_secret_access_key=os.environ["R2_SECRET_ACCESS_KEY"],
        config=Config(signature_version="s3v4"),
        region_name="auto",
    )


def upload_json(client, bucket: str, filename: str, data: object) -> None:
    body = json.dumps(data, ensure_ascii=False).encode("utf-8")
    client.put_object(
        Bucket=bucket,
        Key=filename,
        Body=body,
        ContentType="application/json",
        CacheControl=CACHE_CONTROL,
    )
    print(f"  ✓ {filename} ({len(body):,} bytes)")


# ── Main ──────────────────────────────────────────────────────────────────────

def main() -> int:
    print(f"[{datetime.now(timezone.utc).isoformat()}] publish_to_r2 starting")

    # 1. Fetch
    print(f"  fetching {UPSTREAM_URL} …")
    try:
        raw_records = asyncio.run(fetch_raw(UPSTREAM_URL))
    except Exception as exc:
        print(f"  ERROR fetch: {exc}", file=sys.stderr)
        return 1

    # 2. Validate
    n = len(raw_records)
    print(f"  fetched {n:,} records")
    if n < MIN_RECORDS:
        print(f"  ERROR: only {n} records (expected ≥ {MIN_RECORDS}) — aborting", file=sys.stderr)
        return 1

    # 3. Parse into frontend-compatible shapes
    constituencies = parse_raw_records(raw_records)
    snapshot       = build_snapshot(constituencies)
    parties        = build_parties(constituencies)

    print(
        f"  parsed: {len(constituencies)} constituencies, "
        f"{snapshot['declaredSeats']} declared, {len(parties)} parties"
    )

    # 4. Upload
    bucket = os.environ["R2_BUCKET"]
    print(f"  uploading to R2 bucket '{bucket}' …")
    try:
        client = make_r2_client()
        upload_json(client, bucket, "snapshot.json",       snapshot)
        upload_json(client, bucket, "constituencies.json", constituencies)
        upload_json(client, bucket, "parties.json",        parties)
    except Exception as exc:
        print(f"  ERROR upload: {exc}", file=sys.stderr)
        return 1

    print("  done — all 3 files published successfully")
    return 0


if __name__ == "__main__":
    sys.exit(main())
