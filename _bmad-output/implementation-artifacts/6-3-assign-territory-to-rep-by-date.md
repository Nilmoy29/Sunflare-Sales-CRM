---
baseline_commit: 161aab2
---

# Story 6.3: Assign Territory to Rep by Date

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an **admin**,
I want to assign territories to reps for specific dates,
so that coverage is planned in advance.

## Acceptance Criteria

1. **Given** I am an authenticated admin  
   **When** I open `/admin/territories` and switch to the **Assignments** view  
   **Then** I see a list of territory assignments with rep name, territory name, and `assigned_date` (FR20)  
   **And** a date filter defaults to today in `Australia/Sydney` (same convention as admin dashboard / map filters)  
   **And** the layout remains the desktop manager shell (sidebar + map per UX-DR5)

2. **Given** territories and active reps exist  
   **When** I submit the create-assignment form (territory + rep + date)  
   **Then** a row is inserted into `territory_assignments` with `territory_id`, `rep_id`, `assigned_date`, and `assigned_by = auth.uid()`  
   **And** the new assignment appears in the list without full page reload  
   **And** selecting a list row highlights the linked territory polygon on the map (reuse existing territory overlay layers)

3. **Given** duplicate prevention (schema unique index)  
   **When** I attempt to create the same `(territory_id, rep_id, assigned_date)` combination again  
   **Then** the API returns `409 DUPLICATE_ASSIGNMENT` (or `400 VALIDATION_ERROR` with clear message)  
   **And** no duplicate row is inserted

4. **Given** validation  
   **When** the API receives invalid `territory_id`, `rep_id`, or malformed `assigned_date`  
   **Then** the API returns `400 VALIDATION_ERROR`  
   **And** assigning to a non-rep profile or inactive rep is rejected with a clear message

5. **Given** authorization (NFR10)  
   **When** a rep or unauthenticated user hits assignment APIs or the assignments UI  
   **Then** the API returns 403  
   **And** rep routes (`/rep/map`, knock APIs, calls panel) are unchanged

6. **Given** implementation is complete  
   **When** `npm run build` and `npm run lint` run  
   **Then** they pass  
   **And** there is no rep map territory overlay (Story 6.4), heatmap layer (6.5), assignment DELETE UI, or `profiles.territory_id` editor (optional FR3 stretch — defer unless trivial)

**Implements:** FR20  
**NFRs:** NFR10 (admin server guards), NFR9 (rep reads own assignments only — enforced by existing RLS; no rep UI in this story)

## Tasks / Subtasks

- [x] **Validators + types** (AC: 2, 3, 4)
  - [x] Extend `src/lib/validators/territory-assignments.ts`:
    - Reuse existing `assignedDateSchema` (`YYYY-MM-DD`)
    - `createTerritoryAssignmentBodySchema` — `territory_id` (uuid), `rep_id` (uuid), `assigned_date` (`assignedDateSchema`)
    - `territoryAssignmentSummarySchema` — `id`, `territory_id`, `territory_name`, `rep_id`, `rep_name`, `assigned_date`, `assigned_by`, `created_at`
    - `territoryAssignmentsListQuerySchema` — optional `assigned_date`, `rep_id`, `territory_id` query params
    - Response schemas: `territoryAssignmentsListResponseSchema`, `createTerritoryAssignmentResponseSchema`
    - `parseTerritoryAssignmentSummary(row)` helper (mirror `parseTerritorySummary` date coercion pattern)

- [x] **Database RPCs** (AC: 2, 3, 4)
  - [x] Create `supabase/migrations/*_territory_assignment_rpcs.sql` (sort after `20260611130000_territory_crud_rpcs.sql`):
    - `get_territory_assignments_for_admin(p_assigned_date date default null, p_rep_id uuid default null, p_territory_id uuid default null)`
      - Join `territory_assignments` → `territories` (name) + `profiles` (rep name)
      - Guard: `public.is_admin()` at top
      - Order by `assigned_date desc`, `rep_name`, `territory_name`
    - `create_territory_assignment(p_territory_id uuid, p_rep_id uuid, p_assigned_date date)`
      - Guard: `public.is_admin()`
      - Validate territory exists; rep exists with `role = 'rep'` and `active = true`
      - `assigned_by := auth.uid()`
      - `INSERT` into `territory_assignments`; return enriched summary row (same shape as list)
      - On unique violation `(territory_id, rep_id, assigned_date)` → raise with errcode `23505` or custom `22023` message
    - `security invoker`, `search_path = public`
    - `grant execute ... to authenticated` (admin enforced in function body — same pattern as Story 6.2)

- [x] **Feature layer + API routes** (AC: 2, 3, 4, 5)
  - [x] `src/features/territories/get-territory-assignments.ts` — calls list RPC with optional filters
  - [x] `src/features/territories/create-territory-assignment.ts` — calls create RPC; map `23505` → `DuplicateTerritoryAssignmentError`
  - [x] Extend `src/features/territories/api.ts` — `fetchTerritoryAssignments`, `createTerritoryAssignment`
  - [x] `GET /api/v1/territory-assignments/route.ts` — `requireRoleForApi(["admin"])`, parse query, return `{ data: { assignments } }`
  - [x] `POST /api/v1/territory-assignments/route.ts` — validate body, return `{ data: { assignment } }`
  - [x] Standard error envelope: `400`, `401`, `403`, `409`, `500`

- [x] **Client hook** (AC: 1, 2)
  - [x] `src/features/territories/use-territory-assignments.ts` — load on mount + when date filter changes; expose `create`, `refresh`; follow `use-territories` fetch pattern (no TanStack Query)

- [x] **Admin assignments UI** (AC: 1, 2, 6)
  - [x] Extend `src/app/(admin)/admin/territories/page.tsx` — server-fetch active reps (`profiles` where `role = 'rep'` and `active = true`, order by name) and pass to shell (same pattern as `admin/map/page.tsx`)
  - [x] Extend `src/components/admin/territory-shell.tsx` — top-level view toggle: **Zones** | **Assignments**
  - [x] `src/components/admin/territory-assignments-panel.tsx` (new):
    - Date input filter (default `formatSydneyDateString(new Date())`)
    - Assignment list (rep, territory, date)
    - Create form: territory `<select>` (from `useTerritories`), rep `<select>`, date input, Save
    - Loading / error / empty states
    - Row click → set `selectedTerritoryId` for map highlight (reuse `TerritoryDrawTool` `selectedId` prop)
  - [x] Hide draw controls / save form when in Assignments view; map still shows territory polygons

- [x] **Verify** (AC: 5, 6)
  - [x] Manual: Admin creates assignment for today → appears in list; map highlights territory on row select
  - [x] Manual: Duplicate same territory+rep+date → friendly error
  - [x] Manual: Rep gets 403 on assignment APIs; `/admin/territories` page blocked for rep (existing `requireRole`)
  - [x] Manual: Story 6.2 zone draw/edit still works in Zones view
  - [x] `npm run build` && `npm run lint`
  - [x] Apply RPC migration via Supabase MCP or `npm run db:push`; `npm run db:types`

### Review Findings

- [x] [Review][Patch] Clearing date filter fetches all assignments — empty `assigned_date` omits query param and RPC returns unfiltered rows [`src/features/territories/use-territory-assignments.ts`, `src/components/admin/territory-assignments-panel.tsx`] — fixed: revert empty filter to Sydney today; skip fetch when date invalid.
- [x] [Review][Defer] RPC `grant execute` to `authenticated` (not admin-only) [`supabase/migrations/20260611140000_territory_assignment_rpcs.sql:117-118`] — deferred, pre-existing — same pattern as Stories 6.2, 3.3, 5.6; API routes enforce admin via `requireRoleForApi`.
- [x] [Review][Defer] `getTerritoryAssignmentsForAdmin` silently drops rows when `parseTerritoryAssignmentSummary` fails [`src/features/territories/get-territory-assignments.ts:31-33`] — deferred — acceptable v1; same pattern as 6.2 territory list.
- [x] [Review][Defer] Client `fetchTerritoryAssignments` / `createTerritoryAssignment` do not re-validate responses with Zod [`src/features/territories/api.ts`] — deferred — matches project fetch+hooks convention; server layer parses via `parseTerritoryAssignmentSummary`.
- [x] [Review][Defer] Assignment list row highlight keyed by `territory_id` not `assignment.id` [`src/components/admin/territory-assignments-panel.tsx:120`] — deferred — multiple reps on same territory same day share highlight; cosmetic v1.
- [x] [Review][Defer] GET `/api/v1/territory-assignments` without `assigned_date` returns all assignments [`get_territory_assignments_for_admin` RPC] — deferred — UI always sends date filter; unbounded list acceptable for v1 team size.
- [x] [Review][Defer] Local `npm run db:types` may lag remote RPC signatures [`src/types/supabase.generated.ts`] — deferred — feature layer uses `as never` RPC casts (6.2 pattern); remote MCP confirms RPCs exist.

## Dev Notes

### Critical constraints

- **Do NOT** add rep map polygon overlay or out-of-zone knock warning — Story 6.4.
- **Do NOT** add coverage heatmap — Story 6.5.
- **Do NOT** add new DB tables or RLS migrations — Story 6.1 schema + RLS is complete; this story adds RPCs only.
- **Do NOT** add `assigned_end_date` or multi-day windows — PRD mentions "date/window"; v1 uses single `assigned_date` per 6.1 schema. Defer date ranges unless product explicitly requests in this story.
- **Do NOT** wire `profiles.territory_id` on assignment create — that is the optional FR3 **default/home** territory link, distinct from dated `territory_assignments` (see 6.1 Dev Notes). Defer unless trivial one-liner.
- **Do NOT** add assignment UPDATE or DELETE UI/API unless trivial — schema allows admin DELETE via RLS; not required for FR20 AC.
- **Do NOT** install TanStack Query — project convention: `fetch` + hooks.
- **Do NOT** modify rep `MapCanvas`, admin knock `AdminMapCanvas`, or `TerritoryDrawTool` draw logic — only pass `selectedId` for highlight from assignments panel.
- **Do NOT** recreate `public.is_admin()` — reuse from Epic 1.

### Story 6.1 + 6.2 foundation (must reuse)

| Asset | Location | 6.3 use |
|-------|----------|---------|
| `territory_assignments` table | `20260611120000_create_territories.sql` | INSERT via RPC |
| Unique index `(territory_id, rep_id, assigned_date)` | same migration | Duplicate guard |
| Admin RLS on assignments | `20260611120100_territories_rls.sql` | API uses session JWT |
| `territoryAssignmentRowSchema` | `src/lib/validators/territory-assignments.ts` | Extend with create/summary schemas |
| Territory list + map | `territory-shell.tsx`, `territory-draw-tool.tsx`, `use-territories.ts` | Reuse for dropdown + map highlight |
| Territory CRUD RPC pattern | `20260611130000_territory_crud_rpcs.sql` | Mirror `is_admin()` guard + `security invoker` |
| Sydney date helpers | `src/features/knocks/format-knock-date.ts` | Default filter date; 6.4 will query "today" the same way |

### `profiles.territory_id` vs `territory_assignments` (do not conflate)

| Field | Purpose | This story |
|-------|---------|------------|
| `profiles.territory_id` | Optional default/home territory (FR3) | **Do not** auto-update on assignment |
| `territory_assignments` | Dated operational coverage (FR20) | **Create** via admin UI |

Story 6.4 reads assignments for **today's date** to render rep overlay — assignments created here must use the same `YYYY-MM-DD` string format and Sydney "today" semantics as shift/knock date filters.

### RPC design

**List** — enriched rows for admin UI (no client-side joins):

```sql
select
  a.id,
  a.territory_id,
  t.name as territory_name,
  a.rep_id,
  p.name as rep_name,
  a.assigned_date,
  a.assigned_by,
  a.created_at
from public.territory_assignments a
join public.territories t on t.id = a.territory_id
join public.profiles p on p.id = a.rep_id
where public.is_admin()
  and (p_assigned_date is null or a.assigned_date = p_assigned_date)
  and (p_rep_id is null or a.rep_id = p_rep_id)
  and (p_territory_id is null or a.territory_id = p_territory_id)
order by a.assigned_date desc, p.name, t.name;
```

**Create** — set `assigned_by` server-side:

```sql
insert into public.territory_assignments (territory_id, rep_id, assigned_date, assigned_by)
values (p_territory_id, p_rep_id, p_assigned_date, auth.uid())
returning id;
-- then return enriched row via join (same as list)
```

Handle `unique_violation` on `idx_territory_assignments_unique` → map to `409 DUPLICATE_ASSIGNMENT` in API route.

### API contracts

**GET `/api/v1/territory-assignments?assigned_date=2026-06-07&rep_id=&territory_id=`**

```json
{
  "data": {
    "assignments": [
      {
        "id": "uuid",
        "territory_id": "uuid",
        "territory_name": "Surry Hills East",
        "rep_id": "uuid",
        "rep_name": "Alex Chen",
        "assigned_date": "2026-06-07",
        "assigned_by": "uuid",
        "created_at": "2026-06-07T10:00:00.000Z"
      }
    ]
  }
}
```

**POST `/api/v1/territory-assignments`**

```json
{
  "territory_id": "uuid",
  "rep_id": "uuid",
  "assigned_date": "2026-06-07"
}
```

Response: `{ "data": { "assignment": { ...same shape } } }`

Errors: `400 VALIDATION_ERROR`, `401`, `403 FORBIDDEN`, `409 DUPLICATE_ASSIGNMENT`, `500`

### UI sketch (extend `/admin/territories`)

```
┌─────────────────────────────────────────────────────────┐
│ Admin header (+ Territories nav)                        │
├──────────────┬──────────────────────────────────────────┤
│ [Zones|Assign]│ Mapbox map (existing territory polygons)  │
│              │                                          │
│ Assignments: │  ← selected assignment highlights zone   │
│ Date [today] │                                          │
│ + Create:    │                                          │
│  Territory ▼ │                                          │
│  Rep ▼       │                                          │
│  Date        │                                          │
│  [Assign]    │                                          │
│ List...      │                                          │
└──────────────┴──────────────────────────────────────────┘
```

Zones view = current Story 6.2 behavior unchanged.

### Distinction from team management (Story 1.5)

| | Team management (`/admin/team`) | Assignments (this story) |
| :--- | :--- | :--- |
| Purpose | Create/deactivate rep accounts | Plan which rep covers which zone on which date |
| Data | `profiles`, auth users | `territory_assignments` |
| Map | None | Highlights assigned territory polygon |

### Project structure (architecture-aligned)

```
src/app/api/v1/territory-assignments/route.ts
src/app/(admin)/admin/territories/page.tsx          (UPDATE — pass reps)
src/components/admin/territory-shell.tsx            (UPDATE — view toggle)
src/components/admin/territory-assignments-panel.tsx (NEW)
src/features/territories/get-territory-assignments.ts
src/features/territories/create-territory-assignment.ts
src/features/territories/api.ts                     (UPDATE)
src/features/territories/use-territory-assignments.ts
src/lib/validators/territory-assignments.ts         (UPDATE)
supabase/migrations/*_territory_assignment_rpcs.sql
```

### Testing requirements

- **No new Playwright/e2e tests** unless requested — manual QA checklist in Dev Agent Record.
- **Manual QA:**
  - Create assignment for today → listed; map highlights on row select
  - Change date filter → list updates
  - Duplicate assignment → error message
  - Inactive rep not in dropdown / rejected by API
  - Rep 403 on `GET/POST /api/v1/territory-assignments`
  - Zones view regression: draw/save/edit territory still works
- **Regression:** knock logging, calls panel, pipeline, admin map knock pins unchanged.

### Learnings from Story 6.2 code review (apply proactively)

- PostGIS RPC functions need `extensions.` prefix when calling `st_*` helpers (not needed for assignment RPCs — no geometry).
- `p_notes`-style null sentinel: N/A for assignments; use explicit validation instead.
- `grant execute` to `authenticated` with `is_admin()` inside RPC is accepted project pattern.
- Client API may skip Zod response re-validation — acceptable if server uses `parseTerritoryAssignmentSummary`.

### References

- [Source: docs/Solar_CRM_PRD_v1.md#module-3--territory-management] — Rep Territory Assignment (FR20)
- [Source: docs/Solar_CRM_PRD_v1.md#5-data-model-overview] — TerritoryAssignment entity
- [Source: _bmad-output/planning-artifacts/epics.md#story-63] — AC summary
- [Source: _bmad-output/planning-artifacts/architecture.md#complete-project-directory-structure] — `features/territories`, `admin/territories`
- [Source: _bmad-output/implementation-artifacts/6-1-territory-and-assignment-schema.md] — schema, RLS, unique index, `profiles.territory_id` distinction
- [Source: _bmad-output/implementation-artifacts/6-2-draw-and-save-territories.md] — territory API/RPC/UI patterns, map component reuse
- [Source: src/app/(admin)/admin/map/page.tsx] — server-side rep list fetch pattern
- [Source: src/app/api/v1/territories/route.ts] — `requireRoleForApi`, error envelope
- [Source: src/features/knocks/format-knock-date.ts] — `formatSydneyDateString` for date defaults

## Dev Agent Record

### Agent Model Used

Composer

### Debug Log References

- Migration applied via Supabase MCP `apply_migration` (`territory_assignment_rpcs`).
- Remote MCP `generate_typescript_types` confirms new RPC signatures; local `npm run db:types` may lag until linked project syncs — feature layer uses `as never` RPC casts (same as 6.2).
- `npm run build` and `npm run lint` pass (0 errors).

### Completion Notes List

- Extended territory assignment validators with create/summary/query schemas and `parseTerritoryAssignmentSummary`.
- Added assignment list/create RPCs with admin guard, rep active validation, duplicate handling (`23505` → `409 DUPLICATE_ASSIGNMENT`).
- REST API `GET/POST /api/v1/territory-assignments` with Zod validation and standard error envelope.
- Client hook `useTerritoryAssignments` with Sydney-date filter and optimistic list append on create.
- Admin UI: Zones | Assignments toggle on `/admin/territories`; assignments panel with filter, list, create form, map highlight on row select.
- Active reps loaded server-side on territories page (inactive reps excluded from dropdown).

### File List

- `supabase/migrations/20260611140000_territory_assignment_rpcs.sql` (new)
- `src/lib/validators/territory-assignments.ts` (modified)
- `src/features/territories/get-territory-assignments.ts` (new)
- `src/features/territories/create-territory-assignment.ts` (new)
- `src/features/territories/api.ts` (modified)
- `src/features/territories/use-territory-assignments.ts` (new)
- `src/app/api/v1/territory-assignments/route.ts` (new)
- `src/app/(admin)/admin/territories/page.tsx` (modified)
- `src/components/admin/territory-shell.tsx` (modified)
- `src/components/admin/territory-assignments-panel.tsx` (new)
- `src/types/supabase.generated.ts` (regenerated)

## Change Log

- 2026-06-07: Story 6.3 created — territory assignment admin UI, APIs, RPCs; builds on 6.1 schema and 6.2 territory map.
- 2026-06-07: Story 6.3 implemented — assignment RPCs, REST API, Zones|Assignments UI on `/admin/territories`.
- 2026-06-07: Code review — approved; 1 patch applied (empty date filter), 6 deferrals logged.
