---
baseline_commit: NO_VCS
---

# Story 1.7: Invite Link Onboarding

Status: done

## Story

As an **admin**,
I want to invite reps via a secure link,
So that onboarding is self-service.

## Acceptance Criteria

1. **Given** I am an admin  
   **When** I generate an invite for an email  
   **Then** the rep can open the link, set a password, and complete profile setup (FR7)
2. **And** the invite expires after a configured period
3. **And** used invites cannot be reused

**Implements:** FR7  
**Depends on:** Story 1.3 (auth callback/session), Story 1.5 (admin team management), Story 1.6 (password set flow)

## Tasks / Subtasks

- [x] **Admin invite action and UX integration** (AC: 1-3)
  - [x] Add admin invite action in `src/features/admin/team-actions.ts` (or split invite actions file)
  - [x] Add “Send invite” control in team management UI (`src/features/admin/components/team-management.tsx`)
  - [x] Keep server-side admin role enforcement with `requireRole(["admin"])`

- [x] **Invite generation with Supabase Auth** (AC: 1-3)
  - [x] Use Supabase admin invite API (`auth.admin.inviteUserByEmail`) with server-only service role client
  - [x] Include redirect target to invite onboarding page (`/invite/accept` or equivalent in `(auth)`)
  - [x] Enforce rep role/default metadata on invite creation (`role='rep'`)
  - [x] Return clear success/error states for duplicate/invalid invite attempts

- [x] **Invite acceptance page and password setup** (AC: 1)
  - [x] Create invite acceptance route under `(auth)` (e.g. `src/app/(auth)/invite/accept/page.tsx`)
  - [x] Reuse callback session exchange behavior from `/auth/callback` for invite links
  - [x] Provide password setup form and optional profile completion fields (name/phone/start_date as applicable)
  - [x] Persist profile updates for invited rep after password set

- [x] **Expiry and one-time-use guarantees** (AC: 2, 3)
  - [x] Rely on Supabase invite token lifecycle for expiry and single-use semantics
  - [x] Handle expired/used invite links with explicit error and retry path
  - [x] Add UI copy that guides user to request a new invite from admin

- [x] **Validation and security** (AC: 1-3)
  - [x] Add Zod schemas for invite request + invite acceptance payloads
  - [x] Keep all invite issuance on server; never expose service role key
  - [x] Ensure authenticated/non-authenticated edge states are handled without privilege escalation

- [x] **Navigation and consistency** (AC: 1)
  - [x] Link invite action from `/admin/team` without breaking existing create/deactivate/reset features
  - [x] Keep auth route styling consistent with `(auth)` layout and forms
  - [x] Preserve existing reset-password and login flows

- [x] **Verification** (AC: 1-3)
  - [x] Admin sends invite successfully
  - [x] Invited user opens link, sets password, and reaches valid login/session state
  - [x] Re-used/expired invite shows clear recovery message
  - [x] `npm run build` passes

## Dev Notes

### Previous Story Intelligence

- Story 1.5 already introduced admin server actions and service-role helper (`src/lib/supabase/admin.ts`).
- Story 1.6 already hardened callback logic to handle both `code` and `token_hash/type` flows.
- Team management UI is active in `/admin/team`; add invite feature incrementally to avoid regression.

### Existing Code Anchors (must preserve)

- `src/features/admin/team-actions.ts` contains create/deactivate/reset operations and admin logging pattern.
- `src/features/admin/components/team-management.tsx` renders the current admin table/actions; extend this component, don’t duplicate.
- `src/app/auth/callback/route.ts` is the canonical auth handoff path; keep invite and recovery logic centralized there.
- `src/features/auth/actions.ts` contains password update patterns and can be reused for invite password setup semantics.

### Security & Architecture Guardrails

- Service role usage remains server-only (`src/lib/supabase/admin.ts`); never expose in client routes/components.
- Admin mutations must enforce role checks server-side (NFR10).
- Do not bypass middleware/session checks or weaken existing role restrictions.
- Use Supabase Auth token/expiry behavior as source of truth for invite validity and one-time use.

### Suggested File Structure

- **Create**
  - `src/app/(auth)/invite/accept/page.tsx`
  - `src/features/auth/components/invite-accept-form.tsx`
  - `src/lib/validators/invite.ts` (or extend `validators/admin.ts` / `validators/auth.ts`)
- **Update**
  - `src/features/admin/team-actions.ts`
  - `src/features/admin/components/team-management.tsx`
  - `src/app/auth/callback/route.ts` (invite-specific recovery/error mapping if needed)
  - `src/app/(admin)/admin/team/page.tsx` (invite state wiring)

### Testing Requirements

- Happy path: invite -> accept -> set password -> login.
- Failure paths: expired invite, used invite, invalid token.
- Regression checks: admin team actions (create/deactivate/reset) still work.
- Build + typecheck required before moving to review.

### References

- [Source: `_bmad-output/planning-artifacts/epics.md` — Story 1.7]
- [Source: `docs/Solar_CRM_PRD_v1.md` — FR7]
- [Source: `_bmad-output/planning-artifacts/architecture.md` — Auth/security + route patterns]
- [Source: `_bmad-output/implementation-artifacts/1-5-admin-user-management.md`]
- [Source: `_bmad-output/implementation-artifacts/1-6-password-reset-flow.md`]

## Dev Agent Record

### Agent Model Used

Codex 5.3

### Debug Log References

- Story context generated from sprint status + epics + architecture + prior admin/reset implementations.
- Implemented invite issuance via `inviteUserByEmail` with `next=/invite/accept` callback.
- Added invite accept onboarding page and password/profile completion server action.
- Verified callback invalid invite branch and login success notice behavior.
- Verified with `npm run build` (pass).

### Completion Notes List

- Added admin "Invite rep" flow in team management with server-side role checks.
- Added invite onboarding route and form for password setup and profile completion.
- Extended auth callback routing for invite token error mapping and preserved reset flow behavior.
- Added invite validation schemas and login notice for completed onboarding.
- Build/typecheck completed successfully.

### File List

- `_bmad-output/implementation-artifacts/1-7-invite-link-onboarding.md`
- `src/features/admin/team-actions.ts`
- `src/features/admin/components/team-management.tsx`
- `src/lib/validators/admin.ts`
- `src/lib/validators/auth.ts`
- `src/features/auth/actions.ts`
- `src/features/auth/components/invite-accept-form.tsx`
- `src/app/(auth)/invite/accept/page.tsx`
- `src/app/auth/callback/route.ts`
- `src/app/(auth)/login/page.tsx`

## Story Completion Status

- **Status:** done
- **Completion note:** Invite onboarding flow implemented and verified with production build.
