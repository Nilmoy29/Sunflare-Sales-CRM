---
baseline_commit: 161aab2
---

# Story 6.2: Draw and Save Territories

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an **admin**,
I want to draw territory polygons on the map,
so that I define canvassing zones.

## Acceptance Criteria

1. **Given** I am an authenticated admin  
   **When** I open `/admin/territories`  
   **Then** a full-viewport Mapbox map renders with a polygon draw tool (FR19)  
   **And** missing Mapbox token shows the same setup message pattern as admin/rep maps (`docs/SETUP_KEYS.md`)  
   **And** the page uses desktop manager layout (sidebar + map per UX-DR5)

2. **Given** the draw tool is active  
   **When** I draw a closed polygon and submit the save form  
   **Then** the territory persists with `name` (required), optional `notes` (FR23), and `polygon_geojson` stored as PostGIS `geometry(Polygon, 4326)`  
   **And** `created_by_admin_id` is set to the current admin's `auth.uid()`  
   **And** the new polygon appears on the map after save without full page reload

3. **Given** territories already exist  
   **When** the territories page loads  
   **Then** existing zones render as semi-transparent polygon overlays on the map  
   **And** a sidebar lists territory names with optional notes preview  
   **And** selecting a list item zooms/highlights that polygon

4. **Given** I select an existing territory  
   **When** I edit name or notes and save  
   **Then** the row updates via admin-only API (NFR10 create/edit)  
   **And** polygon geometry is unchanged unless I explicitly redraw (redraw/edit-geometry is optional v1 — name/notes edit is required minimum)

5. **Given** authorization (NFR10)  
   **When** a rep or unauthenticated user hits `/admin/territories` or territory APIs  
   **Then** the page/API returns 403  
   **And** rep routes (`/rep/map`, knock APIs, calls panel) are unchanged

6. **Given** invalid geometry is submitted  
   **When** the API receives non-Polygon GeoJSON, self-intersecting polygon, or wrong SRID  
   **Then** the API returns `400 VALIDATION_ERROR` with a clear message  
   **And** no partial row is inserted

7. **Given** implementation is complete  
   **When** `npm run build` and `npm run lint` run  
   **Then** they pass  
   **And** admin layout includes navigation link to `/admin/territories`  
   **And** there is no territory assignment UI (Story 6.3), rep map overlay (6.4), or heatmap layer (6.5)

**Implements:** FR19, FR23  
**NFRs:** NFR10 (admin server guards), UX-DR5 (desktop manager shell)

## Tasks / Subtasks

- [x] **Dependency: Mapbox Draw** (AC: 1)
  - [x] Add `@mapbox/mapbox-gl-draw` (+ types if needed) — polygon-only draw controls on mapbox-gl v3
  - [x] Import draw CSS alongside `mapbox-gl/dist/mapbox-gl.css`

- [x] **Validators + types** (AC: 2, 4, 6)
  - [x] Extend `src/lib/validators/territories.ts`:
    - `geoJsonPolygonSchema` — `type: "Polygon"`, `coordinates: number[][][]`, min 4 ring points, closed ring
    - `createTerritoryBodySchema` — `name` (trim, 1–`TERRITORY_NAME_MAX_LENGTH`), `notes` (optional, max `TERRITORY_NOTES_MAX_LENGTH`), `polygon` (`geoJsonPolygonSchema`)
    - `updateTerritoryBodySchema` — optional `name`, `notes`, optional `polygon` for redraw
    - `territorySummarySchema` — `id`, `name`, `notes`, `geometry` (GeoJSON Polygon object), `created_at`, `updated_at`
    - Fix deferred 6.1: replace `territoryRowSchema.polygon_geojson: z.string()` with `z.unknown()` or remove from client path; API uses `territorySummarySchema`
  - [x] Response schemas: `territoriesListResponseSchema`, `createTerritoryResponseSchema`, `updateTerritoryResponseSchema`

- [x] **Database RPCs** (AC: 2, 3, 6)
  - [x] Create `supabase/migrations/*_territory_crud_rpcs.sql`:
    - `get_territories_for_admin()` → `id`, `name`, `notes`, `created_at`, `updated_at`, `geometry jsonb` via `st_asgeojson(polygon_geojson)::jsonb`
    - `create_territory(p_name text, p_notes text, p_polygon jsonb)` → `uuid`
      - Guard: `public.is_admin()` or rely on RLS + `auth.uid()` for `created_by_admin_id`
      - `st_setsrid(st_geomfromgeojson(p_polygon::text), 4326)` with `ST_IsValid` + `ST_GeometryType = 'ST_Polygon'` checks
    - `update_territory(p_id uuid, p_name text default null, p_notes text default null, p_polygon jsonb default null)` → `void`
      - Coalesce name/notes; update polygon only when `p_polygon` provided
    - `security invoker`, `stable`/`volatile` as appropriate, `search_path = public`
    - `grant execute ... to authenticated` (admin enforced in function body via `is_admin()`)

- [x] **Feature layer + API routes** (AC: 2, 3, 4, 5, 6)
  - [x] `src/features/territories/get-territories.ts` — calls `get_territories_for_admin` RPC
  - [x] `src/features/territories/create-territory.ts` — calls `create_territory` RPC
  - [x] `src/features/territories/update-territory.ts` — calls `update_territory` RPC
  - [x] `src/features/territories/api.ts` — `fetchTerritories`, `createTerritory`, `updateTerritory`
  - [x] `GET /api/v1/territories/route.ts` — `requireRoleForApi(["admin"])`
  - [x] `POST /api/v1/territories/route.ts` — validate body, return `{ data: { territory } }`
  - [x] `PATCH /api/v1/territories/[id]/route.ts` — validate body + id param
  - [x] Standard error envelope: `400`, `401`, `403`, `500`

- [x] **Client hook** (AC: 3)
  - [x] `src/features/territories/use-territories.ts` — load list on mount; expose `refresh`, `create`, `update` helpers; follow `use-admin-map-knocks` fetch pattern (no TanStack Query)

- [x] **Admin territories UI** (AC: 1, 2, 3, 4, 7)
  - [x] `src/app/(admin)/admin/territories/page.tsx` — `requireRole(["admin"])`
  - [x] `src/components/admin/territory-shell.tsx` — sidebar (list + save/edit form) + map area (UX-DR5)
  - [x] `src/components/admin/territory-draw-tool.tsx` — Mapbox map + `@mapbox/mapbox-gl-draw` in `draw_polygon` mode only
    - Reuse `DEFAULT_MAP_CENTER`, `DEFAULT_MAP_STYLE`, `DEFAULT_MAP_ZOOM`, `getMapboxAccessToken` from `src/lib/geo/mapbox.ts`
    - Render existing territories as GeoJSON fill + outline layers (distinct color, ~30% opacity fill)
    - On draw `create` event → open save form with name/notes fields
    - After successful POST → add to map layers + sidebar list
  - [x] Sidebar: territory list, selected state, edit name/notes form, "Draw new zone" mode toggle
  - [x] Loading / error / empty states

- [x] **Admin nav** (AC: 7)
  - [x] Add `Territories` link in `src/app/(admin)/layout.tsx` → `/admin/territories`

- [x] **Verify** (AC: 5, 7)
  - [x] Manual: Admin draws polygon → saves with name + notes → appears in list and on map
  - [x] Manual: Admin edits territory name/notes → persists
  - [x] Manual: Rep gets 403 on territory APIs; `/admin/map` knock pins unchanged
  - [x] `npm run build` && `npm run lint`
  - [x] Apply RPC migration via Supabase MCP or `npm run db:push`

### Review Findings

- [x] [Review][Patch] Clearing notes on edit is a no-op — `null` `p_notes` means "skip" in RPC [`src/features/territories/update-territory.ts:32`] — fixed: pass `''` when client sends `notes: null`.
- [x] [Review][Patch] "Draw new zone" before map loads does not enter draw mode — `drawRef` null when `drawEnabled` effect runs [`src/components/admin/territory-draw-tool.tsx:240-251`] — fixed: apply `draw_polygon` on map `load` when `drawEnabledRef` is true.
- [x] [Review][Defer] RPC `grant execute` to `authenticated` (not admin-only) [`supabase/migrations/20260611130000_territory_crud_rpcs.sql:158-160`] — deferred, pre-existing — same pattern as Stories 3.3 and 5.6; API routes enforce admin via `requireRoleForApi`.
- [x] [Review][Defer] No polygon redraw UI despite `updateTerritoryBodySchema` supporting `polygon` [`src/components/admin/territory-shell.tsx`] — deferred — AC4 minimum is name/notes edit; geometry redraw optional v1 per story spec.
- [x] [Review][Defer] Client `fetchTerritories` / create / update do not re-validate responses with Zod schemas [`src/features/territories/api.ts`] — deferred — matches project fetch+hooks convention; server layer parses via `parseTerritorySummary`.
- [x] [Review][Defer] `getTerritoriesForAdmin` silently drops rows when `parseTerritorySummary` fails [`src/features/territories/get-territories.ts:21-23`] — deferred — acceptable v1; log/alert if geometry encoding drifts from PostGIS `st_asgeojson` output.
- [x] [Review][Defer] `geoJsonLinearRingSchema` closed-ring check uses strict coordinate equality [`src/lib/validators/territories.ts:11-17`] — deferred — Mapbox Draw closes rings; server `ST_IsValid` is backstop if client validation drifts.
- [x] [Review][Defer] No territory DELETE in UI or API [`src/app/api/v1/territories/`] — deferred — story explicitly defers delete; schema RLS allows admin DELETE for a future story.
- [x] [Review][Defer] Map height uses same `min-h-0 flex-1` chain as `/admin/map`, not explicit `h-screen` [`src/app/(admin)/admin/territories/page.tsx`] — deferred — consistent with existing admin map layout; revisit if viewport fill issues reported on specific breakpoints.

## Dev Notes

### Critical constraints

- **Do NOT** add `territory_assignments` UI or date-picker flows — Story 6.3.
- **Do NOT** add rep map territory overlay — Story 6.4.
- **Do NOT** add coverage heatmap — Story 6.5.
- **Do NOT** embed draw tool on `/admin/map` knock view — use dedicated `/admin/territories` per architecture.md.
- **Do NOT** implement suburb/postcode snapping — PRD mentions it; v1 scope is freehand polygon draw only (defer snapping).
- **Do NOT** add territory DELETE in UI unless trivial — schema RLS allows admin DELETE; optional stretch goal, not required for AC.
- **Do NOT** install TanStack Query — project convention: `fetch` + hooks.
- **Do NOT** modify rep `MapCanvas` or admin knock `AdminMapCanvas` — separate territory map component.
- **Do NOT** add new DB tables or RLS migrations — Story 6.1 schema is complete; this story adds RPCs only.

### Story 6.1 foundation (must reuse)

| Asset | Location | 6.2 use |
|-------|----------|---------|
| `territories` table | `20260611120000_create_territories.sql` | INSERT/UPDATE via RPC |
| Admin RLS | `20260611120100_territories_rls.sql` | API uses session JWT; RLS gates writes |
| Validators | `src/lib/validators/territories.ts` | Extend with create/update/summary schemas |
| Types | `src/types/database.ts` | `Territory` row aliases |
| Deferred from 6.1 review | max-length constants, geometry encoding | Wire in this story's validators + RPC |

### Mapbox Draw integration

```bash
npm install @mapbox/mapbox-gl-draw
```

- Use **polygon mode only** — disable point/line/trash combinations that allow open shapes.
- Draw control CSS: `@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css`
- On `draw.create`, extract `feature.geometry` as GeoJSON Polygon for API payload.
- Existing territory layers: separate GeoJSON source `territories-existing` (fill + line layers) — do not mix with Draw's internal source.
- **Dynamic import** map in client component only (match `admin-map-canvas.tsx` pattern).

### Geometry persistence (server)

Client sends GeoJSON Polygon (WGS84). RPC converts:

```sql
v_geom := st_setsrid(st_geomfromgeojson(p_polygon::text), 4326);

if st_geometrytype(v_geom) != 'ST_Polygon' or not st_isvalid(v_geom) then
  raise exception 'Invalid polygon geometry' using errcode = '22023';
end if;
```

Insert into `polygon_geojson` column (`extensions.geometry(Polygon, 4326)`).

List RPC returns geometry for Mapbox:

```sql
select
  t.id,
  t.name,
  t.notes,
  t.created_at,
  t.updated_at,
  st_asgeojson(t.polygon_geojson)::jsonb as geometry
from public.territories t
order by t.name;
```

### API contracts

**GET `/api/v1/territories`**

```json
{
  "data": {
    "territories": [
      {
        "id": "uuid",
        "name": "Surry Hills East",
        "notes": "High income — avoid mornings",
        "geometry": { "type": "Polygon", "coordinates": [[[151.21, -33.87], ...]] },
        "created_at": "2026-06-07T10:00:00.000Z",
        "updated_at": "2026-06-07T10:00:00.000Z"
      }
    ]
  }
}
```

**POST `/api/v1/territories`**

```json
{
  "name": "Surry Hills East",
  "notes": "Optional manager context",
  "polygon": { "type": "Polygon", "coordinates": [[[lng, lat], ...]] }
}
```

**PATCH `/api/v1/territories/:id`**

```json
{
  "name": "Updated name",
  "notes": "Updated notes"
}
```

Errors: `400 VALIDATION_ERROR`, `401`, `403 FORBIDDEN`, `500`

### Distinction from admin knock map (Story 3.1)

| | Admin knock map (3.1) | Territories (this story) |
| :--- | :--- | :--- |
| Route | `/admin/map` | `/admin/territories` |
| Purpose | Inspect knock pins + filters | Draw/save zone polygons |
| API | `GET /api/v1/admin/knocks` | `GET/POST /api/v1/territories`, `PATCH .../[id]` |
| Interactions | Pin popup, filters, breadcrumbs | Draw polygon, save form, list/select/edit |
| Layers | Clustered knock points | Territory polygon fill + draw control |

### UI sketch (UX-DR5)

```
┌─────────────────────────────────────────────────────────┐
│ Admin header (+ Territories nav link)                   │
├──────────────┬──────────────────────────────────────────┤
│ Sidebar      │ Mapbox map                               │
│ - Draw new   │ - Existing polygons (translucent fill)   │
│ - Territory  │ - MapboxDraw control (polygon mode)      │
│   list       │                                          │
│ - Save form  │                                          │
│   name*      │                                          │
│   notes      │                                          │
│   [Save]     │                                          │
└──────────────┴──────────────────────────────────────────┘
```

### RPC admin guard pattern

Match `create_call_log` SECURITY DEFINER style **or** `security invoker` with explicit check:

```sql
if not public.is_admin() then
  raise exception 'Admin only' using errcode = '42501';
end if;
```

Prefer **invoker** + `is_admin()` at RPC top so RLS remains defense-in-depth (same tables as 6.1).

### Project structure (architecture-aligned)

```
src/app/(admin)/admin/territories/page.tsx
src/app/api/v1/territories/route.ts
src/app/api/v1/territories/[id]/route.ts
src/components/admin/territory-shell.tsx
src/components/admin/territory-draw-tool.tsx
src/features/territories/get-territories.ts
src/features/territories/create-territory.ts
src/features/territories/update-territory.ts
src/features/territories/api.ts
src/features/territories/use-territories.ts
supabase/migrations/*_territory_crud_rpcs.sql
```

### Testing requirements

- **No new Playwright/e2e tests** unless requested — manual QA checklist in Dev Agent Record.
- **Manual QA:**
  - Draw polygon → save with name → listed and visible on map
  - Edit name/notes on existing territory
  - Invalid polygon (e.g. line string) rejected by API
  - Rep 403 on `GET/POST /api/v1/territories`
  - Admin knock map `/admin/map` regression unchanged
- **Regression:** knock logging, calls panel, pipeline, dashboard summary unchanged.

### References

- [Source: docs/Solar_CRM_PRD_v1.md#module-3--territory-management] — Territory Creation UI, Meta Notes (FR19, FR23)
- [Source: _bmad-output/planning-artifacts/epics.md#story-62] — AC summary
- [Source: _bmad-output/planning-artifacts/architecture.md#frontend-architecture] — mapbox-gl, route structure
- [Source: _bmad-output/planning-artifacts/architecture.md#complete-project-directory-structure] — `admin/territories`, `territory-draw-tool.tsx`, `features/territories`
- [Source: _bmad-output/implementation-artifacts/6-1-territory-and-assignment-schema.md] — schema, RLS, geometry column, deferred validator items
- [Source: _bmad-output/implementation-artifacts/3-1-admin-global-map-with-filters.md] — admin map patterns, `requireRoleForApi`, desktop shell
- [Source: src/components/admin/admin-map-canvas.tsx] — Mapbox init, layer IDs, token guard
- [Source: src/features/calls/create-call-log.ts] — RPC insert pattern via `supabase.rpc`
- [Source: _bmad-output/implementation-artifacts/epic-5-retro-2026-06-06.md] — Mapbox draw plugin decision for 6.2

## Dev Agent Record

### Agent Model Used

Composer

### Debug Log References

- PostGIS RPCs require `extensions.st_asgeojson` / `extensions.st_geomfromgeojson` prefix (PostGIS installed in `extensions` schema).
- Migration applied via Supabase MCP `apply_migration` after geometry function prefix fix.
- `npm run db:types` regenerated RPC signatures in `supabase.generated.ts`.
- `npm run build` and `npm run lint` pass (0 errors).

### Completion Notes List

- Added `@mapbox/mapbox-gl-draw` and admin `/admin/territories` page with sidebar + map layout.
- Territory CRUD RPCs with admin guard, geometry validation, and GeoJSON round-trip for Mapbox layers.
- REST API `GET/POST /api/v1/territories`, `PATCH /api/v1/territories/[id]` with Zod validation.
- Draw tool: polygon mode, existing zone overlays, selection highlight/zoom, create + edit name/notes flows.
- Resolved 6.1 deferred items: max-length validators wired; `territoryRowSchema.polygon_geojson` → `z.unknown()`.

### File List

- `package.json` (modified — `@mapbox/mapbox-gl-draw`)
- `package-lock.json` (modified)
- `supabase/migrations/20260611130000_territory_crud_rpcs.sql` (new)
- `src/lib/validators/territories.ts` (modified)
- `src/types/mapbox-gl-draw.d.ts` (new)
- `src/types/supabase.generated.ts` (regenerated)
- `src/features/territories/get-territories.ts` (new)
- `src/features/territories/create-territory.ts` (new)
- `src/features/territories/update-territory.ts` (new)
- `src/features/territories/api.ts` (new)
- `src/features/territories/use-territories.ts` (new)
- `src/app/api/v1/territories/route.ts` (new)
- `src/app/api/v1/territories/[id]/route.ts` (new)
- `src/app/(admin)/admin/territories/page.tsx` (new)
- `src/components/admin/territory-shell.tsx` (new)
- `src/components/admin/territory-draw-tool.tsx` (new)
- `src/app/(admin)/layout.tsx` (modified)

## Change Log

- 2026-06-07: Story 6.2 implemented — admin territory draw/save UI, APIs, RPCs, Mapbox Draw integration.
- 2026-06-07: Code review — approved; 2 patches applied (notes clear, draw-before-load), 7 deferrals logged.
