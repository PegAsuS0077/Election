# Nepal Election Live Vote Counter

> Real-time results dashboard for Nepal's **2082 House of Representatives general election** — March 5, 2026

A full-stack web application that tracks live vote counts across all **165 FPTP constituencies** and **7 provinces**, fetching official results from the Election Commission of Nepal every 30 seconds and broadcasting updates instantly to every connected browser via WebSocket.

---

## What It Does

When results start flowing on election night, this system:

1. **Fetches** the official JSON feed from `result.election.gov.np` every 30 seconds
2. **Parses** 3,406 candidate records, groups them into 165 constituencies, and identifies winners
3. **Stores** each snapshot in SQLite with full candidate-level detail
4. **Broadcasts** the update to all connected browsers over WebSocket — no page refresh needed
5. **Displays** live seat tallies, a province map, and a scrollable constituency table

---

## Screenshots / Demo

> The dashboard runs at `http://localhost:5173` when both servers are started.
> The frontend operates fully with mock data even without the backend running.

---

## Features

| Feature | Detail |
|---------|--------|
| Live seat leaderboard | FPTP seat tally per party, updates every 30 s |
| 165-constituency table | Virtualized scroll, search, province + district filter |
| Interactive province map | Real SVG geographic boundaries, click-to-filter, party colour coding |
| Seat share bars | Animated proportional bar chart per party |
| Candidate detail modal | Click any constituency row for full candidate breakdown |
| Dark mode | Toggle with persistence |
| WebSocket live push | Backend pushes on each scrape — zero browser polling |
| Admin panel | Protected route at `/admin` |
| Mobile responsive | Tailwind CSS v4, fully optimized |
| Mock data fallback | Works offline without a backend for development |

---

## Tech Stack

**Frontend**

- React 18 + TypeScript (strict) + Vite
- Zustand — global state management
- React Router v6 — client-side routing
- Tailwind CSS v4 — dark mode via `class` strategy
- react-window — virtualized list for 165+ rows
- Vitest — unit + component tests

**Backend**

- Python 3.13 + FastAPI 0.115 + uvicorn
- httpx — async HTTP client (no browser/Playwright needed)
- SQLite — stdlib `sqlite3`, 3 tables: `snapshots`, `constituencies`, `candidates`
- pytest 8 + pytest-asyncio 0.24 — 33 tests, all passing

---

## Architecture

```
Browser ──WebSocket──► FastAPI (/ws)
Browser ──HTTP GET──►  FastAPI (/api/snapshot, /api/constituencies)
                            │
                       SQLite DB
                            │
                   Background loop (every 30 s)
                            │
              httpx GET ──► result.election.gov.np
                            JSON (~3 MB, 3,406 records)
```

```
New_Project/
├── frontend/                       # React + TypeScript + Vite
│   └── src/
│       ├── App.tsx                 # Root, routing, WebSocket wiring
│       ├── ConstituencyTable.tsx   # Virtualized results table + modal
│       ├── NepalMap.tsx            # SVG province map
│       ├── SummaryCards.tsx        # Party seat count cards
│       ├── SeatShareBars.tsx       # Proportional bar chart
│       ├── api/results.ts          # fetchSnapshot(), fetchConstituencies()
│       ├── store/electionStore.ts  # Zustand store
│       └── hooks/useElectionSimulation.ts
│
└── backend/                        # Python FastAPI + SQLite
    ├── main.py                     # API server + WebSocket + scraper loop
    ├── scraper.py                  # Fetch + parse upstream JSON
    ├── database.py                 # SQLite read/write layer
    ├── validate_election_day.py    # Pre-election readiness check script
    └── tests/                      # 33 tests (scraper, database, API)
```

---

## Quick Start

### Prerequisites

- Node.js 18+
- Python 3.13
- Git

### 1. Clone

```bash
git clone <repo-url>
cd New_Project
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
# Opens at http://localhost:5173
# Runs with mock data by default — no backend needed
```

### 3. Backend

```bash
cd backend

# Windows (Git Bash)
source venv/Scripts/activate

# Linux / macOS
source venv/bin/activate

pip install -r requirements.txt
python main.py
# API available at http://localhost:8000
```

### 4. Connect frontend to backend

Create `frontend/.env`:

```
VITE_API_URL=http://localhost:8000
```

Then restart the Vite dev server. The frontend will switch from mock data to live API.

---

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/snapshot` | Latest seat tally for all parties |
| `GET` | `/api/constituencies` | All 165 constituency results with candidates |
| `WS` | `/ws` | Live push on every scrape cycle (~30 s) |

**Example snapshot response:**

```json
{
  "taken_at": "2026-03-05T14:00:00Z",
  "total_seats": 275,
  "declared_seats": 42,
  "seat_tally": {
    "NC":      { "fptp": 18, "pr": 0 },
    "CPN-UML": { "fptp": 15, "pr": 0 },
    "NCP":     { "fptp":  6, "pr": 0 },
    "RSP":     { "fptp":  2, "pr": 0 },
    "OTH":     { "fptp":  1, "pr": 0 }
  }
}
```

---

## Data Source

| Property | Value |
|----------|-------|
| URL | `https://result.election.gov.np/JSONFiles/ElectionResultCentral2082.txt` |
| Format | UTF-8 BOM-prefixed JSON array |
| Size | ~3 MB, 3,406 candidate records |
| Constituencies | 165 (grouped by STATE_ID + DistrictName + SCConstID) |
| Winner field | `E_STATUS == "W"` |
| Auth required | None |
| Poll interval | 30 seconds |

---

## Parties Tracked

| Code | English Name | Nepali |
|------|-------------|--------|
| `NC` | Nepali Congress | नेपाली काँग्रेस |
| `CPN-UML` | CPN (Unified Marxist-Leninist) | नेपाल कम्युनिष्ट पार्टी (एकीकृत मार्क्सवादी लेनिनवादी) |
| `NCP` | Nepal Communist Party (Maoist) | नेपाल कम्युनिस्ट पार्टी (माओवादी) |
| `RSP` | Rastriya Swatantra Party | राष्ट्रिय स्वतन्त्र पार्टी |
| `RPP` | Rastriya Prajatantra Party | राष्ट्रिय प्रजातन्त्र पार्टी |
| `JSP` | Janata Samajwadi Party | जनता समाजवादी पार्टी, नेपाल |
| `IND` | Independent | स्वतन्त्र |
| `OTH` | All other parties | (~59 minor parties) |

---

## Development

### Run frontend tests

```bash
cd frontend
npm run test
```

### Run backend tests

```bash
cd backend
source venv/Scripts/activate   # Windows
pytest -v                      # 33 tests
```

### Election-day readiness check

Run this before March 5 to validate the full pipeline against live data:

```bash
cd backend
source venv/Scripts/activate
PYTHONIOENCODING=utf-8 python validate_election_day.py
```

Expected output: `VERDICT: READY` with 0 failures.

### Lint + type-check

```bash
cd frontend
npm run lint
npx tsc --noEmit
```

---

## Build Status

| Component | Status |
|-----------|--------|
| Frontend (20 features) | Complete |
| Backend API + scraper | Complete |
| Backend tests | 33 / 33 passing |
| Frontend ↔ Backend wiring | In progress |
| Election-day validation | READY |

**Remaining tasks before election day:**

- [ ] Vite proxy config (`/api` → `:8000`, `/ws` → `ws://:8000`)
- [ ] Shared TypeScript types for API responses
- [ ] Wire live API into `App.tsx` WebSocket handler
- [ ] End-to-end smoke test with both servers running

---

## Disclaimer

This application is built for legitimate election monitoring and educational purposes only. It is not affiliated with or endorsed by Nepal's Election Commission. All data is sourced from the official public results feed at `result.election.gov.np`.
