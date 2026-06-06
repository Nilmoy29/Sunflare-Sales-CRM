---
baseline_commit: NO_VCS
---

# Story 1.2: Enable PostGIS and Core Auth Schema

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **developer**,
I want PostGIS and minimal auth-related tables migrated,
so that users and spatial data can be stored correctly.

## Acceptance Criteria

1. **Given** a linked Supabase project  
   **When** migrations run (`supabase db push` or CI apply)  
   **Then** the `postgis` extension is enabled in the `extensions` schema (or `public` per Supabase default)

2. **Given** migrations applied  
   **When** inspecting PostgreSQL types  
   **Then** these enums exist with **exact** PRD values (snake_case labels):
   - `user_role`: `admin`, `rep`
   - `door_outcome`: `interested`, `not_home`, `not_interested`, `do_not_knock`, `callback_requested`, `already_has_solar`
   - `call_outcome`: `answered_interested`, `answered_not_interested`, `voicemail`, `no_answer`, `wrong_number`, `callback_scheduled`
   - `lead_source`: `d2d`, `call`
   - `lead_stage`: `knocked_called`, `interested`, `appointment_set`, `pitched`, `proposal_sent`, `signed`, `lost`
   - `lead_activity_type`: `note`, `stage_change`, `call`, `knock`
   - `lost_reason`: `price`, `not_interested`, `competitor`, `no_response`

3. **Given** migrations applied  
   **When** inspecting `public.profiles`  
   **Then** the table has:
   - `id` UUID PRIMARY KEY REFERENCES `auth.users(id)` ON DELETE CASCADE
   - `name` TEXT NOT NULL
   - `phone` TEXT
   - `role` `user_role` NOT NULL DEFAULT `'rep'`
   - `territory_id` UUID NULL (no FK yet — `territories` table is Epic 6)
   - `active` BOOLEAN NOT NULL DEFAULT true
   - `created_at` TIMESTAMPTZ NOT NULL DEFAULT now()
   - `updated_at` TIMESTAMPTZ NOT NULL DEFAULT now()

4. **Given** a new row in `auth.users` (via Supabase Auth signup or dashboard)  
   **When** the user is created  
   **Then** a matching `profiles` row is auto-created via database trigger (default role `rep`, `name` from metadata or email prefix)

5. **Given** this story’s scope  
   **When** migrations are reviewed  
   **Then** **no** business tables exist (`contacts`, `door_knocks`, `leads`, `territories`, etc.) and **no** RLS policies are added (RLS is Story 1.3+)

6. **Given** the TypeScript codebase  
   **When** the app builds  
   **Then** Zod schemas and TypeScript union types mirror all enums in `src/lib/validators/enums.ts` and `src/types/database.ts`

7. **Given** `README.md`  
   **When** a developer sets up the database  
   **Then** instructions document: Supabase project link, `DATABASE_URL`, `supabase link`, and `supabase db push`

**Implements:** FR59 (partial), FR2 (schema foundation)  
**NFRs:** NFR15 (managed backups via Supabase — no app code required)

## Tasks / Subtasks

- [x] **Supabase CLI setup** (AC: 1, 7)
  - [x] Document local workflow in `README.md` (link project, push migrations)
  - [x] Ensure `supabase/config.toml` is valid for local CLI (already stubbed in 1.1)

- [x] **Migration: extensions** (AC: 1)
  - [x] Create `supabase/migrations/20260601120000_enable_postgis.sql`

- [x] **Migration: enums** (AC: 2)
  - [x] Create `supabase/migrations/20260601120100_create_enums.sql`
  - [x] FROZEN header comment

- [x] **Migration: profiles + auth trigger** (AC: 3, 4)
  - [x] Create `supabase/migrations/20260601120200_create_profiles.sql`
  - [x] `profiles` table, `set_updated_at` trigger, `handle_new_user` on `auth.users`
  - [x] No RLS (Story 1.3)

- [x] **TypeScript mirrors** (AC: 6)
  - [x] `src/lib/validators/enums.ts`
  - [x] `src/types/database.ts`

- [x] **Optional seed for local dev** (AC: 3)
  - [x] `supabase/seed.sql` — admin setup comments only

- [x] **Verify** (AC: 1–6)
  - [x] `supabase db push` — applied to `glruwdknafegbcofvnbp` (2026-06-01)
  - [x] `npm run build` passes
  - [x] REST smoke: `profiles` returns 200 with anon key

## Dev Notes

### Critical constraints

- **Do NOT** create `contacts`, `door_knocks`, `leads`, `territories`, or other PRD tables — later stories own them.
- **Do NOT** add RLS policies in this story — Story 1.3 wires auth middleware and will add `00003_rls_policies` (or equivalent).
- **Do NOT** change enum values from PRD — migrations are painful to alter once field data exists (PRD open question #4).
- **Do NOT** add `password_hash` to `profiles` — Supabase Auth owns credentials in `auth.users`.
- **`territory_id`**: nullable UUID only; defer FK to `territories` until Epic 6.

### Migration file naming

Use Supabase CLI timestamp prefix when creating files:

```bash
supabase migration new enable_postgis
supabase migration new create_enums
supabase migration new create_profiles
```

Resulting files land in `supabase/migrations/`. Order: extensions → enums → profiles.

### Reference SQL — extensions (adapt to Supabase)

```sql
-- Enable PostGIS for territory polygons and knock points (Epic 6 / 2.x)
create extension if not exists postgis with schema extensions;
```

### Reference SQL — enums (excerpt)

```sql
create type public.user_role as enum ('admin', 'rep');

create type public.door_outcome as enum (
  'interested', 'not_home', 'not_interested',
  'do_not_knock', 'callback_requested', 'already_has_solar'
);

-- ... remaining enums per AC2
```

### Reference SQL — profiles + trigger (pattern)

```sql
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null,
  phone text,
  role public.user_role not null default 'rep',
  territory_id uuid,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    coalesce((new.raw_user_meta_data->>'role')::public.user_role, 'rep')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
```

Validate `role` cast safety — if metadata role is invalid, default to `rep`.

### TypeScript — validators (architecture compliance)

Mirror DB enums in Zod for Story 1.3+ API routes:

```typescript
// src/lib/validators/enums.ts
import { z } from "zod";

export const userRoleSchema = z.enum(["admin", "rep"]);
export type UserRole = z.infer<typeof userRoleSchema>;

export const doorOutcomeSchema = z.enum([
  "interested", "not_home", "not_interested",
  "do_not_knock", "callback_requested", "already_has_solar",
]);
// ... etc.
```

Use `satisfies` or const arrays exported as `DOOR_OUTCOMES` for UI maps in later stories.

### Supabase project linking

Developer must have:

- Supabase project created (dashboard)
- `.env.local` filled: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`

Commands:

```bash
npx supabase login
npx supabase link --project-ref <your-ref>
npx supabase db push
```

For local-only testing: `npx supabase start` then `npx supabase db reset` (applies migrations + seed).

### Previous story intelligence (1.1)

- App lives at **repo root**; `supabase/` already has `config.toml` and `migrations/.gitkeep`.
- Supabase client stubs exist in `src/lib/supabase/*` — they throw without env vars; this story does not require wiring UI.
- API envelope: `{ data }` / `{ error: { code, message } }` in `src/lib/api/response.ts`.
- Build verified with Next.js 16.2.6, npm 11.5.1, Node ≥20.9.
- Cookie handler types use explicit `CookieOptions` from `@supabase/ssr` — follow same import style.

### Testing (this story)

- **Required:** migrations apply cleanly on fresh database.
- **Required:** `npm run build` passes.
- **Optional:** SQL assertion script or manual checklist in Dev Agent Record.
- **No** Playwright/E2E until auth UI (Story 1.3).

### Project Structure Notes

- Migrations: `supabase/migrations/*.sql` only (no Prisma).
- Validators: `src/lib/validators/enums.ts` (remove `.gitkeep` when file created).
- Types: `src/types/database.ts` for shared DB shapes.

### References

- [Source: `_bmad-output/planning-artifacts/epics.md` — Story 1.2]
- [Source: `docs/Solar_CRM_PRD_v1.md` — Section 5 Data Model, Section 10 open question #4]
- [Source: `_bmad-output/planning-artifacts/architecture.md` — Data Architecture, Naming Patterns]
- [Source: `_bmad-output/implementation-artifacts/1-1-initialize-application-from-starter-template.md` — completed scaffold]

## Dev Agent Record

### Agent Model Used

Composer (dev-story)

### Debug Log References

- `npx supabase start` failed (npx ENOTEMPTY on this machine) — migrations not applied remotely; run `db push` after linking your project.

### Completion Notes List

- Three ordered migrations: PostGIS → enums → profiles + auth trigger.
- `handle_new_user` defaults invalid metadata role to `rep`.
- No RLS per AC5; Story 1.3 owns policies.
- Added `docs/SETUP_KEYS.md` for when/how to collect API keys.
- `npm run build` succeeded.

### File List

- `supabase/migrations/20260601120000_enable_postgis.sql`
- `supabase/migrations/20260601120100_create_enums.sql`
- `supabase/migrations/20260601120200_create_profiles.sql`
- `supabase/seed.sql`
- `src/lib/validators/enums.ts`
- `src/types/database.ts`
- `docs/SETUP_KEYS.md`
- `README.md` (database section)

## Story Completion Status

- **Status:** done
- **Completion note:** MCP verified PostGIS + enums + profiles; security hardening migration applied; `npm run db:types` generates `supabase.generated.ts`.
