"""
Tests for worker.py — build_parties aggregation logic.
R2 upload is tested via a mock to avoid real network calls.
"""

import pytest
from unittest.mock import patch, call
from worker import build_parties, run_loop


# ── build_parties ─────────────────────────────────────────────────────────────

def test_build_parties_counts_seats_for_declared():
    constituencies = [
        {
            "status": "DECLARED",
            "candidates": [
                {"party": "NC",  "votes": 8000},
                {"party": "RSP", "votes": 5000},
            ],
        }
    ]
    parties = build_parties(constituencies)
    nc = next(p for p in parties if p["party"] == "NC")
    assert nc["seatsWon"] == 1
    rsp = next(p for p in parties if p["party"] == "RSP")
    assert rsp["seatsWon"] == 0


def test_build_parties_no_seat_for_counting():
    constituencies = [
        {
            "status": "COUNTING",
            "candidates": [
                {"party": "NC",      "votes": 3000},
                {"party": "CPN-UML", "votes": 2000},
            ],
        }
    ]
    parties = build_parties(constituencies)
    for p in parties:
        assert p["seatsWon"] == 0


def test_build_parties_aggregates_total_votes():
    constituencies = [
        {
            "status": "DECLARED",
            "candidates": [
                {"party": "NC",  "votes": 5000},
                {"party": "NC",  "votes": 3000},
            ],
        },
        {
            "status": "COUNTING",
            "candidates": [
                {"party": "NC",  "votes": 2000},
            ],
        },
    ]
    parties = build_parties(constituencies)
    nc = next(p for p in parties if p["party"] == "NC")
    assert nc["totalVotes"] == 10000


def test_build_parties_sorted_by_seats_then_votes():
    constituencies = [
        {
            "status": "DECLARED",
            "candidates": [
                {"party": "NC",      "votes": 1000},
                {"party": "CPN-UML", "votes": 500},
            ],
        },
        {
            "status": "DECLARED",
            "candidates": [
                {"party": "NC",  "votes": 2000},
                {"party": "RSP", "votes": 900},
            ],
        },
    ]
    parties = build_parties(constituencies)
    # NC has 2 seats — should be first
    assert parties[0]["party"] == "NC"
    assert parties[0]["seatsWon"] == 2


def test_build_parties_empty_input():
    assert build_parties([]) == []


def test_build_parties_skips_constituencies_with_no_candidates():
    constituencies = [{"status": "DECLARED", "candidates": []}]
    # max() on empty sequence would raise — must handle gracefully
    parties = build_parties(constituencies)
    assert parties == []


# ── run_loop uploads three files ──────────────────────────────────────────────

@pytest.mark.asyncio
async def test_run_loop_uploads_three_files():
    fake_constituencies = [
        {
            "code": "1-ताप्लेजुङ-1",
            "name": "Taplejung-1",
            "province": "Koshi",
            "district": "Taplejung",
            "status": "DECLARED",
            "last_updated": "2026-03-05T10:00:00+00:00",
            "candidates": [
                {"party": "NC", "votes": 5000, "rank": 1, "status": "W"},
            ],
        }
    ]
    fake_snapshot = {
        "taken_at": "2026-03-05T10:00:00+00:00",
        "total_seats": 275,
        "declared_seats": 1,
        "seat_tally": {"NC": {"fptp": 1, "pr": 0}},
    }

    uploaded: list[str] = []

    def fake_upload(filename, _data):
        uploaded.append(filename)

    with patch("worker.scrape_results", return_value=(fake_constituencies, fake_snapshot)), \
         patch("worker.upload_json", side_effect=fake_upload), \
         patch("asyncio.sleep", side_effect=InterruptedError):
        try:
            await run_loop()
        except InterruptedError:
            pass

    assert "snapshot.json" in uploaded
    assert "constituencies.json" in uploaded
    assert "parties.json" in uploaded
