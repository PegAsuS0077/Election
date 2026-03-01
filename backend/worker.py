"""
worker.py — Background scraper worker for the Nepal Election Live Vote Counter.

Architecture (spike-safe):
  Every 30 s:
    1. Fetch the upstream election JSON from result.election.gov.np
    2. Normalise + aggregate into snapshot / constituencies / parties
    3. Upload three static JSON files to Cloudflare R2 (S3-compatible):
         snapshot.json
         constituencies.json
         parties.json

No HTTP server. No WebSocket. No database.
The frontend reads these files directly from the R2 public CDN URL.

Required environment variables:
  R2_ACCOUNT_ID
  R2_ACCESS_KEY_ID
  R2_SECRET_ACCESS_KEY
  R2_BUCKET
  R2_ENDPOINT          e.g. https://<account-id>.r2.cloudflarestorage.com

Optional:
  SCRAPE_INTERVAL_SECONDS  (default: 30)
"""

import asyncio
import logging
import os

from dotenv import load_dotenv

from scraper import scrape_results, build_snapshot_from_constituencies
from r2 import upload_json

load_dotenv()

SCRAPE_INTERVAL = int(os.getenv("SCRAPE_INTERVAL_SECONDS", "30"))

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
log = logging.getLogger(__name__)


def build_parties(constituencies: list[dict]) -> list[dict]:
    """
    Aggregate per-party seat counts and total votes from constituency results.
    Returns a list of party dicts sorted by seats won (descending).
    """
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


async def run_loop() -> None:
    log.info("Worker starting. Scrape interval: %ds", SCRAPE_INTERVAL)
    while True:
        try:
            log.info("Scraping upstream…")
            constituencies, snapshot = await scrape_results()

            parties = build_parties(constituencies)

            log.info(
                "Scraped: %d constituencies, %d declared, %d parties",
                len(constituencies),
                snapshot["declared_seats"],
                len(parties),
            )

            upload_json("snapshot.json",       snapshot)
            upload_json("constituencies.json", constituencies)
            upload_json("parties.json",        parties)

            log.info("Uploaded snapshot.json, constituencies.json, parties.json → R2")

        except Exception as exc:
            log.error("Scrape/upload cycle failed: %s", exc, exc_info=True)

        await asyncio.sleep(SCRAPE_INTERVAL)


if __name__ == "__main__":
    asyncio.run(run_loop())
