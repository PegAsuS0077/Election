# Upstream API Discovery Report
## `result.election.gov.np` — प्रतिनिधि सभा निर्वाचन, २०८२ (House of Representatives Election 2082 BS / 2026 AD)

**Discovery date:** 2026-02-23
**Method:** Playwright headless Chromium + manual HTTP probing (curl)
**Election day:** 2026-03-05 (Falgun 22, 2082 BS)

---

## 1. High-Level Summary

The site (`result.election.gov.np`) is currently a **candidate nomination browser**, not a live results board. The page title is **"मतगणना प्रगतिको विवरण"** (Vote Count Progress Details).

**Architecture:** It is a **static-file server**, not a REST API. All data comes from pre-built JSON/text files served directly by an IIS/nginx web server. There is:

- **No REST API layer** — `/api/*` returns 404.
- **No GraphQL** endpoint.
- **No WebSocket** on the server (our backend will add one).
- **No robots.txt** (404).
- **No server-side pagination** — all query params (`page=`, `rows=`) are ignored; the server always returns the full dataset.

**Frontend stack:** jQuery + jqGrid (with `loadonce: true` for client-side pagination/filtering) + Knockout.js (for the candidate detail modal) + Bootstrap.

**Data status (pre-election):**
- `TotalVoteReceived` = `0` for all 3,406 candidates.
- `E_STATUS` = `null` for all candidates.
- `R` (rank) = `1` for all candidates.
- These **will populate on election day** (2026-03-05) as counting progresses.

---

## 2. Endpoint Catalog

| # | Method | URL | Content-Type | Size | Auth | Description |
|---|--------|-----|-------------|------|------|-------------|
| **1** | `GET` | `/JSONFiles/ElectionResultCentral2082.txt` | `text/plain` (valid JSON with UTF-8 BOM) | ~700 KB | None | **Primary data feed** — flat array of all 3,406 candidates with vote counts |
| **2** | `GET` | `/JSONFiles/Election2082/Local/Lookup/states.json` | `application/json` | ~250 B | None | 7 province names with IDs |
| **3** | `GET` | `/JSONFiles/Election2082/Local/Lookup/districts.json` | `application/json` | ~3 KB | None | 79 district names with province parent IDs |
| **4** | `GET` | `/JSONFiles/StateName.txt` | `text/plain` (JSON) | ~130 B | None | Flat array of 7 province name strings (jqGrid filter values) |
| **5** | `GET` | `/JSONFiles/DistrictName.txt` | `text/plain` (JSON) | ~700 B | None | Flat array of 77 district name strings (jqGrid filter values) |
| **6** | `GET` | `/Images/Candidate/{CandidateID}.jpg` | `image/jpeg` | varies | None | Candidate photo (not all candidates have photos) |
| **7** | `GET` | `/Images/pratinidhi-sabha.png` | `image/png` | — | None | Election banner image |

**All other paths return 404 or 403.** The `JSONFiles/` directory itself returns 403 (no directory listing).

### Pagination / Filtering Behavior

The jqGrid passes parameters like `?_search=false&nd=1708600000&rows=10&page=2&sidx=_id&sord=desc` but **the server ignores all query parameters** and always returns the full 3,406-record array. Filtering and pagination are handled entirely client-side by jqGrid's `loadonce: true` mode.

### Update Frequency

The file is a static artifact; on election day the server will presumably regenerate it periodically (every 30–60 seconds) as counting data comes in. Our backend should **poll endpoint #1 every 30 seconds** and diff the result to detect changes.

---

## 3. Data Model

### 3.1 Primary Record — Candidate (from `ElectionResultCentral2082.txt`)

Each record in the flat JSON array represents **one candidate in one constituency**. There are 3,406 records total across 165 constituencies.

```json
{
  "CandidateID":   339933,
  "CandidateName": "क्षितिज थेबे",
  "AGE_YR":        38,
  "Gender":        "पुरुष",

  "PoliticalPartyName": "नेपाल कम्युनिष्ट पार्टी (एकीकृत मार्क्सवादी लेनिनवादी)",
  "SYMBOLCODE":    2598,
  "SymbolName":    "सुर्य",

  "StateName":     "कोशी प्रदेश",
  "STATE_ID":      1,
  "DistrictName":  "ताप्लेजुङ",
  "CTZDIST":       "ताप्लेजुङ",
  "SCConstID":     1,
  "ConstName":     1,

  "TotalVoteReceived": 0,
  "R":             1,
  "E_STATUS":      null,

  "DOB":           38,
  "FATHER_NAME":   "भुपेन्द्र थेबे",
  "SPOUCE_NAME":   "-",
  "QUALIFICATION": "स्नातक",
  "NAMEOFINST":    "TU",
  "EXPERIENCE":    "0",
  "OTHERDETAILS":  "0",
  "ADDRESS":       "ताप्लेजुङ सिरीजङ्घा गाउँपालिका मादिबुङ"
}
```

### 3.2 Field Dictionary

| Field | Type | Notes |
|-------|------|-------|
| `CandidateID` | `int` | Unique candidate identifier; also used as image filename: `/Images/Candidate/{id}.jpg` |
| `CandidateName` | `string` | Full name in Nepali Devanagari |
| `AGE_YR` | `int` | Age in years |
| `DOB` | `int` | Duplicates `AGE_YR` (same value) — actual DOB is not exposed |
| `Gender` | `string` | `"पुरुष"` (Male) \| `"महिला"` (Female) \| `"अन्य"` (Other) |
| `PoliticalPartyName` | `string` | Full Nepali party name (66 unique values); `"स्वतन्त्र"` = Independent |
| `SYMBOLCODE` | `int` | Numeric election symbol code |
| `SymbolName` | `string` | Nepali name of the election symbol (e.g., `"रुख"` = Tree for NC, `"सुर्य"` = Sun for CPN-UML) |
| `StateName` | `string` | Province name (7 values) |
| `STATE_ID` | `int` | Province ID 1–7 |
| `DistrictName` | `string` | District name in Nepali |
| `CTZDIST` | `string` | Duplicate of `DistrictName` (same value always) |
| `SCConstID` | `int` | **Constituency number within the district** (1–10, not a global ID) |
| `ConstName` | `int` | Duplicate of `SCConstID` |
| `TotalVoteReceived` | `int` | **Votes received** — `0` pre-election; populated on election day |
| `R` | `int` | **Rank within constituency** — `1` for all pre-election; winner = lowest R with votes > 0 |
| `E_STATUS` | `string\|null` | **Election status** — `null` pre-election; expected values on election day: `"W"` (Winner) or similar |
| `FATHER_NAME` | `string` | Father's name |
| `SPOUCE_NAME` | `string` | Spouse's name (note: typo in upstream — "SPOUCE") |
| `QUALIFICATION` | `string\|null` | Education level in Nepali (e.g., `"स्नातक"` = Bachelor's); can be `null` |
| `NAMEOFINST` | `string` | Institution name for qualification |
| `EXPERIENCE` | `string` | Political experience (often `"0"`) |
| `OTHERDETAILS` | `string` | Other details (often `"0"`) |
| `ADDRESS` | `string` | Permanent address |

### 3.3 Critical Note: Constituency Key

`SCConstID` is **NOT a global constituency ID**. It is the constituency number **within each district**. The true global constituency identifier is the composite key:

```
(STATE_ID, DistrictName, SCConstID)
```

There are **165 unique constituencies** from this 3-part key. Example:
- `(1, "ताप्लेजुङ", 1)` → Taplejung Constituency 1
- `(3, "काठमाडौं", 1)` → Kathmandu Constituency 1
- `(3, "काठमाडौं", 2)` → Kathmandu Constituency 2

### 3.4 Province Lookup (`states.json`)

```json
[
  {"id": 1, "name": "कोशी प्रदेश"},
  {"id": 2, "name": "मधेश प्रदेश"},
  {"id": 3, "name": "बागमती प्रदेश"},
  {"id": 4, "name": "गण्डकी प्रदेश"},
  {"id": 5, "name": "लुम्बिनी प्रदेश"},
  {"id": 6, "name": "कर्णाली प्रदेश"},
  {"id": 7, "name": "सुदूरपश्चिम प्रदेश"}
]
```

### 3.5 District Lookup (`districts.json`)

79 districts. Each record:
```json
{"id": 1, "name": "ताप्लेजुङ", "parentId": 1}
```
`parentId` = province `id`.

### 3.6 Party Name → Party Key Mapping (PARTY_MAP)

The 66 registered parties reduce to these key parties for our dashboard. Mapping from `PoliticalPartyName` to our `PartyKey`:

```python
PARTY_MAP = {
    "नेपाली काँग्रेस":                                                    "NC",
    "नेपाल कम्युनिष्ट पार्टी (एकीकृत मार्क्सवादी लेनिनवादी)":          "CPN-UML",
    "नेपाल कम्युनिस्ट पार्टी (माओवादी)":                                 "NCP",       # verify exact string on election day
    "राष्ट्रिय स्वतन्त्र पार्टी":                                         "RSP",
    "राष्ट्रिय प्रजातन्त्र पार्टी":                                       "RPP",
    "जनता समाजवादी पार्टी, नेपाल":                                        "JSP",
    "स्वतन्त्र":                                                           "IND",
    # All other 59 parties → "OTH"
}
```

> **Election-day action:** Open the live site in DevTools, confirm the exact `PoliticalPartyName` strings for NCP/Maoist — there are two similarly named parties (`नेपाल कम्युनिष्ट पार्टी (माओवादी)` and `नेपाल कम्युनिस्ट पार्टी (माओवादी)`) and the correct one for the 2026 coalition must be verified.

### 3.7 Winner Determination Logic

On election day, a constituency winner will be identified by:
1. `E_STATUS` becomes non-null (likely `"W"` for winner, `"D"` for declared, or similar)
2. AND/OR `R == 1` with `TotalVoteReceived > 0`
3. AND/OR the candidate with `max(TotalVoteReceived)` per `(STATE_ID, DistrictName, SCConstID)` group

Our scraper should implement all three checks and use whichever is non-null.

---

## 4. Normalized Schema for Our Backend

```
Election
  id            INT PK
  name_np       TEXT  -- "प्रतिनिधि सभा निर्वाचन, २०८२"
  name_en       TEXT  -- "House of Representatives Election 2082"
  year_bs       INT   -- 2082
  year_ad       INT   -- 2026
  election_type TEXT  -- "FPTP" | "PR"
  status        TEXT  -- "upcoming" | "ongoing" | "completed"
  last_updated  TEXT  -- ISO timestamp

Province
  id        INT PK   -- STATE_ID (1–7)
  name_np   TEXT
  name_en   TEXT?

District
  id          INT PK   -- from districts.json
  name_np     TEXT
  province_id INT FK → Province.id

Constituency
  id             TEXT PK   -- "{STATE_ID}-{DistrictName}-{SCConstID}" composite
  state_id       INT FK → Province.id
  district_name  TEXT
  number         INT       -- SCConstID (within district)
  name_np        TEXT      -- "प्रतिनिधि सभा क्षेत्र {number}"
  total_candidates INT

Party
  id           TEXT PK    -- PartyKey e.g. "NC"
  name_np      TEXT       -- full Nepali name (first seen)
  symbol       TEXT       -- SymbolName
  symbol_code  INT        -- SYMBOLCODE

Candidate
  id               INT PK   -- CandidateID
  name_np          TEXT
  age              INT
  gender           TEXT      -- "पुरुष" | "महिला" | "अन्य"
  party_id         TEXT FK → Party.id
  constituency_id  TEXT FK → Constituency.id
  symbol           TEXT
  symbol_code      INT
  qualification    TEXT?
  institution      TEXT?
  experience       TEXT?
  father_name      TEXT?
  spouse_name      TEXT?
  address          TEXT?
  photo_url        TEXT?     -- "/Images/Candidate/{CandidateID}.jpg"

Result             -- updated every scrape cycle
  candidate_id     INT FK → Candidate.id
  votes            INT       -- TotalVoteReceived
  rank             INT       -- R
  status           TEXT?     -- E_STATUS
  is_winner        BOOL      -- derived
  scraped_at       TEXT      -- ISO timestamp

Snapshot           -- aggregated per scrape cycle
  id               INT PK AUTOINCREMENT
  scraped_at       TEXT
  declared_seats   INT       -- count of constituencies with winner
  seat_tally       TEXT      -- JSON: {NC: {fptp, pr}, ...}
  total_votes_cast INT       -- sum of all TotalVoteReceived
```

---

## 5. Backend Scaffold Plan

### 5.1 Revised `scraper.py`

The original plan assumed HTML parsing. **Change to direct JSON fetch:**

```python
# backend/scraper.py
import httpx, json, asyncio
from typing import Any

UPSTREAM_URL = "https://result.election.gov.np/JSONFiles/ElectionResultCentral2082.txt"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (compatible; NepalElectionBot/1.0; +https://localhost)",
    "Accept": "application/json, text/plain, */*",
}

PARTY_MAP: dict[str, str] = {
    "नेपाली काँग्रेस":                                                   "NC",
    "नेपाल कम्युनिष्ट पार्टी (एकीकृत मार्क्सवादी लेनिनवादी)":         "CPN-UML",
    "नेपाल कम्युनिस्ट पार्टी (माओवादी)":                                "NCP",
    "राष्ट्रिय स्वतन्त्र पार्टी":                                        "RSP",
    "राष्ट्रिय प्रजातन्त्र पार्टी":                                      "RPP",
    "जनता समाजवादी पार्टी, नेपाल":                                       "JSP",
    "स्वतन्त्र":                                                          "IND",
}

async def fetch_candidates() -> list[dict[str, Any]]:
    """Fetch the full candidate+results array from the upstream static file."""
    async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
        resp = await client.get(UPSTREAM_URL, headers=HEADERS)
        resp.raise_for_status()
        raw = resp.content
        if raw.startswith(b"\xef\xbb\xbf"):      # strip UTF-8 BOM
            raw = raw[3:]
        return json.loads(raw.decode("utf-8"))

def map_party(party_name: str) -> str:
    return PARTY_MAP.get(party_name, "OTH")

def constituency_id(record: dict) -> str:
    """Derive a stable global constituency key from the composite."""
    return f"{record['STATE_ID']}-{record['DistrictName']}-{record['SCConstID']}"

def is_winner(record: dict) -> bool:
    """Determine winner status from available fields."""
    if record.get("E_STATUS") is not None:
        return True  # any non-null status = declared
    if record.get("R") == 1 and record.get("TotalVoteReceived", 0) > 0:
        return True
    return False

async def scrape_results(url: str = UPSTREAM_URL) -> list[dict]:
    """Main entry point for the background scraper loop."""
    candidates = await fetch_candidates()
    return candidates
```

### 5.2 FastAPI Routes

```python
# backend/main.py — route overview

GET  /api/snapshot          # → Snapshot: totalSeats, declaredSeats, seatTally, lastUpdated
GET  /api/constituencies    # → list[ConstituencyResult] (all 165)
GET  /api/constituencies/{id}  # → single constituency with all candidates + votes
GET  /api/parties           # → list[Party] with seat counts
GET  /api/candidates/{id}   # → single Candidate with latest votes
WS   /ws                    # → live push every scrape cycle
```

### 5.3 Caching Strategy

| Layer | TTL | Mechanism | Notes |
|-------|-----|-----------|-------|
| In-memory (dict) | 30 s | Python `asyncio.Lock` + timestamp check | Zero latency for API reads |
| SQLite (disk) | permanent | 3 tables: `candidates`, `results`, `snapshots` | Survives restart; queryable |
| HTTP `Cache-Control` | 25 s | FastAPI response headers | Allows CDN/browser caching |

**Polling interval:** 30 seconds (matches current plan). On election day, consider reducing to 15 seconds during peak counting hours.

### 5.4 Error Handling

| Scenario | Handling |
|----------|----------|
| Upstream returns non-200 | Log + serve stale data from SQLite |
| JSON parse error (BOM missing / partial write) | Log + serve stale; retry next cycle |
| Network timeout | `httpx.Timeout(30.0)` — fail open with stale data |
| Rate limiting (HTTP 429) | Exponential backoff; log; serve stale |
| `TotalVoteReceived` remains 0 post-election | Alert log: "no votes detected — verify upstream" |

### 5.5 Election-Day Checklist for Scraper

1. Confirm `ElectionResultCentral2082.txt` is actually updated (compare `TotalVoteReceived` sum across cycles)
2. Check if a different filename is used for live results (e.g., `ElectionResultFinal2082.txt`)
3. Verify `E_STATUS` values that appear and update `is_winner()` logic
4. Update `PARTY_MAP` with any corrections to exact Nepali party name strings
5. Check if a separate PR (Proportional Representation) results file appears: try `/JSONFiles/ElectionResultPR2082.txt`

---

## 6. Frontend UX Plan

### 6.1 Pages & Screens

#### A. Overview Dashboard (`/`)
**Components:** SummaryCards, SeatShareBars, NepalMap, ConstituencyTable

- **Header:** Election name (Nepali + English), last-updated timestamp, "LIVE" badge
- **SummaryCards:** Declared X / 165 seats, leading party, total votes counted
- **SeatShareBars:** Horizontal bar — NC | CPN-UML | NCP | RSP | OTH with seat counts
- **NepalMap:** Province-colored SVG; click province to filter table
- **ConstituencyTable:** Virtualized (react-window); columns: Province, District, Constituency #, Leading Candidate, Party, Votes, Status

#### B. Constituency Detail (`/constituency/:id`)
- Candidate cards sorted by votes (descending)
- Progress bar: votes counted vs total registered voters (if available)
- Winner banner (once `E_STATUS` set)
- Candidate detail modal: photo, name, party, age, gender, education, address

#### C. Party Summary (`/parties`)
- Grid of party cards: logo/symbol, full name, seats won, seats leading
- Click → filtered constituency table

#### D. Search (`/search`)
- Full-text search across candidate names (Nepali Unicode search)
- Filter by: Province, District, Party, Gender, Status (Declared / Counting)

#### E. Admin Panel (`/admin`) — already implemented

### 6.2 State Management

Existing Zustand store is adequate. Extend `electionStore` with:
```typescript
// Additional state
candidates: Candidate[]          // raw upstream records (all 3406)
constituencies: ConstituencyResult[]  // derived/aggregated
parties: PartyResult[]           // derived
lastScrapedAt: string | null
```

### 6.3 Key Components

| Component | Data source | Notes |
|-----------|------------|-------|
| `CandidatePhoto` | `/Images/Candidate/{id}.jpg` | Fallback to initials avatar if 404 |
| `ConstituencyCard` | Derived from candidates grouped by composite key | Show top 2 candidates |
| `PartySymbol` | `SymbolName` field | Map to SVG or use text badge |
| `VoteCountUp` | `TotalVoteReceived` | Animate on WebSocket update |
| `GenderBadge` | `Gender` field | Color-coded pill |

### 6.4 i18n Strategy (Nepali First)

All upstream data is **Nepali-only** (no English translations provided). Strategy:

1. **Display as-is** for all upstream Nepali strings (province, district, party, candidate names)
2. **Provide English fallbacks** only for static UI chrome (labels, headings, buttons)
3. Use a lightweight i18n map for the 7 provinces, key parties, and UI labels:

```typescript
const EN_MAP = {
  "कोशी प्रदेश":          "Koshi Province",
  "मधेश प्रदेश":          "Madhesh Province",
  "बागमती प्रदेश":        "Bagmati Province",
  "गण्डकी प्रदेश":        "Gandaki Province",
  "लुम्बिनी प्रदेश":      "Lumbini Province",
  "कर्णाली प्रदेश":       "Karnali Province",
  "सुदूरपश्चिम प्रदेश":   "Sudurpashchim Province",
  "पुरुष":                 "Male",
  "महिला":                 "Female",
  "अन्य":                  "Other",
  "स्नातक":                "Bachelor's",
  "स्नातकोत्तर":           "Master's",
};
```

4. User toggle: `NP | EN` in the header to switch label language.
5. Use `Intl.Collator` with `locale: "ne"` for correct Devanagari sorting.

---

## 7. Risks & Limitations

| Risk | Severity | Mitigation |
|------|----------|------------|
| **Data file URL changes on election day** | High | Monitor `result.election.gov.np` the day before; check DevTools on election morning |
| **`TotalVoteReceived` stays 0** (data not yet live) | High | Alert + fallback UI: "Counting not yet started" |
| **Different file for live results** (e.g., `ElectionResultFinal2082.txt`) | Medium | Probe several filename variations on election day |
| **`E_STATUS` field values unknown** (null currently) | Medium | Log all non-null values as they appear; update logic |
| **NCP exact party name string** (two variants found) | Medium | Verify in live data; both may appear if party split |
| **Server rate-limiting** (no `robots.txt`, but IIS may block rapid polling) | Medium | 30 s interval + User-Agent identification string |
| **Candidate photos may be missing** (404 for many IDs) | Low | Graceful fallback to initials avatar |
| **No PR (Proportional Representation) data file found yet** | Medium | Re-probe `/JSONFiles/ElectionResultPR2082.txt` on election day |
| **`DOB` field = same as `AGE_YR`** — no actual birth date | Low | Display age only, not birth date |
| **`CTZDIST` duplicates `DistrictName`** — redundant field | Low | Ignore `CTZDIST` in our schema |
| **Constituency count in data = 10 at SCConstID level** — misleading | Medium | Always use composite key `(STATE_ID, DistrictName, SCConstID)` |
| **No total registered voters per constituency** | Medium | Cannot show "% counted"; only raw vote totals |

---

## 8. Immediate Actions Before Election Day

1. **Re-run this discovery script** on 2026-03-04 (day before election) to confirm the data file URL and check if a PR results file has been added.
2. **Update `PARTY_MAP`** in `backend/scraper.py` with the two NCP variants once confirmed.
3. **Update `backend/tests/fixtures/fptp_results.html`** → actually now it should be `fptp_results.json` since the data is JSON, not HTML. Rename the fixture and update `test_scraper.py`.
4. **Update `parse_fptp_html()`** → rename to `parse_candidates_json()` and update to process the JSON array directly.
5. Smoke-test on election morning:
   ```bash
   python -c "
   import asyncio
   from backend.scraper import fetch_candidates
   cands = asyncio.run(fetch_candidates())
   votes = sum(c['TotalVoteReceived'] for c in cands)
   print(f'{len(cands)} candidates, {votes} total votes')
   "
   ```

---

## Appendix A: Constituency Composite Key Table (sample)

| STATE_ID | DistrictName | SCConstID | Province (EN) |
|----------|-------------|-----------|---------------|
| 1 | ताप्लेजुङ | 1 | Koshi |
| 1 | पाँचथर | 1 | Koshi |
| 1 | इलाम | 1 | Koshi |
| 1 | इलाम | 2 | Koshi |
| 3 | काठमाडौं | 1 | Bagmati |
| 3 | काठमाडौं | 2 | Bagmati |
| 3 | काठमाडौं | 3 | Bagmati |
| … | … | … | … |

There are **165 total combinations** confirmed from the live data.

## Appendix B: All 66 Registered Parties

```
 राष्ट्रिय नागरिक पार्टी
आम जनता पार्टी(एकल चुनाव चिन्ह)
इतिहासिक जनता पार्टी
उज्यालो नेपाल पार्टी
गतिशील लोकतान्त्रिक पार्टी
गान्धीवादी पार्टी नेपाल
जन अधिकार पार्टी
जनता लोकतान्त्रिक पार्टी, नेपाल
जनता समाजवादी पार्टी(एकल चुनाव चिन्ह)
जनता समाजवादी पार्टी, नेपाल
जनमत पार्टी
जनादेश पार्टी नेपाल(एकल चुनाव चिन्ह)
जय मातृभूमि पार्टी
त्रिमूल नेपाल
नागरिक उन्मुक्ति पार्टी, नेपाल(एकल चुनाव चिन्ह)
नागरिक सर्वोच्चता पार्टी नेपाल(एकल चुनाव चिन्ह)
नेपाल कम्युनिष्ट पार्टी (एकीकृत मार्क्सवादी लेनिनवादी)
नेपाल कम्युनिष्ट पार्टी (माक्र्सवादी)(एकल चुनाव चिन्ह)
नेपाल कम्युनिष्ट पार्टी (संयुक्त)
नेपाल कम्युनिष्ट पार्टी मार्क्सवादी (पुष्पलाल)
नेपाल कम्युनिस्ट पार्टी (माओवादी)
नेपाल जनता पार्टी
नेपाल जनता संरक्षण पार्टी
नेपाल जनमुक्ति पार्टी
नेपाल जनसेवा पार्टी
नेपाल मजदुर किसान पार्टी
नेपाल मातृभूमि पार्टी
नेपाल मानवतावादी पार्टी
नेपाल लोकतान्त्रिक पार्टी
नेपाल संघीय समाजवादी पार्टी(एकल चुनाव चिन्ह)
नेपाल सद्भावना पार्टी
नेपालका लागि नेपाली पार्टी
नेपाली कम्युनिष्ट पार्टी
नेपाली काँग्रेस
नेपाली जनता दल
नेपाली जनश्रमदान संस्कृति पार्टी
नेशनल रिपब्लिक नेपाल
पिपुल फर्ष्ट पार्टी
प्रगतिशील लोकतान्त्रिक पार्टी
प्रजातान्त्रिक पार्टी नेपाल
बहुजन एकता पार्टी नेपाल(एकल चुनाव चिन्ह)
बहुजन शक्ति पार्टी
मंगोल नेशनल अर्गनाइजेसन
मितेरी पार्टी नेपाल
युनाईटेड नेपाल डिमोक्रयाटीक पार्टी
राष्ट्र निर्माण दल नेपाल
राष्ट्रिय उर्जाशील पार्टी, नेपाल
राष्ट्रिय एकता दल
राष्ट्रिय जनता पार्टी नेपाल
राष्ट्रिय जनमत पार्टी
राष्ट्रिय जनमुक्ति पार्टी
राष्ट्रिय जनमोर्चा
राष्ट्रिय परिवर्तन पार्टी
राष्ट्रिय प्रजातन्त्र पार्टी
राष्ट्रिय मुक्ति आन्दोलन, नेपाल
राष्ट्रिय मुक्ति पार्टी नेपाल(एकल चुनाव चिन्ह)
राष्ट्रिय साझा पार्टी
राष्ट्रिय स्वतन्त्र पार्टी
श्रम संस्कृति पार्टी
संघीय लोकतान्त्रिक राष्ट्रिय मञ्च
संयुक्त नागरिक पार्टी
समावेशी समाजवादी पार्टी
समावेशी समाजवादी पार्टी नेपाल
सार्वभौम नागरिक पार्टी
स्वतन्त्र
स्वाभिमान पार्टी
```
