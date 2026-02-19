# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Nepal Election Live Vote Counter — a real-time election results dashboard for Nepal's House of Representatives general election (March 5, 2026). Currently **frontend-only** (mock data phase). A Python/FastAPI backend with SQLite and Playwright scraping is fully planned in `docs/plans/` but not yet scaffolded.

## Commands

All commands run from the `frontend/` directory:

```bash
npm run dev       # Start Vite dev server at http://localhost:5173
npm run build     # TypeScript compile (tsc -b) then Vite production build
npm run lint      # Run ESLint across all .ts/.tsx files
npm run preview   # Serve the production build locally
```

No test runner is currently configured (Vitest is planned as feature 20 in the roadmap).

## Architecture

### Current State (Mock Data Phase)

**Flat, prop-drilling pattern** — all state lives in [frontend/src/App.tsx](frontend/src/App.tsx) and flows down as props:

- `dark: boolean` — dark mode, persisted to `localStorage`, applied as `.dark` class on `<html>`
- `results: ConstituencyResult[]` — simulated live updates via `setInterval` every 3 seconds (randomly bumps votes, marks ~8% COUNTING → DECLARED)
- `selectedProvince` — shared filter state between `ProvinceSummary` and `ConstituencyTable`

**Components** (all in [frontend/src/](frontend/src/)):
- `ConstituencyTable.tsx` — largest component (531 lines); includes `useCountUp` custom hook (easeOutCubic via `requestAnimationFrame`) and an inline `DetailsModal` with ESC-key support
- `SummaryCards.tsx`, `SeatShareBars.tsx` — read directly from `mockData.ts`, no props needed
- `ProvinceSummary.tsx`, `ProgressBar.tsx` — receive props from App

**Data model** (from [frontend/src/mockData.ts](frontend/src/mockData.ts)):
- `PartyKey`: `"NC" | "CPN-UML" | "NCP" | "RSP" | "OTH"`
- `ConstituencyResult`: `{ province, district, code, name, status, lastUpdated, candidates[] }`
- `mockSnapshot`: `{ totalSeats: 275, declaredSeats: 245, seatTally: Record<PartyKey, { fptp, pr }> }`

### Planned Architecture (from `docs/plans/`)

The 20-feature roadmap ([docs/plans/2026-02-19-frontend-roadmap.md](docs/plans/2026-02-19-frontend-roadmap.md)) refactors to:
- **Zustand store** (`src/store/electionStore.ts`) — eliminates prop drilling
- **Custom hooks** (`src/hooks/useElectionSimulation.ts`) — extracts simulation/WebSocket logic
- **API layer** (`src/api/results.ts`) — `VITE_API_URL` env var, falls back to mock data
- **React Router** — adds `/admin` route
- **WebSocket** — replaces `setInterval` with live server push
- **`react-window`** — virtualized table for 165+ real constituencies
- **Vitest** — test suite for utilities, hooks, components

### Key Configuration

- **TypeScript**: strict mode with `noUnusedLocals`, `noUnusedParameters`, `erasableSyntaxOnly` — [frontend/tsconfig.app.json](frontend/tsconfig.app.json)
- **Tailwind v4**: `darkMode: "class"`, uses `@tailwindcss/postcss` plugin — [frontend/tailwind.config.cjs](frontend/tailwind.config.cjs)
- **ESLint**: flat config format (ESLint 9) — [frontend/eslint.config.js](frontend/eslint.config.js)
- **Vite**: minimal config, no proxy yet (will need backend proxy when API is wired) — [frontend/vite.config.ts](frontend/vite.config.ts)

## Branch & Docs

- Current branch: `Task_1`
- Detailed implementation plans live in [docs/plans/](docs/plans/) — read these before implementing new features to understand intended architecture
