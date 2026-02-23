# Frontend — Nepal Election Live Vote Counter

React + TypeScript + Vite dashboard for the Nepal 2026 election results system.

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

## Structure

```
src/
├── App.tsx                        # Root component, routing, WebSocket wiring (pending Task 8)
├── main.tsx                       # React Router: / dashboard, /admin panel
├── mockData.ts                    # PartyKey, ConstituencyResult, Snapshot types + mock data
├── ConstituencyTable.tsx          # Virtualized results table, DetailsModal, useCountUp hook
├── NepalMap.tsx                   # SVG province map with real boundaries
├── SummaryCards.tsx               # Seat count cards (wired to snapshot prop)
├── SeatShareBars.tsx              # Proportional bar chart (wired to snapshot prop)
├── ProvinceSummary.tsx
├── ProgressBar.tsx
├── Skeleton.tsx
├── Tooltip.tsx
├── api/
│   └── results.ts                 # fetchSnapshot(), fetchConstituencies() — falls back to mock
├── store/
│   └── electionStore.ts           # Zustand: results, selectedProvince, dark, isLoading, viewMode, sortBy
├── hooks/
│   └── useElectionSimulation.ts   # Mock simulation + API polling + WebSocket connection
├── pages/
│   └── AdminPanel.tsx
└── tests/
```

## Environment

Set `VITE_API_URL` in `.env` to point at the backend:

```
VITE_API_URL=http://localhost:8000
```

Omit the variable entirely to use mock data (default dev behaviour before backend is wired up).

## Key Dependencies

- **React 18** + **TypeScript** (strict mode)
- **Vite** — dev server + bundler
- **Zustand** — global state
- **React Router v6** — client-side routing
- **Tailwind CSS v4** — `darkMode: "class"`
- **react-window** — virtualized constituency table
- **Vitest** — test runner

## Notes

- TypeScript config enforces `noUnusedLocals`, `noUnusedParameters`, `erasableSyntaxOnly`
- ESLint uses flat config (ESLint 9) — see `eslint.config.js`
- Vite proxy for `/api` and `/ws` not yet configured (Task 5)
