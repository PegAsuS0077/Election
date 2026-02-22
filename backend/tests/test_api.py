import pytest
from httpx import AsyncClient, ASGITransport
from database import init_db, save_snapshot, save_constituency_results
from main import create_app


@pytest.fixture
def db():
    conn = init_db(":memory:")
    save_snapshot(conn, {
        "taken_at": "2026-03-05T10:00:00+00:00",
        "total_seats": 275,
        "declared_seats": 3,
        "seat_tally": {
            "NC":      {"fptp": 2, "pr": 0},
            "CPN-UML": {"fptp": 1, "pr": 0},
            "NCP":     {"fptp": 0, "pr": 0},
            "RSP":     {"fptp": 0, "pr": 0},
            "OTH":     {"fptp": 0, "pr": 0},
        },
    })
    save_constituency_results(conn, [{
        "code": "KTM-1",
        "name": "Kathmandu-1",
        "province": "Bagmati",
        "district": "Kathmandu",
        "status": "DECLARED",
        "last_updated": "2026-03-05T10:00:00+00:00",
        "candidates": [
            {"name": "Alice", "party": "NC", "votes": 8000},
            {"name": "Bob",   "party": "RSP", "votes": 7000},
        ],
    }])
    yield conn
    conn.close()


@pytest.fixture
def app(db):
    return create_app(db, start_scraper=False)


@pytest.mark.asyncio
async def test_get_snapshot(app):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.get("/api/snapshot")
    assert resp.status_code == 200
    data = resp.json()
    assert data["totalSeats"] == 275
    assert data["declaredSeats"] == 3
    assert "seatTally" in data
    assert "NC" in data["seatTally"]
    assert data["seatTally"]["NC"]["fptp"] == 2


@pytest.mark.asyncio
async def test_get_constituencies(app):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.get("/api/constituencies")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
    assert len(data) == 1
    assert data[0]["code"] == "KTM-1"
    assert len(data[0]["candidates"]) == 2


@pytest.mark.asyncio
async def test_snapshot_returns_defaults_when_empty():
    empty_db = init_db(":memory:")
    app = create_app(empty_db, start_scraper=False)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.get("/api/snapshot")
    assert resp.status_code == 200
    assert resp.json()["declaredSeats"] == 0
    empty_db.close()


@pytest.mark.asyncio
async def test_constituencies_returns_empty_list_when_empty():
    empty_db = init_db(":memory:")
    app = create_app(empty_db, start_scraper=False)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.get("/api/constituencies")
    assert resp.status_code == 200
    assert resp.json() == []
    empty_db.close()
