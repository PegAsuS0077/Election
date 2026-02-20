# Real Nepal Province Map — Design Doc

**Date:** 2026-02-20
**Status:** Approved
**Branch:** Task_1

## Problem

The current `NepalMap.tsx` uses hand-drawn trapezoidal SVG paths that are schematic approximations of Nepal's 7 provinces — not geographically accurate.

## Goal

Replace the schematic paths with real geographic province boundaries derived from public-domain GeoJSON, pre-projected to static SVG path strings. No new runtime dependencies.

## Approach

**Approach A — Pre-projected SVG path strings (selected)**

1. Source Nepal level-1 province GeoJSON from public domain (GADM / geoBoundaries).
2. Project offline to `viewBox="0 0 900 500"` using a Mercator projection fitted to Nepal's bounding box (~80.0°E–88.2°E, 26.4°N–30.4°N).
3. Paste resulting `d` path strings as static constants in `PROVINCE_PATHS`.
4. Update label coordinates to geographic centroids.

## Files Changed

- **Modify only:** `frontend/src/NepalMap.tsx`
  - Replace `PROVINCE_PATHS` record with real pre-projected paths
  - Update `viewBox` from `"0 0 900 390"` to `"0 0 900 500"`
  - Update `labelX`/`labelY` to geographic centroids

## What Does NOT Change

- Props interface: `results`, `selectedProvince`, `onSelect`
- `getLeadingParty()` logic
- `PARTY_FILL` hex map
- Party coloring, selected/hover states, stroke behavior
- Legend
- Accessibility attributes (role, aria-label, tabIndex, onKeyDown)
- Dark mode support

## Province Label Approximate Centroids (900×500 space)

| Province | labelX | labelY |
|---|---|---|
| Sudurpashchim | 80 | 240 |
| Karnali | 200 | 200 |
| Lumbini | 310 | 360 |
| Gandaki | 420 | 200 |
| Bagmati | 530 | 220 |
| Madhesh | 580 | 400 |
| Koshi | 720 | 230 |
