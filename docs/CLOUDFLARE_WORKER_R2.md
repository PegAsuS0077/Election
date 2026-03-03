# Cloudflare Worker + R2 — Live Results Pipeline

## Architecture overview

```
result.election.gov.np  ──fetch──▶  Cloudflare Worker (cron every 2 min)
                                          │
                                    normalize & aggregate
                                          │
                                          ▼
                              R2 bucket: nepal-election-results
                                 ├── constituencies.json
                                 ├── snapshot.json
                                 └── parties.json
                                          │
                              public R2 dev URL (pub-xxxx.r2.dev)
                                          │
                                          ▼
                              Vercel (nepalvotes.live)
                              polls CDN every 30 s (LIVE mode)
```

### Why not GitHub Actions cron?

GitHub Actions cron jobs are **not reliable at minute-level granularity**.
The specification `* * * * *` (every minute) typically fires every **14–15 minutes**
in practice, sometimes longer, because GitHub queues jobs during high-traffic
periods and does not guarantee sub-minute or even sub-5-minute precision.

For a live election dashboard where vote counts update every few minutes,
14-minute delays are unacceptable.

### Why Cloudflare Worker cron?

Cloudflare Cron Triggers run inside the Worker runtime, not in a shared CI queue.
They fire at the scheduled time with **~1-second jitter** — reliable at
minute-level granularity. The free tier allows up to **3 cron triggers** and
**100,000 requests/day**, more than enough for this pipeline.

### Why the CPU limit was being exceeded

The original `fetch()` HTTP handler called `runScrape()` directly — the same
heavy function used by the cron trigger. This meant that **any HTTP request to
the Worker URL** (health probes, uptime monitors, bots, Cloudflare itself)
triggered a full upstream fetch + JSON parse of ~3,400 records + transform +
R2 upload, consuming the Worker's CPU budget outside the scheduled window.

In addition, the NEU name-enrichment lookup (`neu_candidates.json`, ~200 KB)
was fetched and parsed **on every single cron run**, adding a second outbound
request and parse cycle per minute.

**Fixes applied (2026-03-03):**

1. `fetch()` now returns a lightweight health-check response only — no scraping.
   Bots and probes can no longer consume CPU budget.
2. `runScrape()` renamed `runOnce()` — called **only** from `scheduled()`.
3. NEU lookup is cached at module level (`_neuCache`). It is loaded once per
   isolate lifetime (typically hours) instead of once per minute.
4. All failure paths (network error, non-200, parse failure, empty array) now
   `return` early **without touching R2**, so existing good data is preserved.
5. Cron changed from `*/1` to `*/2` — halves CPU usage with negligible UX impact
   (frontend still polls every 30 s; it will see the same data at most once).

### Limitations

- Cloudflare cron is **minute-based** — the smallest interval is `*/1 * * * *`
  (every 1 minute). True 30-second polling is not possible with cron alone.
- The frontend polls every 30 s (configurable in `useElectionSimulation.ts`),
  so users get a UI refresh every 30 s even though new data arrives only every
  2 minutes. The UI will show the same data once between scrapes — that is fine.
- R2 public URLs are eventually consistent. In practice writes appear within
  1–2 seconds globally.

### Upgrade path to true 30-second updates

When Render Background Worker access is available again:

1. Replace `worker/` with a Python `backend/worker.py` (already written) that
   runs a `while True: sleep(30)` loop, scrapes, and uploads to the same R2 bucket.
2. The R2 bucket and Vercel frontend stay unchanged — only the producer changes.
3. No frontend code changes required.

### Why not Supabase?

Supabase (Postgres + Realtime) adds significant complexity for live distribution:
- Requires database schema design and migrations.
- Realtime requires WebSocket infrastructure on the frontend.
- Adds latency vs a static JSON file served from a CDN edge node.

R2 + CDN polling is simpler, cheaper, and faster for this use case.
Consider Supabase only for post-election features (full-text search, historical
archive queries, public API).

---

## Files

| File | Purpose |
|------|---------|
| `worker/src/index.ts` | Worker entry point — cron handler + HTTP test handler |
| `worker/wrangler.toml` | Wrangler config — cron schedule + R2 binding |
| `worker/package.json` | Dev dependencies (wrangler, workers-types, typescript) |
| `worker/tsconfig.json` | TypeScript config for the Worker |

---

## First-time deploy

### 1. Install dependencies

```bash
cd worker
npm install
```

### 2. Log in to Cloudflare

```bash
npx wrangler login
```

This opens a browser window. Log in with your Cloudflare account.

### 3. Verify R2 bucket exists

In the Cloudflare dashboard → R2 → confirm bucket named **`nepal-election-results`**
exists and has **Public Access** enabled (Development URL is fine for now).

The bucket binding in `wrangler.toml` maps the name `RESULTS_BUCKET` to
`nepal-election-results`.  If you rename the bucket, update `bucket_name` in
`wrangler.toml`.

### 4. Deploy

```bash
npx wrangler deploy
```

Wrangler compiles `src/index.ts` and uploads the Worker. You should see:

```
✅ Deployed nepalvotes-scraper
   https://nepalvotes-scraper.<your-subdomain>.workers.dev
   Crons: */2 * * * *
```

### 5. Trigger a manual test

The HTTP handler is now a **health check only** — it does not trigger a scrape.

```bash
curl https://nepalvotes-scraper.<your-subdomain>.workers.dev/
# or
curl https://nepalvotes-scraper.<your-subdomain>.workers.dev/health
```

Expected response:

```json
{"ok":true,"service":"nepal-election-scraper","ts":"2026-03-05T12:00:00.000Z"}
```

To **manually trigger a cron run** for testing (does not require deploying):

```bash
cd worker
npx wrangler dev --test-scheduled
# In a second terminal:
curl "http://localhost:8787/__scheduled?cron=*%2F2+*+*+*+*"
```

Check your R2 bucket — three files should be present after a successful run:
- `constituencies.json`
- `snapshot.json`
- `parties.json`

### 6. Verify the output

Open the public R2 URL (find it in Cloudflare dashboard → R2 → bucket →
Settings → Public Development URL):

```
https://pub-xxxx.r2.dev/snapshot.json
https://pub-xxxx.r2.dev/constituencies.json
```

Check:
- `snapshot.json` → `lastUpdated` is within the last 2 minutes
- `constituencies.json` → array length is **165**
- `snapshot.json` → `declaredSeats` matches reality on election day
- If votes are present: `constituencies[0].votesCast > 0`

### 7. Watch live logs

```bash
npx wrangler tail
```

Every cron run prints:
```
[scraper] scheduled run — fetching upstream JSON…
[scraper] fetched 3406 records in 820 ms
[scraper] transformed in 45 ms → 165 constituencies, 0 declared, 0 total votes
[scraper] uploaded 3 files to R2 in 120 ms (total 985 ms)
```

If the upstream is unreachable or returns bad data, the run exits cleanly:
```
[scraper] upstream returned 503 Service Unavailable — R2 NOT updated
```
No stale/corrupt data will be written to R2.

---

## Vercel environment variables

Add these in **Vercel dashboard → Project → Settings → Environment Variables**:

| Variable | Value | Environment |
|----------|-------|-------------|
| `VITE_RESULTS_MODE` | `live` | Production only |
| `VITE_CDN_URL` | `https://pub-xxxx.r2.dev` | Production only |

> Leave `VITE_RESULTS_MODE` blank (or unset) in Preview/Development to keep
> archive mode active for branch deployments.

After adding the variables, trigger a **Redeploy** in Vercel.

---

## Changing the cron schedule

Current setting (`wrangler.toml`):

```toml
[triggers]
crons = ["*/2 * * * *"]   # every 2 minutes — stable, within CPU budget
```

To switch to every 1 minute (faster but uses double the CPU per hour):

```toml
crons = ["*/1 * * * *"]
```

Then redeploy:

```bash
npx wrangler deploy
```

Or change it in the Cloudflare dashboard → Workers → nepalvotes-scraper →
Triggers → Cron Triggers (no redeploy required from dashboard).

---

## Verification checklist (run before election day)

- [ ] `npx wrangler deploy` succeeds from `worker/` directory
- [ ] `curl https://nepalvotes-scraper.<subdomain>.workers.dev/` → `{"ok":true}`
- [ ] `https://pub-xxxx.r2.dev/constituencies.json` returns a 165-element array
- [ ] `https://pub-xxxx.r2.dev/snapshot.json` — `lastUpdated` updates each cron run
- [ ] `VITE_RESULTS_MODE=live` and `VITE_CDN_URL` set on Vercel Production
- [ ] nepalvotes.live shows live data (check browser DevTools → Network → `constituencies.json`)
- [ ] `wrangler tail` shows no errors during a cron run

---

## Election-day notes

- On election day upstream vote counts start populating after polls close.
- The Worker will detect `TotalVoteReceived > 0` and set constituency status
  to `COUNTING` or `DECLARED` automatically (no code changes needed).
- `E_STATUS === "W"` triggers `DECLARED` status. If the Election Commission
  uses a different string, update `isWinner()` in `worker/src/index.ts`.
- The Worker handles the UTF-8 BOM that is present in the official JSON file.
- Watch logs with `wrangler tail` — constituency count should remain 165.
