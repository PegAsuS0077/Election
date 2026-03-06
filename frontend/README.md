# Frontend — Nepal Election Live Vote Counter

React + TypeScript + Vite dashboard for the Nepal 2026 election results system. Deployable on Vercel or Cloudflare Pages; reads pre-parsed JSON from Cloudflare R2.

## Commands

```bash
npm install            # Install dependencies
npm run dev            # Dev server at http://localhost:5173
npm run build          # tsc -b then Vite production build
npm run lint           # ESLint across all .ts/.tsx
npm run preview        # Serve production build locally
npm run test           # Vitest suite (once)
npm run test:watch     # Vitest watch mode
npm run test:coverage  # Coverage report
npx tsc --noEmit       # Type-check without emitting
```

## Modes

### Archive mode (default — no backend needed)

```bash
npm run dev
# Vite proxy fetches upstream JSON → all votes zeroed
# No VITE_RESULTS_MODE env var needed
```

### Live mode (election day)

```env
# frontend/.env.local
VITE_RESULTS_MODE=live
VITE_CDN_URL=https://pub-<hash>.r2.dev
```

### AdSense review mode (recommended during approval)

```env
# frontend/.env.local
VITE_ADSENSE_REVIEW_MODE=true
```

When enabled, the app keeps Google AdSense/Analytics but disables non-Google third-party monetization scripts and sponsored redirect behavior.

## Structure

```
src/
├── App.tsx                          # Root component, routing
├── main.tsx                         # React Router: routes for all pages
├── types.ts                         # Canonical TypeScript types (shared)
├── api.ts                           # CDN fetch helpers (live mode)
├── i18n.ts                          # NP/EN label translations
├── mockData.ts                      # Legacy mock — no production imports
│
├── ConstituencyTable.tsx            # Virtualized results table, DetailsModal, useCountUp
├── NepalMap.tsx                     # SVG province map with real boundaries
├── SummaryCards.tsx                 # Party seat count cards
├── SeatShareBars.tsx                # Proportional bar chart
├── HotSeats.tsx                     # Hot seats widget
├── ProgressBar.tsx
├── ProvinceSummary.tsx
├── Skeleton.tsx
├── Tooltip.tsx
├── Footer.tsx
│
├── api/                             # (legacy path — api.ts now at src root)
├── lib/
│   ├── archiveData.ts               # Fetch upstream JSON, zero votes, sessionStorage cache
│   ├── partyRegistry.ts             # Dynamic party registry built from upstream data
│   ├── parseUpstreamData.ts         # Upstream JSON → frontend types
│   ├── db.ts                        # In-memory data store
│   ├── constants.ts
│   ├── districtNames.ts
│   ├── neuLookup.ts                 # NEU candidate lookup
│   ├── transliterate.ts
│   └── utils.ts
│
├── store/
│   └── electionStore.ts             # Zustand: results, parties, selectedProvince, dark, lang…
│
├── hooks/
│   └── useElectionSimulation.ts     # Live: 30 s CDN polling; Archive: proxy fetch + zero
│
├── components/
│   ├── Layout.tsx                   # Shell layout (header, nav, footer)
│   └── ui/                          # Shared UI primitives
│
├── pages/
│   ├── AboutPage.tsx
│   ├── AdminPanel.tsx
│   ├── CandidateDetailPage.tsx
│   ├── CandidatesPage.tsx
│   ├── ContactPage.tsx
│   ├── ExplorePage.tsx
│   ├── MapPage.tsx
│   ├── PartiesPage.tsx
│   └── PrivacyPage.tsx
│
└── tests/
```

## Environment Variables

| Variable | Value | Description |
|----------|-------|-------------|
| `VITE_RESULTS_MODE` | `live` | Enables live CDN polling; omit for archive mode |
| `VITE_CDN_URL` | `https://pub-<hash>.r2.dev` | R2 public CDN (no trailing slash) |
| `VITE_ADSENSE_REVIEW_MODE` | `true` | Disables non-Google monetization and sponsored redirect UI for safer AdSense review |

## Key Data Architecture

- **partyId**: `String(SYMBOLCODE)` from upstream, or `"IND"` for independents — never a closed enum
- **partyName**: raw `PoliticalPartyName` from upstream — never invented or hardcoded
- **constituencyId**: `${STATE_ID}-${DistrictName}-${SCConstID}` composite key
- **Party registry**: built dynamically from upstream data in `lib/partyRegistry.ts`

## Key Dependencies

- **React 18** + **TypeScript** (strict mode)
- **Vite** — dev server + bundler + Vite proxy (archive mode fetches upstream JSON server-side)
- **Zustand** — global state
- **React Router v6** — client-side routing
- **Tailwind CSS v4** — `darkMode: "class"`
- **react-window** — virtualized constituency table
- **Vitest** — test runner

## Notes

- TypeScript config enforces `noUnusedLocals`, `noUnusedParameters`, `erasableSyntaxOnly`
- ESLint uses flat config (ESLint 9) — see `eslint.config.js`
- No WebSocket — frontend polls CDN; live updates arrive every 30 s via `setInterval`
- `mockData.ts` still exists but no production code imports from it
