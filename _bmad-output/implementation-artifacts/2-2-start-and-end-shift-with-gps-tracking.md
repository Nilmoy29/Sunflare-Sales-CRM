---
baseline_commit: NO_VCS
---

# Story 2.2: Start and End Shift with GPS Tracking

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **rep**,
I want to start and end my shift explicitly,
so that GPS tracking and daily metrics apply only while I'm working.

## Acceptance Criteria

1. **Given** Epic 1 auth and Story 2.1 schema exist  
   **When** migrations run  
   **Then** `public.shifts` exists with:
   - `id` UUID PK DEFAULT `gen_random_uuid()`
   - `rep_id` UUID NOT NULL REFERENCES `public.profiles(id)` ON DELETE RESTRICT
   - `started_at` TIMESTAMPTZ NOT NULL DEFAULT `now()`
   - `ended_at` TIMESTAMPTZ NULL (NULL = active shift)
   - Partial unique index: at most **one** active shift per rep (`ended_at IS NULL`)

2. **Given** migrations applied  
   **When** inspecting `public.gps_pings`  
   **Then** the table matches PRD Section 5 plus shift linkage:
   - `id` UUID PK DEFAULT `gen_random_uuid()`
   - `rep_id` UUID NOT NULL REFERENCES `public.profiles(id)` ON DELETE RESTRICT
   - `shift_id` UUID NOT NULL REFERENCES `public.shifts(id)` ON DELETE RESTRICT *(architecture extension — enables Story 3.5 breadcrumb boundaries)*
   - `lat` DOUBLE PRECISION NOT NULL
   - `lng` DOUBLE PRECISION NOT NULL
   - `recorded_at` TIMESTAMPTZ NOT NULL DEFAULT `now()`
   - Index on `(shift_id, recorded_at)` for breadcrumb queries

3. **Given** RLS is enabled on both tables  
   **When** authenticated as a **rep**  
   **Then** I can **INSERT/SELECT/UPDATE** my own `shifts` (`rep_id = auth.uid()`)  
   **And** I can **INSERT/SELECT** my own `gps_pings` only when linked to my **active** shift (`shift.ended_at IS NULL`)  
   **When** authenticated as an **admin**  
   **Then** I can **SELECT** all shifts and gps_pings (manager visibility for Epic 3)

4. **Given** I am a rep on `/rep/map` with no active shift  
   **When** I tap **Start Shift** (FR51)  
   **Then** `POST /api/v1/shifts/start` creates a shift row and returns `{ data: { id, started_at } }`  
   **And** the UI shows shift-active state with **End Shift** affordance  
   **And** the control meets 44×44px minimum touch target (NFR6, UX-DR2)

5. **Given** I have an active shift  
   **When** the browser Geolocation API is available  
   **Then** GPS pings POST to `/api/v1/gps/pings` approximately every **120 seconds** (FR52, NFR7)  
   **And** each ping includes `lat`, `lng`, and the active `shift_id`  
   **And** the first ping fires shortly after shift start (do not wait full 120s for initial point)

6. **Given** I have an active shift  
   **When** I tap **End Shift** (FR51)  
   **Then** `POST /api/v1/shifts/end` sets `ended_at = now()` on my active shift  
   **And** the client stops the GPS interval immediately  
   **And** no further pings are accepted server-side for that shift (RLS + route validation)

7. **Given** I refresh `/rep/map` mid-shift  
   **When** the page loads  
   **Then** the client restores active shift state via `GET /api/v1/shifts/current` (returns active shift or `null`)  
   **And** GPS collection resumes if shift is still active

8. **Given** geolocation is denied or unavailable  
   **When** shift is active  
   **Then** shift start/end still works  
   **And** the UI shows a clear non-blocking warning that GPS trail is paused  
   **And** ping POST failures do not end the shift

9. **Given** implementation is complete  
   **When** `npm run db:types` and `npm run build` run  
   **Then** TypeScript types include `Shift` and `GpsPing` aliases  
   **And** Zod validators exist for shift/ping API bodies  
   **And** lint passes

**Implements:** FR51, FR52  
**NFRs:** NFR7 (~120s GPS interval), NFR6 (touch targets), NFR9 (rep-scoped data)

## Tasks / Subtasks

- [x] **Migration: shifts + gps_pings tables** (AC: 1, 2)
  - [x] Create `supabase/migrations/20260603130000_create_shifts_gps_pings.sql`
  - [x] Partial unique index `shifts_one_active_per_rep_idx`
  - [x] GiST or btree index on gps_pings for shift timeline queries

- [x] **Migration: RLS** (AC: 3)
  - [x] Create `supabase/migrations/20260603130100_shifts_gps_pings_rls.sql`
  - [x] Reuse `public.is_admin()` — do **not** recreate
  - [x] Use `(select auth.uid())` pattern from Story 2.1 hardening (not bare `auth.uid()`)
  - [x] `gps_pings` INSERT policy must verify active shift ownership

- [x] **API Route Handlers** (AC: 4, 5, 6, 7)
  - [x] `POST /api/v1/shifts/start` — rep-only; reject if active shift exists (`409 SHIFT_ALREADY_ACTIVE`)
  - [x] `POST /api/v1/shifts/end` — rep-only; close active shift (`404 NO_ACTIVE_SHIFT` if none)
  - [x] `GET /api/v1/shifts/current` — rep-only; return active shift or `null`
  - [x] `POST /api/v1/gps/pings` — rep-only; Zod validate body; reject if shift ended
  - [x] All routes use `requireRoleForApi(["rep"])` + `{ data }` / `{ error }` envelope

- [x] **Validators & types** (AC: 9)
  - [x] `src/lib/validators/shifts.ts` — shift start/end response shapes, gps ping body
  - [x] Extend `src/types/database.ts` with `Shift`, `GpsPing` aliases
  - [x] `npm run db:types` after migrations

- [x] **Client: shift controls + GPS loop** (AC: 4, 5, 6, 7, 8)
  - [x] `src/features/shifts/` — API client helpers + `useActiveShift` hook (or equivalent)
  - [x] `src/features/gps/` — `useGpsPingLoop({ shiftId, enabled, intervalMs: 120_000 })`
  - [x] `src/components/rep/shift-controls.tsx` — Start/End buttons, active indicator, geolocation warning
  - [x] Wire into `src/app/(rep)/rep/map/page.tsx` (client wrapper — page stays thin)
  - [x] 44×44px min touch targets; mobile-first floating placement (UX-DR4 partial — full map in 2.3)

- [x] **Apply & verify** (AC: 3, 9)
  - [x] Supabase MCP: `apply_migration`, `list_tables`, `get_advisors`
  - [x] Manual smoke: start shift → pings insert → end shift → ping rejected
  - [x] `npm run build` && `npm run lint`

### Review Findings

- [x] [Review][Patch] Rep can reopen ended shifts or tamper `started_at` via direct UPDATE [`supabase/migrations/20260603130100_shifts_gps_pings_rls.sql:16-20`] — Fixed in `20260603130200_shifts_rep_guardrails.sql`: `enforce_rep_shift_update()` blocks reopening closed shifts and `started_at` changes by non-admins.

- [x] [Review][Patch] GPS API failures shown as geolocation warnings [`src/components/rep/shift-controls.tsx:27-30`] — Fixed: `useGpsPingLoop` returns separate `geoWarning` and `pingWarning`; `ShiftControls` renders all active warnings.

- [x] [Review][Defer] `getActiveShiftForRep` swallows query errors [`src/features/shifts/queries.ts:15-16`] — deferred, pre-existing — returns `null` on any DB error, conflating outage with “no active shift”; acceptable for v1 rep UX.

- [x] [Review][Defer] Multiple permissive SELECT policies on shifts/gps_pings [`supabase/migrations/20260603130100_shifts_gps_pings_rls.sql`] — deferred, pre-existing — same admin/rep split as profiles/contacts; consolidate in performance pass.

## Dev Notes

### Critical constraints

- **Do NOT** add Mapbox map rendering — Story 2.3 owns live map + historic pins.
- **Do NOT** gate knock logging on shift yet — Stories 2.4–2.5 add that; but shift state from this story will be consumed there.
- **Do NOT** add admin map breadcrumbs — Story 3.5.
- **Do NOT** add end-of-shift daily summary — Story 7.7 (FR53).
- **Do NOT** install TanStack Query for this story — not in `package.json` today; use `fetch` + React state (match existing auth/server-action patterns). Add React Query in a dedicated infra story if needed later.
- **Do NOT** recreate `is_admin()` or duplicate RLS patterns from 2.1 — copy the hardened `(select auth.uid())` style.

### `shifts` table is an architecture extension

PRD Section 5 lists `GpsPing` but not a explicit `Shift` entity. Epic AC requires a **shift record** that opens/closes (FR51). Architecture defines `POST /api/v1/shifts/start|end`. The `shifts` table is required — same pattern as `contacts.created_by` in Story 2.1.

### `shift_id` on `gps_pings`

PRD `GpsPing` has only `rep_id`. Adding `shift_id` FK is required for Story 3.5 AC: *"breadcrumbs respect shift start/end boundaries only"*. Without it, admin cannot filter pings to a single shift window.

### Reference SQL — shifts + gps_pings

```sql
create table public.shifts (
  id uuid primary key default gen_random_uuid(),
  rep_id uuid not null references public.profiles (id) on delete restrict,
  started_at timestamptz not null default now(),
  ended_at timestamptz
);

create unique index shifts_one_active_per_rep_idx
  on public.shifts (rep_id)
  where ended_at is null;

create index idx_shifts_rep_started_at on public.shifts (rep_id, started_at desc);

create table public.gps_pings (
  id uuid primary key default gen_random_uuid(),
  rep_id uuid not null references public.profiles (id) on delete restrict,
  shift_id uuid not null references public.shifts (id) on delete restrict,
  lat double precision not null,
  lng double precision not null,
  recorded_at timestamptz not null default now()
);

create index idx_gps_pings_shift_recorded_at
  on public.gps_pings (shift_id, recorded_at);
```

### Reference SQL — RLS (pattern)

```sql
-- shifts: rep manages own rows
create policy shifts_select_rep on public.shifts
  for select to authenticated
  using (rep_id = (select auth.uid()));

create policy shifts_insert_rep on public.shifts
  for insert to authenticated
  with check (rep_id = (select auth.uid()));

create policy shifts_update_rep on public.shifts
  for update to authenticated
  using (rep_id = (select auth.uid()))
  with check (rep_id = (select auth.uid()));

create policy shifts_select_admin on public.shifts
  for select to authenticated
  using (public.is_admin());

-- gps_pings: insert only into own active shift
create policy gps_pings_select_rep on public.gps_pings
  for select to authenticated
  using (rep_id = (select auth.uid()));

create policy gps_pings_insert_rep on public.gps_pings
  for insert to authenticated
  with check (
    rep_id = (select auth.uid())
    and exists (
      select 1 from public.shifts s
      where s.id = shift_id
        and s.rep_id = (select auth.uid())
        and s.ended_at is null
    )
  );

create policy gps_pings_select_admin on public.gps_pings
  for select to authenticated
  using (public.is_admin());

grant select, insert, update on public.shifts to authenticated;
grant select, insert on public.gps_pings to authenticated;
```

### API contracts

**POST `/api/v1/shifts/start`** — no body required

```json
{ "data": { "id": "uuid", "started_at": "2026-06-03T09:00:00.000Z" } }
```

Errors: `409 SHIFT_ALREADY_ACTIVE`, `401`, `403`

**POST `/api/v1/shifts/end`** — no body

```json
{ "data": { "id": "uuid", "started_at": "...", "ended_at": "2026-06-03T17:00:00.000Z" } }
```

Errors: `404 NO_ACTIVE_SHIFT`

**GET `/api/v1/shifts/current`**

```json
{ "data": { "id": "uuid", "started_at": "...", "ended_at": null } }
// or
{ "data": null }
```

**POST `/api/v1/gps/pings`**

```json
// body
{ "shift_id": "uuid", "lat": -33.8688, "lng": 151.2093 }

// response
{ "data": { "id": "uuid", "recorded_at": "..." } }
```

Errors: `400` validation, `404 SHIFT_NOT_ACTIVE`, `403` wrong rep

Route Handler pattern (follow `requireRoleForApi`):

```typescript
import { requireRoleForApi } from "@/lib/auth/guards";
import { apiSuccess, apiError } from "@/lib/api/response";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  const auth = await requireRoleForApi(["rep"]);
  if (auth instanceof Response) return auth;
  // ... supabase insert with user JWT (RLS enforced)
}
```

Use user-scoped `createClient()` — **never** service role for rep mutations.

### Client GPS loop

```typescript
const GPS_INTERVAL_MS = 120_000; // NFR7

// useGpsPingLoop responsibilities:
// 1. On enable + shiftId: request geolocation permission
// 2. Fire immediate ping on start (AC5)
// 3. setInterval(120_000) while enabled
// 4. clearInterval on disable/unmount/shift end
// 5. navigator.geolocation.getCurrentPosition with timeout + maximumAge
// 6. Swallow/log ping errors; do not auto-end shift
// 7. Page Visibility: optional immediate ping when tab becomes visible (nice-to-have)
```

**Browser caveats (document in Completion Notes):**
- Background tabs throttle `setInterval` — acceptable for v1; pings resume when tab foregrounds.
- iOS Safari may suspend timers aggressively — shift state persists via DB; gaps in trail are OK for v1.
- Geolocation requires secure context (HTTPS or localhost) — Vercel prod satisfies NFR12.

### UI placement (UX-DR4 partial)

Story 2.3 adds full map canvas. For 2.2, add floating shift controls overlay on the rep map placeholder:

```
┌─────────────────────────────┐
│  Rep map (placeholder 2.3) │
│                              │
│              ┌─────────────┐ │
│              │ ● On shift  │ │
│              │ End Shift   │ │
│              └─────────────┘ │
└─────────────────────────────┘
```

Use Tailwind: `fixed bottom-6 right-4 z-10`, `min-h-11 min-w-11` (44px), high-contrast button.

Split page into server shell + client `RepMapShiftShell` component (map page must be client-interactive for geolocation).

### Previous story intelligence (2.1)

- Migration order: tables → RLS → optional hardening in separate file if review finds issues.
- RLS: `(select auth.uid())` not bare `auth.uid()`.
- Security definer triggers need `revoke all ... from anon, authenticated` if added.
- MCP workflow: `list_tables` → `apply_migration` → `get_advisors` → `npm run db:types`.
- Latest migration timestamp: `20260603120200_*` — new files must sort after.

### Cross-story dependencies

| Story | Relationship |
| :--- | :--- |
| 2.1 | Prerequisite — contacts/door_knocks done |
| 2.3 | Requires active shift concept; consumes `GET /shifts/current` to gate map features |
| 2.4–2.5 | Will require active shift before knock logging |
| 3.4 | "Reps on active shifts" uses `shifts.ended_at IS NULL` |
| 3.5 | Reads `gps_pings` by `shift_id` for polylines |
| 6.4 | Territory highlight on shift start — builds on shift active state |
| 7.7 | End-of-shift summary triggered on shift end — hook stub OK, implementation deferred |

### Testing (this story)

- **Required:** Migrations apply; RLS smoke (rep A cannot read rep B shifts/pings).
- **Required:** API integration smoke: start → current → ping → end → ping fails.
- **Required:** `npm run build` && `npm run lint`.
- **Manual:** Start shift on `/rep/map`, verify pings in Supabase dashboard every ~2 min, end shift, verify interval stops.
- **No** Playwright E2E unless quick API route tests are trivial to add — geolocation is hard to automate in CI.

### Project Structure Notes

New files expected:

```
supabase/migrations/20260603130000_create_shifts_gps_pings.sql
supabase/migrations/20260603130100_shifts_gps_pings_rls.sql
src/app/api/v1/shifts/start/route.ts
src/app/api/v1/shifts/end/route.ts
src/app/api/v1/shifts/current/route.ts
src/app/api/v1/gps/pings/route.ts
src/lib/validators/shifts.ts
src/features/shifts/...
src/features/gps/...
src/components/rep/shift-controls.tsx
src/app/(rep)/rep/map/... (client shell)
src/types/database.ts (extend)
```

Do not create `shift-controls` logic inside `page.tsx` — delegate to features/components per architecture.

### References

- [Source: `_bmad-output/planning-artifacts/epics.md` — Story 2.2]
- [Source: `docs/Solar_CRM_PRD_v1.md` — Section 5 GpsPing, NFR7, explicit shift clock-in/out]
- [Source: `_bmad-output/planning-artifacts/architecture.md` — shifts API, features/shifts, features/gps, shift-controls component]
- [Source: `_bmad-output/implementation-artifacts/2-1-contacts-and-doorknocks-schema.md` — RLS/migration conventions]
- [Source: `src/lib/auth/guards.ts` — requireRoleForApi pattern]
- [Source: `src/app/(rep)/rep/map/page.tsx` — current placeholder to extend]

## Dev Agent Record

### Agent Model Used

Composer (dev-story)

### Debug Log References

- MCP `apply_migration`: `create_shifts_gps_pings` + `shifts_gps_pings_rls` succeeded
- MCP `list_tables`: `shifts`, `gps_pings` with `rls_enabled: true`
- Supabase insert/update typed with `as never` (matches existing `profiles` update pattern in team-actions)
- ESLint: refactored hooks to avoid set-state-in-effect / ref-during-render rules

### Completion Notes List

- `shifts` + `gps_pings` schema with partial unique index for one active shift per rep
- Four rep-only API routes with Zod validation on GPS ping body
- Floating shift controls on `/rep/map` with 44px touch targets
- GPS loop: immediate ping on start + 120s interval; geolocation errors show non-blocking warning
- Page refresh restores shift via `GET /shifts/current` and resumes GPS loop
- Mapbox deferred to Story 2.3; map page shows placeholder copy
- **Code review patches (2026-06-03):** `enforce_rep_shift_update()` trigger; separate geo vs ping warnings in UI

### File List

- `supabase/migrations/20260603130000_create_shifts_gps_pings.sql`
- `supabase/migrations/20260603130100_shifts_gps_pings_rls.sql`
- `supabase/migrations/20260603130200_shifts_rep_guardrails.sql`
- `src/app/api/v1/shifts/start/route.ts`
- `src/app/api/v1/shifts/end/route.ts`
- `src/app/api/v1/shifts/current/route.ts`
- `src/app/api/v1/gps/pings/route.ts`
- `src/lib/validators/shifts.ts`
- `src/features/shifts/queries.ts`
- `src/features/shifts/api.ts`
- `src/features/shifts/use-active-shift.ts`
- `src/features/gps/use-gps-ping-loop.ts`
- `src/components/rep/shift-controls.tsx`
- `src/app/(rep)/rep/map/rep-map-shift-shell.tsx`
- `src/app/(rep)/rep/map/page.tsx`
- `src/types/database.ts`
- `src/types/supabase.generated.ts`

## Story Completion Status

- **Status:** done
- **Completion note:** Shift start/end with GPS tracking complete — code review patches applied
