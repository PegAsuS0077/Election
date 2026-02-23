"""
validate_election_day.py — Election-day readiness validation script.
Run with: python validate_election_day.py

Tasks covered:
  1. Upstream data fetch + UTF-8 BOM parsing
  2. Election-day simulation (inject realistic votes)
  3. Constituency grouping (165 expected)
  4. Party mapping validation
  5. Snapshot generation + integrity check
  6. Failure handling simulation
  7. Performance measurement
  8. Sample output
"""

import asyncio
import json
import random
import time
from collections import defaultdict
from typing import Any

import httpx

# ── Import from the actual scraper ───────────────────────────────────────────
from scraper import (
    UPSTREAM_URL,
    HEADERS,
    PARTY_MAP,
    map_party_key,
    constituency_id,
    parse_candidates_json,
    build_snapshot_from_constituencies,
)

WARN = []
ERRORS = []
PASS_COUNT = 0
FAIL_COUNT = 0

SEP = "-" * 70


def ok(msg: str) -> None:
    global PASS_COUNT
    PASS_COUNT += 1
    print(f"  [PASS] {msg}")


def warn(msg: str) -> None:
    WARN.append(msg)
    print(f"  [WARN] {msg}")


def fail(msg: str) -> None:
    global FAIL_COUNT
    FAIL_COUNT += 1
    ERRORS.append(msg)
    print(f"  [FAIL] {msg}")


# ── Task 1: Upstream data fetch ───────────────────────────────────────────────
async def task1_fetch() -> list[dict]:
    print(f"\n{SEP}")
    print("TASK 1: Upstream Data Validation")
    print(SEP)

    t0 = time.perf_counter()
    try:
        async with httpx.AsyncClient(timeout=20.0, follow_redirects=True) as client:
            resp = await client.get(UPSTREAM_URL, headers=HEADERS)
            resp.raise_for_status()
            raw = resp.content
    except Exception as e:
        fail(f"Network fetch failed: {e}")
        return []
    fetch_ms = (time.perf_counter() - t0) * 1000

    # BOM check
    if raw[:3] == b"\xef\xbb\xbf":
        ok(f"UTF-8 BOM detected and stripped ({fetch_ms:.0f} ms to fetch)")
        raw = raw[3:]
    else:
        warn("No UTF-8 BOM — may be fine but unexpected for this endpoint")

    # JSON parse
    try:
        data: list[dict] = json.loads(raw.decode("utf-8"))
    except json.JSONDecodeError as e:
        fail(f"JSON parse error: {e}")
        return []

    ok(f"JSON parsed successfully — {len(data):,} records")

    # Field presence
    required_fields = [
        "CandidateID", "CandidateName", "PoliticalPartyName",
        "STATE_ID", "DistrictName", "SCConstID",
        "TotalVoteReceived", "R", "E_STATUS",
    ]
    sample = data[0]
    missing = [f for f in required_fields if f not in sample]
    if missing:
        fail(f"Missing required fields: {missing}")
    else:
        ok(f"All required fields present: {required_fields}")

    # Unique constituencies
    unique_const = {constituency_id(r) for r in data}
    print(f"  INFO: Unique constituencies: {len(unique_const)}")
    if len(unique_const) == 165:
        ok("Exactly 165 constituencies found")
    elif 160 <= len(unique_const) <= 170:
        warn(f"Expected 165 constituencies, found {len(unique_const)} (pre-election data may differ)")
    else:
        fail(f"Unexpected constituency count: {len(unique_const)}")

    # Unique parties
    parties = {r.get("PoliticalPartyName", "") for r in data}
    print(f"  INFO: Unique party names: {len(parties)}")
    for p in sorted(parties):
        print(f"    '{p}' -> {map_party_key(p)}")

    return data


# ── Task 2 & 3: Grouping + simulation ────────────────────────────────────────
def task2_3_simulate(raw_data: list[dict]) -> list[dict]:
    print(f"\n{SEP}")
    print("TASK 2+3: Constituency Grouping & Election-Day Simulation")
    print(SEP)

    # Group by composite key
    groups: dict[str, list[dict]] = defaultdict(list)
    for r in raw_data:
        groups[constituency_id(r)].append(r)

    # Inject realistic votes in memory (do NOT modify original data for task 1)
    simulated: list[dict] = []
    for cid, candidates in groups.items():
        injected = []
        votes = sorted(
            [random.randint(3000, 60000) for _ in candidates],
            reverse=True,
        )
        for i, rec in enumerate(candidates):
            rec_copy = dict(rec)
            rec_copy["TotalVoteReceived"] = votes[i]
            rec_copy["R"] = i + 1          # rank 1 = highest votes
            rec_copy["E_STATUS"] = "W" if i == 0 else None  # winner flag
            injected.append(rec_copy)
        simulated.extend(injected)

    # Group check
    sim_groups: dict[str, list[dict]] = defaultdict(list)
    for r in simulated:
        sim_groups[constituency_id(r)].append(r)

    n_const = len(sim_groups)
    print(f"  INFO: Simulated constituencies: {n_const}")
    if n_const == 165:
        ok("165 constituencies after simulation")
    else:
        warn(f"Simulated constituency count: {n_const} (expected 165)")

    # Multi-candidate check
    solo = [cid for cid, cands in sim_groups.items() if len(cands) < 2]
    if solo:
        warn(f"Constituencies with <2 candidates: {len(solo)}: {solo[:5]}")
    else:
        ok("All constituencies have ≥2 candidates")

    # Winner uniqueness
    multi_winner = []
    for cid, cands in sim_groups.items():
        winners = [c for c in cands if c.get("E_STATUS") == "W"]
        if len(winners) != 1:
            multi_winner.append((cid, len(winners)))
    if multi_winner:
        fail(f"Constituencies with ≠1 winner: {len(multi_winner)}")
    else:
        ok("Exactly one winner per constituency in simulation")

    # Parse through actual scraper logic
    constituencies = parse_candidates_json(simulated)
    declared = [c for c in constituencies if c["status"] == "DECLARED"]
    print(f"  INFO: DECLARED constituencies: {len(declared)} / {len(constituencies)}")
    if len(declared) == 165:
        ok("All 165 constituencies declared in simulation")
    elif len(declared) > 0:
        warn(f"Only {len(declared)} declared — is_winner() may need E_STATUS='W' mapping")
    else:
        fail("Zero declared constituencies — is_winner() not matching simulation E_STATUS")

    return constituencies


# ── Task 4: Party mapping ─────────────────────────────────────────────────────
def task4_party_mapping(raw_data: list[dict]) -> None:
    print(f"\n{SEP}")
    print("TASK 4: Party Mapping Validation")
    print(SEP)

    counts: dict[str, int] = defaultdict(int)
    unknown: dict[str, int] = defaultdict(int)

    for r in raw_data:
        pname = r.get("PoliticalPartyName", "")
        key = map_party_key(pname)
        counts[key] += 1
        if key == "OTH" and pname not in PARTY_MAP:
            unknown[pname] += 1

    for key in ["NC", "CPN-UML", "NCP", "RSP", "OTH"]:
        n = counts.get(key, 0)
        print(f"  {key:10s}: {n:4d} candidates")
        if n == 0:
            warn(f"No candidates mapped to '{key}' — verify PARTY_MAP on election day")

    if unknown:
        print(f"\n  Unmapped party names ({len(unknown)} unique → OTH):")
        for pname, cnt in sorted(unknown.items(), key=lambda x: -x[1]):
            print(f"    [{cnt:3d}] '{pname}'")
        warn(f"{len(unknown)} party names not in PARTY_MAP (falling through to OTH)")
    else:
        ok("All party names mapped via PARTY_MAP (no OTH fallthrough)")

    # Key parties must be present
    for key in ["NC", "CPN-UML"]:
        if counts.get(key, 0) > 0:
            ok(f"'{key}' candidates found ({counts[key]})")
        else:
            fail(f"'{key}' has zero candidates — PARTY_MAP string mismatch")


# ── Task 5: Snapshot generation ───────────────────────────────────────────────
def task5_snapshot(constituencies: list[dict]) -> dict:
    print(f"\n{SEP}")
    print("TASK 5: Snapshot Generation & Integrity")
    print(SEP)

    snapshot = build_snapshot_from_constituencies(constituencies)

    declared = snapshot["declared_seats"]
    total = snapshot["total_seats"]
    tally = snapshot["seat_tally"]
    tally_sum = sum(v["fptp"] for v in tally.values())

    print(f"  declared_seats : {declared}")
    print(f"  total_seats    : {total}")
    print(f"  tally_sum      : {tally_sum}")

    if declared <= 165:
        ok(f"declared_seats ({declared}) ≤ 165")
    else:
        fail(f"declared_seats ({declared}) > 165 — impossible")

    if tally_sum == declared:
        ok(f"seat_tally sum ({tally_sum}) == declared_seats ({declared})")
    else:
        fail(f"seat_tally sum ({tally_sum}) != declared_seats ({declared})")

    # Required keys present
    for key in ["NC", "CPN-UML", "NCP", "RSP", "OTH"]:
        if key in tally:
            ok(f"seat_tally has key '{key}'")
        else:
            fail(f"seat_tally missing key '{key}'")

    return snapshot


# ── Task 6: Failure handling ──────────────────────────────────────────────────
async def task6_failure_handling() -> None:
    print(f"\n{SEP}")
    print("TASK 6: Failure Handling Simulation")
    print(SEP)

    # Case A: empty array
    try:
        result = parse_candidates_json([])
        snap = build_snapshot_from_constituencies(result)
        assert snap["declared_seats"] == 0
        ok("Empty array: returns empty constituency list, snapshot declared=0")
    except Exception as e:
        fail(f"Empty array crash: {e}")

    # Case B: malformed JSON (we simulate by calling with bad types)
    try:
        bad_record = {"STATE_ID": None, "DistrictName": None, "SCConstID": None,
                      "CandidateID": 0, "CandidateName": "", "PoliticalPartyName": "",
                      "TotalVoteReceived": None, "R": None, "E_STATUS": None}
        result = parse_candidates_json([bad_record])
        ok("Malformed/null record: parsed without crash")
    except Exception as e:
        fail(f"Malformed record crash: {e}")

    # Case C: network timeout simulation
    try:
        async with httpx.AsyncClient(timeout=0.001) as client:
            await client.get(UPSTREAM_URL, headers=HEADERS)
        warn("Timeout simulation: request unexpectedly succeeded (tiny timeout)")
    except (httpx.TimeoutException, httpx.ConnectError):
        ok("Network timeout: TimeoutException raised (caller must catch)")
    except Exception as e:
        warn(f"Network timeout raised unexpected type: {type(e).__name__}: {e}")

    # Confirm fetch_candidates wraps with raise_for_status — bad status
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get("https://httpbin.org/status/503", headers=HEADERS)
            resp.raise_for_status()
        fail("503 response: raise_for_status() did not raise")
    except httpx.HTTPStatusError:
        ok("HTTP 503: raise_for_status() raises HTTPStatusError (caller must catch)")
    except Exception as e:
        warn(f"HTTP 503 test raised: {type(e).__name__}: {e}")


# ── Task 7: Performance ───────────────────────────────────────────────────────
async def task7_performance() -> float:
    print(f"\n{SEP}")
    print("TASK 7: Performance Check")
    print(SEP)

    t0 = time.perf_counter()
    async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
        resp = await client.get(UPSTREAM_URL, headers=HEADERS)
        resp.raise_for_status()
        raw = resp.content
    fetch_s = time.perf_counter() - t0

    t1 = time.perf_counter()
    if raw[:3] == b"\xef\xbb\xbf":
        raw = raw[3:]
    data = json.loads(raw.decode("utf-8"))
    parse_candidates_json(data)
    process_s = time.perf_counter() - t1

    total_s = fetch_s + process_s
    print(f"  Fetch time    : {fetch_s*1000:.0f} ms")
    print(f"  Process time  : {process_s*1000:.0f} ms")
    print(f"  Total time    : {total_s*1000:.0f} ms")

    if total_s < 2.0:
        ok(f"Total pipeline < 2 s ({total_s:.2f} s)")
    elif total_s < 5.0:
        warn(f"Total pipeline {total_s:.2f} s — over 2 s but acceptable; check network on election day")
    else:
        fail(f"Total pipeline {total_s:.2f} s — too slow for 30 s polling cycle")

    return total_s


# ── Task 8: Sample output ─────────────────────────────────────────────────────
def task8_sample(constituencies: list[dict], snapshot: dict) -> None:
    print(f"\n{SEP}")
    print("TASK 8: Sample Output")
    print(SEP)

    if constituencies:
        c = constituencies[0]
        sample_c = {
            "code":     c["code"],
            "name":     c["name"],
            "province": c["province"],
            "district": c["district"],
            "status":   c["status"],
            "top2":     sorted(c["candidates"], key=lambda x: x["votes"], reverse=True)[:2],
        }
        print("\n  Sample constituency (top 2 candidates):")
        print(json.dumps(sample_c, ensure_ascii=False, indent=4))

    print("\n  Sample snapshot:")
    print(json.dumps(snapshot, ensure_ascii=False, indent=4))


# ── Main ──────────────────────────────────────────────────────────────────────
async def main() -> None:
    random.seed(42)
    print("=" * 70)
    print("  NEPAL ELECTION SYSTEM — ELECTION-DAY READINESS VALIDATION")
    print("  Date: 2026-02-23 (pre-election)   Target: 2026-03-05")
    print("=" * 70)

    # Task 1
    raw_data = await task1_fetch()
    if not raw_data:
        print("\n[FATAL] Could not fetch upstream data. Aborting remaining tasks.")
        return

    # Tasks 2+3
    sim_constituencies = task2_3_simulate(raw_data)

    # Task 4 (use original data for real party mapping)
    task4_party_mapping(raw_data)

    # Task 5 (use simulated data so we have declared seats)
    snapshot = task5_snapshot(sim_constituencies)

    # Task 6
    await task6_failure_handling()

    # Task 7
    await task7_performance()

    # Task 8
    task8_sample(sim_constituencies, snapshot)

    # ── Final verdict ─────────────────────────────────────────────────────────
    print(f"\n{'=' * 70}")
    print(f"  FINAL VERDICT")
    print(f"{'=' * 70}")
    print(f"  PASSED  : {PASS_COUNT}")
    print(f"  WARNINGS: {len(WARN)}")
    print(f"  FAILED  : {FAIL_COUNT}")

    if WARN:
        print("\n  Warnings:")
        for w in WARN:
            print(f"    ! {w}")

    if ERRORS:
        print("\n  Failures:")
        for e in ERRORS:
            print(f"    x {e}")

    verdict = "READY" if FAIL_COUNT == 0 else "NOT READY"
    print(f"\n  VERDICT: {verdict}")
    if verdict == "NOT READY":
        print("  Fix the FAIL items above before election day.")
    else:
        print("  System is ready for election day.")
        if WARN:
            print("  Review warnings — they may require attention on election day.")
    print("=" * 70)


if __name__ == "__main__":
    asyncio.run(main())
