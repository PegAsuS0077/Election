# Ezoic Re-Enable Quick Guide

This project currently has Ezoic fully removed.

If you want to re-enable Ezoic later, apply the changes below.

## 1) Header Scripts (`frontend/index.html`)

Add these at the top of `<head>` (before other ad scripts):

```html
<script data-cfasync="false" src="https://cmp.gatekeeperconsent.com/min.js"></script>
<script data-cfasync="false" src="https://the.gatekeeperconsent.com/cmp.min.js"></script>
<script async src="//www.ezojs.com/ezoic/sa.min.js"></script>
<script>
  window.ezstandalone = window.ezstandalone || {};
  ezstandalone.cmd = ezstandalone.cmd || [];
</script>
<script src="//ezoicanalytics.com/analytics.js"></script>
```

## 2) ads.txt Server Redirect

### Vercel (`frontend/vercel.json`)

Add:

```json
"redirects": [
  {
    "source": "/ads.txt",
    "destination": "https://srv.adstxtmanager.com/19390/nepalvotes.live",
    "permanent": true
  }
]
```

### Cloudflare Pages (`frontend/public/_redirects`)

Add this line above SPA fallback:

```txt
/ads.txt https://srv.adstxtmanager.com/19390/nepalvotes.live 301
```

## 3) React Placement Code (example)

Add placeholder where ad should render:

```html
<div id="ezoic-pub-ad-placeholder-101"></div>
```

Queue placement IDs after page render:

```js
ezstandalone.cmd.push(function () {
  ezstandalone.showAds(101);
});
```

For multiple IDs on the same page:

```js
ezstandalone.showAds(101, 102, 103);
```

## 4) Verify

1. Deploy frontend.
2. Confirm `https://nepalvotes.live/ads.txt` resolves correctly.
3. Validate placement IDs in Ezoic dashboard.
