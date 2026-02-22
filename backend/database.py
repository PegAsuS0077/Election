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
            t["NC"]["fptp"],      t["NC"]["pr"],
            t["CPN-UML"]["fptp"], t["CPN-UML"]["pr"],
            t["NCP"]["fptp"],     t["NCP"]["pr"],
            t["RSP"]["fptp"],     t["RSP"]["pr"],
            t["OTH"]["fptp"],     t["OTH"]["pr"],
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
