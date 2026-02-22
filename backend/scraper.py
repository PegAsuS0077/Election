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
            rf'<div[^>]*class="candidate-list"[^>]*data-code="{re.escape(code)}"[^>]*>(.*?)'
            r'(?=<div[^>]*class="candidate-list"|$)',
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
        "taken_at":       datetime.now(timezone.utc).isoformat(),
        "total_seats":    275,
        "declared_seats": declared,
        "seat_tally":     seat_tally,
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
