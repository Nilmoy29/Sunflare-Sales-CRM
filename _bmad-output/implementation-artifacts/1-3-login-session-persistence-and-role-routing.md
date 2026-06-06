---
baseline_commit: NO_VCS
---

# Story 1.3: Login, Session Persistence, and Role Routing

Status: done

## Story

As a **rep or admin**,
I want to log in and land in the correct experience for my role,
So that I can use the CRM without repeated logins or wrong permissions.

## Acceptance Criteria

1. **Given** valid credentials **When** I submit login **Then** a Supabase session is established via SSR cookies (FR1, FR5)
2. **And** reps redirect to `/rep/map` and admins to `/admin/dashboard` (FR2)
3. **And** unauthenticated users cannot access `(rep)` or `(admin)` routes (NFR9)
4. **And** session refresh works across mobile browser backgrounding (FR5)

**Implements:** FR1, FR2, FR5, FR55 (routing shells)

## Tasks / Subtasks

- [x] **RLS migration** — `profiles` policies + `is_admin()` helper
- [x] **Middleware** — `src/middleware.ts` session refresh + route guards
- [x] **Login UI** — email/password form, server action, inactive account handling
- [x] **Role routing** — post-login redirect; `/forbidden` on role mismatch
- [x] **Layouts** — rep/admin shells with sign out
- [x] **Auth callback** — `/auth/callback` for code exchange
- [x] **API guard helper** — `requireRoleForApi` for future Route Handlers
- [x] **Verify** — `supabase db push`, `npm run build`

## Dev Agent Record

### Agent Model Used

Composer (dev-story)

### Completion Notes List

- Middleware calls `getUser()` on every matched request (Supabase SSR refresh pattern).
- Deactivated profiles are signed out at middleware and login.
- Home page no longer links directly to protected routes.
- **MCP follow-up (2026-06-01):** `get_advisors` security lints cleared via `harden_function_security` migration; generated DB types wired to Supabase clients.

### File List

- `supabase/migrations/20260601130000_profiles_rls.sql`
- `src/middleware.ts`
- `src/lib/supabase/middleware.ts`
- `src/lib/auth/paths.ts`, `session.ts`, `guards.ts`, `middleware-routes.ts`
- `src/lib/validators/auth.ts`
- `src/features/auth/actions.ts`
- `src/features/auth/components/login-form.tsx`, `sign-out-button.tsx`
- `src/app/(auth)/layout.tsx`, `(auth)/login/page.tsx`
- `src/app/auth/callback/route.ts`
- `src/app/forbidden/page.tsx`
- `src/app/(rep)/layout.tsx`, `(admin)/layout.tsx`
- `src/app/page.tsx`
- `supabase/migrations/20260602100000_harden_function_security.sql`
- `src/types/supabase.generated.ts`
- `scripts/mcp-call.mjs`, `scripts/generate-supabase-types.mjs`
