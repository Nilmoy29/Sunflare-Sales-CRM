---
baseline_commit: NO_VCS
---

# Story 2.3: Rep Map with Live Location and Historic Pins

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **rep**,
I want to see my location and past knock pins on a map,
so that I know where I've been and what's left to cover.

## Acceptance Criteria

1. **Given** an active shift  
   **When** I open `/rep/map`  
   **Then** a full-viewport Mapbox map renders (FR8)  
   **And** `mapbox-gl` is loaded client-only (no SSR) with `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN`  
   **And** missing Mapbox token shows a clear setup message pointing to `docs/SETUP_KEYS.md`

2. **Given** an active shift and geolocation permission granted  
   **When** the map loads  
   **Then** my current GPS position displays as a live marker that updates as I move (FR8)  
   **And** the map can recenter to my location via a control (44×44px min, NFR6)

3. **Given** an active shift  
   **When** the map viewport changes (pan/zoom)  
   **Then** historic knock pins for **my** knocks in the visible bounding box load via `GET /api/v1/knocks?bbox=` (FR8, FR12)  
   **And** pins use Mapbox GeoJSON clustering when zoomed out (NFR1)  
   **And** the API returns at most **500** pins per request (NFR1)  
   **And** initial pin load completes within **2 seconds** for up to 500 pins under normal network conditions (NFR1)

4. **Given** knock pins are displayed  
   **When** I inspect pin styling  
   **Then** colors match PRD outcome semantics (FR11, UX-DR8):
   - `interested` → green (`#22c55e`)
   - `not_home` → yellow (`#eab308`)
   - `not_interested` → red (`#ef4444`)
   - `do_not_knock` → dark gray (`#374151`)
   - `callback_requested` → blue (`#3b82f6`)
   - `already_has_solar` → purple (`#a855f7`)

5. **Given** no active shift  
   **When** I open `/rep/map`  
   **Then** Story 2.2 shift controls remain visible (Start Shift)  
   **And** the map area shows a prompt to start shift before pins/live tracking activate  
   **And** I cannot fetch historic pins via the API without an active shift (`403 NO_ACTIVE_SHIFT`)

6. **Given** implementation is complete  
   **When** `npm run build` and `npm run lint` run  
   **Then** they pass  
   **And** no knock logging UI or POST knock API is added (Stories 2.4–2.5)

**Implements:** FR8, FR11, FR12  
**NFRs:** NFR1 (≤500 pins / 2s, clustering, bbox fetch), NFR6 (touch targets on map controls)

## Tasks / Subtasks

- [x] **Outcome color map** (AC: 4)
  - [x] Create `src/lib/geo/door-outcome-colors.ts` — single source for pin hex colors + Mapbox expression helper
  - [x] Re-export or reference `DOOR_OUTCOMES` from `src/lib/validators/enums.ts` (do not duplicate enum values)

- [x] **GET knocks API (bbox)** (AC: 3, 5)
  - [x] Create `src/app/api/v1/knocks/route.ts` — **GET only** in this story
  - [x] Query params: `bbox=west,south,east,north` (WGS84 degrees) via Zod in `src/lib/validators/knocks.ts`
  - [x] `requireRoleForApi(["rep"])` + verify active shift via `getActiveShiftForRep`
  - [x] Select `id, lat, lng, outcome, knocked_at` from `door_knocks` scoped to rep (RLS + explicit `rep_id` filter)
  - [x] Bbox filter using lat/lng range OR PostGIS `ST_Intersects` with `idx_door_knocks_location` (prefer GiST for NFR1)
  - [x] `LIMIT 500` + order by `knocked_at desc`
  - [x] Response: `{ data: { knocks: KnockPin[], truncated: boolean } }`

- [x] **Mapbox client shell** (AC: 1, 2, 3, 4)
  - [x] Create `src/lib/geo/mapbox.ts` — token accessor, default style URL, Australia-friendly initial center/zoom fallback
  - [x] Create `src/components/rep/map-canvas.tsx` — client component; dynamic import `mapbox-gl`; import `mapbox-gl/dist/mapbox-gl.css`
  - [x] Live user marker via `navigator.geolocation.watchPosition` while shift active (reuse geolocation patterns from Story 2.2)
  - [x] GeoJSON source with `cluster: true`, cluster layers + unclustered point layer colored by outcome
  - [x] Debounced `moveend` handler (~300ms) to refetch pins for new bbox
  - [x] "Recenter" floating button (min 44×44px)

- [x] **Knocks feature hooks** (AC: 3)
  - [x] Create `src/features/knocks/api.ts` — `fetchKnocksInBbox(bbox)`
  - [x] Create `src/features/knocks/use-map-knocks.ts` — loading/error state, abort in-flight fetches on bbox change

- [x] **Integrate rep map page** (AC: 1, 2, 5)
  - [x] Refactor `src/app/(rep)/rep/map/rep-map-shift-shell.tsx` — map-first full-height layout; preserve `ShiftControls` + GPS loop from 2.2
  - [x] When `!isActive`: show centered prompt overlay; do not mount `MapCanvas` pin fetch / watchPosition
  - [x] When `isActive`: map fills viewport beneath floating shift controls

- [x] **Verify** (AC: 6)
  - [x] Seed or manual insert 10–20 test knocks in Supabase for local pin verification
  - [x] Confirm clustering toggles when zooming
  - [x] `npm run build` && `npm run lint`

### Review Findings

- [x] [Review][Patch] Historic pins can fail to render on first load when knocks arrive before map `load` [`src/components/rep/map-canvas.tsx:228-250`] — Fixed: `mapLoaded` state + `syncKnocksToMap` effect re-applies knocks when the map becomes ready; also applies pending knocks on `load`.

- [x] [Review][Patch] Geolocation denial is silently swallowed on the map [`src/components/rep/map-canvas.tsx:267`] — Fixed: `watchGeoWarning` overlay on map; unavailable devices get a derived message without effect setState.

- [x] [Review][Patch] Wide zoom levels break pin fetch with opaque validation error [`src/lib/validators/knocks.ts:19-24`, `src/components/rep/map-canvas.tsx:203-214`] — Fixed: `clampMapBbox()` centers and shrinks viewport bbox before API fetch.

- [x] [Review][Defer] GiST location index unused by bbox RPC [`supabase/migrations/20260603140000_get_knocks_in_bbox_rpc.sql:29-31`] — deferred — remote PostGIS unavailable; lat/lng BETWEEN is acceptable for AU v1 per story Dev Notes; revisit when PostGIS enabled.

- [x] [Review][Dismiss] `as never` cast on `supabase.rpc()` [`src/features/knocks/queries.ts:19`] — established Supabase typing workaround from Stories 2.1–2.2; not introduced by this story.

## Dev Notes

### Critical constraints

- **Do NOT** implement map tap / knock form — Story 2.4 (`FR9`).
- **Do NOT** implement POST `/api/v1/knocks` — Story 2.5.
- **Do NOT** add offline/optimistic pins — Story 2.7.
- **Do NOT** add territory polygon overlay — Story 6.4.
- **Do NOT** install TanStack Query — use `fetch` + hooks (same as Story 2.2).
- **Do NOT** fetch knocks globally — bbox + 500 limit always (architecture anti-pattern).

### Active shift gate

Epic AC: *"Given an active shift"*. Reuse `useActiveShift()` from Story 2.2:

- **Client:** `MapCanvas` mounts pin fetch + `watchPosition` only when `isActive === true`
- **API:** `GET /api/v1/knocks` returns `403 NO_ACTIVE_SHIFT` if no open shift — prevents pin scraping outside shift hours even if client is bypassed

GPS background pings (2.2) and map live marker (2.3) both use Geolocation — acceptable overlap; map uses `watchPosition`, ping loop uses `getCurrentPosition` on interval.

### Bbox API contract

**GET `/api/v1/knocks?bbox=150.95,-34.05,151.05,-33.95`** (west,south,east,north)

```json
{
  "data": {
    "knocks": [
      { "id": "uuid", "lat": -33.8688, "lng": 151.2093, "outcome": "interested", "knocked_at": "2026-06-03T09:00:00.000Z" }
    ],
    "truncated": false
  }
}
```

Errors: `400 VALIDATION_ERROR`, `401`, `403 NO_ACTIVE_SHIFT`

Zod bbox rules: west ∈ [-180,180], east ∈ [-180,180], south ∈ [-90,90], north ∈ [-90,90], west < east, south < north, span sanity (reject world-sized bbox).

### Reference SQL — bbox query (GiST)

```sql
select id, lat, lng, outcome, knocked_at
from public.door_knocks
where rep_id = $rep_id
  and st_intersects(
    st_setsrid(st_makepoint(lng, lat), 4326),
    st_makeenvelope($west, $south, $east, $north, 4326)
  )
order by knocked_at desc
limit 500;
```

Use Supabase RPC **only if** raw SQL in Route Handler is awkward; prefer Route Handler + `createClient()` with `.rpc()` or filtered query. Simple lat/lng BETWEEN is acceptable for v1 AU suburbs if GiST RPC adds scope — **prefer GiST** to validate Story 2.1 index.

If result count = 500, set `truncated: true`.

### Mapbox implementation notes

```typescript
// Dynamic import in map-canvas.tsx or parent:
import dynamic from "next/dynamic";
const MapCanvas = dynamic(() => import("@/components/rep/map-canvas"), { ssr: false });
```

- Set `mapboxgl.accessToken` from `process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN`
- Default style: `mapbox://styles/mapbox/streets-v12` (or light-v11 for daylight field use)
- Cluster layer paint: use `step` on `point_count`; unclustered points use `match` on `["get","outcome"]` with colors from `door-outcome-colors.ts`
- User location: separate source/layer `rep-location` — distinct from knock pins (e.g., pulsing blue dot)
- Container: `className="h-full w-full min-h-[60vh]"` inside flex layout; parent `flex flex-1 flex-col min-h-0`

**mapbox-gl v3.12** already in `package.json` — no new map dependency.

### Outcome colors (PRD §4.2)

```typescript
export const DOOR_OUTCOME_COLORS = {
  interested: "#22c55e",
  not_home: "#eab308",
  not_interested: "#ef4444",
  do_not_knock: "#374151",
  callback_requested: "#3b82f6",
  already_has_solar: "#a855f7",
} as const satisfies Record<DoorOutcome, string>;
```

Export helper `doorOutcomeMapboxColorExpression()` returning a Mapbox `match` expression for layer paint.

### Rep map layout (UX-DR4 partial)

Replace placeholder `<main>` text in `rep-map-shift-shell.tsx`:

```
┌─────────────────────────────────┐
│ Rep header (layout)              │
├─────────────────────────────────┤
│                                  │
│         MAPBOX CANVAS            │
│                                  │
│              [Recenter]  [Shift] │
└─────────────────────────────────┘
```

- Shift controls stay `fixed bottom-6 right-4` (Story 2.2)
- Add recenter button `fixed bottom-6 left-4` (or stacked above shift card) — 44px min
- Map occupies remaining flex space: wrapper `flex flex-1 flex-col min-h-0`

### Previous story intelligence

**Story 2.1:**
- `door_knocks` has `lat`, `lng`, `outcome`, GiST index `idx_door_knocks_location`
- RLS: rep selects own knocks only

**Story 2.2:**
- `rep-map-shift-shell.tsx` — integrate, do not rewrite shift/GPS logic
- `getActiveShiftForRep()` in `src/features/shifts/queries.ts` — reuse for API gate
- `useActiveShift`, `useGpsPingLoop`, `ShiftControls` — preserve as-is
- API pattern: `requireRoleForApi`, `{ data }` / `{ error }` envelope, `as never` for Supabase inserts

### Cross-story dependencies

| Story | Relationship |
| :--- | :--- |
| 2.2 | **Requires** active shift UX + GPS loop (keep) |
| 2.4 | Will add `onMapClick` prop to `MapCanvas` |
| 2.5 | POST knocks + pin refresh/invalidate after create |
| 2.7 | Optimistic muted pins on same GeoJSON source |
| 3.1 | Admin map reuses bbox API pattern (all reps) — different route |
| 6.4 | Territory polygon layer added atop `MapCanvas` |

### Environment

From `docs/SETUP_KEYS.md` — **required for this story:**

```
NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=pk....
```

Add to `.env.local` before dev testing. Document in Dev Agent Record if token missing during CI build (build should still pass — token checked at runtime in client).

### Testing (this story)

- **Required:** `npm run build`, `npm run lint`
- **Manual:** Log in as rep → start shift → open `/rep/map` → verify map + user dot + colored pins
- **Manual:** Pan map → pins refetch for new area (network tab shows bbox query)
- **Manual:** End shift → pin fetch returns 403; map shows start-shift prompt
- **Manual:** Zoom out → clusters appear
- **No** Playwright requirement unless quick smoke is trivial — Mapbox WebGL is flaky in headless CI

### Project Structure Notes

New files expected:

```
src/lib/geo/door-outcome-colors.ts
src/lib/geo/mapbox.ts
src/lib/validators/knocks.ts
src/app/api/v1/knocks/route.ts
src/features/knocks/api.ts
src/features/knocks/use-map-knocks.ts
src/components/rep/map-canvas.tsx
src/components/rep/recenter-control.tsx   (optional — can live in map-canvas)
```

Modify:

```
src/app/(rep)/rep/map/rep-map-shift-shell.tsx
```

Do not put fetch logic inside `page.tsx` — keep page as thin shell per architecture.

### References

- [Source: `_bmad-output/planning-artifacts/epics.md` — Story 2.3]
- [Source: `docs/Solar_CRM_PRD_v1.md` — §4.2 D2D map, outcome colors, NFR1]
- [Source: `_bmad-output/planning-artifacts/architecture.md` — Mapbox, GET /knocks?bbox=, map-canvas, NFR1]
- [Source: `_bmad-output/implementation-artifacts/2-2-start-and-end-shift-with-gps-tracking.md` — shift shell, active shift gate]
- [Source: `_bmad-output/implementation-artifacts/2-1-contacts-and-doorknocks-schema.md` — door_knocks schema + GiST index]
- [Source: `docs/SETUP_KEYS.md` — Mapbox token setup]
- [Source: `src/app/(rep)/rep/map/rep-map-shift-shell.tsx` — integration point]

## Dev Agent Record

### Agent Model Used

Composer

### Debug Log References

- Remote Supabase lacks PostGIS `st_makepoint` in RPC context; bbox RPC uses lat/lng BETWEEN (v1 AU-safe per story Dev Notes).
- Mapbox token optional at dev time — `MapCanvas` shows setup instructions referencing `docs/SETUP_KEYS.md`.

### Completion Notes List

- Implemented rep map with Mapbox canvas (client-only dynamic import), live GPS marker, clustered historic pins colored by door outcome, debounced bbox fetch, and recenter control.
- Added `GET /api/v1/knocks?bbox=` with active-shift gate (`403 NO_ACTIVE_SHIFT`), Zod validation, and `get_knocks_in_bbox` RPC (501 limit, truncated flag).
- Without `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN`, shift controls and knock API still work; map area shows friendly setup message until token is added.
- Code review: fixed initial pin render race (`mapLoaded` + sync effect), map geo warning overlay, client-side `clampMapBbox`.

### File List

- `src/lib/geo/door-outcome-colors.ts` (new)
- `src/lib/geo/mapbox.ts` (new)
- `src/lib/validators/knocks.ts` (new + `clampMapBbox`)
- `src/features/knocks/queries.ts` (new)
- `src/features/knocks/api.ts` (new)
- `src/features/knocks/use-map-knocks.ts` (new)
- `src/app/api/v1/knocks/route.ts` (new)
- `src/components/rep/map-canvas.tsx` (new + review patches)
- `src/app/(rep)/rep/map/rep-map-shift-shell.tsx` (modified)
- `supabase/migrations/20260603140000_get_knocks_in_bbox_rpc.sql` (new)
- `src/types/supabase.generated.ts` (regenerated)

## Change Log

- 2026-06-03: Story 2.3 — rep map with live location, historic knock pins, bbox API, Mapbox canvas with token-missing fallback.
- 2026-06-03: Code review patches — mapLoaded pin sync, geo warning overlay, clampMapBbox.

### Senior Developer Review (AI)

**Outcome:** Approve (after patches)  
**Date:** 2026-06-03  
**Layers:** Blind Hunter, Edge Case Hunter, Acceptance Auditor (inline)

**Summary:** Core story is solid — active-shift gate, bbox API with 500 cap, outcome colors, clustering, token-missing fallback, and build/lint pass. Three client bugs patched: initial pin render race, geolocation denial feedback, bbox clamp on zoom-out. GiST index deferral documented.

## Story Completion Status

- **Status:** done
- **Completion note:** All ACs satisfied; code review patches applied; build and lint pass.
