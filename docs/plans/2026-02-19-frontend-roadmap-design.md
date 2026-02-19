# Frontend Roadmap Design — 20-Feature Implementation

**Date:** 2026-02-19
**Project:** Nepal Election Live Vote Counter
**Stack:** React 19 + TypeScript + Tailwind CSS v4 + Vite 7

---

## Goal

Progressively enhance the election dashboard from a mock-data prototype to a
production-ready, accessible, real-time application — across 20 features
organized into 4 roadmap levels.

---

## Approach: Two-Pass, UX-First

**Pass 1 (features 1–10):** UI/UX improvements and real dashboard features.
No new dependencies, no architectural changes. Delivers visible wins fast.

**Pass 2 (features 11–20):** Architecture refactor (Zustand, custom hook, API
layer), then production-readiness (WebSocket, performance, a11y, tests).

---

## Architecture

### Current State
- All state in `App.tsx` (`results`, `selectedProvince`, `dark`)
- Mock data imported directly from `mockData.ts`
- Components are stateless — receive props from `App.tsx`
- Simulation runs via `setInterval` inline in `App.tsx`

### After Pass 1
Same state shape. Additions:
- `isLoading: boolean` in `App.tsx` — 1.5s simulated delay on mount
- `src/components/Skeleton.tsx` — reusable `animate-pulse` skeleton primitives
- Tooltip component: `src/components/Tooltip.tsx` — CSS + Tailwind `group` pattern, no library
- `NepalMap.tsx` — self-contained SVG of Nepal's 7 provinces, colored by leading party
- Turnout fields added to `ConstituencyResult` in `mockData.ts`

### After Pass 2
- `src/hooks/useElectionSimulation.ts` — interval logic extracted from `App.tsx`, later upgraded to WebSocket
- `src/store/electionStore.ts` — Zustand store: `results`, `snapshot`, `selectedProvince`, `dark`
- `src/api/results.ts` — `fetchResults()` / `fetchSnapshot()`, reads from `VITE_API_URL` or falls back to mock
- Components read from store via selectors — no more prop drilling from `App.tsx`
- React Router adds `/admin` route for admin panel (feature 15)

---

## Feature Breakdown

### Pass 1

| # | Feature | Files Changed |
|---|---------|--------------|
| 1 | Loading skeletons | `Skeleton.tsx` (new), `App.tsx`, `SummaryCards.tsx`, `SeatShareBars.tsx`, `ConstituencyTable.tsx` |
| 2 | Sticky header | `App.tsx` — add `sticky top-0 z-40` to `<header>` |
| 3 | Smooth scroll | `index.css` — add `html { scroll-behavior: smooth; }` |
| 4 | Mobile UX | `ConstituencyTable.tsx` — stacked card layout below `sm:`, larger tap targets in modal |
| 5 | Tooltips | `Tooltip.tsx` (new), applied in `SeatShareBars.tsx`, `ConstituencyTable.tsx` |
| 6 | Vote % in table | `ConstituencyTable.tsx` — compute `votes / totalVotes * 100` inline |
| 7 | Turnout % | `mockData.ts` — add `totalVoters`/`votesCast` to `ConstituencyResult`; display in modal |
| 8 | Sorting controls | `ConstituencyTable.tsx` — dropdown with margin/province/alpha/status, `useMemo` |
| 9 | Seat-flip animation | `ConstituencyTable.tsx` — `useRef` previous winner, flash row on party change |
| 10 | Nepal map (SVG) | `NepalMap.tsx` (new), `App.tsx` — toggle button, province click → filter table |

### Pass 2

| # | Feature | Files Changed |
|---|---------|--------------|
| 11 | Custom hook | `useElectionSimulation.ts` (new), `App.tsx` simplified |
| 12 | Zustand store | `electionStore.ts` (new), all components refactored to use selectors |
| 13 | API layer | `src/api/results.ts` (new), `useElectionSimulation.ts` updated |
| 14 | Env config | `.env`, `vite.config.ts`, `results.ts` — `VITE_API_URL` with mock fallback |
| 15 | Admin panel | `src/pages/AdminPanel.tsx` (new), react-router-dom added, password gate |
| 16 | WebSocket | `useElectionSimulation.ts` — replace `setInterval` with `WebSocket` |
| 17 | Deploy guide | `docs/deploy.md` (new) — Vercel, Netlify, custom domain |
| 18 | Performance | `React.memo` on row components, `useMemo` audit, `react-window` for table, lazy modal |
| 19 | Accessibility | ARIA roles, focus trap in modal (`focus-trap-react`), LIVE region for updates |
| 20 | Tests | `vitest.config.ts`, `src/tests/` — utils, `useElectionSimulation`, `ConstituencyTable`, `NepalMap` |

---

## New Dependencies (Pass 2)

| Package | Purpose |
|---------|---------|
| `zustand` | Global state store |
| `react-router-dom` | Admin panel routing |
| `react-window` | Virtualized table for 165+ rows |
| `focus-trap-react` | Accessible modal focus trapping |
| `vitest` | Test runner |
| `@testing-library/react` | Component tests |
| `@testing-library/user-event` | User interaction simulation |
| `jsdom` | DOM environment for tests |

---

## Data Shape Changes

### `ConstituencyResult` (mockData.ts) — add turnout fields
```ts
type ConstituencyResult = {
  // ... existing fields ...
  totalVoters: number;   // registered voters
  votesCast: number;     // ballots cast
};
```

### Zustand Store Shape
```ts
interface ElectionStore {
  results: ConstituencyResult[];
  snapshot: Snapshot;
  selectedProvince: "All" | Province;
  dark: boolean;
  isLoading: boolean;
  viewMode: "table" | "map";
  sortBy: "margin" | "province" | "alpha" | "status";
  // actions
  setResults: (r: ConstituencyResult[]) => void;
  setSelectedProvince: (p: "All" | Province) => void;
  toggleDark: () => void;
  setViewMode: (v: "table" | "map") => void;
  setSortBy: (s: SortKey) => void;
}
```

---

## Success Criteria

- All 20 features implemented and working
- TypeScript compiles without errors after each feature
- `npm run build` passes after each feature
- Dark mode works in all new components
- No regressions in existing features (filtering, modal, simulation, province summary)
- Vitest test suite passes with coverage on utilities and hooks
