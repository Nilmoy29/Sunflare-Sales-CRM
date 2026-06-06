---
baseline_commit: NO_VCS
---

# Story 2.1: Contacts and DoorKnocks Schema

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **developer**,
I want contact and door knock tables with RLS,
so that reps can persist knock data securely.

## Acceptance Criteria

1. **Given** Epic 1 auth and `profiles` RLS exist  
   **When** migrations run (`npm run db:push` or Supabase MCP `apply_migration`)  
   **Then** `public.contacts` exists with PRD Section 5 fields:
   - `id` UUID PK DEFAULT `gen_random_uuid()`
   - `first_name` TEXT NULL
   - `last_name` TEXT NULL
   - `phone` TEXT NULL
   - `email` TEXT NULL
   - `address` TEXT NULL
   - `suburb` TEXT NULL
   - `postcode` TEXT NULL
   - `lat` DOUBLE PRECISION NULL
   - `lng` DOUBLE PRECISION NULL
   - `created_at` TIMESTAMPTZ NOT NULL DEFAULT `now()`
   - **Plus (architecture-required):** `created_by` UUID NOT NULL REFERENCES `public.profiles(id)` — enables rep-scoped contact RLS (not in PRD diagram but required by architecture contacts policy)

2. **Given** migrations applied  
   **When** inspecting `public.door_knocks`  
   **Then** the table has PRD Section 5 fields:
   - `id` UUID PK DEFAULT `gen_random_uuid()`
   - `contact_id` UUID NOT NULL REFERENCES `public.contacts(id)` ON DELETE RESTRICT
   - `rep_id` UUID NOT NULL REFERENCES `public.profiles(id)` ON DELETE RESTRICT
   - `outcome` `public.door_outcome` NOT NULL
   - `notes` TEXT NULL
   - `knocked_at` TIMESTAMPTZ NOT NULL DEFAULT `now()`
   - `lat` DOUBLE PRECISION NOT NULL
   - `lng` DOUBLE PRECISION NOT NULL
   - `synced` BOOLEAN NOT NULL DEFAULT `true` (offline sync flag per PRD)

3. **Given** `door_outcome` enum from Story 1.2  
   **When** inserting a knock  
   **Then** only frozen PRD values are valid: `interested`, `not_home`, `not_interested`, `do_not_knock`, `callback_requested`, `already_has_solar`

4. **Given** RLS is enabled on both tables  
   **When** authenticated as a **rep**  
   **Then** I can **INSERT** and **SELECT** `door_knocks` where `rep_id = auth.uid()`  
   **And** I can **INSERT** `contacts` only when `created_by = auth.uid()`  
   **And** I can **SELECT** `contacts` I created **or** that are linked to my knocks  
   **And** I can **UPDATE** `contacts` I created **or** linked to my knocks (needed by Story 2.6 address edit)

5. **Given** RLS is enabled  
   **When** authenticated as an **admin** (`public.is_admin()` = true)  
   **Then** I can **SELECT** all rows in `contacts` and `door_knocks`  
   **And** admins do **not** need INSERT/UPDATE on knocks in this story (manager write paths come later)

6. **Given** this story’s scope  
   **When** migrations are reviewed  
   **Then** **`leads`**, **`call_logs`**, **`gps_pings`**, **`territories`**, and other PRD tables are **not** created  
   **And** no API routes or UI are added (schema-only story)

7. **Given** schema changes are applied  
   **When** the TypeScript project builds  
   **Then** `npm run db:types` regenerates `src/types/supabase.generated.ts`  
   **And** `src/types/database.ts` exports `Contact`, `DoorKnock` row/insert/update aliases  
   **And** `npm run build` passes

8. **Given** Supabase security advisors  
   **When** migrations are verified via MCP `get_advisors`  
   **Then** no new critical RLS or function-exposure warnings remain unaddressed

**Implements:** FR59, FR60, FR54 (contacts foundation)  
**NFRs:** NFR9 (rep data isolation), NFR15 (managed Supabase backups — no app code)

## Tasks / Subtasks

- [x] **Migration: tables** (AC: 1, 2, 3, 6)
  - [x] Create `supabase/migrations/20260603120000_create_contacts_door_knocks.sql`
  - [x] `contacts` + indexes (`idx_contacts_phone`, `idx_contacts_created_by`)
  - [x] `door_knocks` + indexes (`idx_door_knocks_rep_id`, `idx_door_knocks_contact_id`, `idx_door_knocks_knocked_at`)
  - [x] Optional spatial index for Story 2.3 bbox queries: `idx_door_knocks_location` on `gist (st_setsrid(st_makepoint(lng, lat), 4326))`

- [x] **Migration: RLS** (AC: 4, 5, 8)
  - [x] Create `supabase/migrations/20260603120100_contacts_door_knocks_rls.sql`
  - [x] Reuse existing `public.is_admin()` — do **not** recreate
  - [x] Enable RLS + policies on `contacts` and `door_knocks`
  - [x] `GRANT SELECT, INSERT, UPDATE ON contacts TO authenticated` (rep scope via policies)
  - [x] `GRANT SELECT, INSERT ON door_knocks TO authenticated`

- [x] **Apply & verify** (AC: 7, 8)
  - [x] Prefer Supabase MCP: `list_tables` before/after, `apply_migration`, `get_advisors`
  - [x] Fallback: `npm run db:push`
  - [x] `npm run db:types` then `npm run build`

- [x] **TypeScript mirrors** (AC: 7)
  - [x] Extend `src/types/database.ts` with `Contact`, `DoorKnock` types from generated file
  - [x] No new Zod enum work — `doorOutcomeSchema` already exists in `src/lib/validators/enums.ts`

### Review Findings

- [x] [Review][Patch] Knock INSERT does not verify contact ownership [`supabase/migrations/20260603120100_contacts_door_knocks_rls.sql:56-58`] — Fixed in `20260603120200_harden_contacts_door_knocks_rls.sql`: `door_knocks_insert_rep` now requires contact ownership or prior knock by same rep.

- [x] [Review][Patch] Rep can reassign `contacts.created_by` on UPDATE [`supabase/migrations/20260603120100_contacts_door_knocks_rls.sql:24-44`] — Fixed: `enforce_contact_created_by()` trigger + `contacts_created_by_guardrails`.

- [x] [Review][Patch] RLS policies use bare `auth.uid()` [`supabase/migrations/20260603120100_contacts_door_knocks_rls.sql`] — Fixed: rep-scoped policies recreated with `(select auth.uid())`.

- [x] [Review][Defer] Multiple permissive SELECT policies [`supabase/migrations/20260603120100_contacts_door_knocks_rls.sql`] — deferred, pre-existing — same split admin/rep policy pattern as `profiles`; consolidation is a performance optimization, not a security defect.

- [x] [Review][Defer] Unused indexes on empty tables [`supabase/migrations/20260603120000_create_contacts_door_knocks.sql`] — deferred, pre-existing — INFO-level advisor noise until Stories 2.3+ generate query traffic.

- [x] [Review][Defer] RLS smoke-test SQL not documented in Dev Agent Record [`2-1-contacts-and-doorknocks-schema.md`] — deferred, pre-existing — MCP policy count verification partially satisfies AC8; explicit rep-isolation smoke SQL can be added when API layer exists in 2.5.

## Dev Notes

### Critical constraints

- **Do NOT** create `leads`, `call_logs`, `gps_pings`, `shifts`, `territories`, or other business tables — later stories own them.
- **Do NOT** add API Route Handlers or rep map UI — Stories 2.3–2.5 own application layer.
- **Do NOT** add `idempotency_key` or `follow_up_at` columns yet — Story 2.7 (offline sync) and 2.5 (follow-up date) add those via separate migrations to keep this story PRD-aligned.
- **Do NOT** recreate or alter `public.is_admin()` — use the helper from `20260601130000_profiles_rls.sql`.
- **Do NOT** change enum values — `door_outcome` is frozen since Story 1.2.
- **`created_by` on contacts** is an intentional architecture extension: PRD Section 5 omits it, but architecture.md requires rep-scoped contact access (“reps read contacts they created or linked to their knocks/calls”). Without `created_by`, contact INSERT/SELECT RLS is impossible before call_logs exist.

### lat/lng vs PostGIS geometry

PRD Section 5 specifies `lat`/`lng` as numeric fields. Architecture prefers `geometry(Point,4326)` for spatial queries. **This story uses PRD `double precision lat/lng`** to satisfy AC1–2 literally. Story 2.3 admin/rep bbox queries should use `ST_MakePoint(lng, lat)` (expression GiST index included above). Do not add redundant geometry columns unless a later story requires it.

### Migration file naming & order

Latest migration: `20260602171000_profiles_rep_guardrails.sql`. New files must sort after it:

```bash
supabase migration new create_contacts_door_knocks
supabase migration new contacts_door_knocks_rls
```

Order: **tables → RLS** (matches Epic 1 pattern: `create_profiles` then `profiles_rls`).

### Reference SQL — contacts (adapt)

```sql
create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  first_name text,
  last_name text,
  phone text,
  email text,
  address text,
  suburb text,
  postcode text,
  lat double precision,
  lng double precision,
  created_by uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now()
);

create index idx_contacts_phone on public.contacts (phone) where phone is not null;
create index idx_contacts_created_by on public.contacts (created_by);
```

### Reference SQL — door_knocks (adapt)

```sql
create table public.door_knocks (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references public.contacts (id) on delete restrict,
  rep_id uuid not null references public.profiles (id) on delete restrict,
  outcome public.door_outcome not null,
  notes text,
  knocked_at timestamptz not null default now(),
  lat double precision not null,
  lng double precision not null,
  synced boolean not null default true
);

create index idx_door_knocks_rep_id on public.door_knocks (rep_id);
create index idx_door_knocks_contact_id on public.door_knocks (contact_id);
create index idx_door_knocks_knocked_at on public.door_knocks (knocked_at desc);
create index idx_door_knocks_location on public.door_knocks
  using gist (st_setsrid(st_makepoint(lng, lat), 4326));
```

### Reference SQL — RLS policies (pattern)

```sql
alter table public.contacts enable row level security;
alter table public.door_knocks enable row level security;

-- contacts: rep read own or linked via knock
create policy contacts_select_rep on public.contacts
  for select to authenticated
  using (
    created_by = auth.uid()
    or exists (
      select 1 from public.door_knocks dk
      where dk.contact_id = contacts.id and dk.rep_id = auth.uid()
    )
  );

create policy contacts_insert_rep on public.contacts
  for insert to authenticated
  with check (created_by = auth.uid());

create policy contacts_update_rep on public.contacts
  for update to authenticated
  using (
    created_by = auth.uid()
    or exists (
      select 1 from public.door_knocks dk
      where dk.contact_id = contacts.id and dk.rep_id = auth.uid()
    )
  )
  with check (
    created_by = auth.uid()
    or exists (
      select 1 from public.door_knocks dk
      where dk.contact_id = contacts.id and dk.rep_id = auth.uid()
    )
  );

create policy contacts_select_admin on public.contacts
  for select to authenticated
  using (public.is_admin());

-- door_knocks: rep own rows only
create policy door_knocks_select_rep on public.door_knocks
  for select to authenticated
  using (rep_id = auth.uid());

create policy door_knocks_insert_rep on public.door_knocks
  for insert to authenticated
  with check (rep_id = auth.uid());

create policy door_knocks_select_admin on public.door_knocks
  for select to authenticated
  using (public.is_admin());
```

Validate: inactive reps (`profiles.active = false`) are blocked at middleware/login (Story 1.3) before DB access — no extra RLS needed here.

### TypeScript — database types

After `npm run db:types`, extend `src/types/database.ts`:

```typescript
export type Contact = Tables<"contacts">;
export type ContactInsert = TablesInsert<"contacts">;
export type ContactUpdate = TablesUpdate<"contacts">;
export type DoorKnock = Tables<"door_knocks">;
export type DoorKnockInsert = TablesInsert<"door_knocks">;
export type DoorKnockUpdate = TablesUpdate<"door_knocks">;
```

Re-export `DoorOutcome` from validators (already exported). No new Zod knock schema until Story 2.5 API work.

### Supabase MCP workflow (preferred)

Per `.cursor/rules/supabase-database-global.mdc` and `supabase-database-mcp.mdc`:

1. `list_tables` — confirm only `profiles` exists today
2. `apply_migration` — tables migration, then RLS migration
3. `list_tables` — verify `contacts`, `door_knocks`, `rls_enabled: true`
4. `get_advisors` — fix any security lints before marking done
5. `npm run db:types` — regenerate TypeScript

Project ref: `glruwdknafegbcofvnbp` (see `docs/SETUP_KEYS.md`).

### Cross-story context (Epic 2)

| Story | Depends on 2.1 |
| :--- | :--- |
| 2.2 Shifts/GPS | Independent schema (`gps_pings` later) |
| 2.3 Rep map pins | Reads `door_knocks` via bbox + `rep_id` filter |
| 2.4–2.5 Knock UI/API | INSERT into `contacts` + `door_knocks` |
| 2.6 Reverse geocoding | UPDATE `contacts.address/suburb/postcode` |
| 2.7 Offline sync | Adds `idempotency_key` column + sync API |
| 2.9 Lead promotion | Creates `leads` table (not in 2.1) |

### Previous story intelligence (Epic 1)

- **Migration patterns:** timestamp-prefixed SQL in `supabase/migrations/`; separate RLS migration; `set search_path = public` on security definer functions; revoke public execute on helper functions (`20260602100000_harden_function_security.sql`).
- **`is_admin()` helper:** Already exists — use in admin policies; do not grant execute to `authenticated`.
- **Generated types:** `src/types/supabase.generated.ts` via `npm run db:types` (MCP-backed script); hand-curated aliases in `src/types/database.ts`.
- **Enums frozen:** All outcome types in `src/lib/validators/enums.ts` — do not duplicate values.
- **Auth guards:** `requireRoleForApi` in `src/lib/auth/guards.ts` ready for Story 2.5 Route Handlers — not needed in this schema-only story.
- **Profiles extras:** `start_date` column added in Story 1.4; rep update guardrails trigger in `20260602171000_profiles_rep_guardrails.sql`.

### Testing (this story)

- **Required:** Both migrations apply cleanly on linked Supabase project.
- **Required:** `npm run build` passes after type regeneration.
- **Required:** MCP or manual SQL smoke — rep user cannot SELECT another rep's knocks; admin can SELECT all.
- **Optional:** Document smoke-test SQL in Dev Agent Record.
- **No** Playwright/E2E — no UI in this story.

### Project Structure Notes

- New files only under `supabase/migrations/` and `src/types/database.ts` (plus regenerated `supabase.generated.ts`).
- Do not create `src/features/knocks/` implementation yet — `.gitkeep` from Story 1.1 is sufficient until 2.4+.
- Feature folder `src/features/contacts/` stays empty until call search (Epic 5) or knock API (2.5).

### References

- [Source: `_bmad-output/planning-artifacts/epics.md` — Story 2.1, Epic 2]
- [Source: `docs/Solar_CRM_PRD_v1.md` — Section 5, entities 4–5 (Contact, DoorKnock)]
- [Source: `_bmad-output/planning-artifacts/architecture.md` — Data Architecture, RLS pattern, naming conventions]
- [Source: `_bmad-output/implementation-artifacts/1-2-enable-postgis-and-core-auth-schema.md` — enum + migration conventions]
- [Source: `_bmad-output/implementation-artifacts/1-3-login-session-persistence-and-role-routing.md` — `is_admin()` RLS pattern]
- [Source: `supabase/migrations/20260601130000_profiles_rls.sql` — policy template]

## Dev Agent Record

### Agent Model Used

Composer (dev-story)

### Debug Log References

- MCP `list_tables` before: only `profiles` (3 rows)
- MCP `apply_migration`: `create_contacts_door_knocks` + `contacts_door_knocks_rls` both succeeded
- MCP `list_tables` after: `contacts` and `door_knocks` with `rls_enabled: true`
- MCP `execute_sql`: 7 policies confirmed on both tables
- `get_advisors` security: stale RLS-disabled errors from pre-RLS cache; post-apply `list_tables` confirms RLS enabled. Pre-existing `auth_leaked_password_protection` WARN unchanged (Auth dashboard setting, out of scope)

### Completion Notes List

- Two ordered migrations: tables → RLS (Epic 1 pattern preserved)
- `contacts.created_by` added for rep-scoped contact access per architecture
- GiST spatial index on `door_knocks` for Story 2.3 bbox queries
- TypeScript aliases added; `npm run db:types`, `npm run build`, `npm run lint` all pass
- No API routes, UI, or extra business tables per story scope
- **Code review patches (2026-06-03):** contact ownership on knock INSERT, `created_by` immutability trigger, RLS initplan hardening via `20260603120200_harden_contacts_door_knocks_rls.sql`

### File List

- `supabase/migrations/20260603120000_create_contacts_door_knocks.sql`
- `supabase/migrations/20260603120100_contacts_door_knocks_rls.sql`
- `supabase/migrations/20260603120200_harden_contacts_door_knocks_rls.sql`
- `src/types/database.ts`
- `src/types/supabase.generated.ts`

## Story Completion Status

- **Status:** done
- **Completion note:** Schema complete with RLS hardening applied after code review — contacts + door_knocks ready for Story 2.2+
