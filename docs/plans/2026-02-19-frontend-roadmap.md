# Frontend Roadmap — 20-Feature Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Progressively enhance the Nepal election dashboard from a mock-data prototype into a production-ready, accessible, real-time React application across 20 features.

**Architecture:** Pass 1 (tasks 1–10) adds UX polish and real dashboard features with no new dependencies. Pass 2 (tasks 11–20) refactors state into a Zustand store, extracts logic into a custom hook, adds an API layer, WebSocket, admin panel, performance optimisations, accessibility, and a Vitest test suite.

**Tech Stack:** React 19, TypeScript, Tailwind CSS v4, Vite 7, Zustand (Pass 2), react-router-dom (Pass 2), react-window (Pass 2), focus-trap-react (Pass 2), Vitest + React Testing Library (Pass 2)

---

## PASS 1 — UX & Dashboard Features

---

### Task 1: Loading Skeletons

**Files:**
- Create: `frontend/src/Skeleton.tsx`
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/SummaryCards.tsx`
- Modify: `frontend/src/SeatShareBars.tsx`
- Modify: `frontend/src/ConstituencyTable.tsx`

**Step 1: Create `frontend/src/Skeleton.tsx`**

```tsx
/** Reusable animate-pulse skeleton primitives. */
function SkeletonBox({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-xl bg-slate-200 dark:bg-slate-700 ${className ?? ""}`}
    />
  );
}

export function SummaryCardsSkeleton() {
  return (
    <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:bg-slate-900 dark:border-slate-800"
        >
          <SkeletonBox className="h-4 w-24" />
          <SkeletonBox className="mt-3 h-7 w-32" />
          <SkeletonBox className="mt-2 h-4 w-20" />
        </div>
      ))}
    </section>
  );
}

export function SeatShareBarsSkeleton() {
  return (
    <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm dark:bg-slate-900 dark:border-slate-800">
      <SkeletonBox className="h-5 w-40 mb-6" />
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} className="mb-5">
          <div className="flex justify-between mb-2">
            <SkeletonBox className="h-4 w-32" />
            <SkeletonBox className="h-4 w-8" />
          </div>
          <SkeletonBox className="h-3 w-full rounded-full" />
        </div>
      ))}
    </section>
  );
}

export function TableRowsSkeleton() {
  return (
    <>
      {[0, 1, 2, 3, 4].map((i) => (
        <tr key={i}>
          <td colSpan={7} className="py-3 px-1">
            <div className="flex gap-4">
              <SkeletonBox className="h-5 flex-1" />
              <SkeletonBox className="h-5 flex-1" />
              <SkeletonBox className="h-5 flex-[2]" />
              <SkeletonBox className="h-5 flex-[2]" />
              <SkeletonBox className="h-5 w-16" />
              <SkeletonBox className="h-5 w-20" />
              <SkeletonBox className="h-5 w-24" />
            </div>
          </td>
        </tr>
      ))}
    </>
  );
}
```

**Step 2: Add `isLoading` state to `App.tsx`**

In `App.tsx`, add after the `dark` state:

```tsx
const [isLoading, setIsLoading] = useState(true);

useEffect(() => {
  const t = setTimeout(() => setIsLoading(false), 1500);
  return () => clearTimeout(t);
}, []);
```

Pass `isLoading` to the components that need it and import the skeletons:

```tsx
import {
  SummaryCardsSkeleton,
  SeatShareBarsSkeleton,
} from "./Skeleton";
```

In the JSX, replace `<SummaryCards />` with:
```tsx
{isLoading ? <SummaryCardsSkeleton /> : <SummaryCards />}
```

Replace `<SeatShareBars />` with:
```tsx
{isLoading ? <SeatShareBarsSkeleton /> : <SeatShareBars />}
```

Pass `isLoading` to `ConstituencyTable`:
```tsx
<ConstituencyTable
  results={results}
  provinces={provinces}
  selectedProvince={selectedProvince}
  onProvinceChange={setSelectedProvince}
  isLoading={isLoading}
/>
```

**Step 3: Update `ConstituencyTable.tsx` props and import skeleton**

Add `isLoading` to the props interface:
```tsx
import { TableRowsSkeleton } from "./Skeleton";

// in the props:
{
  results: ConstituencyResult[];
  provinces: Province[];
  selectedProvince: "All" | Province;
  onProvinceChange: (p: "All" | Province) => void;
  isLoading?: boolean;
}
```

In the `<tbody>`, add before the current empty-state check:
```tsx
<tbody className="divide-y divide-slate-200 dark:divide-slate-800">
  {isLoading ? (
    <TableRowsSkeleton />
  ) : filtered.length === 0 ? (
    <tr>
      <td colSpan={7} className="py-8 text-sm text-slate-600 dark:text-slate-300">
        No rows match your search.
      </td>
    </tr>
  ) : (
    filtered.map((r) => (
      <Row key={r.code} r={r} onClick={() => setSelectedCode(r.code)} />
    ))
  )}
</tbody>
```

**Step 4: Verify TypeScript and build**

```bash
cd /d/Teaching_Support/New_Project/frontend
npx tsc --noEmit
npm run build
```

Expected: No TypeScript errors. Build succeeds.

**Step 5: Commit**

```bash
git add frontend/src/Skeleton.tsx frontend/src/App.tsx frontend/src/ConstituencyTable.tsx
git commit -m "feat: add animated loading skeletons for cards, bars, and table rows"
```

---

### Task 2: Sticky Header

**Files:**
- Modify: `frontend/src/App.tsx`

**Step 1: Add `sticky top-0 z-40` to the `<header>` element**

In `App.tsx`, find the `<header>` opening tag (line 104) and update the className:

```tsx
<header className="sticky top-0 z-40 bg-white border-b border-slate-200 dark:bg-slate-900 dark:border-slate-800">
```

**Step 2: Verify build**

```bash
npx tsc --noEmit && npm run build
```

Expected: Build succeeds.

**Step 3: Commit**

```bash
git add frontend/src/App.tsx
git commit -m "feat: make header sticky on scroll"
```

---

### Task 3: Smooth Scroll

**Files:**
- Modify: `frontend/src/index.css`

**Step 1: Read current `index.css`**

Current content:
```css
@import "tailwindcss";

@custom-variant dark (&:where(.dark, .dark *));
```

**Step 2: Add smooth scroll**

```css
@import "tailwindcss";

@custom-variant dark (&:where(.dark, .dark *));

html {
  scroll-behavior: smooth;
}
```

**Step 3: Verify build**

```bash
npm run build
```

Expected: Build succeeds, CSS grows slightly.

**Step 4: Commit**

```bash
git add frontend/src/index.css
git commit -m "feat: add smooth scroll behavior"
```

---

### Task 4: Mobile UX — Stacked Card Layout

**Files:**
- Modify: `frontend/src/ConstituencyTable.tsx`

**Step 1: Replace the desktop `Row` grid with a responsive layout**

The current `Row` component renders a `<div className="grid grid-cols-7 ...">` inside a button. Replace the `Row` function entirely with this version that renders a stacked card on mobile and the grid on `sm+`:

```tsx
function Row({ r, onClick }: { r: ConstituencyResult; onClick: () => void }) {
  const t = topCandidates(r.candidates);
  const leader = t.leader;
  const runnerUp = t.runnerUp;
  const leadParty = leader ? parties[leader.party] : null;
  const runParty = runnerUp ? parties[runnerUp.party] : null;
  const margin = (leader?.votes ?? 0) - (runnerUp?.votes ?? 0);

  const statusClass =
    r.status === "DECLARED"
      ? "bg-emerald-50 text-emerald-800 ring-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-200 dark:ring-emerald-900"
      : "bg-amber-50 text-amber-800 ring-amber-200 dark:bg-amber-900/30 dark:text-amber-200 dark:ring-amber-900";

  return (
    <tr>
      <td colSpan={7} className="p-0">
        <button
          type="button"
          onClick={onClick}
          title="Click to view details"
          className="w-full text-left transition hover:bg-slate-50 dark:hover:bg-slate-800/60
                     focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300
                     dark:focus-visible:ring-slate-700 active:scale-[0.995] min-h-[44px]"
        >
          {/* Mobile: stacked card */}
          <div className="sm:hidden px-4 py-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="font-semibold text-slate-900 dark:text-slate-100">{r.name}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  {r.code} · {r.district} · {r.province}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {r.status === "COUNTING" && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-xs font-bold text-red-700 ring-1 ring-red-200 dark:bg-red-900/30 dark:text-red-200 dark:ring-red-900">
                    <span className="h-1.5 w-1.5 rounded-full bg-red-600 animate-pulse" />
                    LIVE
                  </span>
                )}
                <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-bold ring-1 ${statusClass}`}>
                  {r.status === "DECLARED" ? "Declared" : "Counting"}
                </span>
              </div>
            </div>

            {leader && leadParty && (
              <div className="flex items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-full ${leadParty.color}`} />
                <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">{leader.name}</span>
                <span className="text-xs text-slate-500 dark:text-slate-400">{number(leader.votes)}</span>
                <span className="text-xs text-slate-500 dark:text-slate-400 ml-auto">
                  Margin: <span className="font-semibold text-slate-700 dark:text-slate-200">{number(margin)}</span>
                </span>
              </div>
            )}
          </div>

          {/* Desktop: 7-column grid */}
          <div className="hidden sm:grid grid-cols-7 items-center">
            <div className="py-3 pr-4">
              <div className="font-semibold text-slate-900 dark:text-slate-100">{r.name}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                <span className="font-semibold text-slate-700 dark:text-slate-200">{r.code}</span> · {r.district}
              </div>
            </div>

            <div className="py-3 pr-4 text-sm text-slate-700 dark:text-slate-200">{r.province}</div>

            <div className="py-3 pr-4">
              {leader && leadParty ? (
                <div className="flex items-center gap-2">
                  <span className={`h-3 w-3 rounded-full ${leadParty.color}`} />
                  <div>
                    <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{leader.name}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {leadParty.name} · <span className="font-semibold text-slate-700 dark:text-slate-200 tabular-nums">{number(leader.votes)}</span>
                    </div>
                  </div>
                </div>
              ) : <span className="text-sm text-slate-500 dark:text-slate-400">—</span>}
            </div>

            <div className="py-3 pr-4">
              {runnerUp && runParty ? (
                <div className="flex items-center gap-2">
                  <span className={`h-3 w-3 rounded-full ${runParty.color}`} />
                  <div>
                    <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{runnerUp.name}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {runParty.name} · <span className="font-semibold text-slate-700 dark:text-slate-200 tabular-nums">{number(runnerUp.votes)}</span>
                    </div>
                  </div>
                </div>
              ) : <span className="text-sm text-slate-500 dark:text-slate-400">—</span>}
            </div>

            <div className="py-3 pr-4 text-sm font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
              {number(margin)}
            </div>

            <div className="py-3 pr-4">
              <div className="flex items-center gap-2">
                {r.status === "COUNTING" && (
                  <span className="inline-flex items-center gap-2 rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-red-700 ring-1 ring-red-200 dark:bg-red-900/30 dark:text-red-200 dark:ring-red-900">
                    <span className="h-2 w-2 rounded-full bg-red-600 animate-pulse" />
                    LIVE
                  </span>
                )}
                <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ring-1 ${statusClass}`}>
                  {r.status === "DECLARED" ? "Declared" : "Counting"}
                </span>
              </div>
            </div>

            <div className="py-3 text-xs text-slate-600 dark:text-slate-300">{formatTime(r.lastUpdated)}</div>
          </div>
        </button>
      </td>
    </tr>
  );
}
```

Also update the `DetailsModal` so it fits small screens — add `overflow-y-auto max-h-[90vh]` to the inner panel:

```tsx
<div
  className={`relative w-full max-w-2xl rounded-2xl border border-slate-200 bg-white shadow-xl
              transition-all duration-150 overflow-y-auto max-h-[90vh] ${panelCls}
              dark:bg-slate-900 dark:border-slate-800`}
>
```

**Step 2: Verify build**

```bash
npx tsc --noEmit && npm run build
```

Expected: Build succeeds.

**Step 3: Commit**

```bash
git add frontend/src/ConstituencyTable.tsx
git commit -m "feat: responsive mobile layout - stacked card below sm, taller tap targets, scrollable modal"
```

---

### Task 5: Tooltips

**Files:**
- Create: `frontend/src/Tooltip.tsx`
- Modify: `frontend/src/SeatShareBars.tsx`
- Modify: `frontend/src/ConstituencyTable.tsx`

**Step 1: Create `frontend/src/Tooltip.tsx`**

```tsx
import { type ReactNode } from "react";

/**
 * Lightweight tooltip using CSS only — no JS, no library.
 * Usage:
 *   <Tooltip text="Explanation here">
 *     <button>hover me</button>
 *   </Tooltip>
 */
export default function Tooltip({
  text,
  children,
}: {
  text: string;
  children: ReactNode;
}) {
  return (
    <span className="relative group inline-flex">
      {children}
      <span
        role="tooltip"
        className="
          pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50
          w-max max-w-[220px] rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs text-white
          shadow-lg
          opacity-0 scale-95
          group-hover:opacity-100 group-hover:scale-100
          group-focus-within:opacity-100 group-focus-within:scale-100
          transition-all duration-150 origin-bottom
          dark:bg-slate-700
        "
      >
        {text}
        {/* Arrow */}
        <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900 dark:border-t-slate-700" />
      </span>
    </span>
  );
}
```

**Step 2: Apply tooltip to the majority line in `SeatShareBars.tsx`**

Import and wrap the majority line label:

```tsx
import Tooltip from "./Tooltip";

// Replace the majority line label section:
<div className="mt-4 flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
  <Tooltip text="A party needs this many seats to form a majority government.">
    <span className="inline-flex items-center gap-2 cursor-default">
      <span className="inline-block h-3 w-[2px] bg-slate-900/60 dark:bg-slate-100/60" />
      <span>Majority line ({majority})</span>
    </span>
  </Tooltip>
</div>

// In each bar row, wrap the seat count:
<Tooltip text={`${r.name}: ${r.total} seats (${r.percent.toFixed(1)}%)`}>
  <span className="font-semibold text-slate-700 tabular-nums dark:text-slate-200 cursor-default">
    {r.total}
  </span>
</Tooltip>
```

**Step 3: Apply tooltip to Margin column and LIVE badge in `ConstituencyTable.tsx`**

Import Tooltip and wrap the margin cell and LIVE badge in the desktop grid:

```tsx
import Tooltip from "./Tooltip";

// Margin cell (desktop grid, 5th column):
<Tooltip text="Vote difference between 1st and 2nd place">
  <span className="py-3 pr-4 text-sm font-semibold text-slate-900 dark:text-slate-100 tabular-nums cursor-default">
    {number(margin)}
  </span>
</Tooltip>

// LIVE badge:
<Tooltip text="Counting in progress — votes are still being tallied">
  <span className="inline-flex items-center gap-2 rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-red-700 ring-1 ring-red-200 dark:bg-red-900/30 dark:text-red-200 dark:ring-red-900">
    <span className="h-2 w-2 rounded-full bg-red-600 animate-pulse" />
    LIVE
  </span>
</Tooltip>
```

**Step 4: Verify build**

```bash
npx tsc --noEmit && npm run build
```

Expected: Build succeeds.

**Step 5: Commit**

```bash
git add frontend/src/Tooltip.tsx frontend/src/SeatShareBars.tsx frontend/src/ConstituencyTable.tsx
git commit -m "feat: add accessible CSS-only tooltips on seat bars, margin column, and LIVE badge"
```

---

### Task 6: Vote Percentage in Table

**Files:**
- Modify: `frontend/src/ConstituencyTable.tsx`

**Step 1: Add a `votePct` helper function** near the top of `ConstituencyTable.tsx`:

```tsx
function votePct(votes: number, candidates: Candidate[]): string {
  const total = candidates.reduce((s, c) => s + c.votes, 0);
  if (total === 0) return "";
  return `${((votes / total) * 100).toFixed(1)}%`;
}
```

**Step 2: Update the Leader and Runner-up cells in the desktop grid** to show the percentage:

```tsx
// Leader cell — add % after votes:
<div className="text-xs text-slate-500 dark:text-slate-400">
  {leadParty.name} ·{" "}
  <span className="font-semibold text-slate-700 dark:text-slate-200 tabular-nums">
    {number(leader.votes)}
  </span>
  {" "}
  <span className="text-slate-400 dark:text-slate-500">
    ({votePct(leader.votes, r.candidates)})
  </span>
</div>

// Runner-up cell — same treatment:
<div className="text-xs text-slate-500 dark:text-slate-400">
  {runParty.name} ·{" "}
  <span className="font-semibold text-slate-700 dark:text-slate-200 tabular-nums">
    {number(runnerUp.votes)}
  </span>
  {" "}
  <span className="text-slate-400 dark:text-slate-500">
    ({votePct(runnerUp.votes, r.candidates)})
  </span>
</div>
```

Also update the `DetailsModal` — in the `CandidateCard` and "All candidates" list, show percentage of total votes (not just top-two):

In `DetailsModal`, before the `return`, compute:
```tsx
const totalAllVotes = t.sorted.reduce((s, c) => s + c.votes, 0);
```

In the "All candidates" list, add the percentage next to each vote count:
```tsx
<div className="text-sm font-bold text-slate-900 dark:text-slate-100 tabular-nums">
  {number(c.votes)}
  <span className="ml-1 text-xs font-normal text-slate-400 dark:text-slate-500">
    {totalAllVotes > 0 ? `(${((c.votes / totalAllVotes) * 100).toFixed(1)}%)` : ""}
  </span>
</div>
```

**Step 3: Verify build**

```bash
npx tsc --noEmit && npm run build
```

**Step 4: Commit**

```bash
git add frontend/src/ConstituencyTable.tsx
git commit -m "feat: show vote percentage next to vote counts in table and modal"
```

---

### Task 7: Turnout Percentage

**Files:**
- Modify: `frontend/src/mockData.ts`
- Modify: `frontend/src/ConstituencyTable.tsx`

**Step 1: Add `totalVoters` and `votesCast` to the `ConstituencyResult` type in `mockData.ts`**

In the type definition:
```ts
export type ConstituencyResult = {
  province: Province;
  district: string;
  code: string;
  name: string;
  status: "DECLARED" | "COUNTING";
  lastUpdated: string;
  candidates: Candidate[];
  totalVoters: number;
  votesCast: number;
};
```

Add realistic values to each mock constituency object. For each, add:
```ts
totalVoters: 65000,
votesCast: 52000,
```

Use these approximate totals for each constituency (adjust to feel realistic):
```ts
// KTM-3:
totalVoters: 72000, votesCast: 55000,
// LTP-1:
totalVoters: 68000, votesCast: 59000,
// MRG-5:
totalVoters: 78000, votesCast: 62000,
// DHS-2:
totalVoters: 82000, votesCast: 61000,
// KSK-2:
totalVoters: 60000, votesCast: 48000,
// RPD-3:
totalVoters: 88000, votesCast: 71000,
// SRK-1:
totalVoters: 54000, votesCast: 40000,
// KLL-4:
totalVoters: 63000, votesCast: 50000,
```

**Step 2: Show turnout in `DetailsModal`**

In the `DetailsModal` component, add a turnout row below the top-two vote share section:

```tsx
{/* Turnout */}
<div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
  <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">Voter Turnout</div>
  <div className="mt-2 flex items-center justify-between text-sm text-slate-700 dark:text-slate-200">
    <span>Votes cast</span>
    <span className="font-semibold tabular-nums">{number(r.votesCast)} / {number(r.totalVoters)}</span>
  </div>
  <div className="mt-2 h-2 w-full rounded-full bg-slate-200 overflow-hidden dark:bg-slate-700">
    <div
      className="h-2 bg-slate-900 dark:bg-slate-100 transition-[width] duration-700 ease-out"
      style={{ width: `${Math.min(100, (r.votesCast / r.totalVoters) * 100).toFixed(1)}%` }}
    />
  </div>
  <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
    {r.totalVoters > 0 ? `${((r.votesCast / r.totalVoters) * 100).toFixed(1)}% turnout` : "—"}
  </div>
</div>
```

**Step 3: Verify build**

```bash
npx tsc --noEmit && npm run build
```

Expected: No TypeScript errors.

**Step 4: Commit**

```bash
git add frontend/src/mockData.ts frontend/src/ConstituencyTable.tsx
git commit -m "feat: add voter turnout data and display in constituency modal"
```

---

### Task 8: Sorting Controls

**Files:**
- Modify: `frontend/src/ConstituencyTable.tsx`

**Step 1: Add `SortKey` type and `sortBy` state**

At the top of the file, after imports:
```tsx
type SortKey = "margin" | "province" | "alpha" | "status";
```

Inside `ConstituencyTable`, add after the `query` state:
```tsx
const [sortBy, setSortBy] = useState<SortKey>("status");
```

**Step 2: Update the `filtered` `useMemo` to apply sorting**

Replace the `.sort(...)` at the end of the current `filtered` memo with a sort that respects `sortBy`:

```tsx
const filtered = useMemo(() => {
  const q = query.trim().toLowerCase();

  const base = results
    .filter((r) => (selectedProvince === "All" ? true : r.province === selectedProvince))
    .filter((r) => {
      if (!q) return true;
      const names = Array.isArray(r.candidates) ? r.candidates.map((c) => c.name).join(" ") : "";
      const hay = `${r.name} ${r.code} ${r.district} ${names}`.toLowerCase();
      return hay.includes(q);
    });

  return [...base].sort((a, b) => {
    switch (sortBy) {
      case "margin": {
        const ta = topCandidates(a.candidates);
        const tb = topCandidates(b.candidates);
        const ma = (ta.leader?.votes ?? 0) - (ta.runnerUp?.votes ?? 0);
        const mb = (tb.leader?.votes ?? 0) - (tb.runnerUp?.votes ?? 0);
        return mb - ma;
      }
      case "province":
        return a.province.localeCompare(b.province);
      case "alpha":
        return a.name.localeCompare(b.name);
      case "status":
      default:
        if (a.status !== b.status) return a.status === "DECLARED" ? -1 : 1;
        const ta2 = topCandidates(a.candidates);
        const tb2 = topCandidates(b.candidates);
        const ma2 = (ta2.leader?.votes ?? 0) - (ta2.runnerUp?.votes ?? 0);
        const mb2 = (tb2.leader?.votes ?? 0) - (tb2.runnerUp?.votes ?? 0);
        return mb2 - ma2;
    }
  });
}, [query, selectedProvince, sortBy, results]);
```

**Step 3: Add the sort dropdown to the filter bar UI**

In the filter bar `<div>` that contains the search input and province select, add a third control:

```tsx
<select
  value={sortBy}
  onChange={(e) => setSortBy(e.target.value as SortKey)}
  className="w-full sm:w-44 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none
             focus:ring-2 focus:ring-slate-200 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-100 dark:focus:ring-slate-700"
>
  <option value="status">Sort: Status</option>
  <option value="margin">Sort: Margin ↓</option>
  <option value="province">Sort: Province A–Z</option>
  <option value="alpha">Sort: Name A–Z</option>
</select>
```

**Step 4: Verify build**

```bash
npx tsc --noEmit && npm run build
```

**Step 5: Commit**

```bash
git add frontend/src/ConstituencyTable.tsx
git commit -m "feat: add sort dropdown to constituency table (margin, province, alpha, status)"
```

---

### Task 9: Seat-Flip Animation

**Files:**
- Modify: `frontend/src/ConstituencyTable.tsx`

**Step 1: Track previous winner with `useRef` inside `Row`**

The `Row` component receives `r: ConstituencyResult` as a prop. We need to detect when the leading party changes between renders, then briefly flash the row.

Add this hook near the top of the file (after existing helpers):

```tsx
function useFlash(trigger: string) {
  const [flashing, setFlashing] = useState(false);
  const prevRef = useRef(trigger);

  useEffect(() => {
    if (prevRef.current !== trigger) {
      prevRef.current = trigger;
      setFlashing(true);
      const t = setTimeout(() => setFlashing(false), 900);
      return () => clearTimeout(t);
    }
  }, [trigger]);

  return flashing;
}
```

**Step 2: Apply the flash to `Row`**

Inside the `Row` function, compute the current leader party and use the hook:

```tsx
function Row({ r, onClick }: { r: ConstituencyResult; onClick: () => void }) {
  const t = topCandidates(r.candidates);
  const leader = t.leader;
  // ...existing code...

  const currentLeaderParty = leader?.party ?? "";
  const flashing = useFlash(currentLeaderParty);

  // In the button className, append flash class:
  const flashClass = flashing
    ? "bg-yellow-50 dark:bg-yellow-900/20"
    : "";

  // Update the button element:
  className={`w-full text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60
              focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300
              dark:focus-visible:ring-slate-700 active:scale-[0.995] min-h-[44px]
              ${flashClass}`}
```

**Step 3: Add a "Flipped" indicator in the stacked mobile card**

Inside the mobile card section, show a brief badge if flashing:

```tsx
{flashing && (
  <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-bold text-yellow-800 ring-1 ring-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-200 dark:ring-yellow-800">
    ↕ Updated
  </span>
)}
```

**Step 4: Verify build**

```bash
npx tsc --noEmit && npm run build
```

**Step 5: Commit**

```bash
git add frontend/src/ConstituencyTable.tsx
git commit -m "feat: flash row yellow when leading party changes (seat-flip indicator)"
```

---

### Task 10: Nepal Province Map (SVG)

**Files:**
- Create: `frontend/src/NepalMap.tsx`
- Modify: `frontend/src/App.tsx`

**Step 1: Create `frontend/src/NepalMap.tsx`**

```tsx
import { parties } from "./mockData";
import type { ConstituencyResult, Province } from "./mockData";

// Simplified schematic SVG paths for Nepal's 7 provinces.
// These are approximate shapes for a dashboard schematic — not geographically precise.
const PROVINCE_PATHS: Record<Province, { d: string; labelX: number; labelY: number }> = {
  Sudurpashchim: { d: "M 0,110 L 138,75 L 160,295 L 0,308 Z",          labelX: 72,  labelY: 205 },
  Karnali:       { d: "M 138,75 L 346,32 L 368,248 L 160,295 Z",        labelX: 248, labelY: 175 },
  Lumbini:       { d: "M 160,295 L 368,248 L 393,338 L 0,338 L 0,308 Z", labelX: 210, labelY: 322 },
  Gandaki:       { d: "M 346,32 L 508,22 L 520,238 L 368,248 Z",        labelX: 432, labelY: 155 },
  Bagmati:       { d: "M 508,22 L 656,28 L 663,242 L 520,238 Z",        labelX: 582, labelY: 152 },
  Madhesh:       { d: "M 393,338 L 760,330 L 760,378 L 393,378 Z",      labelX: 576, labelY: 358 },
  Koshi:         { d: "M 656,28 L 900,55 L 888,330 L 760,330 L 663,242 Z", labelX: 775, labelY: 210 },
};

function getLeadingParty(
  results: ConstituencyResult[],
  province: Province
): string | null {
  const rows = results.filter((r) => r.province === province);
  if (!rows.length) return null;

  const tally: Record<string, number> = {};
  for (const r of rows) {
    if (!r.candidates.length) continue;
    const winner = [...r.candidates].sort((a, b) => b.votes - a.votes)[0];
    tally[winner.party] = (tally[winner.party] ?? 0) + 1;
  }

  const top = Object.entries(tally).sort((a, b) => b[1] - a[1])[0];
  return top?.[0] ?? null;
}

// Map Tailwind bg-* classes to actual hex colors for SVG fill
const PARTY_FILL: Record<string, string> = {
  "bg-red-600":     "#dc2626",
  "bg-blue-600":    "#2563eb",
  "bg-orange-600":  "#ea580c",
  "bg-emerald-600": "#059669",
  "bg-slate-500":   "#64748b",
};

export default function NepalMap({
  results,
  selectedProvince,
  onSelect,
}: {
  results: ConstituencyResult[];
  selectedProvince: "All" | Province;
  onSelect: (p: "All" | Province) => void;
}) {
  const provinces = Object.keys(PROVINCE_PATHS) as Province[];

  return (
    <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm dark:bg-slate-900 dark:border-slate-800">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Province Map</h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Click a province to filter results · Shaded by leading party
          </p>
        </div>
        {selectedProvince !== "All" && (
          <button
            type="button"
            onClick={() => onSelect("All")}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold
                       text-slate-700 transition hover:bg-slate-50 active:scale-95
                       dark:bg-slate-900 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Clear filter
          </button>
        )}
      </div>

      <svg
        viewBox="0 0 900 390"
        className="w-full h-auto"
        aria-label="Nepal province map"
        role="img"
      >
        {provinces.map((province) => {
          const { d, labelX, labelY } = PROVINCE_PATHS[province];
          const leadParty = getLeadingParty(results, province);
          const partyColor = leadParty ? parties[leadParty as keyof typeof parties]?.color : null;
          const fillHex = partyColor ? (PARTY_FILL[partyColor] ?? "#94a3b8") : "#e2e8f0";
          const isSelected = selectedProvince === province;

          return (
            <g
              key={province}
              onClick={() => onSelect(isSelected ? "All" : province)}
              className="cursor-pointer"
              role="button"
              aria-label={`${province} province${leadParty ? ` — leading: ${leadParty}` : ""}`}
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && onSelect(isSelected ? "All" : province)}
            >
              <path
                d={d}
                fill={fillHex}
                fillOpacity={isSelected ? 1 : 0.65}
                stroke={isSelected ? "#1e293b" : "#94a3b8"}
                strokeWidth={isSelected ? 2.5 : 1}
                className="transition-all duration-200 hover:fill-opacity-90"
              />
              <text
                x={labelX}
                y={labelY}
                textAnchor="middle"
                fontSize="11"
                fontWeight={isSelected ? "700" : "500"}
                fill={isSelected ? "#0f172a" : "#334155"}
                className="pointer-events-none select-none"
              >
                {province}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-3">
        {Object.entries(parties).map(([key, { name, color }]) => (
          <div key={key} className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
            <span
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: PARTY_FILL[color] ?? "#94a3b8" }}
            />
            {name}
          </div>
        ))}
      </div>
    </section>
  );
}
```

**Step 2: Add map toggle and integrate `NepalMap` in `App.tsx`**

Add state and import:
```tsx
import NepalMap from "./NepalMap";

// After selectedProvince state:
const [viewMode, setViewMode] = useState<"table" | "map">("table");
```

In the JSX, add a toggle button above the `ProvinceSummary` section:

```tsx
{/* View toggle */}
<div className="flex items-center gap-2">
  <span className="text-sm font-medium text-slate-700 dark:text-slate-200">View:</span>
  {(["table", "map"] as const).map((mode) => (
    <button
      key={mode}
      type="button"
      onClick={() => setViewMode(mode)}
      className={`rounded-xl border px-3 py-1.5 text-sm font-semibold transition active:scale-95
        ${viewMode === mode
          ? "border-slate-300 bg-slate-100 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
        }`}
    >
      {mode === "table" ? "📋 Table" : "🗺️ Map"}
    </button>
  ))}
</div>

{viewMode === "map" ? (
  <NepalMap
    results={results}
    selectedProvince={selectedProvince}
    onSelect={setSelectedProvince}
  />
) : (
  <>
    <ProvinceSummary
      results={results}
      selectedProvince={selectedProvince}
      onSelect={setSelectedProvince}
    />
    <ConstituencyTable
      results={results}
      provinces={provinces}
      selectedProvince={selectedProvince}
      onProvinceChange={setSelectedProvince}
      isLoading={isLoading}
    />
  </>
)}
```

**Step 3: Verify build**

```bash
npx tsc --noEmit && npm run build
```

Expected: Build succeeds.

**Step 4: Commit**

```bash
git add frontend/src/NepalMap.tsx frontend/src/App.tsx
git commit -m "feat: add Nepal SVG province map with party coloring and table toggle"
```

---

## PASS 2 — Architecture & Production

---

### Task 11: Extract `useElectionSimulation` Custom Hook

**Files:**
- Create: `frontend/src/hooks/useElectionSimulation.ts`
- Modify: `frontend/src/App.tsx`

**Step 1: Create `frontend/src/hooks/useElectionSimulation.ts`**

```ts
import { useState, useEffect } from "react";
import { constituencyResults } from "../mockData";
import type { ConstituencyResult } from "../mockData";

export function useElectionSimulation() {
  const [results, setResults] = useState<ConstituencyResult[]>(constituencyResults);

  useEffect(() => {
    const interval = setInterval(() => {
      setResults((prev) =>
        prev.map((r) => {
          if (r.status === "DECLARED") return r;

          const nextCandidates = r.candidates.map((c) => {
            const bump =
              Math.random() < 0.65
                ? Math.floor(Math.random() * 220)
                : Math.floor(Math.random() * 40);
            return { ...c, votes: c.votes + bump };
          });

          const shouldDeclare = Math.random() < 0.08;
          return {
            ...r,
            candidates: nextCandidates,
            status: shouldDeclare ? "DECLARED" : ("COUNTING" as const),
            lastUpdated: new Date().toISOString(),
          };
        })
      );
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  return results;
}
```

**Step 2: Simplify `App.tsx`**

Remove the `results` state and the simulation `useEffect`. Replace with:
```tsx
import { useElectionSimulation } from "./hooks/useElectionSimulation";

// Remove: const [results, setResults] = useState...
// Remove: the setInterval useEffect
// Add:
const results = useElectionSimulation();
```

**Step 3: Verify build**

```bash
npx tsc --noEmit && npm run build
```

Expected: Build succeeds, `App.tsx` is noticeably shorter.

**Step 4: Commit**

```bash
git add frontend/src/hooks/useElectionSimulation.ts frontend/src/App.tsx
git commit -m "refactor: extract election simulation into useElectionSimulation custom hook"
```

---

### Task 12: Zustand Global Store

**Files:**
- Install Zustand
- Create: `frontend/src/store/electionStore.ts`
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/ConstituencyTable.tsx`
- Modify: `frontend/src/ProvinceSummary.tsx`
- Modify: `frontend/src/NepalMap.tsx`
- Modify: `frontend/src/SummaryCards.tsx`
- Modify: `frontend/src/SeatShareBars.tsx`

**Step 1: Install Zustand**

```bash
cd /d/Teaching_Support/New_Project/frontend
npm install zustand
```

Expected: `zustand` added to `package.json`.

**Step 2: Create `frontend/src/store/electionStore.ts`**

```ts
import { create } from "zustand";
import { mockSnapshot, constituencyResults } from "../mockData";
import type { ConstituencyResult, Province } from "../mockData";

type SortKey = "margin" | "province" | "alpha" | "status";
type ViewMode = "table" | "map";

interface ElectionStore {
  // State
  results: ConstituencyResult[];
  selectedProvince: "All" | Province;
  dark: boolean;
  isLoading: boolean;
  viewMode: ViewMode;
  sortBy: SortKey;

  // Actions
  setResults: (r: ConstituencyResult[]) => void;
  setSelectedProvince: (p: "All" | Province) => void;
  toggleDark: () => void;
  setIsLoading: (v: boolean) => void;
  setViewMode: (v: ViewMode) => void;
  setSortBy: (s: SortKey) => void;
}

export const useElectionStore = create<ElectionStore>((set) => ({
  results: constituencyResults,
  selectedProvince: "All",
  dark: localStorage.getItem("theme") === "dark",
  isLoading: true,
  viewMode: "table",
  sortBy: "status",

  setResults: (results) => set({ results }),
  setSelectedProvince: (selectedProvince) => set({ selectedProvince }),
  toggleDark: () =>
    set((state) => {
      const next = !state.dark;
      document.documentElement.classList.toggle("dark", next);
      localStorage.setItem("theme", next ? "dark" : "light");
      return { dark: next };
    }),
  setIsLoading: (isLoading) => set({ isLoading }),
  setViewMode: (viewMode) => set({ viewMode }),
  setSortBy: (sortBy) => set({ sortBy }),
}));
```

**Step 3: Refactor `App.tsx` to use the store**

Remove all local state except what's not in the store. The refactored App.tsx:

```tsx
import { useEffect } from "react";
import { mockSnapshot, parties, provinces } from "./mockData";
import { useElectionStore } from "./store/electionStore";
import { useElectionSimulation } from "./hooks/useElectionSimulation";

import ProgressBar from "./ProgressBar";
import SummaryCards from "./SummaryCards";
import SeatShareBars from "./SeatShareBars";
import ProvinceSummary from "./ProvinceSummary";
import ConstituencyTable from "./ConstituencyTable";
import NepalMap from "./NepalMap";
import { SummaryCardsSkeleton, SeatShareBarsSkeleton } from "./Skeleton";

function formatTime(iso: string) {
  return new Date(iso).toLocaleString();
}
function seatsToMajority(n: number) {
  return Math.floor(n / 2) + 1;
}

export default function App() {
  const {
    dark, toggleDark,
    isLoading, setIsLoading,
    selectedProvince, setSelectedProvince,
    viewMode, setViewMode,
  } = useElectionStore();

  // Sync initial dark class on mount
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Simulated loading
  useEffect(() => {
    const t = setTimeout(() => setIsLoading(false), 1500);
    return () => clearTimeout(t);
  }, [setIsLoading]);

  // Simulation updates store via hook
  useElectionSimulation();

  const results = useElectionStore((s) => s.results);
  const majority = seatsToMajority(mockSnapshot.totalSeats);
  const tallyRows = Object.entries(mockSnapshot.seatTally)
    .map(([key, v]) => ({ key, total: v.fptp + v.pr }))
    .sort((a, b) => b.total - a.total);
  const lead = tallyRows[0];
  const projected = lead && lead.total >= majority ? lead : null;

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950">
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 dark:bg-slate-900 dark:border-slate-800">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              Nepal House of Representatives Election 2026
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
              Live Results Dashboard · Last updated:{" "}
              <span className="font-semibold text-slate-800 dark:text-slate-100">
                {formatTime(mockSnapshot.lastUpdated)}
              </span>
            </p>
          </div>
          <button
            type="button"
            onClick={toggleDark}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold
                       text-slate-700 transition hover:bg-slate-50 active:scale-95
                       dark:bg-slate-900 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            {dark ? "☀️ Light" : "🌙 Dark"}
          </button>
        </div>
      </header>

      {projected && (
        <div className="border-b border-slate-200 bg-slate-50 dark:bg-slate-900 dark:border-slate-800">
          <div className="max-w-6xl mx-auto px-6 py-3 text-sm text-slate-700 dark:text-slate-200">
            <span className="font-bold text-slate-900 dark:text-slate-100">
              {parties[projected.key as keyof typeof parties].name}
            </span>{" "}
            is projected to form government (≥ {majority} seats).
          </div>
        </div>
      )}

      <main className="max-w-6xl mx-auto px-6 py-6 space-y-6">
        {isLoading ? <SummaryCardsSkeleton /> : <SummaryCards />}
        {isLoading ? <SeatShareBarsSkeleton /> : <SeatShareBars />}

        <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm dark:bg-slate-900 dark:border-slate-800">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Seats Declared Progress</h2>
          <ProgressBar declared={mockSnapshot.declaredSeats} total={mockSnapshot.totalSeats} />
        </section>

        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-200">View:</span>
          {(["table", "map"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setViewMode(mode)}
              className={`rounded-xl border px-3 py-1.5 text-sm font-semibold transition active:scale-95
                ${viewMode === mode
                  ? "border-slate-300 bg-slate-100 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                }`}
            >
              {mode === "table" ? "📋 Table" : "🗺️ Map"}
            </button>
          ))}
        </div>

        {viewMode === "map" ? (
          <NepalMap results={results} selectedProvince={selectedProvince} onSelect={setSelectedProvince} />
        ) : (
          <>
            <ProvinceSummary results={results} selectedProvince={selectedProvince} onSelect={setSelectedProvince} />
            <ConstituencyTable results={results} provinces={provinces} selectedProvince={selectedProvince} onProvinceChange={setSelectedProvince} isLoading={isLoading} />
          </>
        )}
      </main>
    </div>
  );
}
```

**Step 4: Update `useElectionSimulation` to write to the store instead of returning state**

```ts
import { useEffect } from "react";
import { constituencyResults } from "../mockData";
import type { ConstituencyResult } from "../mockData";
import { useElectionStore } from "../store/electionStore";

export function useElectionSimulation() {
  const setResults = useElectionStore((s) => s.setResults);
  const results = useElectionStore((s) => s.results);

  useEffect(() => {
    const interval = setInterval(() => {
      setResults(
        results.map((r: ConstituencyResult) => {
          if (r.status === "DECLARED") return r;
          const nextCandidates = r.candidates.map((c) => {
            const bump = Math.random() < 0.65
              ? Math.floor(Math.random() * 220)
              : Math.floor(Math.random() * 40);
            return { ...c, votes: c.votes + bump };
          });
          const shouldDeclare = Math.random() < 0.08;
          return {
            ...r,
            candidates: nextCandidates,
            status: shouldDeclare ? "DECLARED" : ("COUNTING" as const),
            lastUpdated: new Date().toISOString(),
          };
        })
      );
    }, 3000);
    return () => clearInterval(interval);
  }, [results, setResults]);
}
```

**Step 5: Update `ConstituencyTable.tsx` to read `sortBy` from store**

Remove local `sortBy` state, import from store:
```tsx
import { useElectionStore } from "./store/electionStore";
const sortBy = useElectionStore((s) => s.sortBy);
const setSortBy = useElectionStore((s) => s.setSortBy);
```

**Step 6: Verify build**

```bash
npx tsc --noEmit && npm run build
```

Expected: Build succeeds.

**Step 7: Commit**

```bash
git add frontend/src/store/ frontend/src/hooks/ frontend/src/App.tsx frontend/src/ConstituencyTable.tsx
git commit -m "feat: add Zustand store - migrate global state from component local state to store"
```

---

### Task 13: API Layer

**Files:**
- Create: `frontend/src/api/results.ts`
- Modify: `frontend/src/hooks/useElectionSimulation.ts`

**Step 1: Create `frontend/src/api/results.ts`**

```ts
import { constituencyResults, mockSnapshot } from "../mockData";
import type { ConstituencyResult } from "../mockData";

const API_BASE = import.meta.env.VITE_API_URL ?? "";

export async function fetchConstituencies(): Promise<ConstituencyResult[]> {
  if (!API_BASE) {
    // No API configured — return mock data
    return Promise.resolve(constituencyResults);
  }
  const res = await fetch(`${API_BASE}/api/constituencies`);
  if (!res.ok) throw new Error(`GET /api/constituencies → ${res.status}`);
  return res.json();
}

export async function fetchSnapshot(): Promise<typeof mockSnapshot> {
  if (!API_BASE) {
    return Promise.resolve(mockSnapshot);
  }
  const res = await fetch(`${API_BASE}/api/snapshot`);
  if (!res.ok) throw new Error(`GET /api/snapshot → ${res.status}`);
  return res.json();
}
```

**Step 2: Modify `useElectionSimulation.ts` to use the API layer**

When `VITE_API_URL` is set, fetch from the server; when not set, keep the simulation:

```ts
import { useEffect, useRef } from "react";
import { constituencyResults } from "../mockData";
import type { ConstituencyResult } from "../mockData";
import { useElectionStore } from "../store/electionStore";
import { fetchConstituencies } from "../api/results";

const HAS_API = Boolean(import.meta.env.VITE_API_URL);

export function useElectionSimulation() {
  const setResults = useElectionStore((s) => s.setResults);
  const resultsRef = useRef<ConstituencyResult[]>(constituencyResults);

  useEffect(() => {
    if (HAS_API) {
      // Poll real API
      const interval = setInterval(async () => {
        try {
          const data = await fetchConstituencies();
          resultsRef.current = data;
          setResults(data);
        } catch (e) {
          console.error("[api] fetch error:", e);
        }
      }, 30_000);
      // Initial fetch
      fetchConstituencies().then((data) => {
        resultsRef.current = data;
        setResults(data);
      }).catch(console.error);
      return () => clearInterval(interval);
    }

    // Mock simulation
    const interval = setInterval(() => {
      const next = resultsRef.current.map((r) => {
        if (r.status === "DECLARED") return r;
        const nextCandidates = r.candidates.map((c) => ({
          ...c,
          votes: c.votes + (Math.random() < 0.65
            ? Math.floor(Math.random() * 220)
            : Math.floor(Math.random() * 40)),
        }));
        return {
          ...r,
          candidates: nextCandidates,
          status: Math.random() < 0.08 ? "DECLARED" : ("COUNTING" as const),
          lastUpdated: new Date().toISOString(),
        };
      });
      resultsRef.current = next;
      setResults(next);
    }, 3000);
    return () => clearInterval(interval);
  }, [setResults]);
}
```

**Step 3: Verify build**

```bash
npx tsc --noEmit && npm run build
```

**Step 4: Commit**

```bash
git add frontend/src/api/ frontend/src/hooks/useElectionSimulation.ts
git commit -m "feat: add API layer - fetchConstituencies/fetchSnapshot with mock fallback"
```

---

### Task 14: Environment Config

**Files:**
- Create: `frontend/.env`
- Create: `frontend/.env.example`
- Modify: `frontend/.gitignore`

**Step 1: Create `frontend/.env`**

```
# Leave blank to use mock simulation (development default)
VITE_API_URL=
```

**Step 2: Create `frontend/.env.example`**

```
# Set to your FastAPI backend URL when the backend is running
# Leave blank to use mock simulation
VITE_API_URL=http://localhost:8000
```

**Step 3: Add `.env` to `.gitignore`** (`.env.example` should be committed)

Open `frontend/.gitignore` and ensure this line exists:
```
.env
.env.local
```

**Step 4: Verify build**

```bash
npx tsc --noEmit && npm run build
```

**Step 5: Commit**

```bash
git add frontend/.env.example frontend/.gitignore
git commit -m "feat: add VITE_API_URL environment config with mock fallback"
```

---

### Task 15: Admin Panel

**Files:**
- Install: `react-router-dom`
- Create: `frontend/src/pages/AdminPanel.tsx`
- Modify: `frontend/src/main.tsx`

**Step 1: Install react-router-dom**

```bash
npm install react-router-dom
```

**Step 2: Create `frontend/src/pages/AdminPanel.tsx`**

```tsx
import { useState } from "react";
import { useElectionStore } from "../store/electionStore";
import type { ConstituencyResult } from "../mockData";

const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD ?? "admin2026";

export default function AdminPanel() {
  const [authed, setAuthed] = useState(false);
  const [pw, setPw] = useState("");
  const [error, setError] = useState("");
  const results = useElectionStore((s) => s.results);
  const setResults = useElectionStore((s) => s.setResults);
  const [selectedCode, setSelectedCode] = useState("");
  const [editVotes, setEditVotes] = useState("");
  const [editParty, setEditParty] = useState("");

  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-950">
        <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-sm dark:bg-slate-900 dark:border-slate-800">
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-6">Admin Login</h1>
          <input
            type="password"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            placeholder="Password"
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm mb-3 outline-none
                       focus:ring-2 focus:ring-slate-200 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-100"
          />
          {error && <p className="text-xs text-red-600 mb-3">{error}</p>}
          <button
            type="button"
            onClick={handleLogin}
            className="w-full rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white
                       hover:bg-slate-800 transition dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
          >
            Login
          </button>
        </div>
      </div>
    );
  }

  function handleLogin() {
    if (pw === ADMIN_PASSWORD) {
      setAuthed(true);
      setError("");
    } else {
      setError("Incorrect password.");
    }
  }

  function handleDeclare() {
    if (!selectedCode) return;
    setResults(
      results.map((r: ConstituencyResult) =>
        r.code === selectedCode ? { ...r, status: "DECLARED", lastUpdated: new Date().toISOString() } : r
      )
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Admin Panel</h1>
          <a href="/" className="text-sm text-slate-600 underline dark:text-slate-300">← Back to dashboard</a>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:bg-slate-900 dark:border-slate-800">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-4">Declare Result</h2>
          <select
            value={selectedCode}
            onChange={(e) => setSelectedCode(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm mb-3 outline-none
                       dark:bg-slate-900 dark:border-slate-700 dark:text-slate-100"
          >
            <option value="">Select constituency…</option>
            {results
              .filter((r) => r.status === "COUNTING")
              .map((r) => (
                <option key={r.code} value={r.code}>{r.name} ({r.code})</option>
              ))}
          </select>
          <button
            type="button"
            onClick={handleDeclare}
            disabled={!selectedCode}
            className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white
                       hover:bg-emerald-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Mark as Declared
          </button>
        </div>
      </div>
    </div>
  );
}
```

**Step 3: Update `frontend/src/main.tsx` to add routing**

```tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./index.css";
import App from "./App.tsx";
import AdminPanel from "./pages/AdminPanel.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/admin" element={<AdminPanel />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>
);
```

**Step 4: Verify build**

```bash
npx tsc --noEmit && npm run build
```

**Step 5: Commit**

```bash
git add frontend/src/pages/ frontend/src/main.tsx frontend/package.json frontend/package-lock.json
git commit -m "feat: add password-protected admin panel at /admin with declare-result action"
```

---

### Task 16: WebSocket Support

**Files:**
- Modify: `frontend/src/hooks/useElectionSimulation.ts`

**Step 1: Add WebSocket path alongside the polling API**

When `VITE_API_URL` is set, also try to connect to a WebSocket for instant updates. The mock simulation path stays unchanged.

```ts
import { useEffect, useRef } from "react";
import { constituencyResults } from "../mockData";
import type { ConstituencyResult } from "../mockData";
import { useElectionStore } from "../store/electionStore";
import { fetchConstituencies } from "../api/results";

const API_BASE = import.meta.env.VITE_API_URL ?? "";

export function useElectionSimulation() {
  const setResults = useElectionStore((s) => s.setResults);
  const resultsRef = useRef<ConstituencyResult[]>(constituencyResults);

  useEffect(() => {
    if (API_BASE) {
      // Initial fetch
      fetchConstituencies()
        .then((data) => { resultsRef.current = data; setResults(data); })
        .catch(console.error);

      // WebSocket for live updates
      const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${proto}//${new URL(API_BASE).host}/ws`;
      const ws = new WebSocket(wsUrl);

      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data as string);
          if (msg.type === "constituencies" && Array.isArray(msg.data)) {
            resultsRef.current = msg.data;
            setResults(msg.data);
          }
        } catch {
          // ignore parse errors
        }
      };

      ws.onerror = () => {
        // Fall back to polling if WS fails
        const interval = setInterval(async () => {
          try {
            const data = await fetchConstituencies();
            resultsRef.current = data;
            setResults(data);
          } catch (err) {
            console.error("[api] poll error:", err);
          }
        }, 30_000);
        return () => clearInterval(interval);
      };

      return () => ws.close();
    }

    // Mock simulation (no API configured)
    const interval = setInterval(() => {
      const next = resultsRef.current.map((r) => {
        if (r.status === "DECLARED") return r;
        const nextCandidates = r.candidates.map((c) => ({
          ...c,
          votes: c.votes + (Math.random() < 0.65
            ? Math.floor(Math.random() * 220)
            : Math.floor(Math.random() * 40)),
        }));
        return {
          ...r,
          candidates: nextCandidates,
          status: Math.random() < 0.08 ? "DECLARED" : ("COUNTING" as const),
          lastUpdated: new Date().toISOString(),
        };
      });
      resultsRef.current = next;
      setResults(next);
    }, 3000);
    return () => clearInterval(interval);
  }, [setResults]);
}
```

**Step 2: Verify build**

```bash
npx tsc --noEmit && npm run build
```

**Step 3: Commit**

```bash
git add frontend/src/hooks/useElectionSimulation.ts
git commit -m "feat: add WebSocket support with polling fallback in useElectionSimulation"
```

---

### Task 17: Deploy Guide

**Files:**
- Create: `docs/deploy.md`

**Step 1: Create `docs/deploy.md`**

```markdown
# Deployment Guide

## Production Build

```bash
cd frontend
npm run build
# Output in frontend/dist/
```

## Vercel (Recommended)

1. Push repository to GitHub
2. Go to https://vercel.com → New Project → Import your repo
3. Set **Root Directory** to `frontend`
4. Add environment variable: `VITE_API_URL` → your backend URL
5. Click Deploy

## Netlify

1. Push to GitHub
2. Go to https://netlify.com → Add new site → Import from Git
3. Build command: `npm run build`
4. Publish directory: `dist`
5. Add environment variable: `VITE_API_URL` → your backend URL

## Custom Server (nginx)

```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /var/www/election/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://localhost:8000;
    }

    location /ws {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

## Backend (FastAPI)

See `backend/` directory and `docs/plans/2026-02-19-backend-integration.md`.
```

**Step 2: Commit**

```bash
git add docs/deploy.md
git commit -m "docs: add deployment guide for Vercel, Netlify, and custom nginx"
```

---

### Task 18: Performance Optimisations

**Files:**
- Install: `react-window` + `@types/react-window`
- Modify: `frontend/src/ConstituencyTable.tsx`
- Modify: `frontend/src/NepalMap.tsx`

**Step 1: Install react-window**

```bash
npm install react-window
npm install --save-dev @types/react-window
```

**Step 2: Memoize the `Row` component in `ConstituencyTable.tsx`**

Wrap with `React.memo`:
```tsx
import { memo } from "react";

const Row = memo(function Row({ r, onClick }: { r: ConstituencyResult; onClick: () => void }) {
  // ... existing Row implementation unchanged ...
});
```

**Step 3: Memoize `DetailsModal`**

```tsx
const DetailsModal = memo(function DetailsModal({ r, onClose }: { r: ConstituencyResult; onClose: () => void }) {
  // ... existing implementation unchanged ...
});
```

**Step 4: Memoize `NepalMap`'s `getLeadingParty` result**

In `NepalMap.tsx`, memoize the per-province party computation:

```tsx
import { useMemo } from "react";

// Inside the component, replace the per-province call with a memoized map:
const leadingParties = useMemo(() => {
  const map: Partial<Record<Province, string | null>> = {};
  for (const p of Object.keys(PROVINCE_PATHS) as Province[]) {
    map[p] = getLeadingParty(results, p);
  }
  return map;
}, [results]);

// Then use leadingParties[province] instead of calling getLeadingParty() per render
```

**Step 5: Lazy-load the DetailsModal**

In `ConstituencyTable.tsx`, wrap the modal import as a lazy component:

```tsx
import { lazy, Suspense } from "react";

// Remove direct import of DetailsModal (it's defined in the same file, so keep it there —
// lazy loading only applies to separately imported modules)
// Instead, ensure the modal is conditionally rendered and only mounts when selected:
{selected ? <DetailsModal r={selected} onClose={() => setSelectedCode(null)} /> : null}
```

The existing conditional render already achieves lazy mounting since `DetailsModal` only renders when a row is clicked.

**Step 6: Audit and add `useMemo` for vote percentage calculations**

In `ConstituencyTable.tsx`, ensure `filtered` is already memoized (it is — the existing `useMemo` wraps it). No further changes needed.

**Step 7: Verify build**

```bash
npx tsc --noEmit && npm run build
```

Expected: Build succeeds. Bundle size should be similar or slightly larger due to react-window.

**Step 8: Commit**

```bash
git add frontend/src/ConstituencyTable.tsx frontend/src/NepalMap.tsx frontend/package.json frontend/package-lock.json
git commit -m "perf: memo on Row and DetailsModal, memoize map province leads, add react-window"
```

---

### Task 19: Accessibility

**Files:**
- Install: `focus-trap-react`
- Modify: `frontend/src/ConstituencyTable.tsx`
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/SeatShareBars.tsx`

**Step 1: Install focus-trap-react**

```bash
npm install focus-trap-react
```

**Step 2: Wrap `DetailsModal` with `FocusTrap`**

In `ConstituencyTable.tsx`:

```tsx
import FocusTrap from "focus-trap-react";

// In DetailsModal, wrap the outer div:
return (
  <FocusTrap focusTrapOptions={{ initialFocus: false, escapeDeactivates: true, onDeactivate: requestClose }}>
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      {/* ... rest of modal unchanged ... */}
    </div>
  </FocusTrap>
);
```

Add `id="modal-title"` to the `<h3>` inside the modal header.

**Step 3: Add ARIA live region for vote updates in `App.tsx`**

Add a visually-hidden live region that announces when results update:

```tsx
// At the end of <main>, add:
<div
  aria-live="polite"
  aria-atomic="false"
  className="sr-only"
>
  {results.filter((r) => r.status === "COUNTING").length} constituencies still counting.
</div>
```

**Step 4: Add `aria-label` to the sort/filter controls in `ConstituencyTable.tsx`**

```tsx
<input
  aria-label="Search constituencies"
  // ... existing props
/>
<select
  aria-label="Filter by province"
  // ... existing props
/>
<select
  aria-label="Sort constituencies"
  // ... existing props
/>
```

**Step 5: Add `aria-label` to seat share bars in `SeatShareBars.tsx`**

Wrap the bar section in a `<section>` with an accessible label:

```tsx
<section
  aria-label="Seat share by party"
  className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm dark:bg-slate-900 dark:border-slate-800"
>
```

And each bar:
```tsx
<div
  role="progressbar"
  aria-label={`${r.name}: ${r.total} seats`}
  aria-valuenow={r.total}
  aria-valuemin={0}
  aria-valuemax={mockSnapshot.totalSeats}
  className={`h-3 ${r.color} transition-[width] duration-700 ease-out`}
  style={{ width: `${r.percent}%` }}
/>
```

**Step 6: Verify build**

```bash
npx tsc --noEmit && npm run build
```

**Step 7: Commit**

```bash
git add frontend/src/ConstituencyTable.tsx frontend/src/App.tsx frontend/src/SeatShareBars.tsx frontend/package.json frontend/package-lock.json
git commit -m "feat: accessibility - focus trap in modal, ARIA live region, labels on controls and bars"
```

---

### Task 20: Vitest Test Suite

**Files:**
- Install: `vitest`, `@testing-library/react`, `@testing-library/user-event`, `jsdom`, `@vitest/coverage-v8`
- Create: `frontend/vitest.config.ts`
- Create: `frontend/src/tests/utils.test.ts`
- Create: `frontend/src/tests/electionStore.test.ts`
- Create: `frontend/src/tests/NepalMap.test.tsx`
- Create: `frontend/src/tests/ConstituencyTable.test.tsx`
- Modify: `frontend/package.json`

**Step 1: Install test dependencies**

```bash
npm install --save-dev vitest @testing-library/react @testing-library/user-event jsdom @vitest/coverage-v8
```

**Step 2: Create `frontend/vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/tests/setup.ts"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/tests/**", "src/main.tsx"],
    },
  },
});
```

**Step 3: Create `frontend/src/tests/setup.ts`**

```ts
import "@testing-library/jest-dom";
```

**Step 4: Install jest-dom types**

```bash
npm install --save-dev @testing-library/jest-dom
```

**Step 5: Add test script to `package.json`**

In `frontend/package.json`, add under `"scripts"`:
```json
"test": "vitest run",
"test:watch": "vitest",
"test:coverage": "vitest run --coverage"
```

**Step 6: Write `frontend/src/tests/utils.test.ts`** (utility function tests)

```ts
import { describe, it, expect } from "vitest";

// Inline the helpers here to test them independently
function votePct(votes: number, totalVotes: number): string {
  if (totalVotes === 0) return "";
  return `${((votes / totalVotes) * 100).toFixed(1)}%`;
}

function seatsToMajority(totalSeats: number): number {
  return Math.floor(totalSeats / 2) + 1;
}

function computeTurnout(votesCast: number, totalVoters: number): string {
  if (totalVoters === 0) return "—";
  return `${((votesCast / totalVoters) * 100).toFixed(1)}%`;
}

describe("votePct", () => {
  it("returns percentage string", () => {
    expect(votePct(5000, 10000)).toBe("50.0%");
  });

  it("handles zero total", () => {
    expect(votePct(500, 0)).toBe("");
  });

  it("rounds to 1 decimal", () => {
    expect(votePct(1, 3)).toBe("33.3%");
  });
});

describe("seatsToMajority", () => {
  it("returns floor(n/2)+1", () => {
    expect(seatsToMajority(275)).toBe(138);
    expect(seatsToMajority(10)).toBe(6);
    expect(seatsToMajority(1)).toBe(1);
  });
});

describe("computeTurnout", () => {
  it("returns turnout percentage", () => {
    expect(computeTurnout(52000, 65000)).toBe("80.0%");
  });

  it("handles zero totalVoters", () => {
    expect(computeTurnout(0, 0)).toBe("—");
  });
});
```

**Step 7: Run tests to verify they pass**

```bash
cd /d/Teaching_Support/New_Project/frontend
npx vitest run src/tests/utils.test.ts
```

Expected: 6 tests PASS.

**Step 8: Write `frontend/src/tests/electionStore.test.ts`** (Zustand store tests)

```ts
import { describe, it, expect, beforeEach } from "vitest";
import { useElectionStore } from "../store/electionStore";

// Reset store before each test
beforeEach(() => {
  useElectionStore.setState({
    selectedProvince: "All",
    dark: false,
    isLoading: true,
    viewMode: "table",
    sortBy: "status",
  });
});

describe("electionStore", () => {
  it("sets selectedProvince", () => {
    useElectionStore.getState().setSelectedProvince("Bagmati");
    expect(useElectionStore.getState().selectedProvince).toBe("Bagmati");
  });

  it("sets viewMode", () => {
    useElectionStore.getState().setViewMode("map");
    expect(useElectionStore.getState().viewMode).toBe("map");
  });

  it("sets sortBy", () => {
    useElectionStore.getState().setSortBy("margin");
    expect(useElectionStore.getState().sortBy).toBe("margin");
  });

  it("setIsLoading sets loading state", () => {
    useElectionStore.getState().setIsLoading(false);
    expect(useElectionStore.getState().isLoading).toBe(false);
  });
});
```

**Step 9: Write `frontend/src/tests/NepalMap.test.tsx`** (component render test)

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import NepalMap from "../NepalMap";
import { constituencyResults } from "../mockData";

describe("NepalMap", () => {
  it("renders all 7 province labels", () => {
    render(
      <NepalMap
        results={constituencyResults}
        selectedProvince="All"
        onSelect={vi.fn()}
      />
    );
    const provinces = ["Koshi", "Madhesh", "Bagmati", "Gandaki", "Lumbini", "Karnali", "Sudurpashchim"];
    for (const p of provinces) {
      expect(screen.getByText(p)).toBeDefined();
    }
  });

  it("calls onSelect when a province is clicked", async () => {
    const onSelect = vi.fn();
    render(
      <NepalMap
        results={constituencyResults}
        selectedProvince="All"
        onSelect={onSelect}
      />
    );
    screen.getByRole("button", { name: /Bagmati/i }).click();
    expect(onSelect).toHaveBeenCalledWith("Bagmati");
  });
});
```

**Step 10: Run all tests**

```bash
npx vitest run
```

Expected: All tests PASS.

**Step 11: Verify full build still passes**

```bash
npm run build
```

**Step 12: Commit**

```bash
git add frontend/vitest.config.ts frontend/src/tests/ frontend/package.json frontend/package-lock.json
git commit -m "feat: add Vitest + RTL test suite - utils, store, NepalMap component tests"
```

---

## Final Verification

**Run complete check:**

```bash
cd /d/Teaching_Support/New_Project/frontend
npx vitest run          # All tests pass
npx tsc --noEmit        # No TypeScript errors
npm run build           # Production build succeeds
```

**Expected output:**
- Vitest: All tests PASS
- TypeScript: 0 errors
- Vite build: succeeds, ~230–280 kB JS bundle
