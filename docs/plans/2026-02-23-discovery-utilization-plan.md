# Discovery Utilization Plan
## Based on `2026-02-23-upstream-api-discovery.md`

**Created:** 2026-02-23
**Status:** Active — implements the 10 gaps identified between the discovery doc and the current codebase

---

## Project State Snapshot (as of 2026-03-03)

> **Architecture has changed.** The original FastAPI + SQLite + WebSocket backend has been replaced by a spike-safe CDN-first architecture. FastAPI/SQLite/WebSocket are removed; the producer is now a Cloudflare Worker, Render Background Worker, or GitHub Actions script that writes to Cloudflare R2.

| Layer | Status |
|-------|--------|
| Frontend — all features | ✅ Complete |
| Scraper (httpx + JSON) | ✅ Complete — `backend/scraper.py` |
| Backend — spike-safe producer | ✅ Complete — `backend/worker.py`, `backend/publish_to_r2.py`, `worker/` |
| Cloudflare Worker (TypeScript) | ✅ Complete — `worker/src/index.ts` |
| R2 upload helper | ✅ Complete — `backend/r2.py` |
| Frontend LIVE mode (CDN polling) | ✅ Complete — `VITE_RESULTS_MODE=live` |
| Frontend ARCHIVE mode (proxy + zero) | ✅ Complete — `lib/archiveData.ts` |
| Types (`types.ts`) | ✅ Complete — canonical TypeScript types |
| Party registry (dynamic) | ✅ Complete — `lib/partyRegistry.ts` |
| i18n (NP/EN toggle) | ✅ Complete — `i18n.ts` |
| New pages (parties, candidates, search, etc.) | ✅ Complete — see `pages/` |
| FastAPI server (`main.py`) | ❌ Removed — legacy, safe to delete |
| SQLite layer (`database.py`) | ❌ Removed — legacy, safe to delete |
| WebSocket | ❌ Removed — replaced by CDN polling |
| Vite proxy for `/api` + `/ws` | ❌ Not needed — architecture changed |

---

## Gap Inventory & Fix Plan

### Gap 1 — Scraper uses Playwright/HTML; must use httpx/JSON

**Discovery finding (§5.1):** The upstream site serves a static JSON file, not HTML. Playwright is unnecessary overhead.

**Fix:** Rewrite `backend/scraper.py` to:
- Use `httpx.AsyncClient` only (no Playwright import)
- Fetch `https://result.election.gov.np/JSONFiles/ElectionResultCentral2082.txt`
- Strip UTF-8 BOM (`\xef\xbb\xbf`) before parsing
- Implement `constituency_id()`, `map_party()`, `is_winner()` as specified in §5.1
- Remove `playwright` from `requirements.txt`; replace with `httpx` (already listed but was for testing only)

**Files:** `backend/scraper.py`, `backend/requirements.txt`
**Tests:** `backend/tests/test_scraper.py` — update fixture to `fptp_results.json` (not HTML)

---

### Gap 2 — Fixture is `.html`; must be `.json`

**Discovery finding (§8, point 3):** The upstream data is JSON, so the test fixture must be a JSON file.

**Fix:**
- Rename `backend/tests/fixtures/fptp_results.html` → `fptp_results.json`
- Populate with a realistic 5–10 record subset of the real JSON schema from §3.1
- Update `test_scraper.py` to load `fptp_results.json`

**Files:** `backend/tests/fixtures/fptp_results.json`, `backend/tests/test_scraper.py`

---

### Gap 3 — Missing API endpoints

**Discovery finding (§5.2):** Three endpoints specified but not in the original 9-task plan:
- `GET /api/constituencies/{id}` — single constituency with all candidates
- `GET /api/parties` — party list with seat counts
- `GET /api/candidates/{id}` — single candidate with vote history

**Fix:** Add these routes to `backend/main.py` with corresponding database queries in `backend/database.py`.

**Files:** `backend/main.py`, `backend/database.py`
**Tests:** Add to `backend/tests/test_api.py`

---

### Gap 4 — PARTY_MAP incomplete (RPP and JSP missing)

**Discovery finding (§3.6):** `PARTY_MAP` maps 7 parties. However:
- `RPP` ("राष्ट्रिय प्रजातन्त्र पार्टी") is in the discovery map ✅
- `JSP` ("जनता समाजवादी पार्टी, नेपाल") is in the discovery map ✅
- Both exist in our `mockData.ts` `PartyKey` type
- The discovery doc's Python `PARTY_MAP` does include them — but our `mockData.ts` `parties` dict also needs these verified

**Fix:** Cross-check `backend/scraper.py`'s `PARTY_MAP` against `mockData.ts` `parties` — they must map the same 8 keys. The NCP Maoist exact string (ष vs स distinction) must be handled by trying both variants.

**Files:** `backend/scraper.py`

---

### Gap 5 — Mock data: wrong shape, missing Devanagari, only 65/165 constituencies

**Discovery finding (§3.1, §3.3):** The real data shape:
- Composite key: `(STATE_ID, DistrictName, SCConstID)` — not `"TAP-1"` codes
- All strings are Nepali Devanagari (candidate names, districts, parties)
- 165 constituencies total; mock has ~65
- `totalVoters` field: real data has NO registered voter count per constituency — we invented these
- Actual candidate count per constituency averages ~21 (3406 / 165)

**Fix (realistic mock):** Rebuild `frontend/src/mockData.ts` to:
1. Use composite keys matching the real format: `{ stateId, districtName, scConstId }` as the constituency ID
2. Add Nepali names for all 165 constituencies using the real district/province structure
3. Include at least the top 3 candidates per constituency with realistic vote counts based on 2022 election results
4. Add `candidateId` field (matching real `CandidateID` integers) so photo URLs work
5. Remove invented `totalVoters` field (replace with `null` or omit — real API doesn't have it)
6. Add `nameNp` field alongside `name` English field
7. Ensure all 7 provinces have correct seat counts: Koshi 28, Madhesh 32, Bagmati 35, Gandaki 25, Lumbini 32, Karnali 25, Sudurpashchim 23 (= 200 FPTP seats; 75 PR seats for 275 total)

**Files:** `frontend/src/mockData.ts`

---

### Gap 6 — i18n: NP/EN toggle not implemented

**Discovery finding (§6.4):** All upstream data is Nepali-only. Strategy:
- Display upstream Nepali strings as-is
- Provide English fallbacks only for UI chrome + the 7 province names, party names, gender, education
- `NP | EN` toggle in header
- `Intl.Collator` with `locale: "ne"` for sorting

**Fix:**
1. Create `frontend/src/i18n.ts` with the `EN_MAP` from §6.4 + party name translations
2. Add `lang: "np" | "en"` to Zustand store (already has a skeleton `dark` toggle to follow)
3. Add `NP | EN` toggle button to the header in `App.tsx`
4. Use `i18n.ts` in `NepalMap`, `ConstituencyTable`, `ProvinceSummary` for province names

**Files:** `frontend/src/i18n.ts` (new), `frontend/src/store/electionStore.ts`, `frontend/src/App.tsx`

---

### Gap 7 — Candidate photos not integrated

**Discovery finding (§6.3, §3.2):** Each candidate has an ID (`CandidateID`) which maps to a photo URL:
`https://result.election.gov.np/Images/Candidate/{CandidateID}.jpg`

**Fix:**
1. Add `candidateId?: number` to the frontend `Candidate` type in `mockData.ts`
2. Create `frontend/src/CandidatePhoto.tsx` component — img with initials-avatar fallback on 404
3. Use it in `DetailsModal` inside `ConstituencyTable.tsx`

**Files:** `frontend/src/mockData.ts`, `frontend/src/CandidatePhoto.tsx` (new), `frontend/src/ConstituencyTable.tsx`

---

### Gap 8 — New pages not implemented

**Discovery finding (§6.1):** Three new pages planned:

#### B. `/constituency/:id` — Constituency Detail
- Candidate cards sorted by votes descending
- Winner banner when `E_STATUS` set
- Candidate photo + name + party + age + gender + education + address
- No vote % (no total voters in upstream data — remove progress bar or show raw votes only)

#### C. `/parties` — Party Summary
- Grid of party cards: symbol, full name (NP + EN), seats won, seats leading
- Click → filtered constituency table

#### D. `/search` — Candidate Search
- Full-text search across candidate names (Nepali Unicode)
- Filter by: Province, District, Party, Gender, Status
- Use `Intl.Collator locale: "ne"` for sorting results

**Fix:** Implement all three pages + add routes in `frontend/src/main.tsx`

**Files:**
- `frontend/src/pages/ConstituencyDetail.tsx` (new)
- `frontend/src/pages/PartyList.tsx` (new)
- `frontend/src/pages/SearchPage.tsx` (new)
- `frontend/src/main.tsx` (add 3 routes)

---

### Gap 9 — PR (proportional representation) not handled

**Discovery finding (§7, risk table):** No PR data file confirmed yet. Action required on election day.

**Fix (pre-election):**
- Add a `prResults` field to the Zustand store typed as `PRResult[] | null`
- Add a `GET /api/pr-snapshot` route stub in `main.py` that returns `{ available: false }` pre-election
- Add a `GET /JSONFiles/ElectionResultPR2082.txt` probe attempt in `scraper.py` (log result; don't fail)

**Files:** `backend/main.py`, `backend/scraper.py`, `frontend/src/store/electionStore.ts`

---

### Gap 10 — Zustand store missing 3 fields from discovery spec

**Discovery finding (§6.2):** Store needs:
```typescript
candidates: Candidate[]          // raw upstream records (all 3406)
constituencies: ConstituencyResult[]  // derived/aggregated
parties: PartyResult[]           // derived
lastScrapedAt: string | null
```

**Fix:** Add these fields + corresponding setters to `electionStore.ts`

**Files:** `frontend/src/store/electionStore.ts`

---

## Implementation Order (Updated 2026-03-03)

All gaps from this plan have been resolved. The architecture pivoted from FastAPI+SQLite+WebSocket to a spike-safe CDN-first design:

| Priority | Gap | Status |
|----------|-----|--------|
| 🔴 1 | Gap 1+2: Fix scraper to use httpx+JSON | ✅ Done |
| 🔴 2 | Gap 5: Rebuild realistic mock data | ✅ Done (dynamic from upstream) |
| 🟡 3 | Gap 3: Add missing API endpoints | N/A — no API server; CDN JSON instead |
| 🟡 4 | Gap 4: Fix PARTY_MAP NCP variants | ✅ Done — both spellings handled |
| 🟡 5 | Gap 6: i18n NP/EN toggle | ✅ Done — `i18n.ts` |
| 🟡 6 | Gap 7: Candidate photos | ✅ Done |
| 🟢 7 | Gap 8: New pages (parties, candidates, search) | ✅ Done — see `pages/` |
| 🟢 8 | Gap 9: PR stub | Pending — probe on election day |
| 🟢 9 | Gap 10: Zustand store fields | ✅ Done |

---

## Realistic Mock Data Design

### Province seat distribution (FPTP — 165 total)
```
Koshi Province (Province 1):           28 constituencies
Madhesh Province (Province 2):         32 constituencies
Bagmati Province (Province 3):         35 constituencies
Gandaki Province (Province 4):         25 constituencies
Lumbini Province (Province 5):         32 constituencies
Karnali Province (Province 6):         25 constituencies
Sudurpashchim Province (Province 7):   23 constituencies
Total FPTP:                           200 seats
+ PR seats:                            75 seats
Grand Total:                          275 seats
```

### Vote count realism (based on 2022 election patterns)
- Koshi/Bagmati urban: 60,000–85,000 registered voters; 65–75% turnout
- Madhesh Terai: 70,000–95,000 registered voters; 70–80% turnout
- Karnali/Sudurpashchim hills: 20,000–55,000 registered voters; 75–85% turnout
- Winner margin: typically 2,000–8,000 votes (tight races)

### 2022 election result reference (seat counts, FPTP)
```
NC:      57 seats  (target for 2026 simulation: 48–62)
CPN-UML: 78 seats  (target: 70–85)
NCP:     18 seats  (target: 15–22)
RSP:     20 seats  (target: 18–28)
RPP:      7 seats  (target: 5–10)
JSP:      7 seats  (target: 5–8)
IND:      5 seats  (target: 3–7)
OTH:      8 seats  (target: 5–10)
```

### Candidate ID ranges (from real data)
Real `CandidateID` values cluster around 300,000–400,000. Mock IDs should use this range so photo URL construction (`/Images/Candidate/{id}.jpg`) is structurally correct (even if photos don't load in dev).

---

## Key Data Corrections for Mock

1. **Remove `totalVoters` as a reliable field** — upstream has no such field. Replace with `registeredVoters?: number` marked as estimated.
2. **Add `candidateId: number`** to `Candidate` type for photo URL construction.
3. **Add `nameNp: string`** to `ConstituencyResult` for Devanagari display.
4. **`districtName` in Devanagari** alongside English transliteration.
5. **Composite `code` format:** Change from `"TAP-1"` to `"1-ताप्लेजुङ-1"` matching real API's `constituency_id()` format.
6. **Status values:** Add `"PENDING"` as a third status (pre-counting) alongside `"DECLARED"` and `"COUNTING"`.

---

## Election Day Checklist (from discovery §8, consolidated)

- [ ] Re-run discovery script on 2026-03-04 to confirm data file URL
- [ ] Confirm `ElectionResultCentral2082.txt` is updating (sum `TotalVoteReceived` > 0)
- [ ] Probe `/JSONFiles/ElectionResultPR2082.txt` for PR data
- [ ] Confirm exact `E_STATUS` values as they appear
- [ ] Verify NCP exact party name string (ष vs स)
- [ ] Update `PARTY_MAP` in `backend/scraper.py`
- [ ] Rename fixture: `fptp_results.html` → `fptp_results.json`
- [ ] Run smoke test: `python -c "import asyncio; from backend.scraper import fetch_candidates; ..."`
- [ ] Run full `pytest -v` before going live
