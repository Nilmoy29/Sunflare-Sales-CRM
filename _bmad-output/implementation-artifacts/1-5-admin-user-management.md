---
baseline_commit: NO_VCS
---

# Story 1.5: Admin User Management

Status: review

## Story

As an **admin**,
I want to create, deactivate, and reset passwords for reps,
So that I control who can access field data.

## Acceptance Criteria

1. **Given** I am an admin  
   **When** I open team management  
   **Then** I can create a rep account with email, name, phone, role=`rep` (FR4)
2. **And** I can set a rep to inactive and they cannot log in (FR4)
3. **And** I can trigger a forced password reset email (FR4)
4. **And** all mutations enforce admin role server-side (NFR10)

**Implements:** FR4, FR60 (admin path)  
**Depends on:** Story 1.2 (profiles/auth trigger), Story 1.3 (auth+middleware), Story 1.4 (profile fields)

## Tasks / Subtasks

- [x] **Admin team route shell** (AC: 1-4)
  - [x] Add `src/app/(admin)/admin/team/page.tsx`
  - [x] Add team management UI section under admin routes
  - [x] Keep admin layout and sign-out behavior unchanged

- [x] **Server-side admin operations** (AC: 1-4)
  - [x] Implement admin-only server actions (or route handlers) for:
    - [x] create rep user
    - [x] deactivate / reactivate rep
    - [x] trigger password reset
  - [x] Use admin role enforcement (`requireRole(["admin"])` / `requireRoleForApi(["admin"])`) before any mutation
  - [x] Return consistent error envelope/messages

- [x] **User creation flow** (AC: 1)
  - [x] Create Auth user via Supabase admin API (service role on server only)
  - [x] Ensure profile is created and set to `role='rep'`, with provided `name`, `phone`, optional `start_date`
  - [x] Handle email already exists and invalid inputs gracefully

- [x] **Deactivate flow** (AC: 2)
  - [x] Toggle `profiles.active` for target rep from admin path only
  - [x] Confirm inactive users cannot log in (existing middleware/login checks should block)
  - [x] Prevent admin from deactivating self unless explicitly allowed by product policy

- [x] **Password reset trigger** (AC: 3)
  - [x] Use Supabase Auth admin reset/invite endpoint for target email
  - [x] Surface success/error state in admin UI
  - [x] No passwords handled or stored in app DB

- [x] **Validation and constraints** (AC: 1-4)
  - [x] Add Zod schemas for create/update admin payloads (email, name, phone)
  - [x] Ensure role on creation is forced to `rep` (not user-supplied)
  - [x] Ensure all mutations are server-side only (no client secret exposure)

- [x] **Audit-friendly implementation details** (AC: 1-4)
  - [x] Log mutation outcomes server-side with safe metadata (no secrets)
  - [x] Keep API contracts predictable for future admin dashboard stories

- [x] **Verification** (AC: 1-4)
  - [x] Admin can create rep and see row in team list
  - [x] Deactivated rep is blocked from login
  - [x] Admin can trigger password reset flow without direct password handling
  - [x] Non-admin cannot call mutation endpoints/actions
  - [x] `npm run build` passes

## Dev Notes

### Previous Story Intelligence

- Story 1.3 established role-based route protection with middleware and `requireRole` utilities.
- Story 1.4 added rep profile fields and DB guardrails so reps cannot change admin-controlled fields.
- Supabase MCP is available and should be preferred for DB verification and migrations.

### Existing Code Anchors (read before implementation)

- `src/app/(admin)/layout.tsx` currently provides admin header shell; extend navigation rather than replacing layout behavior.
- `src/lib/auth/session.ts` already includes profile fields needed for admin views (`name`, `phone`, `territory_id`, `start_date`, `active`, `role`).
- `src/lib/auth/guards.ts` centralizes API role handling and error mapping.
- `src/features/auth/actions.ts` already has login/logout and rep profile update actions; keep concerns separated if adding admin actions.

### Security and Architecture Guardrails

- Service role key usage is allowed only in server-side admin mutation paths.
- Never expose service role key to client or in public routes.
- Enforce admin checks server-side before mutation calls (NFR10).
- Continue relying on Supabase Auth as source of truth for credentials; `profiles` holds business metadata only.
- Keep RLS and trigger guardrails from 1.3/1.4 intact; do not loosen existing policies.

### Data Model Requirements

- `profiles` already includes: `id`, `name`, `phone`, `role`, `territory_id`, `active`, `created_at`, `updated_at`, `start_date`.
- Creation flow must result in role=`rep` for newly created reps.
- Deactivation flow updates `profiles.active` and should be reflected by login blockers.

### File Structure Guidance

- **Create**
  - `src/app/(admin)/admin/team/page.tsx`
  - `src/features/admin/team-actions.ts` (recommended)
  - `src/features/admin/components/team-management.tsx` (recommended)
  - `src/lib/validators/admin.ts` (recommended)
- **Update**
  - `src/app/(admin)/layout.tsx` (optional nav link)
  - `src/lib/auth/guards.ts` (reuse, extend only if needed)
  - `src/types/supabase.generated.ts` only if schema changes are added

### Testing Requirements

- Manual admin tests: create rep, deactivate, trigger reset, reactivate.
- Unauthorized tests: verify rep/admin boundary on mutation endpoints/actions.
- Build + typecheck required before status moves to review.

### References

- [Source: `_bmad-output/planning-artifacts/epics.md` — Story 1.5]
- [Source: `_bmad-output/planning-artifacts/architecture.md` — Authentication & Security]
- [Source: `docs/Solar_CRM_PRD_v1.md` — FR4, FR60]
- [Source: `_bmad-output/implementation-artifacts/1-3-login-session-persistence-and-role-routing.md`]
- [Source: `_bmad-output/implementation-artifacts/1-4-rep-profile-fields-and-self-view.md`]

## Dev Agent Record

### Agent Model Used

Codex 5.3

### Debug Log References

- Admin create/deactivate/reset actions implemented with server-side admin role checks.
- Admin page reads rep profiles and maps Auth emails via service-role admin list API.
- `npm run build` passes with `/admin/team` route.

### Completion Notes List

- Added admin-only team management flow for creating reps, toggling active status, and sending reset emails.
- Service-role client isolated to server helper (`src/lib/supabase/admin.ts`) and never exposed to client.
- All mutations enforce admin role server-side before executing (NFR10).

### File List

- `src/app/(admin)/admin/team/page.tsx`
- `src/features/admin/components/team-management.tsx`
- `src/features/admin/team-actions.ts`
- `src/lib/supabase/admin.ts`
- `src/lib/validators/admin.ts`
- `src/app/(admin)/layout.tsx`
- `_bmad-output/implementation-artifacts/1-5-admin-user-management.md`

## Story Completion Status

- **Status:** review
- **Completion note:** Admin user management workflow implemented with server-enforced role checks and passing build.
