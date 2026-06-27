# Sunflare — Solar CRM

Web-first PWA for solar field sales: door-to-door canvassing, cold calling, lead pipeline, and manager analytics.

## Stack

- **Next.js 16** (App Router) + TypeScript + Tailwind CSS
- **Supabase** (Postgres + PostGIS, Auth, Realtime)
- **Mapbox GL JS**, **Serwist** (PWA), **Dexie** (offline queue)

## Getting started

```bash
cp .env.example .env.local
# Supabase keys required from Story 1.2 — see docs/SETUP_KEYS.md

npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Database (Supabase)

Apply migrations after creating a Supabase project and filling `.env.local`:

```bash
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
```

**Local (Docker):** `npx supabase start` then `npx supabase db reset`.

Migrations in `supabase/migrations/` enable PostGIS, frozen PRD enums, `profiles`, and RLS. Sign in at `/login` (rep → `/rep/map`, admin → `/admin/dashboard`).

**Which API keys when?** See [`docs/SETUP_KEYS.md`](docs/SETUP_KEYS.md).

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Development server |
| `npm run verify:bearer` | Bearer token API check (mobile auth bridge) |
| `npm run build` | Web production build |
| `npm run lint` | ESLint |
| `npm run start` | Start production server |
| `npm run smoke` | Epic 1–7 smoke test (API + page checks; requires test users in `.env.local`) |

## Monorepo (mobile)

npm workspaces are enabled at the repo root:

| Path | Package | Purpose |
|------|---------|---------|
| `/` (root) | `sunflare` | Next.js web PWA (unchanged) |
| `packages/shared` | `@sunflare/shared` | Shared enums, Zod validators, types |
| `apps/*` | (future) | Expo mobile app (`apps/mobile` in Epic 2) |

```bash
npm install          # links workspaces from root
npm run dev          # web app (root)
npm run build        # web production build
cd apps/mobile && npm start   # Expo dev server

Copy `apps/mobile/.env.example` to `apps/mobile/.env` and set the same Supabase/Mapbox public keys as web (use your machine IP for `EXPO_PUBLIC_API_URL` on a physical device).
```

Workspace packages import as `@sunflare/shared`. Mobile scaffold: `_bmad-output/planning-artifacts/epics-mobile-expo.md`.

## Documentation

Product and engineering artifacts live in:

- [`docs/`](docs/) — PRD and project knowledge
- [`_bmad-output/planning-artifacts/`](_bmad-output/planning-artifacts/) — architecture, epics, readiness reports
- [`_bmad-output/implementation-artifacts/`](_bmad-output/implementation-artifacts/) — sprint status and story specs

## API

- `GET /api/v1/health` — smoke check (`{ "data": { "status": "ok" } }`)
