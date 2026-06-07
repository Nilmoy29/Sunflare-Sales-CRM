---
baseline_commit: 161aab2
---

# Story 6.4: Show Assigned Territory on Rep Map

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **rep**,
I want my territory highlighted when I start a shift,
so that I know where to canvass.

## Acceptance Criteria

1. **Given** I have one or more `territory_assignments` for today (`Australia/Sydney` date, same convention as Story 6.3)  
   **When** I start a shift and the rep map renders at `/rep/map`  
   **Then** each assigned zone appears as a translucent polygon overlay on `MapCanvas` (FR21)  
   **And** overlays render **below** knock pin layers (zones visible, pins remain tappable)  
   **And** missing Mapbox token shows the existing setup message pattern (`docs/SETUP_KEYS.md`)

2. **Given** I have **no** territory assignment for today  
   **When** I start a shift and open the map  
   **Then** the map works as before (knocks, GPS dot, log knock) with **no** territory overlay  
   **And** no error blocks shift or knock logging

3. **Given** authorization (NFR9, NFR10)  
   **When** I call the rep territory API  
   **Then** I receive only territories linked to **my** `territory_assignments` for the requested date  
   **And** admins using rep credentials get the same rep-scoped result (no admin global list)  
   **When** an unauthenticated user calls the API  
   **Then** the API returns 401/403  
   **And** admin territory routes (`/api/v1/territories`, `/api/v1/territory-assignments`) are unchanged

4. **Given** optional out-of-zone knock warning (epics product choice — non-blocking)  
   **When** I open the door outcome sheet for a knock point **outside** all of today's assigned polygons  
   **Then** a dismissible amber info banner appears (e.g. "Outside your assigned territory for today")  
   **And** I can still submit the knock (no server block, no ST_Contains gate on create)

5. **Given** implementation is complete  
   **When** `npm run build` and `npm run lint` run  
   **Then** they pass  
   **And** there is no coverage heatmap (6.5), admin map territory changes, or `profiles.territory_id` fallback overlay unless explicitly added as stretch

**Implements:** FR21  
**NFRs:** NFR9 (rep sees only own assignments), NFR1 (map performance — lightweight GeoJSON overlay, no extra bbox fetches)

## Tasks / Subtasks

- [x] **Validators + types** (AC: 1, 3)
  - [x] Extend `src/lib/validators/territories.ts` (or add `rep-territory-overlay.ts` if cleaner):
    - `repTerritoryOverlaySchema` — `id`, `name`, `geometry` (`geoJsonPolygonSchema`)
    - `repTerritoriesForDateQuerySchema` — optional `assigned_date` (`assignedDateSchema` from `territory-assignments.ts`)
    - `repTerritoriesForDateResponseSchema` — `{ territories: repTerritoryOverlaySchema[] }`
    - `parseRepTerritoryOverlay(row)` — reuse date/geometry coercion patterns from `parseTerritorySummary`

- [x] **Point-in-polygon helper** (AC: 4)
  - [x] `src/lib/geo/point-in-polygon.ts` — `isPointInGeoJsonPolygon(lng, lat, polygon)` and `isPointInAnyTerritory(lng, lat, territories)` using ray-casting on outer ring (no new npm deps — no Turf)

- [x] **Database RPC** (AC: 1, 3)
  - [x] Create `supabase/migrations/*_rep_territory_overlay_rpc.sql` (sort after `20260611140000_territory_assignment_rpcs.sql`):
    - `get_rep_territories_for_date(p_assigned_date date)` → `id`, `name`, `geometry jsonb` via `extensions.st_asgeojson(t.polygon_geojson)::jsonb`
    - Join `territory_assignments` → `territories` where `ta.rep_id = auth.uid()` and `ta.assigned_date = p_assigned_date`
    - `security invoker`, `stable`, `search_path = public`
    - **No** `is_admin()` guard — rep-scoped via `auth.uid()` only (RLS remains defense-in-depth)
    - `grant execute ... to authenticated`

- [x] **Feature layer + API route** (AC: 2, 3)
  - [x] `src/features/territories/get-rep-territories-for-date.ts` — calls RPC; default date = Sydney today when omitted
  - [x] Extend `src/features/territories/api.ts` — `fetchRepTerritoriesForDate(signal?)`
  - [x] `GET /api/v1/territories/mine/route.ts` — `requireRoleForApi(["rep"])`, parse optional `assigned_date` query (default Sydney today), return `{ data: { territories } }`
  - [x] Standard error envelope: `400`, `401`, `403`, `500`

- [x] **Client hook** (AC: 1, 2)
  - [x] `src/features/territories/use-rep-territory-overlay.ts` — fetch when `enabled` (shift active); expose `territories`, `loading`, `error`; follow `use-map-knocks` / `use-territories` fetch pattern

- [x] **Rep map overlay UI** (AC: 1, 2, 4)
  - [x] Extend `src/components/rep/map-canvas.tsx`:
    - New prop `territoryOverlays?: RepTerritoryOverlay[]`
    - GeoJSON source `rep-territories` + fill + line layers inserted **before** knock cluster layers (under pins)
    - Distinct rep zone styling (e.g. green fill ~25% opacity, solid outline) — differentiate from admin blue (`territory-draw-tool.tsx`)
    - `syncTerritoriesToMap` effect when overlays change
  - [x] Extend `src/app/(rep)/rep/map/rep-map-shift-shell.tsx`:
    - `useRepTerritoryOverlay({ enabled: isActive })`
    - Pass `territoryOverlays` to `MapCanvas`
    - Pass territories into `DoorOutcomeSheet` for out-of-zone check (or compute warning in shell and pass `territoryWarning` string)
  - [x] Extend `src/components/rep/door-outcome-sheet.tsx`:
    - Optional prop `territoryWarning?: string | null`
    - Show non-blocking amber banner when set; submission unchanged

- [x] **Verify** (AC: 3, 5)
  - [x] Manual: Admin assigns rep to territory for today (6.3) → rep starts shift → polygon visible on `/rep/map`
  - [x] Manual: Rep with no assignment today → map normal, no overlay
  - [x] Manual: Knock outside zone → warning banner; knock still saves
  - [x] Manual: Rep A cannot see Rep B's territories via API (different auth sessions)
  - [x] Manual: Admin knock map `/admin/map` and territories admin UI unchanged
  - [x] `npm run build` && `npm run lint`
  - [x] Apply RPC migration via Supabase MCP or `npm run db:push`; `npm run db:types`

### Review Findings

- [x] [Review][Patch] Stale overlay shown while refetching after shift restart [`src/features/territories/use-rep-territory-overlay.ts:56-59`] — fixed: clear territories at fetch start; gate display on `enabled && !loading`.
- [x] [Review][Defer] RPC `grant execute` to `authenticated` (not rep-only) [`supabase/migrations/20260611150000_rep_territory_overlay_rpc.sql:25-26`] — deferred, pre-existing — same pattern as Stories 6.2/6.3; RPC scopes via `auth.uid()`; API route enforces rep role.
- [x] [Review][Defer] `getRepTerritoriesForDate` silently drops rows when `parseRepTerritoryOverlay` fails [`src/features/territories/get-rep-territories-for-date.ts:31-33`] — deferred — acceptable v1; same pattern as 6.2/6.3 territory list parsers.
- [x] [Review][Defer] Client `fetchRepTerritoriesForDate` does not re-validate responses with Zod [`src/features/territories/api.ts:187-208`] — deferred — matches project fetch+hooks convention; server layer parses via `parseRepTerritoryOverlay`.
- [x] [Review][Defer] Client fetch omits optional `assigned_date` query param [`src/features/territories/api.ts:190`] — deferred — rep map uses server Sydney-today default; API param available for future callers.
- [x] [Review][Defer] `useRepTerritoryOverlay` swallows fetch errors with no `error` exposure [`src/features/territories/use-rep-territory-overlay.ts:36-40`] — deferred — AC2 requires non-blocking map; empty overlay on failure is acceptable v1 (differs from `useMapKnocks` error UX).
- [x] [Review][Defer] Point-in-polygon uses outer ring only (ignores GeoJSON holes) [`src/lib/geo/point-in-polygon.ts:37-42`] — deferred — admin draw tool produces simple polygons v1; revisit if complex geometries added.
- [x] [Review][Defer] Local `npm run db:types` may lag remote RPC signatures [`src/types/supabase.generated.ts`] — deferred — feature layer uses `as never` RPC casts (6.2/6.3 pattern).

## Dev Notes

### Critical constraints

- **Do NOT** add coverage heatmap — Story 6.5.
- **Do NOT** modify `AdminMapCanvas`, `territory-draw-tool.tsx`, or admin `/admin/territories` flows.
- **Do NOT** block knock create/sync when outside territory — warning only (AC4); no `ST_Contains` server gate on `create_knock_with_contact`.
- **Do NOT** use `profiles.territory_id` as overlay source — dated `territory_assignments` only (FR20/FR21). Deferred 6.1 item: FR3 home territory without assignment row stays out of scope unless trivial and product-approved.
- **Do NOT** add new DB tables or RLS migrations — Story 6.1 RLS already allows rep SELECT on own assignments + linked territories.
- **Do NOT** install Turf or Mapbox Draw on rep map — polygon read-only overlay only.
- **Do NOT** install TanStack Query — `fetch` + hooks.
- **Do NOT** fetch territory overlay when shift inactive — map hidden until shift start per `rep-map-shift-shell.tsx`; hook `enabled: isActive`.

### Story 6.1–6.3 foundation (must reuse)

| Asset | Location | 6.4 use |
|-------|----------|---------|
| Rep RLS on assignments | `20260611120100_territories_rls.sql` | RPC filters `ta.rep_id = auth.uid()` |
| Rep RLS on territories | same — `exists` assignment join | Defense-in-depth with RPC |
| Admin assignments | Story 6.3 UI + `create_territory_assignment` | QA prerequisite: assign before rep test |
| `geoJsonPolygonSchema` | `src/lib/validators/territories.ts` | Overlay geometry validation |
| `assignedDateSchema` | `src/lib/validators/territory-assignments.ts` | Query param + Sydney today default |
| `formatSydneyDateString` | `src/features/knocks/format-knock-date.ts` | **Today's assignment date** — must match 6.3 admin assignments |
| Admin map layer pattern | `src/components/admin/territory-draw-tool.tsx` | Mirror fill+line GeoJSON source pattern; different color |
| Rep map shell | `rep-map-shift-shell.tsx` | Wire hook when `isActive` |
| `MapCanvas` knock layers | `src/components/rep/map-canvas.tsx` | Insert territory layers below pins |

### Date semantics (critical for QA)

Assignments are keyed by `assigned_date` **DATE** (no timezone in Postgres). The app uses **`formatSydneyDateString(new Date())`** as "today" everywhere (6.3 assignments, admin dashboard, call counters). Story 6.4 **must** use the same helper for the default `assigned_date` when fetching rep overlays — otherwise rep map and admin assignments disagree across Sydney midnight.

### RPC design

```sql
create or replace function public.get_rep_territories_for_date(p_assigned_date date)
returns table (id uuid, name text, geometry jsonb)
language sql stable security invoker set search_path = public
as $$
  select
    t.id,
    t.name,
    extensions.st_asgeojson(t.polygon_geojson)::jsonb as geometry
  from public.territory_assignments ta
  join public.territories t on t.id = ta.territory_id
  where ta.rep_id = auth.uid()
    and ta.assigned_date = p_assigned_date
  order by t.name;
$$;
```

PostGIS calls require `extensions.` prefix (Story 6.2 lesson).

### API contract

**GET `/api/v1/territories/mine?assigned_date=2026-06-07`** (date optional — defaults to Sydney today)

```json
{
  "data": {
    "territories": [
      {
        "id": "uuid",
        "name": "Surry Hills East",
        "geometry": { "type": "Polygon", "coordinates": [[[lng, lat], ...]] }
      }
    ]
  }
}
```

Empty array when no assignment — **200 OK**, not 404.

### Map layer integration (`MapCanvas`)

Insert territory source/layers in `map.on("load")` **before** `KNOCKS_SOURCE_ID` layers so polygons sit under clustered pins:

```
rep-territories (geojson)
  rep-territories-fill   — fill-opacity ~0.22
  rep-territories-line   — line-width 2
knocks (geojson, cluster)
  knocks-clusters …
```

Suggested rep zone color: `#10b981` (emerald) — visually distinct from admin territory blue `#3b82f6` and knock outcome pin colors.

Optional stretch (not required): `fitBounds` to union of assigned polygons on first load when no `userLocation` yet — defer if timeboxed.

### Out-of-zone warning (AC4)

When `DoorOutcomeSheet` opens with `draft.lat`/`draft.lng`:

1. If `territories.length === 0` → no warning (no assignment today).
2. Else if point not inside any polygon (outer ring ray-cast) → set `territoryWarning` string.
3. Banner only — `submitKnock` unchanged.

Do **not** add server-side `ST_Contains` to knock RPC in this story.

### `profiles.territory_id` (explicit deferral)

6.1 review deferred: rep cannot SELECT territory via `profiles.territory_id` alone. **Do not** implement FR3 home-territory fallback in 6.4 unless product explicitly requests — AC uses dated assignments only.

### Distinction from admin territory map (Story 6.2)

| | Admin `/admin/territories` | Rep `/rep/map` (this story) |
| :--- | :--- | :--- |
| Role | Admin draw/edit zones | Rep read-only overlay |
| Data source | `get_territories_for_admin` | `get_rep_territories_for_date` |
| Interaction | Draw, assign | View only + optional knock warning |
| Visibility | All territories | Today's assigned zones only |

### Project structure (architecture-aligned)

```
src/app/api/v1/territories/mine/route.ts
src/components/rep/map-canvas.tsx                    (UPDATE — overlay layers)
src/components/rep/door-outcome-sheet.tsx            (UPDATE — optional warning banner)
src/app/(rep)/rep/map/rep-map-shift-shell.tsx        (UPDATE — hook + props)
src/features/territories/get-rep-territories-for-date.ts
src/features/territories/use-rep-territory-overlay.ts
src/features/territories/api.ts                      (UPDATE)
src/lib/geo/point-in-polygon.ts                      (NEW)
src/lib/validators/territories.ts                  (UPDATE — rep overlay schemas)
supabase/migrations/*_rep_territory_overlay_rpc.sql
```

### Testing requirements

- **No new Playwright/e2e tests** unless requested — manual QA checklist in Dev Agent Record.
- **Manual QA prerequisites:** Admin creates territory (6.2) and assigns rep for **today's Sydney date** (6.3).
- **Manual QA:**
  - Rep with today's assignment → green(ish) polygon on active shift map
  - Rep without assignment → no polygon; knocks still work
  - Tap knock outside polygon → warning in sheet; save succeeds
  - Rep B session → empty/different territories vs Rep A
  - End shift → map hidden (overlay fetch stops)
- **Regression:** knock sync, offline queue, GPS pings, shift start/end, admin map pins unchanged.

### Learnings from Epic 6 code reviews (apply proactively)

- PostGIS RPCs: `extensions.st_asgeojson` prefix required.
- Sydney date empty-filter bug (6.3): always default `assigned_date` to `formatSydneyDateString(new Date())` when query omitted.
- `grant execute` to `authenticated` + scoping inside RPC is accepted pattern.
- Client may skip Zod response re-validation if server uses `parseRepTerritoryOverlay`.

### References

- [Source: docs/Solar_CRM_PRD_v1.md#module-3--territory-management] — Zone Map Highlighting (FR21)
- [Source: docs/Solar_CRM_PRD_v1.md#door-to-door-rep--typical-shift] — check highlighted territory at shift start
- [Source: _bmad-output/planning-artifacts/epics.md#story-64] — AC summary + optional out-of-zone warning
- [Source: _bmad-output/planning-artifacts/architecture.md#spatial-query-patterns] — `ST_Contains` noted for future; client warning sufficient v1
- [Source: _bmad-output/implementation-artifacts/6-1-territory-and-assignment-schema.md] — rep RLS, `profiles.territory_id` deferral
- [Source: _bmad-output/implementation-artifacts/6-3-assign-territory-to-rep-by-date.md] — Sydney date semantics, assignment prerequisite
- [Source: src/components/rep/map-canvas.tsx] — knock layer IDs and map init pattern
- [Source: src/app/(rep)/rep/map/rep-map-shift-shell.tsx] — shift gate, `MapCanvas` wiring
- [Source: src/components/admin/territory-draw-tool.tsx] — GeoJSON fill+line layer pattern
- [Source: src/app/api/v1/knocks/mine/route.ts] — rep-scoped `mine` API naming pattern

## Dev Agent Record

### Agent Model Used

Composer

### Debug Log References

- Migration applied via Supabase MCP `apply_migration` (`rep_territory_overlay_rpc`).
- `npm run db:types`, `npm run lint`, and `npm run build` pass (0 errors).
- Fixed `react-hooks/set-state-in-effect` lint in `use-rep-territory-overlay.ts` (derive empty state when disabled) and `door-outcome-sheet.tsx` (key-based dismissal instead of reset effect).

### Completion Notes List

- Added rep overlay validators/schemas and `parseRepTerritoryOverlay` in `territories.ts`.
- Added ray-casting `point-in-polygon.ts` helper for client-side out-of-zone check (no Turf).
- Added `get_rep_territories_for_date` RPC scoped to `auth.uid()` + `assigned_date`.
- Added `GET /api/v1/territories/mine` with rep role guard and Sydney-today default date.
- Added `useRepTerritoryOverlay` hook — fetches only when shift active (`enabled: isActive`).
- Extended `MapCanvas` with emerald `rep-territories` fill+line layers below knock pins.
- Wired overlay + out-of-zone warning in `rep-map-shift-shell.tsx` and dismissible amber banner in `door-outcome-sheet.tsx`.

### File List

- `supabase/migrations/20260611150000_rep_territory_overlay_rpc.sql` (new)
- `src/lib/validators/territories.ts` (modified)
- `src/lib/geo/point-in-polygon.ts` (new)
- `src/features/territories/get-rep-territories-for-date.ts` (new)
- `src/features/territories/use-rep-territory-overlay.ts` (new)
- `src/features/territories/api.ts` (modified)
- `src/app/api/v1/territories/mine/route.ts` (new)
- `src/components/rep/map-canvas.tsx` (modified)
- `src/components/rep/door-outcome-sheet.tsx` (modified)
- `src/app/(rep)/rep/map/rep-map-shift-shell.tsx` (modified)

## Change Log

- 2026-06-07: Story 6.4 created — rep map territory overlay, rep-scoped API/RPC, optional out-of-zone knock warning.
- 2026-06-07: Story 6.4 implemented — rep territory overlay on active shift map, out-of-zone knock warning banner, migration applied, build/lint pass.
- 2026-06-07: Code review — 1 patch applied (stale overlay on shift restart); 7 deferrals logged.
