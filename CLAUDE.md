# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Nepal Election Live Vote Counter — a real-time election results dashboard for Nepal's House of Representatives general election (March 5, 2026).

**Current state:** Frontend is fully implemented (all 20 roadmap features complete). Backend is not yet scaffolded — backend development is the active next phase.

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

### Backend (run from `backend/` — not yet scaffolded)

```bash
python -m venv venv
source venv/Scripts/activate          # Windows Git Bash
pip install -r requirements.txt
playwright install chromium
pytest -v                             # Run all backend tests
python main.py                        # Start FastAPI server at http://localhost:8000
```

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

### Backend (Not Yet Scaffolded — Next Phase)

Full plan in [docs/plans/2026-02-19-backend-integration.md](docs/plans/2026-02-19-backend-integration.md).

**Planned directory structure:**
```
backend/
├── requirements.txt          # fastapi, uvicorn, playwright, pytest, httpx, etc.
├── .env                      # DB_PATH, SCRAPE_URL, SCRAPE_INTERVAL_SECONDS
├── pytest.ini                # asyncio_mode = auto
├── __init__.py
├── database.py               # SQLite layer (init_db, save_snapshot, get_constituencies…)
├── scraper.py                # Playwright scraper + parse_fptp_html() + PARTY_MAP
├── main.py                   # FastAPI app factory, /api/snapshot, /api/constituencies, /ws
└── tests/
    ├── __init__.py
    ├── test_database.py
    ├── test_scraper.py
    ├── test_api.py
    └── fixtures/
        └── fptp_results.html # Mock HTML for scraper tests (update on election day)
```

**Tech stack:**
- Python 3.13, FastAPI 0.115, uvicorn[standard] 0.32
- Playwright 1.49 (headless Chromium scraper)
- sqlite3 (stdlib) — 3 tables: `snapshots`, `constituencies`, `candidates`
- pytest 8, pytest-asyncio 0.24, httpx 0.28 (for async API tests)

**Endpoints:**
- `GET /api/snapshot` — latest seat tally
- `GET /api/constituencies` — all constituency results
- `WS  /ws` — live push on every scrape cycle (every 30 s)

**Background task:** asyncio loop scrapes `result.election.gov.np` every 30 seconds, saves to SQLite, broadcasts to all WebSocket clients.

**CORS:** allows `http://localhost:5173` (Vite dev server).

### Key Configuration

- **TypeScript**: strict mode, `noUnusedLocals`, `noUnusedParameters`, `erasableSyntaxOnly` — [frontend/tsconfig.app.json](frontend/tsconfig.app.json)
- **Tailwind v4**: `darkMode: "class"`, `@tailwindcss/postcss` — [frontend/tailwind.config.cjs](frontend/tailwind.config.cjs)
- **ESLint**: flat config (ESLint 9) — [frontend/eslint.config.js](frontend/eslint.config.js)
- **Vite**: proxy not yet configured (add in backend Task 5) — [frontend/vite.config.ts](frontend/vite.config.ts)
- **Environment**: `VITE_API_URL` in [frontend/.env](frontend/.env) controls data source; omit to use mock data

## Branch & Docs

- Current branch: `Task_1`
- Detailed plans: [docs/plans/](docs/plans/) — **read before implementing**
  - [2026-02-19-backend-integration.md](docs/plans/2026-02-19-backend-integration.md) — 9-task backend plan (TDD, full code included)
  - [2026-02-19-frontend-roadmap.md](docs/plans/2026-02-19-frontend-roadmap.md) — 20-feature frontend roadmap (complete reference)
  - [2026-02-19-frontend-roadmap-design.md](docs/plans/2026-02-19-frontend-roadmap-design.md) — architectural design
  - [2026-02-20-real-nepal-map-design.md](docs/plans/2026-02-20-real-nepal-map-design.md) — province map design
  - [2026-02-20-real-nepal-map-implementation.md](docs/plans/2026-02-20-real-nepal-map-implementation.md) — map implementation

## Backend Development Roadmap

Tasks are defined in [docs/plans/2026-02-19-backend-integration.md](docs/plans/2026-02-19-backend-integration.md). Implement in order:

| Task | Description | Files |
|------|-------------|-------|
| **1** | Scaffold `backend/` directory + `requirements.txt` + venv | `backend/requirements.txt`, `.env`, `pytest.ini`, `__init__.py` |
| **2** | SQLite database layer (TDD) | `backend/database.py`, `backend/tests/test_database.py` |
| **3** | Playwright scraper + HTML parser (TDD, mock fixture) | `backend/scraper.py`, `backend/tests/test_scraper.py`, `fixtures/fptp_results.html` |
| **4** | FastAPI server + WebSocket + background scraper loop (TDD) | `backend/main.py`, `backend/tests/test_api.py` |
| **5** | Vite dev proxy (`/api` → `:8000`, `/ws` → `ws://:8000`) | `frontend/vite.config.ts` |
| **6** | Frontend API module with shared types | `frontend/src/api.ts` |
| **7** | Wire `SummaryCards` & `SeatShareBars` to `snapshot` prop | `frontend/src/SummaryCards.tsx`, `frontend/src/SeatShareBars.tsx` |
| **8** | Wire `App.tsx` to live API + WebSocket | `frontend/src/App.tsx` |
| **9** | End-to-end smoke test (backend + frontend running together) | verification only |

## Post-Election Day Checklist (March 5, 2026)

When results go live at `result.election.gov.np`:

1. Open the site in Chrome DevTools — inspect the real DOM structure
2. Update `backend/tests/fixtures/fptp_results.html` with a real HTML sample
3. Update `parse_fptp_html()` selectors in `backend/scraper.py` to match real structure
4. Update `PARTY_MAP` in `backend/scraper.py` with exact party name strings from the site
5. Re-run all backend tests: `pytest -v`
6. Smoke-test scraper: `python -c "import asyncio; from scraper import scrape_results; print(asyncio.run(scrape_results('https://result.election.gov.np')))"`

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
