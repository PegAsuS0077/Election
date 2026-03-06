# Nepal Election Live Vote Counter

> Real-time results dashboard for Nepal's **2082 House of Representatives general election** — March 5, 2026

A full-stack web application that tracks live vote counts across all **165 FPTP constituencies** and **7 provinces**, fetching official results from the Election Commission of Nepal and publishing pre-parsed JSON to a Cloudflare R2 CDN every 1–2 minutes, served instantly to every browser visit without a live backend.

---

## What It Does

When results start flowing on election night, this system:

1. **Fetches** the official JSON feed from `result.election.gov.np` (via Cloudflare Worker or GitHub Actions)
2. **Parses** 3,406 candidate records, groups them into 165 constituencies, and identifies winners
3. **Uploads** `snapshot.json`, `constituencies.json`, and `parties.json` to Cloudflare R2
4. **Frontend polls** the R2 CDN every 30 seconds — no backend server involved for reads
5. **Displays** live seat tallies, a province map, a scrollable constituency table, party pages, and candidate search

---

## Architecture — Spike-Safe (CDN-First)

```
result.election.gov.np  (upstream JSON, ~3 MB, updates every ~30 s)
        │
        ▼
  Producer (one of):
  ┌─────────────────────────────────────────────────────────────────┐
  │  Option A: Cloudflare Worker (worker/)                          │
  │    · TypeScript Worker, cron every */2 * * * *                  │
  │    · Runs at Cloudflare edge — no server to manage              │
  │                                                                 │
  │  Option B: GitHub Actions (backend/publish_to_r2.py)           │
  │    · Python script, cron every minute                           │
  │    · May drift 5–15 min under load                              │
  │                                                                 │
  │  Option C: Render Background Worker (backend/worker.py)         │
  │    · Python, true 30-second interval (always-on process)        │
  └─────────────────────────────────────────────────────────────────┘
        │
        ▼
Cloudflare R2 (object storage + public CDN URL)
  ├── snapshot.json          — seat tally + declared seats
  ├── constituencies.json    — all 165 constituencies with candidates
  └── parties.json           — party aggregates
        │
        ▼
Frontend host (Vercel or Cloudflare Pages, polls CDN every 30 s)
  · No backend dependency for reads
  · Horizontally scalable — any traffic spike served from CDN
```

```
New_Project/
├── frontend/                       # React + TypeScript + Vite (Vercel or Cloudflare Pages)
│   └── src/
│       ├── App.tsx                 # Root component, routing
│       ├── types.ts                # Canonical TypeScript types
│       ├── api.ts                  # CDN fetch helpers
│       ├── ConstituencyTable.tsx   # Virtualized results table + modal
│       ├── NepalMap.tsx            # SVG province map
│       ├── SummaryCards.tsx        # Party seat count cards
│       ├── SeatShareBars.tsx       # Proportional bar chart
│       ├── HotSeats.tsx            # Hot seats widget
│       ├── Footer.tsx
│       ├── i18n.ts                 # NP/EN translations
│       ├── lib/
│       │   ├── archiveData.ts      # Upstream fetch + zero votes + sessionStorage cache
│       │   ├── partyRegistry.ts    # Dynamic party registry from upstream data
│       │   ├── parseUpstreamData.ts
│       │   ├── db.ts               # In-memory data store
│       │   └── ...
│       ├── store/electionStore.ts  # Zustand global state
│       ├── hooks/useElectionSimulation.ts  # CDN polling (live) or archive mode
│       └── pages/
│           ├── AboutPage.tsx
│           ├── AdminPanel.tsx
│           ├── CandidateDetailPage.tsx
│           ├── CandidatesPage.tsx
│           ├── ContactPage.tsx
│           ├── ExplorePage.tsx
│           ├── MapPage.tsx
│           ├── PartiesPage.tsx
│           └── PrivacyPage.tsx
│
├── backend/                        # Python scraper + publisher
│   ├── scraper.py                  # Fetch + parse upstream JSON (httpx)
│   ├── worker.py                   # Render Background Worker entry point
│   ├── publish_to_r2.py            # GitHub Actions one-shot publisher
│   ├── r2.py                       # boto3 S3-compatible R2 upload helper
│   ├── validate_election_day.py    # Pre-election readiness check
│   └── tests/                      # pytest: test_scraper.py, test_worker.py
│
└── worker/                         # Cloudflare Worker (TypeScript)
    ├── src/index.ts                # Cron handler + HTTP test handler
    └── wrangler.toml               # Cron schedule + R2 binding
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

### 2. Frontend (archive mode — no backend needed)

```bash
cd frontend
npm install
npm run dev
# Opens at http://localhost:5173
# Fetches upstream JSON via Vite proxy, zeroes all votes (archive mode)
```

### 3. Frontend (live mode — reads from R2)

Create `frontend/.env.local`:

```
VITE_RESULTS_MODE=live
VITE_CDN_URL=https://pub-<hash>.r2.dev
```

Then `npm run dev`. The frontend polls the R2 CDN every 30 seconds.

---

## Deployment

See [docs/deploy.md](docs/deploy.md) for the full guide covering:
- Cloudflare R2 bucket setup
- Render Background Worker deployment
- Vercel frontend deployment
- Cloudflare Pages frontend deployment + rollback plan
- Environment variables

### Cloudflare Worker (recommended producer)

See [docs/CLOUDFLARE_WORKER_R2.md](docs/CLOUDFLARE_WORKER_R2.md) — fires every 1–2 minutes with ~1-second jitter.

### GitHub Actions (alternative producer)

See [docs/GITHUB_ACTIONS_R2.md](docs/GITHUB_ACTIONS_R2.md) — easier setup, may drift 5–15 minutes under load.

---

## Features

| Feature | Detail |
|---------|--------|
| Live seat leaderboard | FPTP seat tally per party, updates every 30 s |
| 165-constituency table | Virtualized scroll, search, province + district filter |
| Interactive province map | Real SVG geographic boundaries, click-to-filter, party colour coding |
| Seat share bars | Animated proportional bar chart per party |
| Candidate detail modal | Click any constituency row for full candidate breakdown |
| Parties page | Party cards with seat counts and symbol names |
| Candidates search | Full-text search across all 3,406 candidates |
| NP/EN toggle | Switch UI labels between Nepali and English |
| Dark mode | Toggle with persistence |
| Admin panel | Protected route at `/admin` |
| Mobile responsive | Tailwind CSS v4, fully optimized |
| Archive mode | Pre-election mode: shows candidate data with votes zeroed |

---

## Tech Stack

**Frontend**

- React 18 + TypeScript (strict) + Vite
- Zustand — global state management
- React Router v6 — client-side routing
- Tailwind CSS v4 — dark mode via `class` strategy
- react-window — virtualized list for 165+ rows
- Vitest — unit + component tests
- Deployed on **Vercel**

**Backend / Worker**

- Python 3.13 + httpx — async JSON scraper (no Playwright, no HTML parsing)
- boto3 — S3-compatible Cloudflare R2 uploads
- pytest 8 — 31 tests passing (scraper + worker)
- Deployed as **Render Background Worker** OR **Cloudflare Worker** (TypeScript) OR **GitHub Actions**

**Infrastructure**

- Cloudflare R2 — object storage + public CDN
- No database — stateless producer, CDN-served JSON

---

## Environment Variables

### Frontend (Vercel or Cloudflare Pages)

| Variable | Value | Description |
|----------|-------|-------------|
| `VITE_RESULTS_MODE` | `live` | Enables live CDN polling (omit for archive mode) |
| `VITE_CDN_URL` | `https://pub-<hash>.r2.dev` | R2 public CDN URL (no trailing slash) |

For Cloudflare Pages cutover with rollback, see:
- [docs/CLOUDFLARE_PAGES_CUTOVER.md](docs/CLOUDFLARE_PAGES_CUTOVER.md)

### Backend / Worker (Render or GitHub Actions)

| Variable | Description |
|----------|-------------|
| `R2_ACCOUNT_ID` | Cloudflare account ID |
| `R2_ACCESS_KEY_ID` | R2 API token access key |
| `R2_SECRET_ACCESS_KEY` | R2 API token secret |
| `R2_BUCKET` | R2 bucket name (e.g. `nepal-election-results`) |
| `R2_ENDPOINT` | `https://<ACCOUNT_ID>.r2.cloudflarestorage.com` |
| `SCRAPE_INTERVAL_SECONDS` | Scrape interval (default: `30`) |
| `SCRAPER_VERIFY_SSL` | Verify upstream TLS certs (default: `true`; set `false` only as emergency workaround) |

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
| Poll interval | 30 seconds (producer-side) |

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

> Party IDs are dynamic (`String(SYMBOLCODE)` or `"IND"` for independents). The system never assumes a closed party enum.

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
pytest tests/test_scraper.py tests/test_worker.py -v   # 31 tests
```

### Lint + type-check

```bash
cd frontend
npm run lint
npx tsc --noEmit
```

### Publish to R2 locally (one-shot)

```bash
cd backend
source venv/Scripts/activate
export R2_ACCOUNT_ID=... R2_ACCESS_KEY_ID=... R2_SECRET_ACCESS_KEY=... R2_BUCKET=... R2_ENDPOINT=...
python publish_to_r2.py
```

---

## Build Status

| Component | Status |
|-----------|--------|
| Frontend | Complete — all features implemented |
| Backend scraper | Complete — httpx + JSON, 0 Playwright |
| Backend worker | Complete — Render / GitHub Actions / Cloudflare Worker |
| Backend tests | 31 / 31 passing |
| Spike-safe CDN architecture | Complete |
| Cloudflare Worker producer | Complete |

---

## Election-Day Checklist (March 5, 2026)

- [ ] Confirm R2 bucket is public and `constituencies.json` is accessible via CDN URL
- [ ] Confirm producer is running (Cloudflare Worker cron logs or Render worker logs)
- [ ] Confirm `TotalVoteReceived > 0` in live data (votes start after polls close ~18:00 NPT)
- [ ] Check `E_STATUS` values — if anything other than `"W"` appears for winners, update `_WINNER_STATUS` in `backend/scraper.py` and `isWinner()` in `worker/src/index.ts`
- [ ] Verify NCP/Maoist party name string is unchanged (two spellings handled in `PARTY_MAP`)
- [ ] Check for PR results file: `GET /JSONFiles/ElectionResultPR2082.txt` (may go live on election day)
- [ ] Run `pytest tests/test_scraper.py tests/test_worker.py -v` after any scraper changes

---

## Disclaimer

This application is built for legitimate election monitoring and educational purposes only. It is not affiliated with or endorsed by Nepal's Election Commission. All data is sourced from the official public results feed at `result.election.gov.np`.
