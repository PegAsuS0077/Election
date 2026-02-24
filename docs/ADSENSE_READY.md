# AdSense Readiness Checklist — NepalVotes

## Pre-Application Checklist

- [ ] Site indexed by Google (verify in Google Search Console)
- [ ] Sitemap submitted to Google Search Console (`https://nepalvotes.live/sitemap.xml`)
- [ ] Privacy Policy page exists (`/privacy-policy`)
- [ ] About page exists (`/about`)
- [ ] Contact page exists (`/contact`)
- [ ] Unique, original content present (live election data, not duplicated)
- [ ] No broken links in navigation or footer
- [ ] Clean, functional navigation (desktop + mobile)
- [ ] Mobile responsive (verified on multiple screen sizes)
- [ ] No console errors in production build
- [ ] robots.txt allows crawling (`https://nepalvotes.live/robots.txt`)
- [ ] Site accessible via HTTPS
- [ ] Domain age ≥ 6 months (verify before applying)

---

## How to Apply for Google AdSense

1. Go to [https://adsense.google.com](https://adsense.google.com)
2. Sign in with your Google account
3. Click **Get Started**
4. Enter your website URL: `https://nepalvotes.live`
5. Choose your payment country and accept terms
6. Google will provide an AdSense verification script — paste it inside `<head>` in `frontend/index.html`:
   ```html
   <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-XXXXXXXXXXXXXXXXX"
        crossorigin="anonymous"></script>
   ```
7. Submit for review. Google typically reviews within 1–14 days.
8. Once approved, create ad units in the AdSense dashboard.

---

## Where to Place Ad Code

### Option A — Global (all pages)
Paste the AdSense auto-ads script in `frontend/index.html` inside `<head>`:
```html
<!-- AdSense auto ads -->
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-XXXXXXXXXXXXXXXXX"
     crossorigin="anonymous"></script>
```
Auto-ads will automatically find good placement spots across the site.

### Option B — Manual ad units in specific components
For targeted placement, add ad units in these components:

| Component | File | Suggested placement |
|-----------|------|---------------------|
| Between summary cards and seat share bars | `frontend/src/App.tsx` | After `<SummaryCards />` |
| Above constituency table | `frontend/src/App.tsx` | Before `<ConstituencyTable />` |
| Sidebar on Explore page | `frontend/src/pages/ExplorePage.tsx` | Right column |
| Below party list | `frontend/src/pages/PartiesPage.tsx` | Bottom of page |

**Example ad unit component** (create once approved):
```tsx
// frontend/src/components/AdUnit.tsx
export function AdUnit({ slot }: { slot: string }) {
  useEffect(() => {
    try {
      ((window as unknown as Record<string, unknown>).adsbygoogle as unknown[]).push({});
    } catch {}
  }, []);
  return (
    <ins
      className="adsbygoogle"
      style={{ display: "block" }}
      data-ad-client="ca-pub-XXXXXXXXXXXXXXXXX"
      data-ad-slot={slot}
      data-ad-format="auto"
      data-full-width-responsive="true"
    />
  );
}
```

---

## Notes

- **Content policy**: Ensure all election data shown is factual and sourced from the Election Commission of Nepal.
- **Traffic requirement**: AdSense has no official minimum traffic, but sites with consistent organic traffic (500+ sessions/day) get approved faster.
- **Policy violations to avoid**: No copyrighted images, no misleading content, no pop-ups that block content.
- **Nepal-specific**: AdSense is available in Nepal. Ensure your payment profile is set to Nepal if receiving payments locally.
