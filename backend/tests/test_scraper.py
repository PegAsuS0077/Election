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
