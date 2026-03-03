# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Nepal Election Live Vote Counter — a real-time election results dashboard for Nepal's House of Representatives general election (March 5, 2026).

**Current state (as of 2026-03-03):**
- Architecture: **spike-safe CDN-first** — no public FastAPI server, no WebSocket, no SQLite
- Frontend: fully implemented — all features complete, TypeScript 0 errors
- Backend: Render Background Worker + GitHub Actions publisher + Cloudflare Worker (TypeScript)
- Tests: 31 backend tests passing (scraper + worker)
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
pytest tests/test_scraper.py tests/test_worker.py -v   # Run 31 backend tests
python worker.py                                        # Start Render Background Worker
python publish_to_r2.py                                 # One-shot publish to R2
PYTHONIOENCODING=utf-8 python validate_election_day.py  # Election-day readiness check
```

### Cloudflare Worker (run from `worker/`)

```bash
npm install
npx wrangler login
npx wrangler deploy        # Deploy to Cloudflare
npx wrangler tail          # Watch live logs
```

## Architecture — Spike-Safe (CDN-First)

No public FastAPI server. No WebSocket. No SQLite.

```
result.election.gov.np  (upstream JSON, ~3 MB, updates every ~30 s)
        │
        ▼
  Producer (one of three):
  · Cloudflare Worker (worker/) — cron */2 * * * *, TypeScript, recommended
  · Render Background Worker (backend/worker.py) — Python, true 30 s loop
  · GitHub Actions (backend/publish_to_r2.py) — Python, cron every minute, may drift
        │
        ▼
Cloudflare R2 — snapshot.json, constituencies.json, parties.json
        │
        ▼
Vercel frontend — polls CDN every 30 s (LIVE mode)
                — fetches upstream via Vite proxy, zeros votes (ARCHIVE mode)
```

### Frontend

- **LIVE mode**: `VITE_RESULTS_MODE=live` → polls `${VITE_CDN_URL}/constituencies.json` every 30 s
- **ARCHIVE mode** (default): fetches upstream JSON via Vite proxy, zeros all votes, caches in sessionStorage
- **Zustand store** ([frontend/src/store/electionStore.ts](frontend/src/store/electionStore.ts)) — global state; starts empty, no mockData dependency
- **Custom hook** ([frontend/src/hooks/useElectionSimulation.ts](frontend/src/hooks/useElectionSimulation.ts)) — live: CDN polling; archive: proxy fetch + zero
- **API helpers** ([frontend/src/api.ts](frontend/src/api.ts)) — CDN fetch using `VITE_CDN_URL`
- **Canonical types** ([frontend/src/types.ts](frontend/src/types.ts))
- **Party registry** ([frontend/src/lib/partyRegistry.ts](frontend/src/lib/partyRegistry.ts)) — dynamic, built from upstream data
- **Archive data** ([frontend/src/lib/archiveData.ts](frontend/src/lib/archiveData.ts)) — fetch + zero + sessionStorage cache
- **React Router** ([frontend/src/main.tsx](frontend/src/main.tsx)) — all page routes
- **i18n** ([frontend/src/i18n.ts](frontend/src/i18n.ts)) — NP/EN label translations

**Components** (all in [frontend/src/](frontend/src/)):
- [ConstituencyTable.tsx](frontend/src/ConstituencyTable.tsx) — main results table, `useCountUp` hook, `DetailsModal`
- [NepalMap.tsx](frontend/src/NepalMap.tsx) — SVG map with real geographic province boundaries
- [SummaryCards.tsx](frontend/src/SummaryCards.tsx) — party seat count cards
- [SeatShareBars.tsx](frontend/src/SeatShareBars.tsx) — proportional bar chart
- [HotSeats.tsx](frontend/src/HotSeats.tsx), [Footer.tsx](frontend/src/Footer.tsx)
- [components/Layout.tsx](frontend/src/components/Layout.tsx) — shell layout

**Pages** ([frontend/src/pages/](frontend/src/pages/)):
`AboutPage`, `AdminPanel`, `CandidateDetailPage`, `CandidatesPage`, `ContactPage`, `ExplorePage`, `MapPage`, `PartiesPage`, `PrivacyPage`

**Key data model:**
- `partyId`: `String(SYMBOLCODE)` or `"IND"` for independents — never a closed enum
- `partyName`: raw `PoliticalPartyName` from upstream — never invented or hardcoded
- `constituencyId`: `${STATE_ID}-${DistrictName}-${SCConstID}` composite key

### Backend

**Actual directory structure:**
```
backend/
├── requirements.txt          # httpx, boto3, pytest, pytest-asyncio (no fastapi/uvicorn)
├── requirements-dev.txt      # dev dependencies
├── pytest.ini                # asyncio_mode = auto
├── runtime.txt               # python-3.13.x
├── conftest.py               # shared pytest fixtures
├── __init__.py
├── scraper.py                # httpx-based JSON scraper + parse_candidates_json() + PARTY_MAP
├── worker.py                 # Render Background Worker — scrape + R2 upload loop
├── publish_to_r2.py          # GitHub Actions one-shot publisher
├── r2.py                     # boto3 S3-compatible R2 upload helper
├── district_names.py         # District name helpers
├── validate_election_day.py  # Election-day readiness validation script
└── tests/
    ├── __init__.py
    ├── test_scraper.py       # 24 tests
    ├── test_worker.py        # 7 tests
    ├── test_api.py           # legacy — imports deleted main.py (skip or delete)
    ├── test_database.py      # legacy — imports deleted database.py (skip or delete)
    └── fixtures/             # mock JSON fixtures for scraper tests
```

**Retained but unused (safe to delete):**
- `backend/main.py` — old FastAPI server
- `backend/database.py` — old SQLite layer
- `backend/tests/test_api.py` — imports main.py
- `backend/tests/test_database.py` — imports database.py

**Tech stack:**
- Python 3.13, httpx 0.28 (async HTTP client — no Playwright, no HTML parsing)
- boto3 — S3-compatible Cloudflare R2 uploads
- pytest 8, pytest-asyncio 0.24

**R2 environment variables:** `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_ENDPOINT`

### Cloudflare Worker

```
worker/
├── src/index.ts     # Cron handler, HTTP test handler, scrape + R2 upload logic
├── wrangler.toml    # Cron schedule (*/2 * * * *) + R2 binding (RESULTS_BUCKET)
├── package.json
└── tsconfig.json
```

**Upstream data source (confirmed live 2026-02-23):**
- URL: `https://result.election.gov.np/JSONFiles/ElectionResultCentral2082.txt`
- Format: UTF-8 BOM-prefixed JSON array, 3,406 candidate records, ~3 MB
- Fields: `CandidateID`, `CandidateName`, `PoliticalPartyName`, `STATE_ID`, `DistrictName`, `SCConstID`, `TotalVoteReceived`, `R` (rank), `E_STATUS`
- Winner field: `E_STATUS == "W"` (confirmed); `null` pre-election
- No auth, no pagination — full dataset every request

**Key scraper facts:**
- Constituency composite key: `f"{STATE_ID}-{DistrictName}-{SCConstID}"` → exactly 165 constituencies
- `is_winner()` / `isWinner()`: checks `E_STATUS in {"W"}` first; fallback to `R==1 and votes>0`
- `_WINNER_STATUS = {"W"}` — update this set if upstream uses different strings on election day
- Party mapping: NC, CPN-UML, NCP (two spelling variants), RSP, RPP, JSP, IND all explicitly mapped; all others → OTH

### Key Configuration

- **TypeScript**: strict mode, `noUnusedLocals`, `noUnusedParameters`, `erasableSyntaxOnly` — [frontend/tsconfig.app.json](frontend/tsconfig.app.json)
- **Tailwind v4**: `darkMode: "class"`, `@tailwindcss/postcss` — [frontend/tailwind.config.cjs](frontend/tailwind.config.cjs)
- **ESLint**: flat config (ESLint 9) — [frontend/eslint.config.js](frontend/eslint.config.js)
- **Vite**: proxy configured for archive mode (upstream JSON fetch) — [frontend/vite.config.ts](frontend/vite.config.ts)
- **Environment**: `VITE_RESULTS_MODE=live` + `VITE_CDN_URL` for live mode; omit both for archive mode (default)

## Branch & Docs

- Current branch: `Task_1`
- Docs: [docs/](docs/)
  - [deploy.md](docs/deploy.md) — full deployment guide (Render worker + Vercel)
  - [CLOUDFLARE_WORKER_R2.md](docs/CLOUDFLARE_WORKER_R2.md) — Cloudflare Worker setup (recommended producer)
  - [GITHUB_ACTIONS_R2.md](docs/GITHUB_ACTIONS_R2.md) — GitHub Actions setup (alternative producer)
  - [ADSENSE_READY.md](docs/ADSENSE_READY.md) — AdSense readiness checklist
  - [plans/](docs/plans/) — historical design plans (reference only; may be outdated)

## Election-Day Checklist (March 5, 2026)

Before going live:

1. Confirm R2 bucket is public and `constituencies.json` is accessible via CDN URL
2. Confirm producer is running (check Cloudflare Worker cron logs or Render worker logs)
3. Confirm `TotalVoteReceived > 0` in live data (votes start after polls close ~18:00 NPT)
4. Check `E_STATUS` values — if anything other than `"W"` appears for winners:
   - Update `_WINNER_STATUS` in `backend/scraper.py`
   - Update `isWinner()` in `worker/src/index.ts`
5. Verify NCP/Maoist party name string is unchanged — two spellings are already handled
6. Check for a PR results file: `GET /JSONFiles/ElectionResultPR2082.txt` (may go live on election day)
7. Run `pytest tests/test_scraper.py tests/test_worker.py -v` after any scraper changes

## Superpowers Mode Policy

During PASS 1 (Tasks 1–10): Execute tasks manually. No execute-plan orchestration. No automatic reviewer dispatch. Prioritize quota efficiency.

During PASS 2: execute-plan allowed for structural changes only.

## Usage Constraints (Important)

When implementing tasks:

- Modify ONLY the specified file unless explicitly instructed.
- Do NOT verify or re-read unrelated files.
- Do NOT refactor outside the current task scope.
- Return ONLY changed sections (diff-style when possible).
- Assume previous tasks compile successfully unless told otherwise.
- Treat each task as isolated.

Priority: Surgical edits over broad verification.
