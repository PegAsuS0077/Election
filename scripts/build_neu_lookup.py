#!/usr/bin/env python3
"""
Build a clean, minimal candidate enrichment lookup JSON for the frontend.

Sources:
  candidates_enriched.json — 3,406 records with CandidateID and Ekantipur
                             English name (name_en, matched via fuzzy search).
  neu_candidates_full.json — 3,406 records with English father/spouse/hometown
                             scraped from nepalelectionupdates.com.

Output: frontend/public/neu_candidates.json  (~300 KB)
  Keyed by CandidateID (integer) — exact match, no fuzzy lookup needed.

Each output record:
  id  CandidateID (int)                        always present
  n   English name from Ekantipur              omitted when not reliable
  f   father's English name (from NEU)         omitted when absent
  s   spouse's English name (from NEU)         omitted when placeholder
  h   hometown/citizenship district (from NEU) omitted when contaminated

Name reliability rule:
  Only include name_en when source='ekantipur', score>=85, AND name is ASCII.
  Records that fail this are left without 'n' so parseUpstreamData keeps the
  transliterated fallback (better than a wrong fuzzy-matched Nepali string).

Run from the project root:
  python scripts/build_neu_lookup.py
"""

import json
import os
import re
import sys

ENRICHED_PATH = "d:/Teaching_Support/Election_Data_Scraper/candidates_enriched.json"
NEU_PATH      = "d:/Teaching_Support/Election_Data_Scraper/neu_candidates_full.json"
OUTPUT_PATH   = os.path.join(os.path.dirname(__file__), "..", "frontend", "public", "neu_candidates.json")

PLACEHOLDER_SPOUSE  = {"Location", "", "Parties", "Parliament Election 2082"}
MAX_CITIZENSHIP_LEN = 30   # longer strings are scraper contamination
MIN_SCORE           = 85   # minimum Ekantipur fuzzy match score to trust name_en

# NEU uses different district spellings than the upstream Election Commission JSON.
DISTRICT_FIX: dict[str, str] = {
    "Kavrepalanchowk":    "Kavrepalanchok",
    "Sindhupalchowk":     "Sindhupalchok",
    "Kapilbastu":         "Kapilvastu",
    "Nawalparasi (East)": "Nawalpur",
    "Nawalparasi (West)": "Parasi",
    "Rukum (East)":       "Rukum East",
    "Rukum (West)":       "Rukum West",
}

def normalize_label(label: str) -> str:
    m = re.match(r"^(.+?)-(\d+)$", label)
    if not m:
        return label
    district, num = m.group(1), m.group(2)
    return f"{DISTRICT_FIX.get(district, district)}-{num}"

def norm(s: str) -> str:
    """Strip non-alphanumeric and lowercase — mirrors neuLookup.ts normalize()."""
    return re.sub(r"[^a-z0-9]", "", s.lower())

def is_ascii(s: str) -> bool:
    return bool(s) and all(ord(c) < 128 for c in s)

def is_reliable(r: dict) -> bool:
    return (
        r.get("name_en_source") == "ekantipur"
        and r.get("match_score", 0) >= MIN_SCORE
        and is_ascii(r.get("name_en", ""))
    )


def build(enriched_path: str, neu_path: str, output_path: str) -> None:
    with open(enriched_path, encoding="utf-8") as f:
        enriched = json.load(f)
    with open(neu_path, encoding="utf-8") as f:
        neu_raw = json.load(f)

    print(f"Enriched records: {len(enriched)}")
    print(f"NEU records:      {len(neu_raw)}")

    # ── Build NEU lookup: (constituency_label, normalized_name) → record ──────
    neu_map: dict[str, dict] = {}
    for r in neu_raw:
        raw_label = r.get("constituency_label", "").strip()
        name      = r.get("symbol_name", "").strip()
        if not raw_label or not name:
            continue
        cl  = normalize_label(raw_label)
        key = cl.lower() + "|" + norm(name)
        if key not in neu_map:
            neu_map[key] = r

    # ── Merge: one output record per CandidateID ──────────────────────────────
    output:      list[dict] = []
    n_ekantipur  = 0
    n_neu_bio    = 0

    for r in enriched:
        cid = r["CandidateID"]
        rec: dict = {"id": cid}

        # English name — only from Ekantipur when reliable
        if is_reliable(r):
            rec["n"] = r["name_en"]
            n_ekantipur += 1

        # Bio from NEU — try to match by constituency + Ekantipur name,
        # then by constituency + transliterated name (name_np → ASCII via norm)
        district_en    = r.get("district_en", "")
        const_id       = r.get("SCConstID", "")
        cl             = f"{district_en}-{const_id}"

        neu_rec = None
        if rec.get("n"):
            neu_rec = neu_map.get(cl.lower() + "|" + norm(rec["n"]))

        if neu_rec:
            n_neu_bio += 1
            father      = neu_rec.get("father", "").strip()
            spouse      = neu_rec.get("spouse", "").strip()
            citizenship = neu_rec.get("citizenship", "").strip()
            if father and father not in ("", "Parties"):
                rec["f"] = father
            if spouse and spouse not in PLACEHOLDER_SPOUSE:
                rec["s"] = spouse
            if citizenship and len(citizenship) <= MAX_CITIZENSHIP_LEN:
                rec["h"] = citizenship

        output.append(rec)

    os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, separators=(",", ":"))

    size_kb = os.path.getsize(output_path) / 1024
    print(f"Output records:   {len(output)}")
    print(f"Ekantipur names:  {n_ekantipur}  (reliable English name_en)")
    print(f"NEU bio matched:  {n_neu_bio}  (English father/spouse/hometown)")
    print(f"Written to:       {os.path.abspath(output_path)}")
    print(f"File size:        {size_kb:.1f} KB")


if __name__ == "__main__":
    for path in (ENRICHED_PATH, NEU_PATH):
        if not os.path.exists(path):
            print(f"ERROR: Input not found: {path}", file=sys.stderr)
            sys.exit(1)
    build(ENRICHED_PATH, NEU_PATH, OUTPUT_PATH)
