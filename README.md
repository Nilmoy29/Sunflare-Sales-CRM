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
| `npm run build` | Production build (uses `--webpack` for Serwist PWA service worker) |
| `npm run lint` | ESLint |
| `npm run start` | Start production server |
| `npm run smoke` | Epic 1–7 smoke test (API + page checks; requires test users in `.env.local`) |

## Documentation

Product and engineering artifacts live in:

- [`docs/`](docs/) — PRD and project knowledge
- [`_bmad-output/planning-artifacts/`](_bmad-output/planning-artifacts/) — architecture, epics, readiness reports
- [`_bmad-output/implementation-artifacts/`](_bmad-output/implementation-artifacts/) — sprint status and story specs

## API

- `GET /api/v1/health` — smoke check (`{ "data": { "status": "ok" } }`)
