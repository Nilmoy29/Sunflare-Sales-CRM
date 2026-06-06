---
baseline_commit: NO_VCS
---

# Story 3.5: Shift GPS Breadcrumbs on Admin Map

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an **admin**,
I want to see rep routes for active shifts,
so that I verify field coverage.

## Acceptance Criteria

1. **Given** I am an authenticated admin on `/admin/map`  
   **When** I select **exactly one rep** in the sidebar rep filter  
   **And** the knock date filter is a **single day** (`from === to`, Australia/Sydney)  
   **Then** a **GPS breadcrumb polyline** displays on the map for that rep's shift on the selected day (FR45)  
   **And** the polyline connects `gps_pings` in `recorded_at` order  
   **And** a sidebar hint shows which rep's route is displayed (or why none is shown)

2. **Given** shift resolution for the selected rep and day `[dayStart, dayEnd]`  
   **When** breadcrumbs are loaded  
   **Then** if the rep has an **active shift** (`ended_at IS NULL`), that shift is used  
   **Else** the **most recent completed shift** where `started_at` falls within the day bounds is used  
   **And** pings are loaded only for the resolved `shift_id`  
   **And** pings are filtered to `recorded_at >= shift.started_at` AND (`shift.ended_at IS NULL` OR `recorded_at <= shift.ended_at`)  
   **And** no pings from other shifts or outside shift boundaries appear (FR45)

3. **Given** breadcrumb display rules  
   **When** zero or multiple reps are selected (`repIds` null or length ≠ 1)  
   **Then** no breadcrumb polyline is shown  
   **When** the date filter spans multiple days (`from !== to`)  
   **Then** no breadcrumb polyline is shown and sidebar explains "Select a single day to view routes"  
   **When** one rep + single day but no qualifying shift exists  
   **Then** no polyline; sidebar shows "No shift on this day"  
   **When** shift exists but fewer than 2 pings  
   **Then** show start marker only (single point circle) or empty line — no invalid LineString

4. **Given** authorization boundaries  
   **When** a rep or unauthenticated user hits the breadcrumbs API  
   **Then** the API returns 403 (NFR10)  
   **And** rep-facing GPS/shift routes are unchanged

5. **Given** performance and map UX (NFR1, UX-DR5)  
   **When** breadcrumbs load  
   **Then** one API round trip returns shift metadata + ordered ping points (no per-ping N+1)  
   **And** knock pin clustering and existing admin map filters continue to work unchanged  
   **And** breadcrumb layer uses a distinct color (e.g. blue `#3b82f6`) so it does not clash with outcome pin colors (UX-DR8)

6. **Given** implementation is complete  
   **When** `npm run build` and `npm run lint` run  
   **Then** they pass  
   **And** Stories 3.1–3.4 admin map/dashboard behavior is preserved  
   **And** there is no Realtime breadcrumb streaming, heatmap (6.5), territory overlay (6.4), or rep live GPS marker on admin map

**Implements:** FR45  
**NFRs:** NFR1 (map performance), NFR10 (admin guards), UX-DR5 (desktop admin map), UX-DR8 (distinct layer colors)

## Tasks / Subtasks

- [x] **Validators + types** (AC: 1, 2, 4)
  - [x] Create `src/lib/validators/shift-breadcrumbs.ts`:
    - `shiftBreadcrumbPointSchema` — `lat`, `lng`, `recorded_at`
    - `shiftBreadcrumbShiftSchema` — `id`, `rep_id`, `started_at`, `ended_at` (nullable)
    - `shiftBreadcrumbsResponseSchema` — `{ shift: ShiftBreadcrumbShift | null, points: ShiftBreadcrumbPoint[] }`
    - `shiftBreadcrumbsQuerySchema` — `rep_id` (uuid), `date` (YYYY-MM-DD)
    - Export `parseShiftBreadcrumbsSearchParams(searchParams)`

- [x] **Server query + API route** (AC: 2, 4, 5)
  - [x] Create `src/features/admin/get-shift-breadcrumbs.ts`:
    - Resolve shift for rep + Sydney day (active first, else latest completed that started that day)
    - Query `gps_pings` for `shift_id` with boundary filter; `ORDER BY recorded_at ASC`
    - Return `{ shift, points }` with Zod parse at boundary
  - [x] Optional RPC `get_admin_shift_breadcrumbs(p_rep_id, p_from, p_to)` if direct queries need optimization — skipped; direct indexed queries sufficient
  - [x] Create `GET /api/v1/admin/gps/breadcrumbs/route.ts`
  - [x] `requireRoleForApi(["admin"])`

- [x] **Client fetch + hook** (AC: 1, 5)
  - [x] Add `fetchShiftBreadcrumbs(repId, date, signal?)` to `src/features/admin/api.ts` (or `src/features/knocks/api.ts` if preferred — prefer `features/admin` for admin-only)
  - [x] Create `src/features/admin/use-shift-breadcrumbs.ts` — takes `repId | null`, `date | null`, `enabled` boolean; `loadedKey` pattern; abort on unmount

- [x] **Admin map UI — polyline layer** (AC: 1, 3, 5, 6)
  - [x] Update `src/components/admin/admin-map-shell.tsx`:
    - Derive `selectedRepId` when `filters.repIds?.length === 1`
    - Derive `singleDay` when `filters.from === filters.to`
    - Pass `breadcrumbRepId`, `breadcrumbDate`, `breadcrumbEnabled` to canvas
    - Add sidebar route hint below rep filter (loading / active / no shift / multi-day message)
  - [x] Update `src/components/admin/admin-map-canvas.tsx`:
    - Add GeoJSON `LineString` source + `line` layer (and optional single-point `circle` layer)
    - Integrate `useShiftBreadcrumbs` when enabled
    - `syncBreadcrumbsToMap()` on data change; clear layer when disabled
    - Add breadcrumb layers **below** knock pin layers so pins stay clickable
    - Non-blocking loading/error overlay for breadcrumbs (do not block knock pins)

- [x] **Verify** (AC: 4, 6)
  - [x] Manual: Select one rep + single day with active shift + pings → blue polyline visible
  - [x] Manual: Select two reps → polyline clears
  - [x] Manual: Multi-day date range → no polyline + hint
  - [x] Manual: Completed shift today → polyline for that shift only
  - [x] Manual: Rep 403 on breadcrumbs API
  - [x] `npm run build` && `npm run lint`

### Review Findings

- [x] [Review][Patch] Stale polyline after fetch error — error path sets `loadedKey` but leaves prior `data.points` on the map [`src/features/admin/use-shift-breadcrumbs.ts:56`]
- [x] [Review][Patch] Stale polyline while rep/date refetch in flight — hook returns previous rep's points while `loading` is true [`src/features/admin/use-shift-breadcrumbs.ts:77`]
- [x] [Review][Defer] Active-shift breadcrumbs include pings outside the selected calendar day — spec-compliant (shift-boundary filter per AC2); historical-day UX quirk acceptable v1 [`src/features/admin/get-shift-breadcrumbs.ts:98`]
- [x] [Review][Defer] No ping count cap for long multi-day active shifts — NFR1 theoretical; story does not require truncation [`src/features/admin/get-shift-breadcrumbs.ts:98`]

## Dev Notes

### Critical constraints

- **Do NOT** modify `GET /api/v1/knocks` or rep GPS ping writer — Story 2.2.
- **Do NOT** add Realtime subscription for breadcrumbs — refetch on rep/date selection only.
- **Do NOT** fetch all pings globally — scope to one resolved `shift_id` per request.
- **Do NOT** reuse rep `MapCanvas` — extend `admin-map-canvas.tsx` only.
- **Do NOT** show breadcrumbs when multiple reps or multi-day knock filter selected.
- **Do NOT** install TanStack Query — `fetch` + hooks (project convention).
- **Do NOT** add heatmap, territory polygons, or live rep position marker on admin map.

### Rep selection = existing filter

Story 3.1 already has rep multi-select checkboxes. **Do not add a separate rep picker.** Breadcrumb triggers when exactly one rep is checked (not "All reps").

```typescript
const breadcrumbRepId =
  filters.repIds?.length === 1 ? filters.repIds[0] : null;
const breadcrumbDate =
  filters.from === filters.to ? filters.from : null;
const breadcrumbEnabled = breadcrumbRepId !== null && breadcrumbDate !== null;
```

### Shift resolution (canonical)

```typescript
// dayStart = startOfDaySydney(date), dayEnd = endOfDaySydney(date)

// 1. Active shift for rep (ended_at IS NULL) — use if started_at <= dayEnd
//    (covers overnight shifts still open on the selected day)

// 2. Else latest shift where:
//    started_at >= dayStart AND started_at <= dayEnd
//    ORDER BY started_at DESC LIMIT 1

// Pings:
// WHERE shift_id = resolved.id
//   AND recorded_at >= shift.started_at
//   AND (shift.ended_at IS NULL OR recorded_at <= shift.ended_at)
// ORDER BY recorded_at ASC
```

### API contract

**GET `/api/v1/admin/gps/breadcrumbs?rep_id=<uuid>&date=2026-06-06`**

```json
{
  "data": {
    "shift": {
      "id": "uuid",
      "rep_id": "uuid",
      "started_at": "2026-06-06T00:15:00.000Z",
      "ended_at": null
    },
    "points": [
      { "lat": -33.87, "lng": 151.21, "recorded_at": "2026-06-06T00:17:00.000Z" },
      { "lat": -33.871, "lng": 151.212, "recorded_at": "2026-06-06T00:19:00.000Z" }
    ]
  }
}
```

When no shift: `{ "shift": null, "points": [] }`

Errors: `400 VALIDATION_ERROR`, `401`, `403 FORBIDDEN`, `500 BREADCRUMBS_FAILED`

### Mapbox layer sketch

```typescript
const BREADCRUMB_SOURCE_ID = "admin-shift-breadcrumb";
const BREADCRUMB_LINE_LAYER_ID = "admin-shift-breadcrumb-line";
const BREADCRUMB_POINT_LAYER_ID = "admin-shift-breadcrumb-point";

// LineString when points.length >= 2
// Single circle at point when points.length === 1
// Empty collection when disabled or no points
```

Paint:
- Line: `#3b82f6`, width 3, opacity 0.85
- Point: `#2563eb`, radius 6

Insert layers **before** `CLUSTER_LAYER_ID` so knock pins render on top.

### Reference SQL — pings for shift

```sql
select gp.lat, gp.lng, gp.recorded_at
from public.gps_pings gp
where gp.shift_id = :shift_id
  and gp.recorded_at >= :shift_started_at
  and (:shift_ended_at is null or gp.recorded_at <= :shift_ended_at)
order by gp.recorded_at asc;
```

Admin RLS `gps_pings_select_admin` already grants read access.

### UI sketch (UX-DR5)

```
Global map sidebar
┌─────────────────────────┐
│ Reps                    │
│ ☑ Jane Smith  ← only one│
│ ☐ Bob Jones             │
│ Route: Jane Smith       │
│ Active shift · 48 pings │
├─────────────────────────┤
│ From / To (same day)    │
└─────────────────────────┘
[Map with blue polyline + knock pins]
```

### Files to touch (expected)

| File | Action |
| :--- | :--- |
| `src/lib/validators/shift-breadcrumbs.ts` | **New** |
| `src/features/admin/get-shift-breadcrumbs.ts` | **New** |
| `src/features/admin/use-shift-breadcrumbs.ts` | **New** |
| `src/features/admin/api.ts` | **Update** — fetch helper |
| `src/app/api/v1/admin/gps/breadcrumbs/route.ts` | **New** |
| `src/components/admin/admin-map-shell.tsx` | **Update** — derive breadcrumb props + sidebar hint |
| `src/components/admin/admin-map-canvas.tsx` | **Update** — LineString layer + hook integration |

**Unchanged:** `get_admin_knocks_in_bbox` RPC, rep map, `POST /api/v1/gps/pings`, dashboard widgets (3.2–3.4).

### Current code state (read before editing)

**`src/components/admin/admin-map-shell.tsx`** — Rep multi-select, date range, outcome filters; passes `filters` + `refreshKey` to canvas.

**`src/components/admin/admin-map-canvas.tsx`** — Mapbox map with clustered knock GeoJSON source; no line layers yet. Copy layer lifecycle pattern from knock source setup.

**`supabase/migrations/20260603130000_create_shifts_gps_pings.sql`** — `shifts`, `gps_pings` with `shift_id` FK; index `(shift_id, recorded_at)`.

**`supabase/migrations/20260603130100_shifts_gps_pings_rls.sql`** — `gps_pings_select_admin` for admin reads.

**`src/app/api/v1/gps/pings/route.ts`** — Rep-only ping INSERT; do not change.

**Story 3.1 explicitly deferred** breadcrumb polylines to this story.

### Previous story intelligence

**Story 3.1 (done):**
- Admin map shell/canvas split; rep filter semantics; bbox knock fetch unchanged.
- PII: no knock notes in popups.

**Story 2.2 (done):**
- `shift_id` on `gps_pings` enables boundary-scoped breadcrumbs.
- ~2 min ping interval during active shift (NFR7).

**Story 3.4 (done):**
- Active shift detection pattern (`ended_at IS NULL`) — reuse for shift resolution priority.

### Cross-story dependencies

| Story | Relationship |
| :--- | :--- |
| 2.2 | **Requires** — `shifts`, `gps_pings`, `shift_id` FK |
| 3.1 | **Extends** — admin map; preserve knock pins/filters |
| 6.5 | **Deferred** — coverage heatmap layer |
| 7.4 | **Future** — rep deep-dive may reuse breadcrumb API |

### Testing

- **Required:** `npm run build`, `npm run lint`
- **Manual:** Rep with active shift + pings → polyline on single-rep select
- **Manual:** End shift → completed shift breadcrumb still loads for same day
- **Manual:** Two reps selected → no polyline
- **No** Playwright unless trivial

### References

- [Source: `_bmad-output/planning-artifacts/epics.md` — Story 3.5, FR45]
- [Source: `docs/Solar_CRM_PRD_v1.md` — GPS Shift Breadcrumbs]
- [Source: `_bmad-output/implementation-artifacts/3-1-admin-global-map-with-filters.md` — scope boundary, map patterns]
- [Source: `_bmad-output/implementation-artifacts/2-2-start-and-end-shift-with-gps-tracking.md` — schema + shift_id rationale]
- [Source: `src/components/admin/admin-map-canvas.tsx`]
- [Source: `supabase/migrations/20260603130000_create_shifts_gps_pings.sql`]

## Dev Agent Record

### Agent Model Used

Composer

### Debug Log References

- Lint: fixed `react-hooks/set-state-in-effect` by returning empty breadcrumbs when disabled (matches `use-admin-map-knocks` early-return pattern).
- Build: fixed `parseShiftRow` typing for Supabase row coercion.

### Completion Notes List

- Added `GET /api/v1/admin/gps/breadcrumbs` with admin guard; resolves active shift first, else latest completed shift started on the Sydney day; pings scoped to shift boundaries.
- Admin map shows blue (`#3b82f6`) polyline or single-point marker when exactly one rep + single-day filter; sidebar route hint for loading/error/no-shift/multi-day states.
- Breadcrumb layers render below knock pin layers; knock clustering and filters unchanged.
- `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` set in `.env.local` for local map testing (not committed).

### File List

- `src/lib/validators/shift-breadcrumbs.ts` (new)
- `src/features/admin/get-shift-breadcrumbs.ts` (new)
- `src/features/admin/use-shift-breadcrumbs.ts` (new)
- `src/app/api/v1/admin/gps/breadcrumbs/route.ts` (new)
- `src/features/admin/api.ts` (updated)
- `src/components/admin/admin-map-shell.tsx` (updated)
- `src/components/admin/admin-map-canvas.tsx` (updated)

### Senior Developer Review (AI)

**Outcome:** Approved (2 patches applied)  
**Date:** 2026-06-06  
**Layers:** Blind Hunter, Edge Case Hunter, Acceptance Auditor (inline)

**Summary:** Core ACs met — admin-only API, canonical shift resolution, blue polyline below knock pins, sidebar hints, single-day/single-rep gating. Patches: clear breadcrumbs on error; hide points while refetch in flight.

## Change Log

- 2026-06-06: Story 3.5 implemented — shift GPS breadcrumbs on admin map (FR45).
- 2026-06-06: Code review — clear stale breadcrumbs on error; hide points while loading.
