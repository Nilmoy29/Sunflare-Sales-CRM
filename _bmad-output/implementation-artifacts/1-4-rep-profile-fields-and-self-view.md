---
baseline_commit: NO_VCS
---

# Story 1.4: Rep Profile Fields and Self View

Status: review

## Story

As a **rep**,
I want my profile to show my assigned details,
So that I know my account is configured correctly.

## Acceptance Criteria

1. **Given** I am logged in as a rep  
   **When** I view my profile  
   **Then** I see `name`, `phone`, optional `territory_id`, `start_date`, and `active` status (FR3)
2. **And** I can update allowed fields per policy (name/phone only if admin-locked fields excluded)

**Implements:** FR3  
**Depends on:** Story 1.2 (`profiles` schema), Story 1.3 (auth + route protection)

## Tasks / Subtasks

- [x] **Schema extension for FR3 fields** (AC: 1)
  - [x] Add migration `supabase/migrations/<timestamp>_profiles_rep_fields.sql`
  - [x] Add `start_date date` to `public.profiles` (nullable for backward compatibility)
  - [x] Keep existing constraints and RLS behavior intact
  - [x] Apply migration via Supabase MCP `apply_migration` (preferred), then verify with `list_tables`

- [x] **Type updates** (AC: 1, 2)
  - [x] Regenerate Supabase types via `npm run db:types`
  - [x] Ensure `src/types/database.ts` exposes `Profile`/update types with `start_date`
  - [x] Keep `UserRole` enums and existing generated type flow unchanged

- [x] **Auth/session data shape update** (AC: 1)
  - [x] Update `AuthProfile` in `src/lib/auth/session.ts` to include rep profile fields used in UI
  - [x] Update `getAuthProfile()` select list to fetch `phone`, `territory_id`, `start_date`, `active`, `name`
  - [x] Preserve existing unauthenticated/inactive/forbidden behavior

- [x] **Rep profile UI route** (AC: 1, 2)
  - [x] Add rep profile page at `src/app/(rep)/rep/profile/page.tsx`
  - [x] Show fields from AC in read/edit form
  - [x] Add inline edit mode for `name` and `phone` only
  - [x] Show `territory_id`, `start_date`, `active`, and `role` as read-only values

- [x] **Server-side update path** (AC: 2)
  - [x] Add server action in `src/features/auth/actions.ts` (or split to `src/features/auth/profile-actions.ts`) for profile updates
  - [x] Validate payload with Zod (`name`, `phone` only)
  - [x] Use user-scoped Supabase server client; update only current `auth.uid()` row
  - [x] Return API-consistent errors/messages; no service-role usage

- [x] **Navigation and UX polish** (AC: 1)
  - [x] Add link from rep shell/header to `/rep/profile`
  - [x] Keep mobile-first spacing/targets (44x44 minimum touch targets)
  - [x] Preserve current sign-out behavior and route protection

- [x] **Verification** (AC: 1, 2)
  - [x] Verify rep can load `/rep/profile` and see required fields
  - [x] Verify rep can update name/phone and reload reflects changes
  - [x] Verify rep cannot modify role/active/territory/start_date from UI
  - [x] Run `npm run build` (required)
  - [x] Re-run Supabase MCP `get_advisors` (security) after migration

## Dev Notes

### Previous Story Intelligence (from Story 1.3)

- Session/route protection is already enforced in `src/middleware.ts` and `src/lib/supabase/middleware.ts`.
- Rep/admin role routing and forbidden handling are implemented; do not duplicate route guards in client UI.
- Supabase MCP flow is active and already used for migration/advisor checks.
- Generated DB types are authoritative (`src/types/supabase.generated.ts`), and wrappers in `src/types/database.ts` should stay thin.

### Current Code Anchors (must preserve)

- Rep shell currently uses `getAuthProfile()` in `src/app/(rep)/layout.tsx`.
- `getAuthProfile()` currently selects only `id, role, active, name`; extend without breaking existing callers.
- `requireRoleForApi()` exists for route handler protection; can be reused if profile update route handlers are introduced.
- `public.profiles` currently has RLS and ownership/admin policies; maintain this model.

### Data Model and Security Constraints

- Do **not** introduce business tables in this story.
- Do **not** loosen RLS or grant broader function/table permissions.
- Keep updates user-scoped (`id = auth.uid()`) for reps.
- Avoid service role key usage in app runtime for profile self-edit.
- `start_date` is part of FR3 and should be stored in DB (nullable until admin workflows populate it).

### File Structure Guidance

- **Update files**
  - `src/lib/auth/session.ts`
  - `src/app/(rep)/layout.tsx` (profile nav hook)
  - `src/features/auth/actions.ts` (or split as noted)
  - `src/types/database.ts`
  - `src/types/supabase.generated.ts` (generated)
- **Create files**
  - `supabase/migrations/<timestamp>_profiles_rep_fields.sql`
  - `src/app/(rep)/rep/profile/page.tsx`
  - Optional: `src/features/auth/components/profile-form.tsx`
  - Optional: `src/lib/validators/profile.ts`

### Testing Requirements

- Build + typecheck must pass.
- Manual checks:
  - Rep sees all required fields.
  - Only name/phone editable.
  - Role mismatch and unauthenticated behavior unchanged.
- Security check via Supabase MCP advisors after migration.

### References

- [Source: `_bmad-output/planning-artifacts/epics.md` — Story 1.4]
- [Source: `docs/Solar_CRM_PRD_v1.md` — FR3]
- [Source: `_bmad-output/planning-artifacts/architecture.md` — Auth & Security, route structure]
- [Source: `_bmad-output/implementation-artifacts/1-3-login-session-persistence-and-role-routing.md`]

## Dev Agent Record

### Agent Model Used

Codex 5.3

### Debug Log References

- Applied migration via Supabase MCP `apply_migration` and verified `start_date` in `public.profiles` via MCP SQL/list tables.
- Regenerated `src/types/supabase.generated.ts` using `npm run db:types`.
- `npm run build` passes with `/rep/profile` route included.
- MCP `get_advisors` (security) returns no lints.

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created.

### File List

- `supabase/migrations/20260602170500_profiles_rep_fields.sql`
- `src/app/(rep)/rep/profile/page.tsx`
- `src/features/auth/components/profile-form.tsx`
- `src/features/auth/actions.ts`
- `src/lib/auth/session.ts`
- `src/lib/validators/auth.ts`
- `src/app/(rep)/layout.tsx`
- `src/types/supabase.generated.ts`
- `_bmad-output/implementation-artifacts/1-4-rep-profile-fields-and-self-view.md`

## Story Completion Status

- **Status:** review
- **Completion note:** Rep profile self-view/edit implemented with MCP-backed schema update and passing build.
