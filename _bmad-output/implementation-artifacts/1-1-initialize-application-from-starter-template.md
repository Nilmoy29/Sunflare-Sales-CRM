---
baseline_commit: NO_VCS
---

# Story 1.1: Initialize Application from Starter Template

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **developer**,
I want the Sunflare codebase scaffolded from the architecture starter,
so that all agents implement against a consistent project structure.

## Acceptance Criteria

1. **Given** the project workspace at repository root (`Sunflare/`)  
   **When** the architecture starter commands are executed  
   **Then** a Next.js 16 App Router application exists with TypeScript, Tailwind CSS, and ESLint under `src/`

2. **Given** the scaffolded app  
   **When** dependencies are installed  
   **Then** these packages are present in `package.json`: `@supabase/supabase-js`, `@supabase/ssr`, `mapbox-gl`, `@serwist/next`, `serwist`, `dexie`, `zod`, and devDependency `@types/mapbox-gl`

3. **Given** the application root  
   **When** a developer copies environment configuration  
   **Then** `.env.example` documents all required variables from architecture (Supabase URL/keys, Mapbox token, app URL, optional service role and DATABASE_URL)

4. **Given** the scaffolded tree  
   **When** compared to architecture.md  
   **Then** placeholder directories exist: `src/features/` (with module subfolders), `src/lib/supabase/`, `src/lib/validators/`, `src/lib/geo/`, `src/lib/offline/`, `src/components/ui/`, `src/components/rep/`, `src/components/admin/`, `supabase/migrations/`, and route group folders under `src/app/` as stubs (empty `page.tsx` or `.gitkeep` acceptable)

5. **Given** the project  
   **When** `pnpm run build` (or `npm run build`) executes  
   **Then** the build completes without errors (no Supabase/Mapbox runtime calls required yet—stubs only)

6. **Given** existing BMad artifacts at repo root  
   **When** scaffolding completes  
   **Then** `docs/`, `_bmad-output/`, and `_bmad/` remain untouched and functional

**Implements:** Architecture starter (enables all subsequent FRs)  
**NFRs:** NFR12 (deployment path via Vercel-compatible Next.js app)

## Tasks / Subtasks

- [x] **Scaffold Next.js app at repository root** (AC: 1, 6)
  - [x] From `{project-root}`, run create-next-app (see Dev Notes for non-empty directory handling)
  - [x] Verify `src/app/layout.tsx`, `src/app/page.tsx`, `tsconfig.json`, `next.config.ts`, `eslint.config.mjs` exist
  - [x] Confirm `@/*` import alias works

- [x] **Install architecture dependencies** (AC: 2)
  - [x] `pnpm add @supabase/supabase-js @supabase/ssr mapbox-gl @serwist/next serwist dexie zod`
  - [x] `pnpm add -D @types/mapbox-gl`

- [x] **Environment template** (AC: 3)
  - [x] Create `.env.example` with variables from architecture.md (no secrets committed)
  - [x] Add `.env.local` to `.gitignore` if not already present

- [x] **Create folder skeleton per architecture** (AC: 4)
  - [x] `src/features/{auth,knocks,shifts,gps,territories,calls,pipeline,contacts,dashboard}/.gitkeep`
  - [x] `src/lib/supabase/`, `src/lib/validators/`, `src/lib/geo/`, `src/lib/offline/`
  - [x] `src/components/ui/`, `src/components/rep/`, `src/components/admin/`
  - [x] `src/app/(auth)/login/`, `(rep)/rep/map/`, `(admin)/admin/dashboard/`, `src/app/api/v1/` (placeholder structure only)
  - [x] `supabase/config.toml` via `supabase init` OR minimal manual `supabase/migrations/.gitkeep`
  - [x] Root `README.md` section: link to `_bmad-output/planning-artifacts/` docs

- [x] **Mapbox CSS import placeholder** (AC: 4)
  - [x] Add comment in `src/app/globals.css` or dedicated file noting `mapbox-gl/dist/mapbox-gl.css` import required in map stories (do not wire map UI in this story)

- [x] **Verify build** (AC: 5)
  - [x] `pnpm run lint` and `pnpm run build` pass
  - [x] Document Node/pnpm versions used in Dev Agent Record

### Review Findings

- [x] [Review][Patch] Add `engines` and `packageManager` to `package.json` for reproducible installs [`package.json`]
- [x] [Review][Defer] No root `src/middleware.ts` yet — deferred to Story 1.3 per plan
- [x] [Review][Dismiss] Supabase clients throw without env vars — acceptable until Story 1.2; README documents `.env.local` setup

### Senior Developer Review (AI)

**Outcome:** Approve  
**Date:** 2026-06-01  
**Layers:** Blind Hunter, Edge Case Hunter, Acceptance Auditor (inline)

**Summary:** Scaffold meets all six acceptance criteria. Next.js 16.2.6, architecture dependencies, folder skeleton, API health envelope, and production build verified. One minor patch applied (`engines` / `packageManager`). No blocking issues.

## Dev Notes

### Critical constraints

- **Do NOT** implement auth, database migrations, Serwist service worker, or Mapbox UI in this story—that is Story 1.2+.
- **Do NOT** use `next-pwa` (deprecated); Serwist wiring comes in Story 2.8.
- **Do NOT** add Prisma or alternate ORM—Supabase SQL migrations only (architecture).
- **Do NOT** store secrets in git; `.env.local` only.

### Scaffold location (repository root)

The workspace **is** the Sunflare product repo (`docs/`, `_bmad-output/` live alongside the app).

**Preferred command** (from project root):

```bash
npx create-next-app@latest . \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir \
  --import-alias "@/*" \
  --yes
```

If the CLI refuses a non-empty directory, use one of:

1. `npx create-next-app@latest sunflare-tmp ...` then move all generated files to repo root (except conflicts with `docs/`, `_bmad/`, `_bmad-output/`), delete `sunflare-tmp/`
2. Or use `--empty` if your CLI version supports minimal scaffold, then add Tailwind/ESLint per Next.js docs

Architecture originally named subfolder `sunflare/`; **repo root is correct** for this workspace to avoid `Sunflare/sunflare/` nesting.

### Dependency versions (June 2026)

- **Next.js 16** via `create-next-app@latest` (architecture supersedes PRD’s Next 14 reference)
- **Package manager:** `pnpm` preferred (architecture examples); `npm` acceptable if lockfile committed consistently
- **Serwist:** install packages only; do not configure `withSerwist` in `next.config.ts` until Story 2.8

### `.env.example` required keys

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=
MAPBOX_SECRET_TOKEN=
DATABASE_URL=
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Route stub layout (no business logic)

Match architecture route groups—placeholder `page.tsx` returning minimal heading is enough:

| Path | Purpose |
|------|---------|
| `src/app/(auth)/login/page.tsx` | Auth shell placeholder |
| `src/app/(rep)/rep/map/page.tsx` | Rep home placeholder |
| `src/app/(admin)/admin/dashboard/page.tsx` | Admin home placeholder |
| `src/app/api/v1/health/route.ts` | Optional `GET` returning `{ data: { status: "ok" } }` for build smoke test |

Use API envelope from architecture: success `{ data: T }`, errors `{ error: { code, message } }` on future routes.

### Supabase client stubs (optional but recommended)

Create minimal files so Story 1.2 can extend without restructure:

- `src/lib/supabase/client.ts` — browser client factory (env vars only, no calls)
- `src/lib/supabase/server.ts` — server client placeholder using `@supabase/ssr`
- `src/lib/supabase/middleware.ts` — export helper stub (middleware.ts wiring in Story 1.3)

### Testing (this story)

- **Manual:** `pnpm dev` loads home page; `pnpm build` succeeds
- **No E2E required** for 1.1; Playwright can be added in CI story later
- **No Supabase project required** to complete AC—migrations are Story 1.2

### Project Structure Notes

- Alignment: [Source: `_bmad-output/planning-artifacts/architecture.md#Project Structure & Boundaries`]
- Naming: TypeScript `camelCase` in code; prepare for API/DB `snake_case` later
- `implementation_artifacts` stay in `_bmad-output/implementation-artifacts/` (not inside `src/`)

### Previous story intelligence

None — first implementation story. Greenfield repo.

### References

- [Source: `_bmad-output/planning-artifacts/epics.md` — Story 1.1]
- [Source: `_bmad-output/planning-artifacts/architecture.md` — Starter Template Evaluation, Project Structure]
- [Source: `docs/Solar_CRM_PRD_v1.md` — Section 6 Recommended Tech Stack]
- [Source: `_bmad-output/planning-artifacts/implementation-readiness-report-2026-06-01.md` — FR/NFR inventory]

## Dev Agent Record

### Agent Model Used

Composer (Cursor agent)

### Debug Log References

- Initial `create-next-app` at repo root failed (non-empty directory); scaffolded via `sunflare-tmp` then merged to root.
- First `npm install` hit ENOSPC; resolved after npm cache clean (~4.5GB free).
- Build failed on implicit `any` in Supabase cookie handlers; fixed with explicit `CookieOptions` types.

### Completion Notes List

- Next.js **16.2.6** App Router app at repository root with TypeScript, Tailwind v4, ESLint.
- Architecture dependencies installed via `npm install` (see versions below).
- Route stubs: `/`, `/login`, `/rep/map`, `/admin/dashboard`, `GET /api/v1/health`.
- Supabase client/server/middleware stubs and `apiSuccess` helper per architecture envelopes.
- `npm run lint` and `npm run build` pass (Node v24.6.0, npm 11.5.1).
- BMad folders (`docs/`, `_bmad/`, `_bmad-output/`) unchanged.
- Code review approved 2026-06-01; added `engines` and `packageManager` to `package.json`.

### File List

- `.env.example`
- `.gitignore`
- `README.md`
- `package.json`
- `package-lock.json`
- `eslint.config.mjs`
- `next.config.ts`
- `next-env.d.ts`
- `postcss.config.mjs`
- `tsconfig.json`
- `public/*` (default Next.js assets)
- `src/app/globals.css`
- `src/app/layout.tsx`
- `src/app/page.tsx`
- `src/app/(auth)/login/page.tsx`
- `src/app/(rep)/rep/map/page.tsx`
- `src/app/(admin)/admin/dashboard/page.tsx`
- `src/app/api/v1/health/route.ts`
- `src/lib/api/response.ts`
- `src/lib/supabase/client.ts`
- `src/lib/supabase/server.ts`
- `src/lib/supabase/middleware.ts`
- `src/features/*/.gitkeep` (9 modules)
- `src/lib/validators/.gitkeep`
- `src/lib/geo/.gitkeep`
- `src/lib/offline/.gitkeep`
- `src/components/ui/.gitkeep`
- `src/components/rep/.gitkeep`
- `src/components/admin/.gitkeep`
- `supabase/config.toml`
- `supabase/migrations/.gitkeep`

## Change Log

- 2026-06-01: Story 1.1 implemented — greenfield Next.js scaffold, architecture deps, folder skeleton, production build verified.
- 2026-06-01: Code review approved; story marked done.

## Story Completion Status

- **Status:** done
- **Completion note:** Approved after adversarial code review (2026-06-01).
