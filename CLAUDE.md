# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Nepal Election Live Vote Counter — a real-time election results dashboard for Nepal's House of Representatives general election (March 5, 2026).

**Current state (as of 2026-02-23):**
- Frontend: fully implemented (all 20 roadmap features complete)
- Backend: fully scaffolded and implemented (Tasks 1–4 complete, 33 tests passing)
- Election-day readiness: validated — system is READY

## Commands

### Frontend (run from `frontend/`)

```bash
npm run dev            # Start Vite dev server at http://localhost:5173
npm run build          # TypeScript compile (tsc -b) then Vite production build
npm run lint           # Run ESLint across all .ts/.tsx files
npm run preview        # Serve the production build locally
npm run test           # Run Vitest suite once
npm run test:watch     # Vitest watch mode
npm run test:coverage  # Generate coverage report
npx tsc --noEmit       # TypeScript check without emitting
```

### Backend (run from `backend/`)

```bash
source venv/Scripts/activate          # Windows Git Bash (venv already created)
pip install -r requirements.txt
pytest -v                             # Run all 33 backend tests
python main.py                        # Start FastAPI server at http://localhost:8000
PYTHONIOENCODING=utf-8 python validate_election_day.py  # Election-day readiness check
```

> Note: Playwright is listed in requirements but NOT needed — the scraper uses plain httpx
> (the upstream site serves a flat JSON file, not HTML).

## Architecture

### Frontend (Complete)

All 20 roadmap features are implemented. The frontend uses:

- **Zustand store** ([frontend/src/store/electionStore.ts](frontend/src/store/electionStore.ts)) — global state (`results`, `selectedProvince`, `dark`, `isLoading`, `viewMode`, `sortBy`)
- **Custom hook** ([frontend/src/hooks/useElectionSimulation.ts](frontend/src/hooks/useElectionSimulation.ts)) — handles mock simulation, API polling, and WebSocket connection
- **API layer** ([frontend/src/api/results.ts](frontend/src/api/results.ts)) — `fetchSnapshot()`, `fetchConstituencies()` using `VITE_API_URL`; falls back to mock data
- **React Router** ([frontend/src/main.tsx](frontend/src/main.tsx)) — `/` dashboard, `/admin` protected admin panel
- **WebSocket** — replaces `setInterval`; live updates from backend
- **react-window** — virtualized table for 165+ constituencies
- **Vitest** — test suite in [frontend/src/tests/](frontend/src/tests/)

**Components** (all in [frontend/src/](frontend/src/)):
- [ConstituencyTable.tsx](frontend/src/ConstituencyTable.tsx) — main results table (531 lines), `useCountUp` hook, `DetailsModal` with ESC + focus trap
- [NepalMap.tsx](frontend/src/NepalMap.tsx) — SVG map with real geographic province boundaries, party colour coding, province-click filter
- [SummaryCards.tsx](frontend/src/SummaryCards.tsx) — accepts `snapshot` prop (wired to live API)
- [SeatShareBars.tsx](frontend/src/SeatShareBars.tsx) — accepts `snapshot` prop (wired to live API)
- [ProvinceSummary.tsx](frontend/src/ProvinceSummary.tsx), [ProgressBar.tsx](frontend/src/ProgressBar.tsx), [Skeleton.tsx](frontend/src/Skeleton.tsx), [Tooltip.tsx](frontend/src/Tooltip.tsx), [AdminPanel.tsx](frontend/src/pages/AdminPanel.tsx)

**Data model** ([frontend/src/mockData.ts](frontend/src/mockData.ts)):
- `PartyKey`: `"NC" | "CPN-UML" | "NCP" | "RSP" | "OTH"`
- `ConstituencyResult`: `{ province, district, code, name, status, lastUpdated, candidates[], totalVoters, votesCast }`
- `Snapshot`: `{ totalSeats: 275, declaredSeats, lastUpdated, seatTally: Record<PartyKey, { fptp, pr }> }`

### Backend (Complete — Tasks 1–4 Done)

**Actual directory structure:**
```
backend/
├── requirements.txt          # fastapi, uvicorn, httpx, pytest, pytest-asyncio, etc.
├── pytest.ini                # asyncio_mode = auto
├── runtime.txt               # python-3.13.x
├── conftest.py               # shared pytest fixtures
├── __init__.py
├── database.py               # SQLite layer (init_db, save_snapshot, get_constituencies…)
├── scraper.py                # httpx-based JSON scraper + parse_candidates_json() + PARTY_MAP
├── main.py                   # FastAPI app, /api/snapshot, /api/constituencies, /ws
├── election.db               # SQLite database (auto-created at runtime)
├── validate_election_day.py  # Election-day readiness validation script (run pre-election)
└── tests/
    ├── __init__.py
    ├── test_database.py      # 5 tests
    ├── test_scraper.py       # 24 tests
    ├── test_api.py           # 4 tests
    └── fixtures/             # mock HTML fixtures (legacy, not used by scraper)
```

**Tech stack:**
- Python 3.13, FastAPI 0.115, uvicorn[standard] 0.32
- httpx 0.28 (async HTTP client — replaces Playwright; upstream is plain JSON)
- sqlite3 (stdlib) — 3 tables: `snapshots`, `constituencies`, `candidates`
- pytest 8, pytest-asyncio 0.24

**Upstream data source (confirmed live 2026-02-23):**
- URL: `https://result.election.gov.np/JSONFiles/ElectionResultCentral2082.txt`
- Format: UTF-8 BOM-prefixed JSON array, 3,406 candidate records, ~3 MB
- Fields: `CandidateID`, `CandidateName`, `PoliticalPartyName`, `STATE_ID`, `DistrictName`, `SCConstID`, `TotalVoteReceived`, `R` (rank), `E_STATUS`
- Winner field: `E_STATUS == "W"` (confirmed); `null` pre-election
- No auth, no pagination — full dataset every request

**Endpoints:**
- `GET /api/snapshot` — latest seat tally
- `GET /api/constituencies` — all constituency results
- `WS  /ws` — live push on every scrape cycle (every 30 s)

**Background task:** asyncio loop fetches JSON from `result.election.gov.np` every 30 seconds, saves to SQLite, broadcasts to all WebSocket clients.

**CORS:** allows `http://localhost:5173` (Vite dev server).

**Key scraper facts:**
- Constituency composite key: `f"{STATE_ID}-{DistrictName}-{SCConstID}"` → exactly 165 constituencies
- `is_winner()`: checks `E_STATUS in {"W"}` first; fallback to `R==1 and votes>0` for partial counts
- `_WINNER_STATUS = {"W"}` — update this set if upstream uses different strings on election day
- Party mapping: NC, CPN-UML, NCP (two spelling variants), RSP, RPP, JSP, IND all explicitly mapped; all others → OTH

### Remaining Backend Tasks

| Task | Description | Files | Status |
|------|-------------|-------|--------|
| **1** | Scaffold `backend/` + `requirements.txt` + venv | done | ✅ |
| **2** | SQLite database layer (TDD) | `database.py`, `test_database.py` | ✅ |
| **3** | Scraper + JSON parser (TDD) | `scraper.py`, `test_scraper.py` | ✅ |
| **4** | FastAPI server + WebSocket + scraper loop (TDD) | `main.py`, `test_api.py` | ✅ |
| **5** | Vite dev proxy (`/api` → `:8000`, `/ws` → `ws://:8000`) | `frontend/vite.config.ts` | ⬜ |
| **6** | Frontend API module with shared types | `frontend/src/api.ts` | ⬜ |
| **7** | Wire `SummaryCards` & `SeatShareBars` to `snapshot` prop | `frontend/src/SummaryCards.tsx`, `frontend/src/SeatShareBars.tsx` | ⬜ |
| **8** | Wire `App.tsx` to live API + WebSocket | `frontend/src/App.tsx` | ⬜ |
| **9** | End-to-end smoke test (backend + frontend running together) | verification only | ⬜ |

### Key Configuration

- **TypeScript**: strict mode, `noUnusedLocals`, `noUnusedParameters`, `erasableSyntaxOnly` — [frontend/tsconfig.app.json](frontend/tsconfig.app.json)
- **Tailwind v4**: `darkMode: "class"`, `@tailwindcss/postcss` — [frontend/tailwind.config.cjs](frontend/tailwind.config.cjs)
- **ESLint**: flat config (ESLint 9) — [frontend/eslint.config.js](frontend/eslint.config.js)
- **Vite**: proxy not yet configured (add in Task 5) — [frontend/vite.config.ts](frontend/vite.config.ts)
- **Environment**: `VITE_API_URL` in [frontend/.env](frontend/.env) controls data source; omit to use mock data

## Branch & Docs

- Current branch: `Task_1`
- Detailed plans: [docs/plans/](docs/plans/) — **read before implementing**
  - [2026-02-19-backend-integration.md](docs/plans/2026-02-19-backend-integration.md) — 9-task backend plan (TDD, full code included)
  - [2026-02-19-frontend-roadmap.md](docs/plans/2026-02-19-frontend-roadmap.md) — 20-feature frontend roadmap (complete reference)
  - [2026-02-19-frontend-roadmap-design.md](docs/plans/2026-02-19-frontend-roadmap-design.md) — architectural design
  - [2026-02-20-real-nepal-map-design.md](docs/plans/2026-02-20-real-nepal-map-design.md) — province map design
  - [2026-02-20-real-nepal-map-implementation.md](docs/plans/2026-02-20-real-nepal-map-implementation.md) — map implementation

## Election-Day Checklist (March 5, 2026)

Before going live:

1. Run `PYTHONIOENCODING=utf-8 python validate_election_day.py` from `backend/` — confirm READY
2. Confirm `TotalVoteReceived > 0` in live data (votes start flowing after polls close)
3. Check `E_STATUS` values in live data — if anything other than `"W"` appears for winners, update `_WINNER_STATUS` in `scraper.py`
4. Verify NCP/Maoist party name string is unchanged — two spellings are already handled
5. Check for a PR results file: `GET /JSONFiles/ElectionResultPR2082.txt` (may go live on election day)
6. Re-run `pytest -v` after any scraper changes

> The old "Post-Election Day Checklist" referenced `parse_fptp_html()` and Playwright —
> those are obsolete. The scraper uses plain httpx + JSON, not HTML parsing.

## Superpowers Mode Policy

During PASS 1 (Tasks 1–10): Execute tasks manually. No execute-plan orchestration. No automatic reviewer dispatch. Prioritize quota efficiency.

During PASS 2: execute-plan allowed for structural changes only.

## Usage Constraints (Important)

When implementing roadmap tasks:

- Modify ONLY the specified file unless explicitly instructed.
- Do NOT verify or re-read unrelated files.
- Do NOT refactor outside the current task scope.
- Return ONLY changed sections (diff-style when possible).
- Assume previous tasks compile successfully unless told otherwise.
- Treat each roadmap task as isolated.
- For backend tasks: always write the failing test first, then implement (TDD).

Priority: Surgical edits over broad verification.
