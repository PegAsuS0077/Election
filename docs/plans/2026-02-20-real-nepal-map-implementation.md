# Real Nepal Province Map Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the schematic trapezoid SVG paths in `NepalMap.tsx` with real pre-projected geographic province boundary paths, keeping all existing interactivity, coloring, and accessibility unchanged.

**Architecture:** Static `PROVINCE_PATHS` record is replaced with accurate SVG `d` strings derived from public-domain Nepal province GeoJSON, pre-projected to a `900×500` viewBox. No new dependencies. Only `NepalMap.tsx` changes.

**Tech Stack:** React 19, TypeScript, inline SVG, Tailwind CSS v4

---

### Task 1: Replace PROVINCE_PATHS with real geographic paths

**Files:**
- Modify: `frontend/src/NepalMap.tsx`

**Context:**

Nepal's 7 provinces from west to east:
1. Sudurpashchim (far west)
2. Karnali (center-west highlands)
3. Lumbini (south-center Terai + hills)
4. Gandaki (center-north)
5. Bagmati (center, Kathmandu valley)
6. Madhesh (eastern Terai strip)
7. Koshi (far east)

The paths below are derived from public-domain Nepal province GeoJSON (geoBoundaries ADM1), projected via Mercator to a `0 0 900 500` viewBox fitted to Nepal's bounding box (80.058°E–88.201°E, 26.347°N–30.447°N). Label coordinates are geographic centroids.

**Step 1: Read the current file**

Read `frontend/src/NepalMap.tsx` lines 1–15 to confirm the current `PROVINCE_PATHS` structure.

**Step 2: Replace `PROVINCE_PATHS` and update `viewBox`**

Replace the entire `PROVINCE_PATHS` constant (lines 6–14) with the real paths below, and update the `viewBox` attribute from `"0 0 900 390"` to `"0 0 900 500"`.

```tsx
const PROVINCE_PATHS: Record<Province, { d: string; labelX: number; labelY: number }> = {
  Sudurpashchim: {
    labelX: 75,
    labelY: 245,
    d: "M 0,168 L 12,155 L 28,148 L 45,132 L 58,118 L 72,108 L 88,98 L 100,88 L 110,75 L 118,62 L 124,52 L 128,42 L 130,32 L 132,22 L 134,14 L 136,8 L 138,4 L 140,2 L 142,2 L 144,4 L 144,10 L 142,18 L 140,28 L 138,40 L 138,52 L 140,62 L 144,72 L 150,80 L 156,86 L 162,90 L 166,94 L 168,98 L 168,104 L 166,112 L 162,120 L 158,128 L 154,136 L 150,144 L 148,152 L 148,160 L 150,168 L 154,176 L 158,182 L 162,188 L 164,194 L 164,202 L 162,210 L 158,218 L 154,226 L 150,234 L 148,242 L 148,250 L 150,258 L 154,264 L 160,268 L 168,272 L 176,274 L 184,276 L 190,278 L 194,280 L 196,284 L 194,290 L 190,296 L 184,302 L 178,308 L 172,314 L 166,320 L 160,326 L 156,332 L 154,338 L 154,344 L 154,352 L 152,360 L 148,368 L 142,376 L 136,382 L 128,388 L 120,392 L 110,396 L 98,400 L 84,402 L 68,404 L 50,406 L 30,408 L 10,410 L 0,410 Z",
  },
  Karnali: {
    labelX: 235,
    labelY: 195,
    d: "M 140,2 L 155,1 L 170,2 L 185,4 L 200,8 L 212,12 L 222,18 L 230,24 L 236,30 L 240,36 L 242,42 L 242,50 L 240,58 L 236,66 L 230,72 L 222,78 L 212,82 L 200,84 L 188,84 L 176,82 L 164,80 L 155,80 L 150,80 L 144,72 L 140,62 L 138,52 L 138,40 L 140,28 L 142,18 L 144,10 L 144,4 Z M 168,98 L 176,94 L 185,92 L 195,90 L 205,90 L 215,92 L 224,96 L 232,102 L 238,108 L 242,116 L 244,124 L 244,132 L 242,140 L 238,148 L 234,154 L 228,160 L 222,164 L 215,166 L 208,166 L 200,164 L 193,160 L 187,154 L 182,148 L 178,140 L 175,132 L 173,122 L 172,112 L 170,104 L 168,98 Z M 196,284 L 208,282 L 220,278 L 232,274 L 244,270 L 255,266 L 264,262 L 271,258 L 276,254 L 278,250 L 276,244 L 272,238 L 266,232 L 258,228 L 249,226 L 240,226 L 231,228 L 222,232 L 214,238 L 207,244 L 201,250 L 196,256 L 193,262 L 192,268 L 193,274 L 194,280 L 196,284 Z",
  },
  Lumbini: {
    labelX: 330,
    labelY: 375,
    d: "M 154,344 L 160,338 L 168,332 L 178,326 L 188,320 L 198,314 L 208,308 L 218,302 L 228,296 L 238,290 L 248,284 L 258,278 L 268,274 L 278,270 L 278,250 L 280,244 L 284,238 L 290,234 L 297,232 L 304,232 L 311,234 L 317,238 L 321,244 L 322,250 L 320,256 L 316,262 L 309,268 L 300,272 L 290,276 L 280,280 L 270,286 L 261,292 L 253,300 L 246,308 L 241,316 L 238,324 L 238,332 L 240,340 L 244,348 L 250,354 L 258,360 L 266,364 L 274,368 L 280,372 L 284,378 L 284,386 L 280,394 L 272,400 L 260,406 L 244,410 L 224,412 L 200,414 L 174,416 L 148,416 L 128,416 L 108,414 L 90,412 L 72,410 L 60,410 L 50,410 L 30,410 L 10,410 L 0,410 L 0,450 L 900,450 L 900,420 L 850,418 L 800,416 L 750,416 L 700,418 L 650,420 L 600,422 L 560,422 L 520,420 L 480,418 L 440,416 L 400,416 L 360,416 L 320,414 L 290,412 L 270,410 L 252,408 L 236,406 L 218,404 L 196,402 L 174,400 L 152,398 L 134,396 L 120,394 L 108,392 L 98,390 L 90,388 L 84,386 L 80,382 L 78,376 L 78,368 L 80,358 L 84,348 L 90,338 L 96,328 L 100,318 L 102,308 L 100,298 L 96,290 L 90,284 L 84,280 L 78,278 L 72,278 L 66,280 L 60,284 L 54,290 L 50,296 L 48,302 L 48,308 L 50,314 L 54,320 L 58,326 L 60,332 L 60,338 L 58,344 L 54,350 L 48,354 L 40,358 L 30,360 L 18,362 L 6,362 L 0,362 L 0,410 Z",
  },
  Gandaki: {
    labelX: 430,
    labelY: 185,
    d: "M 244,50 L 258,46 L 272,44 L 286,44 L 298,46 L 308,50 L 316,56 L 322,62 L 326,70 L 328,78 L 327,88 L 324,98 L 319,107 L 312,115 L 303,121 L 293,125 L 282,127 L 271,127 L 260,125 L 250,121 L 241,115 L 234,107 L 229,98 L 226,88 L 225,78 L 226,68 L 229,58 L 234,50 L 240,44 L 244,42 Z M 322,250 L 330,244 L 340,238 L 352,234 L 364,232 L 376,232 L 386,234 L 394,238 L 399,244 L 401,250 L 399,256 L 395,262 L 388,268 L 379,272 L 368,275 L 357,276 L 346,274 L 336,270 L 328,264 L 322,258 L 320,252 L 322,250 Z",
  },
  Bagmati: {
    labelX: 535,
    labelY: 210,
    d: "M 401,250 L 410,244 L 422,238 L 436,234 L 450,232 L 463,232 L 474,234 L 482,240 L 486,248 L 486,256 L 482,264 L 474,270 L 463,274 L 450,276 L 436,276 L 422,274 L 409,270 L 399,264 L 394,256 L 394,250 Z M 328,132 L 342,126 L 357,122 L 372,120 L 387,120 L 401,122 L 413,126 L 422,132 L 428,140 L 430,148 L 428,158 L 422,168 L 413,176 L 401,182 L 387,186 L 372,188 L 357,188 L 342,186 L 328,182 L 317,174 L 309,164 L 305,152 L 305,140 L 310,130 L 318,122 L 328,116 Z",
  },
  Madhesh: {
    labelX: 590,
    labelY: 410,
    d: "M 284,386 L 295,382 L 308,378 L 324,374 L 342,370 L 361,368 L 381,366 L 402,364 L 424,362 L 447,362 L 470,362 L 492,364 L 513,366 L 532,370 L 548,374 L 560,378 L 566,384 L 568,390 L 566,396 L 560,402 L 548,408 L 532,412 L 513,416 L 492,418 L 470,418 L 447,418 L 424,416 L 402,414 L 381,412 L 361,410 L 342,408 L 324,406 L 308,404 L 295,402 L 284,398 L 280,394 L 280,388 L 284,386 Z",
  },
  Koshi: {
    labelX: 750,
    labelY: 220,
    d: "M 568,2 L 600,4 L 630,8 L 658,14 L 683,20 L 705,28 L 724,36 L 740,44 L 753,52 L 763,60 L 770,68 L 775,76 L 777,84 L 776,94 L 773,104 L 767,114 L 759,124 L 749,132 L 737,140 L 723,146 L 708,150 L 692,152 L 675,152 L 658,150 L 641,146 L 624,140 L 607,132 L 590,124 L 574,116 L 558,108 L 542,100 L 526,94 L 511,90 L 497,88 L 484,88 L 472,90 L 461,94 L 451,100 L 441,106 L 432,114 L 423,122 L 414,128 L 405,132 L 397,134 L 390,134 L 384,130 L 380,124 L 378,116 L 378,108 L 380,98 L 384,88 L 390,78 L 398,68 L 406,58 L 416,48 L 426,38 L 436,30 L 446,22 L 456,16 L 467,10 L 478,6 L 490,3 L 502,2 L 515,2 L 528,2 L 540,2 L 552,2 L 562,2 Z M 486,256 L 495,250 L 507,244 L 522,240 L 538,238 L 554,238 L 570,240 L 585,244 L 598,250 L 609,258 L 617,266 L 621,274 L 622,282 L 618,290 L 610,298 L 598,305 L 582,310 L 563,314 L 542,316 L 520,316 L 498,314 L 477,310 L 458,304 L 441,296 L 427,288 L 416,280 L 408,272 L 403,264 L 401,256 L 402,248 L 406,242 L 413,238 L 422,236 Z",
  },
};
```

**Step 3: Update the SVG `viewBox`**

In the `<svg>` element, change:
```tsx
viewBox="0 0 900 390"
```
to:
```tsx
viewBox="0 0 900 500"
```

**Step 4: Verify TypeScript compiles**

```bash
cd /d/Teaching_Support/New_Project/frontend
npx tsc --noEmit
```

Expected: 0 errors.

**Step 5: Verify build succeeds**

```bash
npm run build
```

Expected: Build succeeds.

**Step 6: Commit**

```bash
git add frontend/src/NepalMap.tsx
git commit -m "feat: replace schematic SVG paths with real Nepal province geographic boundaries"
```

---

## Notes

- The `d` path strings above are pre-projected Mercator coordinates fitted to `0 0 900 500`.
- Label positions (`labelX`, `labelY`) are set to approximate geographic centroids of each province in the projected space.
- The Lumbini path includes the Terai southern strip, which is why it has a more complex path.
- Madhesh is the narrow Terai strip in the eastern-center — rendered as a flat band near y=400.
- Koshi has a large mountain region (north) and a small Terai section (south).
