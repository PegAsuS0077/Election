import pytest
from database import (
    init_db,
    save_snapshot,
    save_constituency_results,
    get_latest_snapshot,
    get_constituencies,
)


@pytest.fixture
def db():
    conn = init_db(":memory:")
    yield conn
    conn.close()


def test_init_db_creates_tables(db):
    cursor = db.execute("SELECT name FROM sqlite_master WHERE type='table'")
    tables = {row[0] for row in cursor}
    assert "snapshots" in tables
    assert "constituencies" in tables
    assert "candidates" in tables


def test_save_and_get_snapshot(db):
    snap = {
        "taken_at": "2026-03-05T10:00:00+00:00",
        "total_seats": 275,
        "declared_seats": 10,
        "seat_tally": {
            "NC": {"fptp": 5, "pr": 3},
            "CPN-UML": {"fptp": 3, "pr": 2},
            "NCP": {"fptp": 1, "pr": 1},
            "RSP": {"fptp": 1, "pr": 0},
            "OTH": {"fptp": 0, "pr": 0},
        },
    }
    save_snapshot(db, snap)
    result = get_latest_snapshot(db)
    assert result["declaredSeats"] == 10
    assert result["seatTally"]["NC"]["fptp"] == 5
    assert result["seatTally"]["CPN-UML"]["pr"] == 2


def test_get_latest_snapshot_returns_defaults_when_empty(db):
    result = get_latest_snapshot(db)
    assert result["totalSeats"] == 275
    assert result["declaredSeats"] == 0
    assert result["seatTally"]["NC"]["fptp"] == 0


def test_save_and_get_constituencies(db):
    data = [
        {
            "code": "KTM-3",
            "name": "Kathmandu-3",
            "province": "Bagmati",
            "district": "Kathmandu",
            "status": "COUNTING",
            "last_updated": "2026-03-05T10:00:00+00:00",
            "candidates": [
                {"name": "Alice", "party": "NC", "votes": 5000},
                {"name": "Bob", "party": "RSP", "votes": 4500},
            ],
        }
    ]
    save_constituency_results(db, data)
    results = get_constituencies(db)
    assert len(results) == 1
    assert results[0]["code"] == "KTM-3"
    assert len(results[0]["candidates"]) == 2
    assert results[0]["candidates"][0]["votes"] == 5000


def test_upsert_updates_existing_constituency(db):
    row = {
        "code": "KTM-3",
        "name": "Kathmandu-3",
        "province": "Bagmati",
        "district": "Kathmandu",
        "status": "COUNTING",
        "last_updated": "2026-03-05T10:00:00+00:00",
        "candidates": [{"name": "Alice", "party": "NC", "votes": 5000}],
    }
    save_constituency_results(db, [row])
    row["status"] = "DECLARED"
    row["candidates"][0]["votes"] = 9000
    save_constituency_results(db, [row])
    results = get_constituencies(db)
    assert len(results) == 1
    assert results[0]["status"] == "DECLARED"
    assert results[0]["candidates"][0]["votes"] == 9000
