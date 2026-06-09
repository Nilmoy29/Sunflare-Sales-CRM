---
baseline_commit: NO_VCS
---

# Story 1.6: Password Reset Flow

Status: done

## Story

As a **user**,
I want to reset my password via email,
So that I can recover access without admin help.

## Acceptance Criteria

1. **Given** I forgot my password  
   **When** I request reset and click the email link  
   **Then** I can set a new password and log in (FR6)
2. **And** expired or invalid tokens show a clear error

**Implements:** FR6  
**Depends on:** Story 1.3 (auth shell + callback + session middleware), Story 1.5 (admin reset trigger exists)

## Tasks / Subtasks

- [x] **Auth reset routes and pages** (AC: 1, 2)
  - [x] Add `src/app/(auth)/reset-password/page.tsx` (request reset form)
  - [x] Add `src/app/(auth)/reset-password/update/page.tsx` (set new password form)
  - [x] Keep within `(auth)` route group conventions and existing layout styles

- [x] **Server-side actions for reset flow** (AC: 1, 2)
  - [x] Add action to request reset email (email input only)
  - [x] Add action to update password after link flow
  - [x] Use Supabase auth APIs only; never store passwords in DB
  - [x] Return clear user-facing success/error states

- [x] **Token/session handling** (AC: 1, 2)
  - [x] Reuse existing `/auth/callback` where possible for code exchange
  - [x] Ensure reset link lands user in valid password update state
  - [x] Handle invalid/expired links gracefully with explicit message and retry path

- [x] **Validation and UX** (AC: 1, 2)
  - [x] Add Zod schema for reset request email
  - [x] Add Zod schema for new password + confirmation
  - [x] Enforce minimum password length and clear mismatch errors
  - [x] Keep mobile-friendly form behavior and accessibility labels

- [x] **Navigation and login integration** (AC: 1)
  - [x] Add “Forgot password?” entry point on `/login`
  - [x] Redirect to `/login` after successful password update
  - [x] Preserve existing role-based login redirect behavior

- [x] **Verification** (AC: 1, 2)
  - [x] Request reset email from reset page
  - [x] Complete new password flow from email link
  - [x] Confirm login works with new password
  - [x] Confirm invalid/expired token path shows clear recovery message
  - [x] Run `npm run build`

## Dev Notes

### Previous Story Intelligence

- Story 1.3 already implemented login page, session middleware, and `/auth/callback`.
- Story 1.5 added admin-triggered reset action; this story adds self-service end-user flow.
- Current auth actions live in `src/features/auth/actions.ts`; keep concerns organized (split files if needed).

### Existing Code Anchors (must preserve)

- `src/app/(auth)/login/page.tsx` currently handles login messaging and should gain forgot-password link only.
- `src/app/auth/callback/route.ts` exists for code/session exchange and should remain canonical.
- `src/lib/supabase/server.ts` + `src/lib/supabase/middleware.ts` must continue managing SSR cookie sessions.
- `src/lib/validators/auth.ts` currently holds auth-related schemas and can be extended with reset schemas.

### Security & Architecture Guardrails

- Do not use service-role key for self-service reset flow.
- Do not log passwords or token secrets.
- Keep server-side enforcement and error handling consistent with `apiError` patterns where API routes are used.
- Follow architecture route conventions and avoid bypassing middleware checks.

### File Structure Guidance

- **Create**
  - `src/app/(auth)/reset-password/page.tsx`
  - `src/app/(auth)/reset-password/update/page.tsx`
  - `src/features/auth/components/reset-password-request-form.tsx` (recommended)
  - `src/features/auth/components/reset-password-update-form.tsx` (recommended)
- **Update**
  - `src/features/auth/actions.ts` (or split into `password-actions.ts`)
  - `src/app/(auth)/login/page.tsx` (forgot-password link)
  - `src/lib/validators/auth.ts` (reset schemas)

### Testing Requirements

- Validate both happy path and invalid/expired token path.
- Ensure no regression on login/session/role redirect.
- Build + typecheck required before move to review.

### References

- [Source: `_bmad-output/planning-artifacts/epics.md` — Story 1.6]
- [Source: `docs/Solar_CRM_PRD_v1.md` — FR6]
- [Source: `_bmad-output/planning-artifacts/architecture.md` — Authentication & Security]
- [Source: `_bmad-output/implementation-artifacts/1-3-login-session-persistence-and-role-routing.md`]
- [Source: `_bmad-output/implementation-artifacts/1-5-admin-user-management.md`]

## Dev Agent Record

### Agent Model Used

Codex 5.3

### Debug Log References

- Added reset request and password update forms under `(auth)` routes.
- Reused `/auth/callback` for reset link code exchange and invalid recovery handling.
- `npm run build` passes with `/reset-password` and `/reset-password/update` routes.

### Completion Notes List

- Implemented self-service reset request and update actions using Supabase auth APIs only.
- Added explicit invalid/expired reset link message and retry path.
- Added forgot-password entry point on `/login`; successful update routes back to login.

### File List

- `src/features/auth/actions.ts`
- `src/lib/validators/auth.ts`
- `src/features/auth/components/reset-password-request-form.tsx`
- `src/features/auth/components/reset-password-update-form.tsx`
- `src/app/(auth)/reset-password/page.tsx`
- `src/app/(auth)/reset-password/update/page.tsx`
- `src/app/(auth)/login/page.tsx`
- `src/app/auth/callback/route.ts`
- `_bmad-output/implementation-artifacts/1-6-password-reset-flow.md`

## Story Completion Status

- **Status:** done
- **Completion note:** Password reset flow implemented with clear invalid-link handling and passing build.
