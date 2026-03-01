# GitHub Actions + Cloudflare R2 Setup

## How it works

```
GitHub Actions (cron every 1 min)
  └── backend/publish_to_r2.py
        ├── Fetches upstream JSON from result.election.gov.np (server-side — no CORS)
        ├── Parses 3,406 candidate records → 165 constituencies
        └── Uploads to Cloudflare R2:
              snapshot.json
              constituencies.json
              parties.json
                    │
                    ▼
            R2 Public CDN URL
                    │
                    ▼
            Vercel frontend (polls every 30 s)
```

The frontend never touches the upstream election site directly — it only reads
the pre-parsed JSON files from R2. This eliminates the CORS problem entirely.

---

## Step 1 — Cloudflare R2 bucket

### Create the bucket

1. Cloudflare Dashboard → **R2 Object Storage** → **Create bucket**
2. Name: `nepal-election-results` (or any name — note it for `R2_BUCKET`)
3. After creation → **Settings** tab → **Public Access** → **Allow Access**
4. Note the **Public Bucket URL**:
   `https://pub-<hash>.r2.dev`
   This is what you set as `VITE_CDN_URL` in Vercel.

### Create an API token

1. R2 → **Manage API Tokens** → **Create API Token**
2. Token name: `nepal-election-gh-actions`
3. Permissions: **Object Read & Write** — restrict to your bucket
4. Click **Create API Token** — save both values shown:
   - **Access Key ID** → `R2_ACCESS_KEY_ID`
   - **Secret Access Key** → `R2_SECRET_ACCESS_KEY`
   These are shown **only once**. Store them immediately as GitHub secrets (Step 2).

### Find your Account ID

- Cloudflare Dashboard → right sidebar, or
- URL when viewing your account: `https://dash.cloudflare.com/<ACCOUNT_ID>/r2`

This becomes `R2_ACCOUNT_ID`. The endpoint is auto-derived as:
`https://<R2_ACCOUNT_ID>.r2.cloudflarestorage.com`

---

## Step 2 — GitHub Actions secrets

Go to your repository on GitHub:
**Settings → Secrets and variables → Actions → New repository secret**

Add all four secrets:

| Secret name           | Value                                              |
|-----------------------|----------------------------------------------------|
| `R2_ACCOUNT_ID`       | Your Cloudflare Account ID (32-char hex string)    |
| `R2_ACCESS_KEY_ID`    | Access Key ID from R2 API token                    |
| `R2_SECRET_ACCESS_KEY`| Secret Access Key from R2 API token                |
| `R2_BUCKET`           | Your bucket name e.g. `nepal-election-results`     |

> **Never put these values in any file in the repository.**

---

## Step 3 — Verify the workflow runs

1. Push this branch to GitHub
2. Go to **Actions** tab → **Publish Election Results to R2**
3. Click **Run workflow** (manual trigger) to test immediately
4. Check the run logs — you should see:
   ```
   fetching https://result.election.gov.np/JSONFiles/...
   fetched 3,406 candidate records
   parsed: 165 constituencies, 0 declared, N parties
   uploading to R2 bucket 'nepal-election-results' ...
     ✓ uploaded snapshot.json (... bytes)
     ✓ uploaded constituencies.json (... bytes)
     ✓ uploaded parties.json (... bytes)
   done — all 3 files published successfully
   ```
5. Verify files are accessible at your public CDN URL:
   `https://pub-<hash>.r2.dev/constituencies.json`

---

## Step 4 — Configure the frontend

Set these environment variables in **Vercel → Project → Settings → Environment Variables**:

| Variable            | Value                                    |
|---------------------|------------------------------------------|
| `VITE_RESULTS_MODE` | `live`                                   |
| `VITE_CDN_URL`      | `https://pub-<hash>.r2.dev` (no trailing slash) |

Redeploy the frontend after setting these. The frontend will poll
`${VITE_CDN_URL}/constituencies.json` every 30 seconds.

---

## Step 5 — CORS on R2 (if needed)

If the browser reports CORS errors fetching from R2, add a CORS policy to the bucket:

Cloudflare Dashboard → R2 → your bucket → **Settings** → **CORS Policy**:

```json
[
  {
    "AllowedOrigins": ["https://nepalvotes.live", "http://localhost:5173"],
    "AllowedMethods": ["GET", "HEAD"],
    "AllowedHeaders": ["*"],
    "MaxAgeSeconds": 300
  }
]
```

---

## Local testing

To run the script locally (without GitHub Actions):

```bash
cd backend
source venv/Scripts/activate      # Windows Git Bash
pip install -r requirements-dev.txt

# Set env vars manually (do NOT commit these)
export R2_ACCOUNT_ID=your_account_id
export R2_ACCESS_KEY_ID=your_access_key
export R2_SECRET_ACCESS_KEY=your_secret_key
export R2_BUCKET=nepal-election-results

python publish_to_r2.py
```

To run tests:

```bash
pytest tests/test_scraper.py tests/test_worker.py -v
```

---

## Cron schedule note

GitHub Actions scheduled workflows run at most once per minute (`* * * * *`).
Under heavy load, GitHub may delay runs by 5–15 minutes. This is acceptable
for an election dashboard — the upstream source itself updates every ~30 seconds,
and voters can refresh the page at any time.

If sub-minute freshness is critical, switch to the Render Background Worker
(`backend/worker.py`) which runs continuously with a true 30-second interval.
