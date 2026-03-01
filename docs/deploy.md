# Deployment Guide — Spike-Safe Architecture

## Overview

```
result.election.gov.np  (upstream JSON, ~3 MB, updates every ~30 s)
        │
        ▼
Render Background Worker  (backend/worker.py)
  · Fetches upstream JSON every 30 s
  · Normalises + aggregates
  · Uploads 3 static JSON files to Cloudflare R2:
        snapshot.json
        constituencies.json
        parties.json
        │
        ▼
Cloudflare R2  (object storage + public CDN URL)
        │
        ▼
Vercel  (frontend, polls CDN every 30 s)
  · No backend dependency for reads
  · Horizontally scalable — any traffic spike served from CDN
```

---

## 1. Cloudflare R2 Setup

### Create bucket

1. Cloudflare Dashboard → R2 → Create Bucket
2. Name: `nepal-election-results` (or anything)
3. Enable **Public Access** on the bucket → note the public URL:
   `https://pub-<hash>.r2.dev`

### Create API token

1. R2 → Manage API Tokens → Create API Token
2. Permissions: **Object Read & Write** on your bucket
3. Note the **Access Key ID** and **Secret Access Key**

### Get your endpoint URL

Format: `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`

Your Account ID is visible in the Cloudflare dashboard URL.

---

## 2. Render — Background Worker

### Service settings

| Setting | Value |
|---|---|
| **Service type** | Background Worker |
| **Runtime** | Python |
| **Root directory** | `backend` |
| **Build command** | `pip install -r requirements.txt` |
| **Start command** | `python worker.py` |

### `backend/runtime.txt`

```
python-3.13.2
```

### Environment variables (set in Render dashboard)

| Variable | Description | Example |
|---|---|---|
| `R2_ACCOUNT_ID` | Cloudflare account ID | `abc123def456` |
| `R2_ACCESS_KEY_ID` | R2 API token access key | `...` |
| `R2_SECRET_ACCESS_KEY` | R2 API token secret | `...` |
| `R2_BUCKET` | R2 bucket name | `nepal-election-results` |
| `R2_ENDPOINT` | R2 S3-compatible endpoint | `https://abc123.r2.cloudflarestorage.com` |
| `SCRAPE_INTERVAL_SECONDS` | How often to scrape (optional) | `30` |

### What the worker does

Every `SCRAPE_INTERVAL_SECONDS` seconds:
1. Fetches `https://result.election.gov.np/JSONFiles/ElectionResultCentral2082.txt`
2. Parses 3,406 candidate records, groups into 165 constituencies
3. Derives seat tally snapshot and party aggregates
4. Uploads `snapshot.json`, `constituencies.json`, `parties.json` to R2

On error, logs and retries on the next cycle. Worker never crashes.

---

## 3. Vercel — Frontend

### Environment variables (set in Vercel dashboard)

| Variable | Value |
|---|---|
| `VITE_RESULTS_MODE` | `live` |
| `VITE_CDN_URL` | `https://pub-<hash>.r2.dev` (no trailing slash) |

Leave `VITE_UPSTREAM_URL` blank — only needed for archive mode in production.

### Build settings

| Setting | Value |
|---|---|
| **Framework** | Vite |
| **Root directory** | `frontend` |
| **Build command** | `npm run build` |
| **Output directory** | `dist` |

### What the frontend does in live mode

1. On mount: fetches `${VITE_CDN_URL}/constituencies.json`
2. Every 30 s: re-fetches `constituencies.json`
3. All reads hit R2's CDN — no Render server involved for reads

---

## 4. Local Development

### Archive mode (default — no backend needed)

```bash
cd frontend
npm run dev
# Open http://localhost:5173
# Fetches upstream JSON via Vite proxy → all votes zeroed
```

### Live mode (simulate election day locally)

1. Set R2 env vars in `backend/.env`
2. Run the worker:
   ```bash
   cd backend
   source venv/Scripts/activate
   python worker.py
   ```
3. Set frontend env:
   ```
   # frontend/.env.local
   VITE_RESULTS_MODE=live
   VITE_CDN_URL=https://pub-<hash>.r2.dev
   ```
4. Run frontend:
   ```bash
   cd frontend
   npm run dev
   ```

---

## 5. Election-Day Checklist

- [ ] Confirm R2 bucket is public and `constituencies.json` is accessible via CDN URL
- [ ] Confirm Render worker is running: check logs for `Uploaded snapshot.json`
- [ ] Confirm `TotalVoteReceived > 0` in live data (votes start after polls close ~18:00 NPT)
- [ ] Check `E_STATUS` values — if anything other than `"W"` appears for winners, update `_WINNER_STATUS` in `backend/scraper.py` and redeploy
- [ ] Verify NCP/Maoist party name string in PARTY_MAP is unchanged
- [ ] Check for PR results file: `GET /JSONFiles/ElectionResultPR2082.txt` (may go live on election day)
- [ ] Run `pytest -v` in `backend/` after any scraper changes

---

## 6. Files Changed in This Refactor

### Backend — new files

| File | Purpose |
|---|---|
| `worker.py` | Entry point — scrape + upload loop |
| `r2.py` | boto3 S3-compatible R2 upload helper |
| `tests/test_worker.py` | 7 tests for worker logic |

### Backend — modified files

| File | Change |
|---|---|
| `requirements.txt` | Removed fastapi, uvicorn; added boto3 |

### Backend — retained but now unused

| File | Notes |
|---|---|
| `main.py` | Safe to delete after confirming worker works |
| `database.py` | Safe to delete after confirming worker works |
| `tests/test_api.py` | Safe to delete (imports main.py) |
| `tests/test_database.py` | Safe to delete (imports database.py) |

### Frontend — modified files

| File | Change |
|---|---|
| `src/hooks/useElectionSimulation.ts` | Replaced WebSocket with 30 s CDN polling |
| `src/App.tsx` | Removed WebSocket useEffect + imports |
| `src/api.ts` | Replaced VITE_API_URL backend calls with VITE_CDN_URL CDN fetches |
| `src/lib/archiveData.ts` | Removed VITE_API_URL backend fallback path |
| `vite.config.ts` | Removed `/api` and `/ws` proxy entries |
| `.env` | Replaced VITE_API_URL with VITE_CDN_URL |
