---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
workflowType: architecture
project_name: Sunflare
user_name: Nilmoy
date: 2026-06-01
lastStep: 8
status: complete
completedAt: 2026-06-01
inputDocuments:
  - docs/Solar_CRM_PRD_v1.md
  - _bmad-output/planning-artifacts/implementation-readiness-report-2026-06-01.md
---

# Architecture Decision Document — Sunflare (Solar CRM)

_This document defines technical decisions for consistent AI-agent implementation. Aligned with PRD v1.0 and implementation-readiness FR/NFR traceability (60 FRs, 15 NFRs)._

---

## Project Context Analysis

### Requirements Overview

**Functional Requirements**

Solar CRM v1 is a **full-stack web PWA** for solar field sales: door-to-door canvassing with map-based logging, cold-call tracking, unified lead pipeline, territory management, and a manager analytics dashboard. Requirements span six modules (Auth, D2D Map, Territory, Cold Call, Pipeline, Manager Dashboard) plus cross-cutting shift/GPS, offline sync, and a unified `Contact` hub (FR1–FR60).

Architecturally this implies:

- **Dual UX surfaces**: mobile-first rep app (`/rep/*`) and desktop manager console (`/admin/*`)
- **Geospatial core**: PostGIS polygons, point pins, spatial queries (territory containment, heatmaps)
- **Realtime manager views**: activity feed and counters without polling
- **Offline-first field logging**: queue knocks locally, sync on reconnect (NFR4, FR13)
- **Strong tenancy**: rep-scoped data via RLS; admin global (FR2, FR60, NFR9)

**Non-Functional Requirements**

| ID | Architectural driver |
| :--- | :--- |
| NFR1 | Map pin clustering + viewport-limited fetch (≤500 pins / 2s) |
| NFR2–NFR3 | Lean API payloads, edge-friendly reads, aggregated dashboard queries |
| NFR4, NFR14 | Serwist + IndexedDB outbox pattern; idempotent sync |
| NFR5–NFR6, NFR8 | Mobile layout system, touch targets, PWA manifest |
| NFR7 | Shift-gated GPS job (~120s interval) |
| NFR9–NFR12 | Supabase Auth JWT, RLS, server route guards, HTTPS-only |
| NFR13, NFR15 | Vercel + Supabase SLA; managed backups |

**Scale & Complexity**

- **Primary domain:** Full-stack web (Next.js + Supabase)
- **Complexity level:** Medium–high (geospatial + offline + realtime + RBAC)
- **Estimated major components:** ~12 (auth, map, knock sync, shift/GPS, territory, calls, pipeline, dashboard, realtime, offline queue, admin users, exports)

### Technical Constraints & Dependencies

- Team: 10–30 reps, 1 admin; single-tenant internal deployment
- PRD stack preferences: Next.js, Tailwind, Mapbox, PostgreSQL/PostGIS, Supabase, Vercel
- v1 excludes: native app, proposals/billing, SMS/email integrations
- Enums for door/call outcomes and pipeline stages **frozen before migrations** (PRD open question #4)
- Explicit shift clock-in/out (not passive always-on GPS)

### Cross-Cutting Concerns Identified

1. **Authentication & authorization** (JWT + RLS + route middleware)
2. **Geospatial** (PostGIS, Mapbox, geolocation, reverse geocoding)
3. **Offline sync & idempotency** (IndexedDB outbox, conflict handling)
4. **Realtime subscriptions** (manager feed, live counters)
5. **Audit & activity history** (LeadActivity, pipeline moves, knock/call streams)
6. **Role-based UI routing** (rep vs admin shells)
7. **Performance budgets** (map, forms, dashboard aggregates)

---

## Starter Template Evaluation

### Primary Technology Domain

**Full-stack web application** — Next.js App Router frontend with colocated API routes and Supabase backend.

### Starter Options Considered

| Option | Verdict |
| :--- | :--- |
| `create-next-app@latest` (official) | **Selected** — TypeScript, Tailwind, App Router, ESLint, Turbopack defaults |
| T3 Stack | Rejected — adds tRPC/Drizzle; PRD already commits to Supabase |
| Separate Express API | Deferred — PRD chooses unified Next.js API for v1 |

**Version note:** PRD references Next.js 14; **architecture adopts Next.js 16** (`create-next-app@16.2.6`, May 2026) as current stable. App Router patterns are compatible; upgrade path is standard.

### Selected Starter: create-next-app

**Rationale:** Official template matches PRD (React, TypeScript, Tailwind, App Router), minimal ops, Vercel-native deploy, includes `AGENTS.md` for coding agents.

**Initialization command:**

```bash
npx create-next-app@latest sunflare \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir \
  --import-alias "@/*" \
  --yes
cd sunflare
pnpm add @supabase/supabase-js @supabase/ssr
pnpm add mapbox-gl
pnpm add @serwist/next serwist
pnpm add dexie
pnpm add zod
pnpm add -D @types/mapbox-gl
```

**Post-init (first implementation story):** Supabase project + PostGIS extension + schema migrations; Serwist wiring; environment variables (see Infrastructure).

**Architectural decisions provided by starter:**

| Area | Decision |
| :--- | :--- |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS v4 (starter default) |
| Routing | App Router under `src/app/` |
| Build | Turbopack (dev); production per Next 16 defaults |
| Lint | ESLint (starter config) |
| Structure | `src/` directory, `@/*` imports |

---

## Core Architectural Decisions

### Decision Priority Analysis

**Critical (block implementation):**

- Supabase as system of record (Postgres + PostGIS + Auth + Realtime + RLS)
- Next.js Route Handlers for mutations; Server Components for read-heavy admin pages
- Rep/admin route groups with middleware role enforcement
- Offline outbox (Dexie) + sync API with idempotency keys
- Mapbox for map rendering; server-side spatial logic in Postgres

**Important (shape architecture):**

- Zod validation at API boundary; shared types from DB enums
- TanStack Query for client data fetching (mutations + cache invalidation)
- Supabase Realtime channels scoped by role
- `@serwist/next` instead of deprecated `next-pwa`

**Deferred (post-MVP / v2):**

- Separate Express/worker service for cron digests (FR weekly PDF — v2)
- Twilio/SendGrid (integrated comms — v2)
- Native React Native app (v2)
- Bulk CSV import (v2)

### Data Architecture

| Decision | Choice | Rationale |
| :--- | :--- | :--- |
| Database | **PostgreSQL 15+ via Supabase** | PRD; managed backups (NFR15) |
| Geospatial | **PostGIS** (`geometry(Polygon,4326)`, `geometry(Point,4326)`) | Territory intersection, heatmaps |
| ORM / migrations | **Supabase SQL migrations** in `supabase/migrations/` | RLS lives with schema; versioned |
| Modeling | PRD entities: User, Territory, TerritoryAssignment, Contact, DoorKnock, CallLog, Lead, LeadActivity, FollowUp, GpsPing | Single `contacts` hub |
| Validation | **Zod** schemas in `src/lib/validators/` mirroring DB enums | Consistent API + forms |
| Caching | React Query client cache; **no** generic Redis v1 | Scale fits team size |
| ID strategy | UUID v4 (`gen_random_uuid()`) | Supabase default |

**Spatial query patterns:**

- Territory assignment: `ST_Contains(territory.polygon, knock_point)`
- Admin map: bounding-box query + limit 500 pins (NFR1)
- Heatmap: aggregated grid/materialized view (Phase 3)

### Authentication & Security

| Decision | Choice | Rationale |
| :--- | :--- | :--- |
| Auth provider | **Supabase Auth** (email/password) | PRD JWT; integrates with RLS |
| Session (web) | `@supabase/ssr` cookie sessions | Server Component + Route Handler access |
| Authorization | **RLS policies** + `role` claim on `profiles` | NFR9 rep isolation |
| API guards | Next.js `middleware.ts` + per-route `requireRole()` | NFR10 server enforcement |
| Admin mutations | Service role **only** in Edge/cron — never client | Least privilege |
| PII at rest (client) | Dexie stores **non-sensitive** knock draft fields; encrypt phone/notes via **Web Crypto** (AES-GCM) before IndexedDB if cached | NFR11 |
| Transport | HTTPS only (Vercel + Supabase) | NFR12 |

**RLS policy pattern (conceptual):**

- `rep`: `SELECT/INSERT/UPDATE` own rows (`rep_id = auth.uid()`)
- `admin`: `FOR ALL` via `profiles.role = 'admin'`
- `contacts`: reps read contacts they created or linked to their knocks/calls; admins read all

### API & Communication Patterns

| Decision | Choice | Rationale |
| :--- | :--- | :--- |
| API style | **REST** Route Handlers under `src/app/api/v1/` | PRD Next.js API routes |
| Versioning | `/api/v1/` prefix | Future-proof |
| Errors | `{ error: { code, message, details? } }` + HTTP status | Agent consistency |
| Success | `{ data: T }` wrapper for JSON | Predictable clients |
| Realtime | **Supabase Realtime** on `door_knocks`, `call_logs`, `leads` INSERT | FR42 live feed |
| Rate limiting | Vercel middleware basic IP limit on auth routes | Abuse protection |
| Idempotency | `Idempotency-Key` header on knock/call POST | Offline replay safety |

**Key endpoints (illustrative):**

```
POST   /api/v1/shifts/start|end
POST   /api/v1/knocks          (+ sync batch)
GET    /api/v1/knocks?bbox=   (viewport)
POST   /api/v1/calls
GET    /api/v1/contacts/search
PATCH  /api/v1/leads/:id/stage
GET    /api/v1/admin/dashboard/summary
GET    /api/v1/admin/activity   (or Realtime-only)
```

### Frontend Architecture

| Decision | Choice | Rationale |
| :--- | :--- | :--- |
| Rendering | **RSC** for admin dashboards; **client components** for map, kanban, forms | Performance + interactivity |
| State | **TanStack Query v5** server state; React `useState` for local UI | Avoid global store complexity |
| Map | **mapbox-gl** client-only dynamic import | NFR1 clustering via GeoJSON sources |
| Forms | React Hook Form + Zod resolver | Fast door form (FR10) |
| Kanban | `@dnd-kit/core` | Accessible drag-drop pipeline |
| PWA | **Serwist** (`@serwist/next`), disabled in dev | NFR4; replaces stale `next-pwa` |
| Offline queue | **Dexie** table `pending_knocks` | IndexedDB outbox |
| Push | Web Push via service worker + VAPID (Phase 2) | FR35 |
| UI kit | **shadcn/ui** (Radix + Tailwind) | Rapid mobile + desktop components |

**Route structure:**

```
src/app/
  (auth)/login, reset-password, invite/[token]
  (rep)/rep/map, rep/shift, rep/pipeline, rep/calls, rep/history
  (admin)/admin/dashboard, admin/map, admin/territories, admin/team, admin/pipeline
  api/v1/...
```

### Infrastructure & Deployment

| Decision | Choice | Rationale |
| :--- | :--- | :--- |
| Frontend host | **Vercel** (production + preview) | PRD |
| Backend | **Supabase Cloud** (Sydney region if AU users) | PRD |
| Environments | `local` / `preview` / `production` | Standard |
| CI | GitHub Actions: lint, typecheck, `supabase db lint`, Playwright smoke | Quality gate |
| Secrets | Vercel env + Supabase vault; never commit `.env.local` | Security |
| Maps | Mapbox token (public) + secret for server geocoding if needed | |
| Monitoring | Vercel Analytics + Supabase logs; Sentry optional Phase 3 | |

**Required environment variables:**

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=        # server only
NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=
MAPBOX_SECRET_TOKEN=              # optional server geocoding
DATABASE_URL=                     # migrations CLI
NEXT_PUBLIC_APP_URL=
```

### Decision Impact Analysis

**Implementation sequence:**

1. Scaffold Next.js + Supabase + base schema/RLS
2. Auth + role middleware + profile provisioning
3. Contact + DoorKnock + shift/GPS + rep map (Phase 1 PRD)
4. Offline outbox + sync API
5. Pipeline + CallLog (Phase 2)
6. Territory polygons + assignments (Phase 2)
7. Admin dashboard + Realtime + analytics (Phase 3)

**Cross-component dependencies:**

- RLS must exist before any rep-facing API ships
- Shift session gates GPS ping writer and daily summary job
- Contact record required before knock/call; knock may create contact
- Lead promotion depends on knock/call outcome enums

---

## Implementation Patterns & Consistency Rules

### Naming Patterns

**Database (PostgreSQL):**

- Tables: `snake_case` plural (`door_knocks`, `call_logs`)
- Columns: `snake_case` (`rep_id`, `knocked_at`)
- PK: `id` UUID
- FK: `{entity}_id`
- Enums: `snake_case` type names matching PRD (`door_outcome`, `lead_stage`)
- Indexes: `idx_{table}_{columns}`

**API:**

- REST plural resources: `/api/v1/knocks`, `/api/v1/leads`
- Query params: `snake_case` (`rep_id`, `date_from`)
- JSON body fields: **snake_case** (matches DB)

**Code (TypeScript):**

- Components: `PascalCase` (`DoorOutcomeSheet.tsx`)
- Files: match export (`door-outcome-sheet.tsx` for shadcn, `DoorOutcomeSheet.tsx` for features)
- Functions: `camelCase` (`createDoorKnock`)
- Types/interfaces: `PascalCase` (`DoorKnock`, `DoorOutcome`)
- Constants: `SCREAMING_SNAKE` for enums (`DOOR_OUTCOMES`)

### Structure Patterns

**Feature-first under `src/`:**

```
src/
  app/                 # routes only — thin
  components/
    ui/                # shadcn primitives
    rep/               # rep-specific
    admin/             # admin-specific
  features/            # domain logic grouped by module
    auth/
    knocks/
    shifts/
    territories/
    calls/
    pipeline/
    dashboard/
  lib/
    supabase/          # client, server, middleware helpers
    validators/
    geo/
    offline/
  hooks/
  types/
tests/
  e2e/                 # Playwright
  unit/                # vitest co-located or mirrored
supabase/
  migrations/
  seed.sql
```

- **Tests:** unit `*.test.ts` next to module OR `tests/unit/features/knocks/`; e2e in `tests/e2e/`
- **No business logic in** `app/**/page.tsx` — delegate to `features/`

### Format Patterns

**API success:**

```json
{ "data": { "id": "...", "outcome": "interested" } }
```

**API error:**

```json
{ "error": { "code": "DUPLICATE_KNOCK_TODAY", "message": "This address was knocked today." } }
```

**Dates:** ISO 8601 UTC strings in JSON (`2026-06-01T09:30:00.000Z`); display in `Australia/Sydney` via `Intl` in UI

**Booleans:** `true`/`false` only

### Communication Patterns

**Realtime event naming:** Postgres table topic — subscribe to `door_knocks` INSERT with RLS filter

**React Query keys:** `['knocks', { repId, bbox }]`, `['dashboard', 'summary', dateRange]`

**Invalidation:** on knock create → invalidate `knocks`, `dashboard`, `activity`

### Process Patterns

**Loading:** `isLoading` for initial fetch; `isPending` for mutations (TanStack Query v5)

**Errors:** toast for user-facing; log `error.code` server-side; never expose stack traces to client

**Offline knock flow:**

1. Write to Dexie `pending_knocks` with `client_id` (UUID) + `idempotency_key`
2. Optimistic pin on map (muted style)
3. Background sync POST `/api/v1/knocks/sync` when online
4. On success: remove pending row; on conflict: surface duplicate alert (FR18)

**Auth flow:** Supabase session refresh in middleware; redirect unauthenticated to `/login`; role mismatch → `403` page

### Enforcement Guidelines

**All AI agents MUST:**

- Use snake_case in DB and API JSON
- Enforce role checks in Route Handlers (not UI-only)
- Add Zod validation for every mutation body
- Use feature folders — no random `utils` dumping ground
- Respect FR enum values exactly (no new outcomes without migration)

**Anti-patterns:**

- Prisma + Supabase duplicate ORMs
- Storing JWT in localStorage (use cookies via SSR)
- Fetching all pins globally without bbox limit
- `any` types on API boundaries

---

## Project Structure & Boundaries

### Complete Project Directory Structure

```
sunflare/
├── README.md
├── package.json
├── next.config.ts
├── tsconfig.json
├── eslint.config.mjs
├── .env.example
├── .gitignore
├── AGENTS.md
├── public/
│   ├── sw.js                    # Serwist output
│   ├── manifest.webmanifest
│   └── icons/
├── supabase/
│   ├── config.toml
│   ├── migrations/
│   │   ├── 00001_extensions.sql
│   │   ├── 00002_core_schema.sql
│   │   ├── 00003_rls_policies.sql
│   │   └── 00004_functions.sql
│   └── seed.sql
├── src/
│   ├── middleware.ts
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── globals.css
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx
│   │   │   ├── reset-password/page.tsx
│   │   │   └── invite/[token]/page.tsx
│   │   ├── (rep)/
│   │   │   ├── layout.tsx
│   │   │   └── rep/
│   │   │       ├── map/page.tsx
│   │   │       ├── pipeline/page.tsx
│   │   │       ├── calls/page.tsx
│   │   │       └── history/page.tsx
│   │   ├── (admin)/
│   │   │   ├── layout.tsx
│   │   │   └── admin/
│   │   │       ├── dashboard/page.tsx
│   │   │       ├── map/page.tsx
│   │   │       ├── territories/page.tsx
│   │   │       ├── team/page.tsx
│   │   │       └── pipeline/page.tsx
│   │   ├── api/v1/
│   │   │   ├── knocks/route.ts
│   │   │   ├── knocks/sync/route.ts
│   │   │   ├── shifts/start/route.ts
│   │   │   ├── shifts/end/route.ts
│   │   │   ├── calls/route.ts
│   │   │   ├── contacts/route.ts
│   │   │   ├── leads/[id]/route.ts
│   │   │   ├── leads/[id]/stage/route.ts
│   │   │   ├── territories/route.ts
│   │   │   └── admin/
│   │   │       ├── dashboard/summary/route.ts
│   │   │       └── export/csv/route.ts
│   │   ├── sw.ts
│   │   └── ~offline/page.tsx
│   ├── components/ui/
│   ├── components/rep/
│   │   ├── map-canvas.tsx
│   │   ├── door-outcome-sheet.tsx
│   │   └── shift-controls.tsx
│   ├── components/admin/
│   │   ├── activity-feed.tsx
│   │   ├── funnel-chart.tsx
│   │   └── territory-draw-tool.tsx
│   ├── features/
│   │   ├── auth/
│   │   ├── knocks/
│   │   ├── shifts/
│   │   ├── gps/
│   │   ├── territories/
│   │   ├── calls/
│   │   ├── pipeline/
│   │   ├── contacts/
│   │   └── dashboard/
│   ├── lib/
│   │   ├── supabase/client.ts
│   │   ├── supabase/server.ts
│   │   ├── supabase/middleware.ts
│   │   ├── validators/
│   │   ├── geo/mapbox.ts
│   │   ├── offline/db.ts
│   │   └── api/response.ts
│   ├── hooks/
│   └── types/database.ts
└── tests/
    ├── e2e/rep-knock.spec.ts
    └── unit/features/knocks/
```

### Architectural Boundaries

**API boundaries:** Client → Next Route Handlers → Supabase client (user JWT) → Postgres/RLS. Admin bulk export may use service role in Route Handler only.

**Component boundaries:** Map components do not call Supabase directly — use feature services + React Query hooks.

**Data boundaries:** All spatial writes validate SRID 4326; territory edits admin-only.

### Requirements to Structure Mapping

| PRD module | FR range | Location |
| :--- | :--- | :--- |
| Auth & users | FR1–FR7 | `features/auth`, `api/v1` admin users, `supabase/migrations` profiles |
| D2D map | FR8–FR18, FR51–FR57 | `features/knocks`, `components/rep/map-*`, `lib/offline` |
| Territory | FR19–FR23 | `features/territories`, `admin/territories` |
| Cold call | FR24–FR31 | `features/calls`, `rep/calls` |
| Pipeline | FR32–FR41 | `features/pipeline`, shared kanban components |
| Dashboard | FR42–FR50, FR58 | `features/dashboard`, `admin/dashboard` |
| Cross-cutting | FR52–FR55, FR59–FR60 | `features/shifts`, `features/gps`, `middleware.ts`, RLS |

### Data Flow (knock — online)

```
Rep taps map → DoorOutcomeSheet → POST /api/v1/knocks
  → Zod validate → Supabase insert door_knocks + upsert contacts
  → optional lead promotion → Realtime event → Admin activity feed
```

### Data Flow (knock — offline)

```
Rep submits → Dexie pending_knocks → optimistic UI pin
  → connectivity restored → POST /api/v1/knocks/sync (batch + idempotency)
  → server upsert → clear pending → invalidate React Query caches
```

---

## Architecture Validation Results

### Coherence Validation ✅

- Next.js + Supabase + Mapbox + Serwist + Dexie are compatible and commonly combined
- PRD upgraded from Next 14 → **16** documented explicitly
- RLS + middleware + Route Handler guards align (NFR9–NFR10)
- Offline strategy matches NFR4/NFR14 (outbox, not cache-only)

### Requirements Coverage Validation ✅

| Area | Coverage |
| :--- | :--- |
| FR1–FR60 | Each mapped to feature folder + API/DB component |
| NFR1–NFR15 | Addressed in decisions (map bbox, Serwist, RLS, GPS interval, etc.) |
| v2 items | Explicitly deferred |

**Gap:** No separate UX spec — UI patterns inferred from PRD journeys (noted in readiness report).

### Implementation Readiness Validation

**Decision completeness:** High — stack, patterns, structure, and boundaries defined.

**Structure completeness:** High — concrete tree, not placeholders.

**Pattern completeness:** High — naming, API, offline, auth flows specified.

### Gap Analysis

| Priority | Gap | Mitigation |
| :--- | :--- | :--- |
| Important | No UX wireframes | Run `bmad-ux` or add screen list to epics |
| Important | Push notification provider choice | Decide VAPID + library in Phase 2 story |
| Important | Reverse geocoding provider | Mapbox Geocoding API (align with map vendor) |
| Nice-to-have | Sentry / structured logging | Add in Phase 3 |
| Nice-to-have | WCAG level | Target WCAG 2.1 AA in UX pass |

### Architecture Completeness Checklist

**Requirements Analysis**

- [x] Project context thoroughly analyzed
- [x] Scale and complexity assessed
- [x] Technical constraints identified
- [x] Cross-cutting concerns mapped

**Architectural Decisions**

- [x] Critical decisions documented with versions
- [x] Technology stack fully specified
- [x] Integration patterns defined
- [x] Performance considerations addressed

**Implementation Patterns**

- [x] Naming conventions established
- [x] Structure patterns defined
- [x] Communication patterns specified
- [x] Process patterns documented

**Project Structure**

- [x] Complete directory structure defined
- [x] Component boundaries established
- [x] Integration points mapped
- [x] Requirements to structure mapping complete

### Architecture Readiness Assessment

**Overall Status:** **READY WITH MINOR GAPS**

**Confidence Level:** High

**Key Strengths:**

- PRD-aligned stack with clear rep/admin split
- RLS-first security model for multi-rep tenancy
- Explicit offline outbox pattern for field reliability
- FR traceability table for epic/story authors

**Areas for Future Enhancement:**

- Dedicated UX artifact and accessibility standard
- Background workers for scheduled digests (v2)
- Read replicas / materialized views if pin volume exceeds 500 per viewport strategy

### Implementation Handoff

**AI agent guidelines:**

1. Read this document before implementing any feature
2. Follow naming, API envelope, and folder conventions exactly
3. Never bypass RLS — use user-scoped Supabase client in Route Handlers
4. Map every story to FR IDs from readiness report

**First implementation priority:**

```bash
npx create-next-app@latest sunflare --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --yes
```

Then: Supabase init, `00001_extensions.sql` (`postgis`), core schema from PRD Section 5, RLS policies, auth middleware.

---

## Workflow Complete

Architecture workflow finished **2026-06-01** for **Sunflare**.

**Recommended next BMad steps:**

1. **`bmad-create-epics-and-stories`** — break down FR1–FR60 using module mapping above  
2. Re-run **`bmad-check-implementation-readiness`** — architecture gap should close  
3. Optional: **`bmad-ux`** before sprint planning for screen-level specs
