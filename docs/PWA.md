# PWA Setup — NepalVotes

NepalVotes is installable as a Progressive Web App (PWA) on Android and desktop Chrome/Edge. This document explains how to verify the setup.

## Files Added / Changed

| File | Purpose |
|------|---------|
| `frontend/public/manifest.webmanifest` | Web App Manifest — name, icons, display mode |
| `frontend/public/icons/icon-192.png` | 192×192 PWA icon |
| `frontend/public/icons/icon-512.png` | 512×512 PWA icon |
| `frontend/public/offline.html` | Fallback page shown when offline |
| `frontend/vite.config.ts` | Added `vite-plugin-pwa` with Workbox config |
| `frontend/src/main.tsx` | Registers service worker via `virtual:pwa-register` |
| `frontend/src/components/InstallPrompt.tsx` | "Add to Home Screen" banner |
| `frontend/src/App.tsx` | Mounts `<InstallPrompt />` |
| `frontend/index.html` | Added `<link rel="manifest">`, `theme-color`, Apple meta tags |
| `frontend/tsconfig.app.json` | Added `vite-plugin-pwa/vanillajs` to types |

## Local Testing

### 1. Development server (SW disabled in dev by default)

```bash
cd frontend
npm run dev
```

Service worker is disabled in dev (`devOptions.enabled: false`) to avoid caching confusion. Use the production build to test the SW.

### 2. Production build + preview

```bash
cd frontend
npm run build   # generates dist/ with sw.js + workbox chunks
npm run preview # serves at http://localhost:4173
```

Open `http://localhost:4173` in Chrome.

### 3. Chrome DevTools — Application tab

- Open **DevTools → Application → Manifest**
  - Should show app name, icons, display `standalone`
- Open **DevTools → Application → Service Workers**
  - Should show `sw.js` as "Activated and running"
  - Tick **Offline** to test the offline fallback

### 4. Lighthouse PWA audit

In Chrome DevTools:
1. Go to **Lighthouse** tab
2. Select **Progressive Web App** category
3. Run audit on `http://localhost:4173`

Expected results:
- Installable ✓
- PWA Optimised ✓
- Offline fallback ✓

### 5. Android install (Add to Home Screen)

1. Open `https://nepalvotes.live` in Chrome on Android
2. Tap the **three-dot menu → Add to Home Screen** (or wait for the Install banner to appear at the bottom)
3. Tap **Add** — the app icon appears on the home screen
4. Launch — opens in standalone mode (no browser chrome)

### 6. Desktop install (Chrome/Edge)

Look for the install icon (⊕) in the address bar on the right. Click to install.

## Workbox Caching Strategy

| Route | Strategy | TTL |
|-------|----------|-----|
| `result.election.gov.np/JSONFiles/*` | NetworkFirst | 5 min |
| `result.election.gov.np/Images/Candidate/*` | CacheFirst | 7 days |
| Cloudflare R2 CDN URLs | StaleWhileRevalidate | 2 min |
| App shell (JS/CSS/HTML) | Precached | Until new deploy |

## Updating Icons

The placeholder icons in `public/icons/` are generated programmatically (dark navy circle with N monogram). To replace them with a proper branded icon:

1. Create a 512×512 PNG with transparent background
2. Save as `frontend/public/icons/icon-512.png`
3. Scale it down and save as `frontend/public/icons/icon-192.png`
4. Rebuild: `npm run build`

> **Tip**: Use [Squoosh](https://squoosh.app) or [pwa-asset-generator](https://github.com/elegantapp/pwa-asset-generator) to generate all icon sizes from a single source SVG.
