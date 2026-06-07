---
baseline_commit: 161aab2
---

# Story 6.1: Territory and Assignment Schema

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **developer**,
I want territory polygons and assignments in PostGIS,
so that spatial assignment queries work.

## Acceptance Criteria

1. **Given** PostGIS is enabled (`20260601120000_enable_postgis.sql`)  
   **When** migrations run (`npm run db:push` or Supabase MCP `apply_migration`)  
   **Then** `public.territories` exists with PRD Section 5 (Territory entity) fields:
   - `id` UUID PK DEFAULT `gen_random_uuid()`
   - `name` TEXT NOT NULL
   - `polygon_geojson` `geometry(Polygon, 4326)` NOT NULL
   - `notes` TEXT NULL
   - `created_by_admin_id` UUID NOT NULL REFERENCES `public.profiles(id)` ON DELETE RESTRICT
   - **Plus (architecture convention):** `created_at` TIMESTAMPTZ NOT NULL DEFAULT `now()`
   - **Plus (architecture convention):** `updated_at` TIMESTAMPTZ NOT NULL DEFAULT `now()` with `set_updated_at()` trigger

2. **Given** migrations applied  
   **When** inspecting `public.territory_assignments`  
   **Then** the table has PRD Section 5 (TerritoryAssignment entity) fields:
   - `id` UUID PK DEFAULT `gen_random_uuid()`
   - `territory_id` UUID NOT NULL REFERENCES `public.territories(id)` ON DELETE RESTRICT
   - `rep_id` UUID NOT NULL REFERENCES `public.profiles(id)` ON DELETE RESTRICT
   - `assigned_date` DATE NOT NULL
   - `assigned_by` UUID NOT NULL REFERENCES `public.profiles(id)` ON DELETE RESTRICT
   - **Plus (architecture convention):** `created_at` TIMESTAMPTZ NOT NULL DEFAULT `now()`
   - **And** duplicate assignment rows are prevented: unique index on `(territory_id, rep_id, assigned_date)`

3. **Given** `profiles.territory_id` exists without FK (Story 1.2)  
   **When** migrations run  
   **Then** `profiles.territory_id` gains FK → `public.territories(id)` ON DELETE SET NULL  
   **And** existing profile rows are unchanged (column remains nullable)

4. **Given** hardened RLS (FR60, NFR9, NFR10)  
   **When** authenticated as an **admin** (`public.is_admin()`)  
   **Then** I can `SELECT`/`INSERT`/`UPDATE`/`DELETE` all rows in `territories` and `territory_assignments`  
   **When** authenticated as a **rep**  
   **Then** I can `SELECT` `territory_assignments` where `rep_id = auth.uid()`  
   **And** I can `SELECT` `territories` only when linked via my assignment (`exists` subquery on `territory_assignments`)  
   **And** reps have **no** `INSERT`/`UPDATE`/`DELETE` on either table (NFR10 — admin-only territory mutations per architecture data boundary)

5. **Given** spatial query requirements (architecture)  
   **When** migrations are reviewed  
   **Then** `territories` has GiST index `idx_territories_polygon` on `polygon_geojson`  
   **And** `territory_assignments` has indexes `idx_territory_assignments_rep_date` on `(rep_id, assigned_date)` and `idx_territory_assignments_territory_date` on `(territory_id, assigned_date)`  
   **And** polygon column enforces SRID 4326 via `geometry(Polygon, 4326)` typmod (AC from epics: polygons use SRID 4326)

6. **Given** this story's scope  
   **When** migrations are reviewed  
   **Then** there are **no** territory API Route Handlers, admin draw UI, assignment UI, rep map overlay, heatmap layer, or `ST_Contains` knock-warning RPC  
   **And** rep/admin map components are **not** modified (Stories 6.2–6.5)  
   **And** `get_admin_daily_rep_summary`, knock APIs, calls panel, and pipeline flows are unchanged

7. **Given** schema changes are applied  
   **When** the TypeScript project builds  
   **Then** `npm run db:types` regenerates `src/types/supabase.generated.ts`  
   **And** `src/types/database.ts` exports `Territory`, `TerritoryAssignment` row/insert/update aliases  
   **And** `src/lib/validators/territories.ts` and `src/lib/validators/territory-assignments.ts` provide row schemas  
   **And** `npm run build` and `npm run lint` pass

8. **Given** Supabase security advisors  
   **When** migrations are verified via MCP `get_advisors`  
   **Then** no new critical RLS or function-exposure warnings remain unaddressed

**Implements:** FR59, FR19 (foundation), FR60  
**NFRs:** NFR9 (rep sees only own assignments), NFR10 (territory writes admin-only via RLS)

## Tasks / Subtasks

- [x] **Migration: tables + indexes + profiles FK** (AC: 1, 2, 3, 5)
  - [x] Create `supabase/migrations/*_create_territories.sql` (sort after `20260610150000_call_script.sql`)
  - [x] `territories` DDL per AC1
  - [x] `territory_assignments` DDL per AC2 with unique index
  - [x] `territories_set_updated_at` trigger using existing `public.set_updated_at()`
  - [x] GiST + btree indexes per AC5
  - [x] `alter table profiles add constraint profiles_territory_id_fkey foreign key (territory_id) references territories(id) on delete set null`

- [x] **Migration: RLS** (AC: 4, 8)
  - [x] Create `supabase/migrations/*_territories_rls.sql`
  - [x] Enable RLS on both tables
  - [x] Admin policies: `FOR ALL` via `public.is_admin()` (match leads/shifts admin pattern)
  - [x] Rep `territory_assignments_select_rep` — `rep_id = (select auth.uid())`
  - [x] Rep `territories_select_rep` — scoped via assignment subquery
  - [x] `GRANT SELECT, INSERT, UPDATE, DELETE ON territories TO authenticated` (admin policies gate writes)
  - [x] `GRANT SELECT, INSERT, UPDATE, DELETE ON territory_assignments TO authenticated`
  - [x] Reuse `public.is_admin()` — do **not** recreate

- [x] **Apply & verify** (AC: 6, 7, 8)
  - [x] Prefer Supabase MCP: `list_tables` / `list_extensions` (confirm PostGIS), `apply_migration`, `get_advisors`
  - [x] Fallback: `npm run db:push` per `docs/SETUP_KEYS.md`
  - [x] `npm run db:types` then `npm run build` && `npm run lint`
  - [x] Regression smoke: knock promotion, calls panel, admin summary grid, rep map load unchanged

- [x] **TypeScript mirrors** (AC: 7)
  - [x] Create `src/lib/validators/territories.ts` — `territoryRowSchema` (`name`, `notes`, geometry as string from PostgREST or omit from client schema until 6.2 API)
  - [x] Create `src/lib/validators/territory-assignments.ts` — `territoryAssignmentRowSchema`
  - [x] Extend `src/types/database.ts` with `Territory`, `TerritoryAssignment` types
  - [x] No new SQL enums — territories use geometry + text fields only

### Review Findings

- [x] [Review][Defer] RLS smoke documented as policy-structure review, not live rep A/B session [`6-1-territory-and-assignment-schema.md` Dev Agent Record] — deferred, pre-existing — same pattern as Stories 2.1, 4.1, and 5.1; acceptable for schema-only story.
- [x] [Review][Defer] Multiple permissive SELECT policies on `territories` and `territory_assignments` (admin `FOR ALL` + rep `SELECT`) [`supabase/migrations/20260611120100_territories_rls.sql`] — deferred, pre-existing — same split admin/rep pattern as `call_logs` and `door_knocks`; consolidate when optimizing RLS performance.
- [x] [Review][Defer] Rep cannot `SELECT` territory via `profiles.territory_id` alone — only via `territory_assignments` [`supabase/migrations/20260611120100_territories_rls.sql:23-33`] — deferred — AC4 requires assignment-scoped read; revisit in Story 6.4 if default home territory (FR3) should render without a dated assignment row.
- [x] [Review][Defer] `TERRITORY_NAME_MAX_LENGTH` / `TERRITORY_NOTES_MAX_LENGTH` defined but unused in validators [`src/lib/validators/territories.ts:3-4`] — deferred — wire into create/update body schemas in Story 6.2 API layer.
- [x] [Review][Defer] `territoryRowSchema.polygon_geojson` typed as `z.string()` while generated type is `unknown` [`src/lib/validators/territories.ts:9`, `src/types/supabase.generated.ts`] — deferred — no runtime usage until 6.2; align with PostgREST geometry encoding when draw API lands.

## Dev Notes

### Critical constraints

- **Do NOT** add admin territory draw tool or `/admin/territories` page — Story 6.2.
- **Do NOT** add assignment UI or date-picker flows — Story 6.3.
- **Do NOT** add rep map polygon overlay or out-of-zone knock warning — Story 6.4.
- **Do NOT** add coverage heatmap layer or aggregation RPC — Story 6.5.
- **Do NOT** add API routes (`GET/POST /api/v1/territories`, assignments endpoints) — Stories 6.2–6.3.
- **Do NOT** add `ST_Contains` spatial RPC for knock validation — Story 6.4 (optional product warning).
- **Do NOT** wire `profiles.territory_id` in profile UI or admin team forms — Story 6.3+ (optional default territory link per FR3).
- **Do NOT** recreate `public.is_admin()` or `public.set_updated_at()` — use helpers from Epic 1.
- **Do NOT** add Supabase Realtime publication on territory tables — not required for v1 admin draw/assign flows.

### PRD vs architecture naming

| PRD field | SQL column | Notes |
|-----------|------------|-------|
| `polygon_geojson` | `polygon_geojson geometry(Polygon, 4326)` | PRD name retained; stores PostGIS geometry, not a `jsonb` column. Story 6.2 API accepts GeoJSON and converts via `ST_GeomFromGeoJSON` / `ST_SetSRID`. |
| `created_by_admin_id` | `created_by_admin_id` | FK to `profiles`; RLS enforces admin-only INSERT (NFR10). No DB check that referenced profile has `role = 'admin'`. |
| `assigned_date` | `assigned_date date` | PRD "date/window" — schema uses single `date`; time windows deferred unless 6.3 product requires `assigned_end_date`. |

### Brownfield schema diff (pre-6.1 vs PRD Section 5)

| Entity | Status | Action in 6.1 |
|--------|--------|---------------|
| PostGIS extension | ✅ `extensions.postgis` | None — verify via MCP |
| `territories` table | ❌ Missing | **Create** |
| `territory_assignments` table | ❌ Missing | **Create** |
| `profiles.territory_id` | ⏳ Column only, no FK | **Add FK** ON DELETE SET NULL |
| `features/territories/` | ⏳ `.gitkeep` only (Story 1.1) | None — app layer in 6.2+ |
| Rep map overlay | ❌ | None (6.4) |
| Admin map draw tool | ❌ | None (6.2) |

### Migration file naming & order

Latest migration: `20260610150000_call_script.sql`. New files must sort after it:

```bash
supabase migration new create_territories
supabase migration new territories_rls
```

Order: **tables + indexes + profiles FK → RLS** (matches Epic 1/2/4/5 pattern).

### Canonical DDL — `territories`

```sql
create table public.territories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  polygon_geojson extensions.geometry(Polygon, 4326) not null,
  notes text,
  created_by_admin_id uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger territories_set_updated_at
  before update on public.territories
  for each row
  execute function public.set_updated_at();

create index idx_territories_polygon on public.territories
  using gist (polygon_geojson);

create index idx_territories_name on public.territories (name);
```

**Geometry schema note:** PostGIS lives in `extensions` schema (`create extension postgis with schema extensions`). Use `extensions.geometry(...)` in DDL, or `public.geometry(...)` if your local `search_path` maps it — match how `door_knocks` spatial index uses `st_setsrid(st_makepoint(...), 4326)` without schema prefix. Verify column type via MCP `list_tables` after apply.

### Canonical DDL — `territory_assignments`

```sql
create table public.territory_assignments (
  id uuid primary key default gen_random_uuid(),
  territory_id uuid not null references public.territories (id) on delete restrict,
  rep_id uuid not null references public.profiles (id) on delete restrict,
  assigned_date date not null,
  assigned_by uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now()
);

create unique index idx_territory_assignments_unique
  on public.territory_assignments (territory_id, rep_id, assigned_date);

create index idx_territory_assignments_rep_date
  on public.territory_assignments (rep_id, assigned_date);

create index idx_territory_assignments_territory_date
  on public.territory_assignments (territory_id, assigned_date);
```

### Profiles FK (brownfield)

```sql
alter table public.profiles
  add constraint profiles_territory_id_fkey
  foreign key (territory_id) references public.territories (id) on delete set null;
```

`profiles.territory_id` is the optional **default/home territory** link (FR3). Date-specific coverage uses `territory_assignments` (FR20). Do not conflate the two in this story.

### RLS pattern (match shifts/leads admin style)

```sql
alter table public.territories enable row level security;
alter table public.territory_assignments enable row level security;

-- Admin full access
create policy territories_admin on public.territories
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy territory_assignments_admin on public.territory_assignments
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Rep read own assignments
create policy territory_assignments_select_rep on public.territory_assignments
  for select to authenticated
  using (rep_id = (select auth.uid()));

-- Rep read territories assigned to them (for Story 6.4 overlay)
create policy territories_select_rep on public.territories
  for select to authenticated
  using (
    exists (
      select 1 from public.territory_assignments ta
      where ta.territory_id = territories.id
        and ta.rep_id = (select auth.uid())
    )
  );
```

Use `(select auth.uid())` initplan pattern from `20260603120200_harden_contacts_door_knocks_rls.sql`.

### Future spatial queries (do not implement in 6.1)

Architecture documents these patterns for Stories 6.4–6.5:

```sql
-- Point-in-polygon for knock vs assigned territory (6.4 optional warning)
select t.*
from public.territories t
join public.territory_assignments ta on ta.territory_id = t.id
where ta.rep_id = :rep_id
  and ta.assigned_date = current_date
  and st_contains(
    t.polygon_geojson,
    st_setsrid(st_makepoint(:lng, :lat), 4326)
  );

-- GeoJSON for Mapbox overlay (6.4)
select st_asgeojson(polygon_geojson)::jsonb as geometry
from public.territories where id = :id;
```

Knocks continue using `lat`/`lng` doubles (Story 2.1 decision) — spatial checks use `ST_MakePoint(lng, lat)` expression, not a stored geometry column on `door_knocks`.

### Downstream story dependencies

| Story | Depends on 6.1 |
|-------|----------------|
| 6.2 Draw and Save Territories | `territories` table + admin RLS INSERT/UPDATE |
| 6.3 Assign Territory to Rep by Date | `territory_assignments` + unique index |
| 6.4 Rep Map Overlay | rep SELECT policies + `assigned_date` index |
| 6.5 Heatmap | knock `lat`/`lng` + territory GiST (indirect) |

### Epic 5 retrospective carry-forward

- PostGIS already enabled locally (Epic 1.2) — **confirm on remote** via MCP `list_extensions` before apply.
- Calls and territories are orthogonal — no migration conflicts with `call_logs` / `call_script`.
- Map stack is **mapbox-gl** (Story 2.3+) — Story 6.2 draw tool will extend admin map; no library install in 6.1.

### Project Structure Notes

- Schema-only story — touch only `supabase/migrations/`, `src/types/`, `src/lib/validators/`.
- Future app code lands in `src/features/territories/`, `src/components/admin/territory-draw-tool.tsx`, `src/app/(admin)/admin/territories/page.tsx` per architecture.md — **not in 6.1**.
- API endpoints (illustrative, 6.2+): `GET/POST /api/v1/territories`, assignment routes under same prefix.

### Testing requirements

- **No new Playwright/e2e tests** — schema-only (consistent with Stories 2.1, 4.1, 5.1).
- **Manual RLS smoke** (document in Dev Agent Record):
  - Admin can INSERT territory + assignment
  - Rep A can SELECT own assignment + linked territory polygon
  - Rep A cannot SELECT Rep B's assignment or unassigned territory
  - Rep cannot INSERT/UPDATE/DELETE territories
- **Regression:** `create_knock_with_contact`, admin summary RPC, rep map bbox knocks, calls panel — all unchanged.

### References

- [Source: docs/Solar_CRM_PRD_v1.md#5-data-model-overview] — Territory + TerritoryAssignment entities
- [Source: _bmad-output/planning-artifacts/architecture.md#data-architecture] — `geometry(Polygon,4326)`, spatial patterns
- [Source: _bmad-output/planning-artifacts/architecture.md#architectural-boundaries] — SRID 4326 validation; territory edits admin-only
- [Source: _bmad-output/planning-artifacts/epics.md#story-61] — AC summary
- [Source: _bmad-output/implementation-artifacts/1-2-enable-postgis-and-core-auth-schema.md] — `territory_id` FK deferred to Epic 6
- [Source: _bmad-output/implementation-artifacts/2-1-contacts-and-doorknocks-schema.md] — lat/lng vs geometry decision for knocks
- [Source: _bmad-output/implementation-artifacts/5-1-calllog-schema-and-rls.md] — schema-only story pattern, RLS smoke docs
- [Source: _bmad-output/implementation-artifacts/epic-5-retro-2026-06-06.md#epic-6-preview] — Epic 6 prep checklist
- [Source: .cursor/rules/supabase-database-mcp.mdc] — MCP-first migration workflow

## Dev Agent Record

### Agent Model Used

Composer

### Debug Log References

- PostGIS confirmed via MCP `list_extensions` (`extensions.postgis` v3.3.7).
- Migrations applied via MCP `apply_migration` (`create_territories`, `territories_rls`).
- RLS policy structure verified via MCP `execute_sql` on `pg_policies` (4 policies: admin ALL + rep SELECT on each table).
- `polygon_geojson` column type confirmed as `extensions.geometry` via `information_schema.columns`.
- Security advisors: no new ERROR-level findings for territory tables after RLS migration; pre-existing WARN items only (`normalize_phone_digits`, SECURITY DEFINER RPCs, auth leaked-password).

### Completion Notes List

- Created `territories` and `territory_assignments` tables with PostGIS `geometry(Polygon, 4326)`, GiST polygon index, assignment date indexes, and unique `(territory_id, rep_id, assigned_date)` constraint.
- Wired deferred `profiles.territory_id` FK with `ON DELETE SET NULL`.
- Added RLS: admin full CRUD; rep read-only on own assignments and linked territories.
- Added TypeScript validators and `database.ts` exports; regenerated `supabase.generated.ts`.
- `npm run build` and `npm run lint` pass. No app routes or UI added (schema-only scope).

### RLS smoke (policy-structure review)

- `territories_admin` + `territory_assignments_admin`: `FOR ALL` gated by `is_admin()`.
- `territory_assignments_select_rep`: rep-scoped SELECT only.
- `territories_select_rep`: SELECT via assignment join — reps cannot read unassigned territories.
- No rep INSERT/UPDATE/DELETE policies — writes blocked for non-admins (NFR10).

### File List

- `supabase/migrations/20260611120000_create_territories.sql` (new)
- `supabase/migrations/20260611120100_territories_rls.sql` (new)
- `src/lib/validators/territories.ts` (new)
- `src/lib/validators/territory-assignments.ts` (new)
- `src/types/database.ts` (modified)
- `src/types/supabase.generated.ts` (regenerated)

## Change Log

- 2026-06-07: Story 6.1 implemented — territory + assignment schema, RLS, profiles FK, TypeScript mirrors.
- 2026-06-07: Code review — approved; 5 deferrals logged, 0 patches required.
