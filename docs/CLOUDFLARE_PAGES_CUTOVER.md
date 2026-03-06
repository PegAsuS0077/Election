# Cloudflare Pages Cutover + Rollback Plan

This runbook migrates frontend hosting from Vercel to Cloudflare Pages while keeping a fast rollback path.

## Goal

- Keep the existing data pipeline:
  - Cloudflare Worker cron writes JSON to R2.
  - Frontend reads from `VITE_CDN_URL`.
- Move only frontend hosting.
- Keep Vercel deploy live as standby until cutover is stable.

## Prerequisites

1. Keep the current Vercel project active (do not delete).
2. Confirm Worker health:
   - `https://<your-worker>.workers.dev/health`
3. Confirm R2 objects are fresh:
   - `<VITE_CDN_URL>/snapshot.json`
   - `<VITE_CDN_URL>/constituencies.json`

## Cloudflare Pages Setup

1. Create Pages project from this repo.
2. Build settings:
   - Root directory: `frontend`
   - Build command: `npm run build`
   - Output directory: `dist`
3. Environment variables (Production):
   - `VITE_RESULTS_MODE=live`
   - `VITE_CDN_URL=https://pub-<hash>.r2.dev`
4. Deploy and validate preview URL first.

## Route Handling (SPA)

This repo now includes `frontend/public/_redirects`:

```txt
/* /index.html 200
```

This is required for deep links like `/map`, `/parties`, `/constituency/...` on direct refresh.

## Safe Cutover (No-Downtime Pattern)

1. Lower DNS TTL for `nepalvotes.live` to `60` seconds (at least 10 minutes before switch).
2. Keep Vercel serving production while Pages is validated.
3. Point `nepalvotes.live` to Cloudflare Pages custom domain.
4. Verify:
   - Home loads.
   - Deep-link refresh works.
   - Network calls go to `VITE_CDN_URL` and return 200.
   - Core pages: `/`, `/explore`, `/map`, `/parties`, `/candidates`.
5. Monitor for 30-60 minutes before considering Vercel removal.

## Rollback (Fast)

If issues appear after cutover:

1. Re-point `nepalvotes.live` back to Vercel target.
2. Wait 1-2 TTL windows (with TTL 60s, usually ~1-3 minutes).
3. Purge Cloudflare cache for the zone.
4. Re-test critical pages.

Because Vercel remains live, rollback is DNS-only and does not require a new build.

## Post-Stabilization

After at least 24 hours stable traffic:

1. Keep `frontend/vercel.json` in repo for emergency redeploys.
2. Optionally remove Vercel project only when you no longer need instant rollback.

