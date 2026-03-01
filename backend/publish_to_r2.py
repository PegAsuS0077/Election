"""
publish_to_r2.py — Single-shot script run by GitHub Actions every minute.

Flow:
  1. Fetch upstream election JSON (UTF-8 BOM stripped)
  2. Validate minimum record count
  3. Parse into constituencies + snapshot + parties
  4. Upload snapshot.json / constituencies.json / parties.json to Cloudflare R2

Required environment variables (set as GitHub Actions secrets):
  R2_ACCOUNT_ID         Cloudflare account ID
  R2_ACCESS_KEY_ID      R2 API token — Access Key ID
  R2_SECRET_ACCESS_KEY  R2 API token — Secret Access Key
  R2_BUCKET             R2 bucket name

R2 endpoint is derived automatically:
  https://<R2_ACCOUNT_ID>.r2.cloudflarestorage.com

Exit codes:
  0 — success
  1 — upstream fetch / validation / upload failed
"""

import json
import os
import sys
from datetime import datetime, timezone

import boto3
import httpx
from botocore.config import Config

from scraper import (
    fetch_candidates,
    parse_candidates_json,
    build_snapshot_from_constituencies,
)

# ── Config ────────────────────────────────────────────────────────────────────

UPSTREAM_URL = (
    "https://result.election.gov.np/JSONFiles/ElectionResultCentral2082.txt"
)

# Minimum number of candidate records we expect. The full dataset has 3,406.
# If we get fewer than this the file is probably truncated — abort.
MIN_RECORDS = 3000

# Cache-Control sent with every uploaded file.
# 25 s < 60 s cron interval → clients never serve stale data for more than
# one missed cycle (max staleness = 25 s CDN + 60 s cron = ~85 s).
CACHE_CONTROL = "public, max-age=25"


# ── R2 client ─────────────────────────────────────────────────────────────────

def _make_r2_client():
    account_id  = os.environ["R2_ACCOUNT_ID"]
    access_key  = os.environ["R2_ACCESS_KEY_ID"]
    secret_key  = os.environ["R2_SECRET_ACCESS_KEY"]
    endpoint    = f"https://{account_id}.r2.cloudflarestorage.com"

    return boto3.client(
        "s3",
        endpoint_url=endpoint,
        aws_access_key_id=access_key,
        aws_secret_access_key=secret_key,
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
    print(f"  ✓ uploaded {filename} ({len(body):,} bytes)")


# ── Party aggregation ─────────────────────────────────────────────────────────

def build_parties(constituencies: list[dict]) -> list[dict]:
    """Aggregate per-party seat counts and total votes, sorted by seats won."""
    seat_counts: dict[str, int] = {}
    total_votes: dict[str, int] = {}

    for c in constituencies:
        if not c.get("candidates"):
            continue
        for cand in c["candidates"]:
            party = cand["party"]
            total_votes[party] = total_votes.get(party, 0) + cand.get("votes", 0)
        if c["status"] == "DECLARED":
            winner = max(c["candidates"], key=lambda x: x.get("votes", 0))
            party = winner["party"]
            seat_counts[party] = seat_counts.get(party, 0) + 1

    all_parties = set(seat_counts) | set(total_votes)
    parties = [
        {
            "party":      p,
            "seatsWon":   seat_counts.get(p, 0),
            "totalVotes": total_votes.get(p, 0),
        }
        for p in all_parties
    ]
    parties.sort(key=lambda x: (-x["seatsWon"], -x["totalVotes"]))
    return parties


# ── Main ──────────────────────────────────────────────────────────────────────

def main() -> int:
    run_at = datetime.now(timezone.utc).isoformat()
    print(f"[{run_at}] publish_to_r2 starting")

    # 1. Fetch
    print(f"  fetching {UPSTREAM_URL} …")
    try:
        import asyncio
        raw_candidates = asyncio.run(fetch_candidates(UPSTREAM_URL))
    except Exception as exc:
        print(f"  ERROR: upstream fetch failed: {exc}", file=sys.stderr)
        return 1

    # 2. Validate
    record_count = len(raw_candidates)
    print(f"  fetched {record_count:,} candidate records")
    if record_count < MIN_RECORDS:
        print(
            f"  ERROR: only {record_count} records — expected ≥ {MIN_RECORDS}. "
            "Upstream may be returning a truncated or error response. Aborting.",
            file=sys.stderr,
        )
        return 1

    # 3. Parse
    constituencies = parse_candidates_json(raw_candidates)
    snapshot       = build_snapshot_from_constituencies(constituencies)
    parties        = build_parties(constituencies)

    declared = snapshot["declared_seats"]
    print(
        f"  parsed: {len(constituencies)} constituencies, "
        f"{declared} declared, {len(parties)} parties"
    )

    # 4. Upload
    bucket = os.environ["R2_BUCKET"]
    print(f"  uploading to R2 bucket '{bucket}' …")
    try:
        client = _make_r2_client()
        upload_json(client, bucket, "snapshot.json",       snapshot)
        upload_json(client, bucket, "constituencies.json", constituencies)
        upload_json(client, bucket, "parties.json",        parties)
    except Exception as exc:
        print(f"  ERROR: R2 upload failed: {exc}", file=sys.stderr)
        return 1

    print(f"  done — all 3 files published successfully")
    return 0


if __name__ == "__main__":
    sys.exit(main())
