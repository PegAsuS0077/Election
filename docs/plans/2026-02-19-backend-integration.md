# Nepal Election Backend Integration Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a FastAPI backend with SQLite database, Playwright scraper for result.election.gov.np, WebSocket real-time updates, and wire the existing React frontend to live data instead of mock data.

**Architecture:** A FastAPI server hosts REST endpoints (`/api/snapshot`, `/api/constituencies`) and a WebSocket endpoint (`/ws`). A background asyncio task runs a Playwright scraper every 30 seconds, saves results to SQLite, and broadcasts updates to all connected WebSocket clients. The React frontend fetches initial data on mount and subscribes to WebSocket for live updates.

**Tech Stack:** Python 3.13, FastAPI 0.115, uvicorn, Playwright 1.49, sqlite3 (stdlib), pytest 8, pytest-asyncio 0.24, httpx 0.28 (testing); React 19 + TypeScript + Vite 7 (existing frontend, unchanged except wiring)

---

### Task 1: Backend Directory & Dependencies

**Files:**
- Create: `backend/requirements.txt`
- Create: `backend/.env`
- Create: `backend/pytest.ini`
- Create: `backend/tests/__init__.py` (empty)
- Create: `backend/__init__.py` (empty)

**Step 1: Create `backend/requirements.txt`**

```
fastapi==0.115.0
uvicorn[standard]==0.32.0
playwright==1.49.0
python-dotenv==1.0.1
httpx==0.28.0
pytest==8.3.4
pytest-asyncio==0.24.0
anyio==4.6.2
```

**Step 2: Create `backend/.env`**

```
DB_PATH=election.db
SCRAPE_URL=https://result.election.gov.np
SCRAPE_INTERVAL_SECONDS=30
```

**Step 3: Create `backend/pytest.ini`**

```ini
[pytest]
asyncio_mode = auto
```

**Step 4: Create empty `backend/__init__.py` and `backend/tests/__init__.py`**

Both files are empty (zero bytes). Just `touch` them.

**Step 5: Install dependencies**

Run from `backend/` (with virtualenv active):
```bash
cd /d/Teaching_Support/New_Project/backend
python -m venv venv
source venv/Scripts/activate
pip install -r requirements.txt
playwright install chromium
```

Expected: All packages install without errors; chromium downloads.

**Step 6: Commit**

```bash
git add backend/
git commit -m "chore: scaffold backend directory with Python dependencies"
```

---

### Task 2: Database Layer (TDD)

**Files:**
- Create: `backend/tests/test_database.py`
- Create: `backend/database.py`

**Step 1: Write the failing tests**

`backend/tests/test_database.py`:
```python
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
```

**Step 2: Run test to verify it fails**

```bash
cd /d/Teaching_Support/New_Project/backend
source venv/Scripts/activate
pytest tests/test_database.py -v
```

Expected: FAIL with `ModuleNotFoundError: No module named 'database'`

**Step 3: Implement `backend/database.py`**

```python
import sqlite3
from typing import Any


PARTY_COLS: dict[str, tuple[str, str]] = {
    "NC": ("nc_fptp", "nc_pr"),
    "CPN-UML": ("uml_fptp", "uml_pr"),
    "NCP": ("ncp_fptp", "ncp_pr"),
    "RSP": ("rsp_fptp", "rsp_pr"),
    "OTH": ("oth_fptp", "oth_pr"),
}

_SCHEMA = """
CREATE TABLE IF NOT EXISTS snapshots (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    taken_at       TEXT    NOT NULL,
    total_seats    INTEGER DEFAULT 275,
    declared_seats INTEGER DEFAULT 0,
    nc_fptp  INTEGER DEFAULT 0, nc_pr  INTEGER DEFAULT 0,
    uml_fptp INTEGER DEFAULT 0, uml_pr INTEGER DEFAULT 0,
    ncp_fptp INTEGER DEFAULT 0, ncp_pr INTEGER DEFAULT 0,
    rsp_fptp INTEGER DEFAULT 0, rsp_pr INTEGER DEFAULT 0,
    oth_fptp INTEGER DEFAULT 0, oth_pr INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS constituencies (
    code         TEXT PRIMARY KEY,
    name         TEXT NOT NULL,
    province     TEXT NOT NULL,
    district     TEXT NOT NULL,
    status       TEXT DEFAULT 'COUNTING',
    last_updated TEXT
);

CREATE TABLE IF NOT EXISTS candidates (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    constituency_code   TEXT    NOT NULL,
    name                TEXT    NOT NULL,
    party               TEXT    NOT NULL,
    votes               INTEGER DEFAULT 0,
    FOREIGN KEY (constituency_code) REFERENCES constituencies(code)
);
"""


def init_db(db_path: str) -> sqlite3.Connection:
    conn = sqlite3.connect(db_path, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.executescript(_SCHEMA)
    conn.commit()
    return conn


def save_snapshot(conn: sqlite3.Connection, snap: dict[str, Any]) -> None:
    t = snap["seat_tally"]
    conn.execute(
        """
        INSERT INTO snapshots (
            taken_at, total_seats, declared_seats,
            nc_fptp, nc_pr, uml_fptp, uml_pr,
            ncp_fptp, ncp_pr, rsp_fptp, rsp_pr,
            oth_fptp, oth_pr
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
        """,
        (
            snap["taken_at"], snap["total_seats"], snap["declared_seats"],
            t["NC"]["fptp"],     t["NC"]["pr"],
            t["CPN-UML"]["fptp"], t["CPN-UML"]["pr"],
            t["NCP"]["fptp"],    t["NCP"]["pr"],
            t["RSP"]["fptp"],    t["RSP"]["pr"],
            t["OTH"]["fptp"],    t["OTH"]["pr"],
        ),
    )
    conn.commit()


def get_latest_snapshot(conn: sqlite3.Connection) -> dict[str, Any]:
    row = conn.execute(
        "SELECT * FROM snapshots ORDER BY id DESC LIMIT 1"
    ).fetchone()
    if not row:
        return {
            "totalSeats": 275,
            "declaredSeats": 0,
            "lastUpdated": "",
            "seatTally": {k: {"fptp": 0, "pr": 0} for k in PARTY_COLS},
        }
    return {
        "totalSeats": row["total_seats"],
        "declaredSeats": row["declared_seats"],
        "lastUpdated": row["taken_at"],
        "seatTally": {
            "NC":      {"fptp": row["nc_fptp"],  "pr": row["nc_pr"]},
            "CPN-UML": {"fptp": row["uml_fptp"], "pr": row["uml_pr"]},
            "NCP":     {"fptp": row["ncp_fptp"], "pr": row["ncp_pr"]},
            "RSP":     {"fptp": row["rsp_fptp"], "pr": row["rsp_pr"]},
            "OTH":     {"fptp": row["oth_fptp"], "pr": row["oth_pr"]},
        },
    }


def save_constituency_results(
    conn: sqlite3.Connection, results: list[dict[str, Any]]
) -> None:
    for r in results:
        conn.execute(
            """
            INSERT INTO constituencies (code, name, province, district, status, last_updated)
            VALUES (?,?,?,?,?,?)
            ON CONFLICT(code) DO UPDATE SET
                status       = excluded.status,
                last_updated = excluded.last_updated
            """,
            (r["code"], r["name"], r["province"], r["district"],
             r["status"], r["last_updated"]),
        )
        conn.execute(
            "DELETE FROM candidates WHERE constituency_code=?", (r["code"],)
        )
        conn.executemany(
            "INSERT INTO candidates (constituency_code, name, party, votes) VALUES (?,?,?,?)",
            [(r["code"], c["name"], c["party"], c["votes"]) for c in r["candidates"]],
        )
    conn.commit()


def get_constituencies(conn: sqlite3.Connection) -> list[dict[str, Any]]:
    rows = conn.execute("SELECT * FROM constituencies").fetchall()
    out = []
    for row in rows:
        cands = conn.execute(
            "SELECT name, party, votes FROM candidates "
            "WHERE constituency_code=? ORDER BY votes DESC",
            (row["code"],),
        ).fetchall()
        out.append({
            "province":    row["province"],
            "district":    row["district"],
            "code":        row["code"],
            "name":        row["name"],
            "status":      row["status"],
            "lastUpdated": row["last_updated"],
            "candidates":  [
                {"name": c["name"], "party": c["party"], "votes": c["votes"]}
                for c in cands
            ],
        })
    return out
```

**Step 4: Run tests to verify they pass**

```bash
pytest tests/test_database.py -v
```

Expected: 5 tests PASS

**Step 5: Commit**

```bash
git add backend/database.py backend/tests/test_database.py backend/tests/__init__.py backend/__init__.py backend/pytest.ini
git commit -m "feat: add SQLite database layer with constituency and snapshot tables"
```

---

### Task 3: Playwright Scraper (TDD with mock HTML)

**Files:**
- Create: `backend/tests/fixtures/fptp_results.html`
- Create: `backend/tests/test_scraper.py`
- Create: `backend/scraper.py`

**Step 1: Create mock HTML fixture**

`backend/tests/fixtures/fptp_results.html`:
```html
<!DOCTYPE html>
<html>
<body>
  <table class="result-table">
    <thead>
      <tr><th>Code</th><th>Constituency</th><th>Province</th><th>District</th><th>Status</th></tr>
    </thead>
    <tbody>
      <tr class="constituency-row" data-code="KTM-1">
        <td>KTM-1</td>
        <td>Kathmandu-1</td>
        <td>Bagmati</td>
        <td>Kathmandu</td>
        <td>COUNTING</td>
      </tr>
      <tr class="constituency-row" data-code="LTP-1">
        <td>LTP-1</td>
        <td>Lalitpur-1</td>
        <td>Bagmati</td>
        <td>Lalitpur</td>
        <td>DECLARED</td>
      </tr>
    </tbody>
  </table>
  <div class="candidate-list" data-code="KTM-1">
    <div class="candidate" data-party="NC" data-votes="12000">Ram Shrestha</div>
    <div class="candidate" data-party="RSP" data-votes="11500">Sita Karki</div>
    <div class="candidate" data-party="CPN-UML" data-votes="4200">Hari Thapa</div>
  </div>
  <div class="candidate-list" data-code="LTP-1">
    <div class="candidate" data-party="CPN-UML" data-votes="19000">Bina Maharjan</div>
    <div class="candidate" data-party="NC" data-votes="17500">Keshav Adhikari</div>
  </div>
</body>
</html>
```

> **IMPORTANT NOTE for implementer:** This fixture HTML is a placeholder with a fictional structure. On election day (March 5, 2026), open https://result.election.gov.np in Chrome DevTools, inspect the actual DOM, and update:
> 1. The fixture HTML to match real structure
> 2. The regex/selectors in `parse_fptp_html()` in `scraper.py`
> 3. The `PARTY_MAP` dict with actual party name strings from the site

**Step 2: Write the failing tests**

`backend/tests/test_scraper.py`:
```python
import pytest
from pathlib import Path
from scraper import parse_fptp_html, map_party_key, build_snapshot_from_constituencies

FIXTURE = Path(__file__).parent / "fixtures" / "fptp_results.html"


def test_map_party_key_known_parties():
    assert map_party_key("Nepali Congress") == "NC"
    assert map_party_key("NC") == "NC"
    assert map_party_key("CPN-UML") == "CPN-UML"
    assert map_party_key("Rastriya Swatantra Party") == "RSP"
    assert map_party_key("RSP") == "RSP"
    assert map_party_key("Nepali Communist Party") == "NCP"


def test_map_party_key_unknown_returns_oth():
    assert map_party_key("Some Random Party") == "OTH"
    assert map_party_key("") == "OTH"


def test_parse_fptp_html_returns_list():
    html = FIXTURE.read_text(encoding="utf-8")
    results = parse_fptp_html(html)
    assert isinstance(results, list)
    assert len(results) == 2


def test_parse_fptp_html_constituency_fields():
    html = FIXTURE.read_text(encoding="utf-8")
    c = parse_fptp_html(html)[0]
    assert c["code"] == "KTM-1"
    assert c["name"] == "Kathmandu-1"
    assert c["province"] == "Bagmati"
    assert c["district"] == "Kathmandu"
    assert c["status"] == "COUNTING"
    assert "last_updated" in c


def test_parse_fptp_html_declared_status():
    html = FIXTURE.read_text(encoding="utf-8")
    results = {r["code"]: r for r in parse_fptp_html(html)}
    assert results["LTP-1"]["status"] == "DECLARED"


def test_parse_fptp_html_candidate_fields():
    html = FIXTURE.read_text(encoding="utf-8")
    results = {r["code"]: r for r in parse_fptp_html(html)}
    cands = results["KTM-1"]["candidates"]
    assert len(cands) == 3
    assert cands[0]["name"] == "Ram Shrestha"
    assert cands[0]["party"] == "NC"
    assert cands[0]["votes"] == 12000


def test_build_snapshot_counts_declared_winners():
    constituencies = [
        {
            "code": "KTM-1", "status": "DECLARED",
            "candidates": [
                {"party": "NC", "votes": 9000},
                {"party": "RSP", "votes": 7000},
            ],
        },
        {
            "code": "LTP-1", "status": "COUNTING",
            "candidates": [{"party": "CPN-UML", "votes": 5000}],
        },
    ]
    snap = build_snapshot_from_constituencies(constituencies)
    assert snap["declared_seats"] == 1
    assert snap["seat_tally"]["NC"]["fptp"] == 1
    assert snap["seat_tally"]["CPN-UML"]["fptp"] == 0
```

**Step 3: Run test to verify it fails**

```bash
pytest tests/test_scraper.py -v
```

Expected: FAIL with `ModuleNotFoundError: No module named 'scraper'`

**Step 4: Implement `backend/scraper.py`**

```python
import re
from datetime import datetime, timezone
from typing import Any

from playwright.async_api import async_playwright


# ── Party name → frontend PartyKey mapping ────────────────────────────────────
# Update this dict with actual party name strings from result.election.gov.np
PARTY_MAP: dict[str, str] = {
    "nepali congress": "NC",
    "nc": "NC",
    "cpn-uml": "CPN-UML",
    "uml": "CPN-UML",
    "nepali communist party": "NCP",
    "ncp": "NCP",
    "rastriya swatantra party": "RSP",
    "rsp": "RSP",
}


def map_party_key(raw: str) -> str:
    """Map a raw party name string to a frontend PartyKey (NC/CPN-UML/NCP/RSP/OTH)."""
    return PARTY_MAP.get(raw.strip().lower(), "OTH")


def parse_fptp_html(html: str) -> list[dict[str, Any]]:
    """
    Parse FPTP constituency results from raw HTML.

    IMPORTANT: The regex selectors below match the placeholder fixture in
    tests/fixtures/fptp_results.html.  On election day, inspect the real
    page HTML at https://result.election.gov.np and update the patterns here.
    """
    results: list[dict[str, Any]] = []

    rows = re.findall(
        r'<tr[^>]*data-code="([^"]+)"[^>]*>(.*?)</tr>',
        html, re.DOTALL,
    )

    for code, row_html in rows:
        cells = re.findall(r'<td[^>]*>(.*?)</td>', row_html, re.DOTALL)
        if len(cells) < 5:
            continue

        def strip(s: str) -> str:
            return re.sub(r'<[^>]+>', '', s).strip()

        status_raw = strip(cells[4]).upper()
        status = "DECLARED" if "DECLARED" in status_raw else "COUNTING"

        cand_block = re.search(
            rf'<div[^>]*class="candidate-list"[^>]*data-code="{re.escape(code)}"[^>]*>(.*?)</div>',
            html, re.DOTALL,
        )
        candidates: list[dict[str, Any]] = []
        if cand_block:
            for party_raw, votes_str, cand_name in re.findall(
                r'<div[^>]*class="candidate"[^>]*data-party="([^"]+)"'
                r'[^>]*data-votes="(\d+)"[^>]*>([^<]+)</div>',
                cand_block.group(1),
            ):
                candidates.append({
                    "name":  cand_name.strip(),
                    "party": map_party_key(party_raw),
                    "votes": int(votes_str),
                })

        results.append({
            "code":         code,
            "name":         strip(cells[1]),
            "province":     strip(cells[2]),
            "district":     strip(cells[3]),
            "status":       status,
            "last_updated": datetime.now(timezone.utc).isoformat(),
            "candidates":   candidates,
        })

    return results


def build_snapshot_from_constituencies(
    constituencies: list[dict[str, Any]],
) -> dict[str, Any]:
    """Derive a snapshot dict from a list of constituency results."""
    seat_tally: dict[str, dict[str, int]] = {
        k: {"fptp": 0, "pr": 0} for k in ["NC", "CPN-UML", "NCP", "RSP", "OTH"]
    }
    declared = 0
    for c in constituencies:
        if c["status"] == "DECLARED" and c.get("candidates"):
            declared += 1
            winner = max(c["candidates"], key=lambda x: x["votes"])
            seat_tally[winner["party"]]["fptp"] += 1

    return {
        "taken_at":      datetime.now(timezone.utc).isoformat(),
        "total_seats":   275,
        "declared_seats": declared,
        "seat_tally":    seat_tally,
    }


async def scrape_results(url: str) -> tuple[list[dict], dict]:
    """
    Use Playwright to load the election results page and return
    (constituency_results, snapshot_data).

    IMPORTANT: On election day, open the site in a browser, inspect the DOM,
    and update parse_fptp_html() selectors to match the real structure.
    """
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        try:
            await page.goto(url, wait_until="networkidle", timeout=30_000)
            html = await page.content()
        finally:
            await browser.close()

    constituencies = parse_fptp_html(html)
    snapshot = build_snapshot_from_constituencies(constituencies)
    return constituencies, snapshot
```

**Step 5: Run tests to verify they pass**

```bash
pytest tests/test_scraper.py -v
```

Expected: 8 tests PASS

**Step 6: Commit**

```bash
git add backend/scraper.py backend/tests/test_scraper.py backend/tests/fixtures/
git commit -m "feat: add Playwright scraper with HTML parser and party key mapping"
```

---

### Task 4: FastAPI Server with WebSocket (TDD)

**Files:**
- Create: `backend/tests/test_api.py`
- Create: `backend/main.py`

**Step 1: Write the failing tests**

`backend/tests/test_api.py`:
```python
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
```

**Step 2: Run test to verify it fails**

```bash
pytest tests/test_api.py -v
```

Expected: FAIL with `ModuleNotFoundError: No module named 'main'`

**Step 3: Implement `backend/main.py`**

```python
import asyncio
import os
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from dotenv import load_dotenv
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from database import (
    init_db,
    get_constituencies,
    get_latest_snapshot,
    save_constituency_results,
    save_snapshot,
)
from scraper import scrape_results

load_dotenv()

DB_PATH = os.getenv("DB_PATH", "election.db")
SCRAPE_URL = os.getenv("SCRAPE_URL", "https://result.election.gov.np")
SCRAPE_INTERVAL = int(os.getenv("SCRAPE_INTERVAL_SECONDS", "30"))


class ConnectionManager:
    def __init__(self) -> None:
        self._connections: list[WebSocket] = []

    async def connect(self, ws: WebSocket) -> None:
        await ws.accept()
        self._connections.append(ws)

    def disconnect(self, ws: WebSocket) -> None:
        if ws in self._connections:
            self._connections.remove(ws)

    async def broadcast(self, data: dict) -> None:
        dead: list[WebSocket] = []
        for ws in list(self._connections):
            try:
                await ws.send_json(data)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(ws)


def create_app(db=None, start_scraper: bool = True) -> FastAPI:
    """
    Factory so tests can inject an in-memory db and skip the scraper loop.
    """
    if db is None:
        db = init_db(DB_PATH)

    manager = ConnectionManager()

    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncGenerator:
        task = None
        if start_scraper:
            task = asyncio.create_task(_scraper_loop(db, manager))
        yield
        if task:
            task.cancel()

    app = FastAPI(lifespan=lifespan)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:5173"],
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.get("/api/snapshot")
    def snapshot():
        return get_latest_snapshot(db)

    @app.get("/api/constituencies")
    def constituencies():
        return get_constituencies(db)

    @app.websocket("/ws")
    async def websocket_endpoint(ws: WebSocket):
        await manager.connect(ws)
        try:
            # Push current state immediately on connect
            await ws.send_json({"type": "snapshot",       "data": get_latest_snapshot(db)})
            await ws.send_json({"type": "constituencies",  "data": get_constituencies(db)})
            while True:
                await ws.receive_text()   # keep-alive; client can send pings
        except WebSocketDisconnect:
            manager.disconnect(ws)

    return app


async def _scraper_loop(db, manager: ConnectionManager) -> None:
    """Run scraper every SCRAPE_INTERVAL seconds and broadcast results."""
    while True:
        try:
            constituencies, snapshot = await scrape_results(SCRAPE_URL)
            save_snapshot(db, snapshot)
            save_constituency_results(db, constituencies)
            await manager.broadcast({"type": "snapshot",      "data": get_latest_snapshot(db)})
            await manager.broadcast({"type": "constituencies", "data": get_constituencies(db)})
        except Exception as exc:
            print(f"[scraper] error: {exc}")
        await asyncio.sleep(SCRAPE_INTERVAL)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(create_app(), host="0.0.0.0", port=8000, reload=False)
```

**Step 4: Run tests to verify they pass**

```bash
pytest tests/test_api.py -v
```

Expected: 4 tests PASS

**Step 5: Run the full test suite**

```bash
pytest -v
```

Expected: All tests PASS (database + scraper + api = 17 tests)

**Step 6: Commit**

```bash
git add backend/main.py backend/tests/test_api.py
git commit -m "feat: add FastAPI server with REST endpoints, WebSocket, and background scraper"
```

---

### Task 5: Vite Proxy Configuration

**Files:**
- Modify: `frontend/vite.config.ts`

**Step 1: Update `frontend/vite.config.ts`**

Replace entire file with:
```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:8000',
      '/ws': {
        target: 'ws://localhost:8000',
        ws: true,
      },
    },
  },
})
```

**Step 2: Verify TypeScript build still succeeds**

```bash
cd /d/Teaching_Support/New_Project/frontend
npx tsc --noEmit
```

Expected: No errors

**Step 3: Commit**

```bash
git add frontend/vite.config.ts
git commit -m "feat: add Vite dev proxy for /api and /ws to FastAPI backend"
```

---

### Task 6: Frontend API Layer

**Files:**
- Create: `frontend/src/api.ts`

**Step 1: Create `frontend/src/api.ts`**

```ts
// Shared types and fetch helpers for the live backend API.
// These mirror the data shapes from backend/database.py and scraper.py.

export type PartyKey = "NC" | "CPN-UML" | "NCP" | "RSP" | "OTH";

export type SeatTally = Record<PartyKey, { fptp: number; pr: number }>;

export type Snapshot = {
  totalSeats: number;
  declaredSeats: number;
  lastUpdated: string;
  seatTally: SeatTally;
};

export type Candidate = {
  name: string;
  party: PartyKey;
  votes: number;
};

export type ConstituencyResult = {
  province: string;
  district: string;
  code: string;
  name: string;
  status: "DECLARED" | "COUNTING";
  lastUpdated: string;
  candidates: Candidate[];
};

export type WsMessage =
  | { type: "snapshot"; data: Snapshot }
  | { type: "constituencies"; data: ConstituencyResult[] };

export async function fetchSnapshot(): Promise<Snapshot> {
  const res = await fetch("/api/snapshot");
  if (!res.ok) throw new Error(`GET /api/snapshot → ${res.status}`);
  return res.json();
}

export async function fetchConstituencies(): Promise<ConstituencyResult[]> {
  const res = await fetch("/api/constituencies");
  if (!res.ok) throw new Error(`GET /api/constituencies → ${res.status}`);
  return res.json();
}
```

**Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: No errors

**Step 3: Commit**

```bash
git add frontend/src/api.ts
git commit -m "feat: add frontend API module with types and fetch helpers"
```

---

### Task 7: Wire SummaryCards & SeatShareBars to Props

**Files:**
- Modify: `frontend/src/SummaryCards.tsx`
- Modify: `frontend/src/SeatShareBars.tsx`

**Step 1: Update `SummaryCards.tsx` to accept `snapshot` prop**

Replace the `mockSnapshot` import at line 1 with a prop. The component currently reads `mockSnapshot` from `./mockData`. Change it to accept a `snapshot` prop typed from `api.ts`.

Key changes:
- Remove: `import { mockSnapshot, parties, seatChange } from "./mockData";`
- Add: `import { parties, seatChange } from "./mockData";`
- Add: `import type { Snapshot } from "./api";`
- Change the function signature from `export default function SummaryCards()` to `export default function SummaryCards({ snapshot }: { snapshot: Snapshot })`
- Replace all `mockSnapshot.` references with `snapshot.`

Full updated file:
```tsx
import type { Snapshot } from "./api";
import { parties, seatChange } from "./mockData";

function seatsToMajority(totalSeats: number) {
  return Math.floor(totalSeats / 2) + 1;
}

function ChangePill({ delta }: { delta: number }) {
  const up = delta > 0;
  const down = delta < 0;
  const cls = up
    ? "bg-emerald-50 text-emerald-800 ring-emerald-200"
    : down
    ? "bg-rose-50 text-rose-800 ring-rose-200"
    : "bg-slate-50 text-slate-700 ring-slate-200";
  const sign = up ? "+" : "";
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-bold ring-1 ${cls}`}>
      {up ? "▲" : down ? "▼" : "•"} {sign}{delta}
    </span>
  );
}

export default function SummaryCards({ snapshot }: { snapshot: Snapshot }) {
  const majority = seatsToMajority(snapshot.totalSeats);

  const totals = Object.entries(snapshot.seatTally).map(([key, v]) => ({
    key,
    total: v.fptp + v.pr,
  }));
  totals.sort((a, b) => b.total - a.total);
  const leader   = totals[0];
  const runnerUp = totals[1];

  return (
    <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <Card title="Majority" big={`${majority}`} sub="Seats needed to form government" />
      <Card
        title="Leading party"
        big={parties[leader.key as keyof typeof parties].name.split(" (")[0]}
        sub={`${leader.total} seats`}
        dotColor={parties[leader.key as keyof typeof parties].color}
        right={<ChangePill delta={seatChange[leader.key as keyof typeof seatChange]} />}
      />
      <Card
        title="Runner-up"
        big={parties[runnerUp.key as keyof typeof parties].name.split(" (")[0]}
        sub={`${runnerUp.total} seats`}
        dotColor={parties[runnerUp.key as keyof typeof parties].color}
        right={<ChangePill delta={seatChange[runnerUp.key as keyof typeof seatChange]} />}
      />
    </section>
  );
}

function Card({
  title, big, sub, dotColor, right,
}: {
  title: string; big: string; sub: string; dotColor?: string; right?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:bg-slate-900 dark:border-slate-800">
      <div className="text-sm font-semibold text-slate-600 dark:text-slate-300 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {dotColor ? <span className={`h-3 w-3 rounded-full ${dotColor}`} /> : null}
          {title}
        </div>
        {right}
      </div>
      <div className="mt-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">{big}</div>
      <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">{sub}</div>
    </div>
  );
}
```

**Step 2: Update `SeatShareBars.tsx` to accept `snapshot` prop**

Key changes:
- Remove: `import { mockSnapshot, parties } from "./mockData";`
- Add: `import { parties } from "./mockData";`
- Add: `import type { Snapshot } from "./api";`
- Change function signature to accept `{ snapshot }: { snapshot: Snapshot }`
- Replace all `mockSnapshot.` with `snapshot.`

Full updated file:
```tsx
import type { Snapshot } from "./api";
import { parties } from "./mockData";

function seatsToMajority(totalSeats: number) {
  return Math.floor(totalSeats / 2) + 1;
}

export default function SeatShareBars({ snapshot }: { snapshot: Snapshot }) {
  const totalSeats = snapshot.totalSeats;
  const majority   = seatsToMajority(totalSeats);
  const majorityPct = (majority / totalSeats) * 100;

  const rows = Object.entries(snapshot.seatTally)
    .map(([key, v]) => {
      const total = v.fptp + v.pr;
      return {
        key,
        total,
        color:   parties[key as keyof typeof parties].color,
        name:    parties[key as keyof typeof parties].name,
        percent: (total / totalSeats) * 100,
      };
    })
    .sort((a, b) => b.total - a.total);

  return (
    <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm dark:bg-slate-900 dark:border-slate-800">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Seat Share (Out of {totalSeats})
          </h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Majority needed:{" "}
            <span className="font-semibold text-slate-900 dark:text-slate-100">{majority}</span>
          </p>
        </div>
        <div className="text-xs text-slate-500 dark:text-slate-400">FPTP + PR</div>
      </div>

      <div className="mt-4 flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
        <span className="inline-block h-3 w-[2px] bg-slate-900/60 dark:bg-slate-100/60" />
        <span>Majority line ({majority})</span>
      </div>

      <div className="mt-4 space-y-5">
        {rows.map((r) => (
          <div key={r.key}>
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span className={`h-3 w-3 rounded-full ${r.color}`} />
                <span className="font-medium text-slate-900 dark:text-slate-100">{r.name}</span>
              </div>
              <span className="font-semibold text-slate-700 tabular-nums dark:text-slate-200">{r.total}</span>
            </div>
            <div className="mt-2 relative h-3 w-full rounded-full bg-slate-200 overflow-hidden dark:bg-slate-700">
              <div
                className="absolute top-0 h-full w-[2px] bg-slate-900/60 dark:bg-slate-100/60"
                style={{ left: `${majorityPct}%` }}
                aria-hidden="true"
              />
              <div
                className={`h-3 ${r.color} transition-[width] duration-700 ease-out`}
                style={{ width: `${r.percent}%` }}
              />
            </div>
            <div className="mt-1 relative h-4">
              <div
                className="absolute -translate-x-1/2 text-[10px] text-slate-500 dark:text-slate-400"
                style={{ left: `${majorityPct}%` }}
              >
                {majority}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
```

**Step 3: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: Errors about missing `snapshot` prop in `App.tsx` (that's fine — we fix it in the next task)

**Step 4: Commit**

```bash
git add frontend/src/SummaryCards.tsx frontend/src/SeatShareBars.tsx
git commit -m "refactor: SummaryCards and SeatShareBars now accept snapshot prop"
```

---

### Task 8: Wire App.tsx to Live API & WebSocket

**Files:**
- Modify: `frontend/src/App.tsx`

**Step 1: Rewrite `App.tsx`**

Replace the entire file content with:

```tsx
import { useEffect, useState } from "react";
import { parties, provinces, seatChange } from "./mockData";
import type { Province } from "./mockData";
import {
  fetchSnapshot,
  fetchConstituencies,
} from "./api";
import type { Snapshot, ConstituencyResult, WsMessage } from "./api";

import ProgressBar     from "./ProgressBar";
import SummaryCards    from "./SummaryCards";
import SeatShareBars   from "./SeatShareBars";
import ProvinceSummary from "./ProvinceSummary";
import ConstituencyTable from "./ConstituencyTable";

const THEME_KEY = "theme";

function formatTime(iso: string) {
  return iso ? new Date(iso).toLocaleString() : "—";
}

function seatsToMajority(totalSeats: number) {
  return Math.floor(totalSeats / 2) + 1;
}

const EMPTY_SNAPSHOT: Snapshot = {
  totalSeats:    275,
  declaredSeats: 0,
  lastUpdated:   "",
  seatTally: {
    NC:        { fptp: 0, pr: 0 },
    "CPN-UML": { fptp: 0, pr: 0 },
    NCP:       { fptp: 0, pr: 0 },
    RSP:       { fptp: 0, pr: 0 },
    OTH:       { fptp: 0, pr: 0 },
  },
};

export default function App() {
  /* ── Dark mode ── */
  const [dark, setDark] = useState(() => localStorage.getItem(THEME_KEY) === "dark");
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem(THEME_KEY, dark ? "dark" : "light");
  }, [dark]);

  /* ── Live data ── */
  const [snapshot, setSnapshot]   = useState<Snapshot>(EMPTY_SNAPSHOT);
  const [results, setResults]     = useState<ConstituencyResult[]>([]);
  const [selectedProvince, setSelectedProvince] = useState<"All" | Province>("All");

  // Initial HTTP fetch
  useEffect(() => {
    fetchSnapshot().then(setSnapshot).catch(console.error);
    fetchConstituencies().then(setResults).catch(console.error);
  }, []);

  // WebSocket for live updates
  useEffect(() => {
    const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
    const ws = new WebSocket(`${proto}//${window.location.host}/ws`);

    ws.onmessage = (e: MessageEvent) => {
      const msg = JSON.parse(e.data) as WsMessage;
      if (msg.type === "snapshot")      setSnapshot(msg.data);
      if (msg.type === "constituencies") setResults(msg.data);
    };

    ws.onerror = (err) => console.error("[ws] error", err);

    return () => ws.close();
  }, []);

  /* ── Majority banner ── */
  const majority  = seatsToMajority(snapshot.totalSeats);
  const tallyRows = Object.entries(snapshot.seatTally)
    .map(([key, v]) => ({ key, total: v.fptp + v.pr }))
    .sort((a, b) => b.total - a.total);
  const lead      = tallyRows[0];
  const projected = lead && lead.total >= majority ? lead : null;

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 dark:bg-slate-900 dark:border-slate-800">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              Nepal House of Representatives Election 2026
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
              Live Results Dashboard · Last updated:{" "}
              <span className="font-semibold text-slate-800 dark:text-slate-100">
                {formatTime(snapshot.lastUpdated)}
              </span>
            </p>
          </div>
          <button
            type="button"
            onClick={() => setDark((d) => !d)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700
                       transition hover:bg-slate-50 active:scale-95
                       dark:bg-slate-900 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            {dark ? "☀️ Light" : "🌙 Dark"}
          </button>
        </div>
      </header>

      {/* Projected Government Banner */}
      {projected && (
        <div className="border-b border-slate-200 bg-slate-50 dark:bg-slate-900 dark:border-slate-800">
          <div className="max-w-6xl mx-auto px-6 py-3 text-sm text-slate-700 dark:text-slate-200">
            <span className="font-bold text-slate-900 dark:text-slate-100">
              {parties[projected.key as keyof typeof parties].name}
            </span>{" "}
            is projected to form government (≥ {majority} seats).
          </div>
        </div>
      )}

      {/* Main */}
      <main className="max-w-6xl mx-auto px-6 py-6 space-y-6">
        <SummaryCards snapshot={snapshot} />

        <SeatShareBars snapshot={snapshot} />

        <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm dark:bg-slate-900 dark:border-slate-800">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Seats Declared Progress
          </h2>
          <ProgressBar
            declared={snapshot.declaredSeats}
            total={snapshot.totalSeats}
          />
        </section>

        <ProvinceSummary
          results={results}
          selectedProvince={selectedProvince}
          onSelect={setSelectedProvince}
        />

        <ConstituencyTable
          results={results}
          provinces={provinces}
          selectedProvince={selectedProvince}
          onProvinceChange={setSelectedProvince}
        />
      </main>
    </div>
  );
}
```

**Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: No errors

**Step 3: Commit**

```bash
git add frontend/src/App.tsx
git commit -m "feat: wire App.tsx to live API and WebSocket, replace all mock data"
```

---

### Task 9: End-to-End Smoke Test

**Step 1: Run all backend tests**

```bash
cd /d/Teaching_Support/New_Project/backend
source venv/Scripts/activate
pytest -v
```

Expected: All tests PASS (no failures)

**Step 2: Start the backend server (terminal 1)**

```bash
cd /d/Teaching_Support/New_Project/backend
source venv/Scripts/activate
python main.py
```

Expected output: `Uvicorn running on http://0.0.0.0:8000`

**Step 3: Verify REST endpoints (terminal 2)**

```bash
curl http://localhost:8000/api/snapshot
```

Expected: `{"totalSeats":275,"declaredSeats":0,"lastUpdated":"","seatTally":{...}}`

```bash
curl http://localhost:8000/api/constituencies
```

Expected: `[]` (empty until election day)

**Step 4: Start the frontend (terminal 2)**

```bash
cd /d/Teaching_Support/New_Project/frontend
npm run dev
```

Expected: `Local:   http://localhost:5173/`

**Step 5: Open browser**

Open: `http://localhost:5173`

Expected:
- Dashboard renders without errors
- SummaryCards shows 0 seats (live data, empty pre-election)
- No console errors
- WebSocket connects (check Network tab → WS → `/ws`)

**Step 6: Final commit**

```bash
git add .
git commit -m "feat: complete Nepal election live dashboard — backend + frontend integrated"
```

---

## Post-Election Day Checklist

When results start flowing on March 5, 2026:

1. Open https://result.election.gov.np in Chrome DevTools
2. Find the constituency results table/list structure
3. Update `backend/scraper.py` → `parse_fptp_html()` with real CSS selectors
4. Update `backend/tests/fixtures/fptp_results.html` with a real HTML sample
5. Update `backend/scraper.py` → `PARTY_MAP` with exact party name strings from the site
6. Re-run all backend tests: `pytest -v`
7. Test scraper manually: `python -c "import asyncio; from scraper import scrape_results; print(asyncio.run(scrape_results('https://result.election.gov.np')))"`
