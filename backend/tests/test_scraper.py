import json
import pytest
from pathlib import Path
from scraper import (
    map_party_key,
    constituency_id,
    is_winner,
    parse_candidates_json,
    build_snapshot_from_constituencies,
)

FIXTURE = Path(__file__).parent / "fixtures" / "fptp_results.json"


def load_fixture() -> list[dict]:
    return json.loads(FIXTURE.read_text(encoding="utf-8"))


# ── map_party_key ─────────────────────────────────────────────────────────────

def test_map_party_key_nc():
    assert map_party_key("नेपाली काँग्रेस") == "NC"


def test_map_party_key_uml():
    assert map_party_key("नेपाल कम्युनिष्ट पार्टी (एकीकृत मार्क्सवादी लेनिनवादी)") == "CPN-UML"


def test_map_party_key_rsp():
    assert map_party_key("राष्ट्रिय स्वतन्त्र पार्टी") == "RSP"


def test_map_party_key_rpp():
    assert map_party_key("राष्ट्रिय प्रजातन्त्र पार्टी") == "RPP"


def test_map_party_key_jsp():
    assert map_party_key("जनता समाजवादी पार्टी, नेपाल") == "JSP"


def test_map_party_key_ind():
    assert map_party_key("स्वतन्त्र") == "IND"


def test_map_party_key_unknown_returns_oth():
    assert map_party_key("Some Unknown Party") == "OTH"
    assert map_party_key("") == "OTH"


def test_map_party_key_strips_whitespace():
    assert map_party_key("  नेपाली काँग्रेस  ") == "NC"


# ── constituency_id ───────────────────────────────────────────────────────────

def test_constituency_id_format():
    record = {"STATE_ID": 3, "DistrictName": "काठमाडौं", "SCConstID": 1}
    assert constituency_id(record) == "3-काठमाडौं-1"


def test_constituency_id_unique_districts():
    r1 = {"STATE_ID": 3, "DistrictName": "काठमाडौं", "SCConstID": 1}
    r2 = {"STATE_ID": 3, "DistrictName": "ललितपुर", "SCConstID": 1}
    assert constituency_id(r1) != constituency_id(r2)


# ── is_winner ─────────────────────────────────────────────────────────────────

def test_is_winner_with_e_status_set():
    assert is_winner({"E_STATUS": "W", "R": 1, "TotalVoteReceived": 5000}) is True


def test_is_winner_rank1_with_votes():
    assert is_winner({"E_STATUS": None, "R": 1, "TotalVoteReceived": 1000}) is True


def test_is_winner_rank1_no_votes():
    assert is_winner({"E_STATUS": None, "R": 1, "TotalVoteReceived": 0}) is False


def test_is_winner_not_rank1():
    assert is_winner({"E_STATUS": None, "R": 2, "TotalVoteReceived": 5000}) is False


# ── parse_candidates_json ─────────────────────────────────────────────────────

def test_parse_candidates_json_returns_list():
    raw = load_fixture()
    results = parse_candidates_json(raw)
    assert isinstance(results, list)


def test_parse_candidates_json_groups_by_constituency():
    raw = load_fixture()
    results = parse_candidates_json(raw)
    # Fixture has candidates in 2 constituencies: KTM-1 and LTP-1
    assert len(results) == 2


def test_parse_candidates_json_constituency_fields():
    raw = load_fixture()
    results = {r["code"]: r for r in parse_candidates_json(raw)}

    ktm = results["3-काठमाडौं-1"]
    assert ktm["province"] == "Bagmati"
    assert ktm["district"] == "काठमाडौं"
    assert ktm["state_id"] == 3
    assert "last_updated" in ktm
    assert len(ktm["candidates"]) == 3


def test_parse_candidates_json_candidate_party_mapped():
    raw = load_fixture()
    results = {r["code"]: r for r in parse_candidates_json(raw)}
    cands = {c["name"]: c for c in results["3-काठमाडौं-1"]["candidates"]}
    assert cands["राम श्रेष्ठ"]["party"] == "NC"
    assert cands["सीता थापा"]["party"] == "CPN-UML"
    assert cands["बिकास राई"]["party"] == "RSP"


def test_parse_candidates_json_declared_when_winner_exists():
    raw = load_fixture()
    results = {r["code"]: r for r in parse_candidates_json(raw)}
    # ललितपुर-1 has a candidate with E_STATUS = "W"
    ltp = results["3-ललितपुर-1"]
    assert ltp["status"] == "DECLARED"


def test_parse_candidates_json_declared_when_rank1_has_votes():
    """KTM-1 has R=1 with TotalVoteReceived>0, so is_winner() returns True → DECLARED."""
    raw = load_fixture()
    results = {r["code"]: r for r in parse_candidates_json(raw)}
    ktm = results["3-काठमाडौं-1"]
    # The rank-1 candidate has votes > 0, so the constituency is DECLARED
    assert ktm["status"] == "DECLARED"


# ── build_snapshot_from_constituencies ───────────────────────────────────────

def test_build_snapshot_counts_declared_winners():
    constituencies = [
        {
            "code": "3-काठमाडौं-1",
            "status": "DECLARED",
            "candidates": [
                {"party": "NC",      "votes": 12000},
                {"party": "CPN-UML", "votes": 9500},
            ],
        },
        {
            "code": "3-ललितपुर-1",
            "status": "COUNTING",
            "candidates": [{"party": "CPN-UML", "votes": 5000}],
        },
    ]
    snap = build_snapshot_from_constituencies(constituencies)
    assert snap["declared_seats"] == 1
    assert snap["seat_tally"]["NC"]["fptp"] == 1
    assert snap["seat_tally"]["CPN-UML"]["fptp"] == 0


def test_build_snapshot_all_parties_present():
    snap = build_snapshot_from_constituencies([])
    expected_parties = {"NC", "CPN-UML", "NCP", "RSP", "RPP", "JSP", "IND", "OTH"}
    assert set(snap["seat_tally"].keys()) == expected_parties


def test_build_snapshot_total_seats():
    snap = build_snapshot_from_constituencies([])
    assert snap["total_seats"] == 275
