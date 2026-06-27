---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
workflowType: architecture
scope: mobile-expo-android
project_name: Sunflare Mobile
user_name: Nilmoy
date: 2026-06-26
lastStep: 8
status: complete
completedAt: 2026-06-26
parent_architecture: _bmad-output/planning-artifacts/architecture.md
inputDocuments:
  - _bmad-output/planning-artifacts/prds/prd-Sunflare-2026-06-26/prd.md
  - _bmad-output/planning-artifacts/prds/prd-Sunflare-2026-06-26/addendum.md
  - docs/Solar_CRM_PRD_v1.md
  - _bmad-output/planning-artifacts/architecture.md
---

# Architecture Decision Document — Sunflare Mobile (Expo Android)

_This document defines technical decisions for the **rep-facing Android app** (Expo SDK). It extends the web PWA architecture (`architecture.md`) without replacing it. Aligned with mobile PRD FR-1–FR-25 and NFR-M1–M7._

---

## Project Context Analysis

### Requirements Overview

**Functional Requirements (mobile PRD)**

25 FRs across seven feature groups: Auth (FR-1–4), Shift/GPS (FR-5–7), Map/Knocks (FR-8–14), Pipeline (FR-15–18), Cold Call (FR-19–21), Notifications/History (FR-22–23), Distribution (FR-24–25). Architecturally these map to:

- **Native shell** with tab/stack navigation (Map, Pipeline, Calls, History, Profile)
- **Background location task** gated by active Shift
- **Mapbox native map** with bbox-limited pin fetch (parity with web NFR1)
- **SQLite outbox** mirroring web Dexie knock sync contract
- **Dual transport**: Supabase client (RLS reads/writes) + Next.js `/api/v1/*` (business logic, geocoding, batch sync)
- **Expo push** for follow-up reminders (extends web push infrastructure)

**Non-Functional Requirements**

| ID | Architectural driver |
| :--- | :--- |
| NFR-M1 | Thumb-zone layout; min 44dp touch targets |
| NFR-M2–M4 | HTTPS; JWT in secure store; no service-role in APK; RLS unchanged |
| NFR-M3 | SQLite outbox encryption for PII fields at rest |
| NFR-M5 | Cold start → Map interactive &lt;4s |
| NFR-M7 | Sentry via `@sentry/react-native` + EAS source maps |

**Scale & Complexity**

- **Primary domain:** React Native (Expo) mobile client + existing Next.js/Supabase backend
- **Complexity level:** Medium–high (background GPS, offline sync, Mapbox native, auth bridge)
- **Estimated major components:** ~10 (auth, navigation, map, knock/outbox, shift/GPS task, pipeline, calls, push, API client, shared package)

### Technical Constraints & Dependencies

- **Brownfield:** Web PWA is production path; mobile reuses DB schema, enums, RLS, and most `/api/v1` routes
- **Team:** Same codebase owners; 10–30 reps; internal APK rollout
- **Enums frozen** per web architecture — mobile must import from `packages/shared`, not redefine
- **Admin surface:** Web-only; mobile blocks or redirects Admin role (FR-2)
- **Cookie-based API auth today:** Web route handlers use `@supabase/ssr` cookies — **mobile requires Bearer token bridge** (see Auth decisions)

### Cross-Cutting Concerns

1. **Auth bridge** (secure store + Bearer on API + Supabase session)
2. **Offline idempotency** (same `client_id` / `idempotency_key` as web)
3. **Shift-gated GPS** (~120s background task)
4. **Geospatial** (Mapbox RN, bbox queries, territory GeoJSON)
5. **Push token registry** (Expo push tokens alongside web VAPID subscriptions)
6. **Code sharing** (validators, enums, API types in monorepo package)

---

## Starter Template Evaluation

### Primary Technology Domain

**Expo managed workflow** — React Native app with custom dev client for Mapbox native module.

### Starter Options Considered

| Option | Verdict |
| :--- | :--- |
| `create-expo-app` (default template, SDK 56) | **Selected** — official, Expo Router, TypeScript, aligns with React 19.2 / RN 0.85 |
| Expo blank + manual Router | Rejected — default template includes Router tabs |
| React Native CLI bare | Rejected — higher ops burden; addendum defers eject |
| Capacitor + PWA | Rejected — insufficient background GPS improvement |

### Selected Starter: create-expo-app @ SDK 56

**Version note (verified June 2026):** Expo SDK **56.0.0** — React Native **0.85**, React **19.2.3**, Node **≥22.13.x**.

**Initialization command:**

```bash
cd /Users/apple/Documents/Sunflare
npx create-expo-app@latest apps/mobile \
  --template default@sdk-56
```

Then install dev-client + Mapbox:

```bash
cd apps/mobile
npx expo install expo-dev-client @rnmapbox/maps expo-location expo-task-manager \
  expo-notifications expo-secure-store expo-sqlite expo-linking expo-router
```

**Rationale:** SDK 56 is current stable; matches web React 19.2; Expo Router parallels Next.js App Router mental model; dev client required for `@rnmapbox/maps`.

---

## Core Architectural Decisions

### Decision Priority Analysis

**Critical (block implementation):**

- Monorepo layout with `packages/shared`
- Bearer token support on Next.js API routes
- Expo dev client + EAS Build APK profile
- Mapbox via `@rnmapbox/maps`
- SQLite outbox matching web sync schema

**Important (shape architecture):**

- Expo Router file-based tabs
- TanStack Query for server state
- Background GPS via `expo-location` + `expo-task-manager`
- Hybrid data access (Supabase direct + REST)

**Deferred:**

- iOS build & App Store
- Certificate pinning
- Biometric unlock
- WatermelonDB (use `expo-sqlite` first; migrate if sync complexity grows)

### Data Architecture

| Decision | Choice | Rationale |
| :--- | :--- | :--- |
| Remote DB | **Existing Supabase Postgres** | Single source of truth; no mobile-specific schema |
| Local DB | **expo-sqlite** | Outbox tables: `pending_knocks`, `pending_gps_pings`, `sync_meta` |
| Validation | **Zod schemas in `packages/shared`** | Extract from `src/lib/validators/*` incrementally |
| Types | **`packages/shared/src/database.ts`** | Re-export / symlink `supabase.generated` types |
| Caching | **TanStack Query v5** | Parity with web React Query patterns |
| Conflict policy | **Same as web** | Idempotency keys; duplicate knock warns; server wins on enum conflicts |

### Authentication & Security

| Decision | Choice | Rationale |
| :--- | :--- | :--- |
| Auth provider | **Supabase Auth** | Same users as web |
| Token storage | **expo-secure-store** via `@supabase/supabase-js` custom storage adapter | FR-3; not AsyncStorage |
| Mobile → Supabase | **Direct client** with session refresh | RLS-scoped reads where features allow |
| Mobile → Next API | **`Authorization: Bearer <access_token>`** | Cookies unavailable outside WebView |
| **Web change required** | `createClientFromRequest(request)` in `src/lib/supabase/server.ts` | Parse Bearer header; fallback to cookies for web |
| Admin on mobile | **Block screen** + link to web | FR-2 |
| Deep links | **`sunflare://`** scheme + `https://{APP_URL}/auth/*` universal links | Password reset, invite |
| Secrets in APK | **Only** `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `EXPO_PUBLIC_MAPBOX_TOKEN`, `EXPO_PUBLIC_API_URL` | Never service role |

### API & Communication Patterns

| Decision | Choice | Rationale |
| :--- | :--- | :--- |
| API style | **Existing REST** `/api/v1/*` | Reuse route handlers |
| JSON format | **snake_case** bodies/responses | Match web architecture |
| Error shape | `{ error: { code, message } }` | Match `apiError` helper |
| Base URL | `EXPO_PUBLIC_API_URL` → production Vercel URL | Absolute URLs from mobile |
| Supabase Realtime | **Not used on mobile v1** | Manager realtime is web-only; mobile uses Query invalidation |
| Geocoding | **`GET/POST /api/v1/geocode/reverse`** | Keeps `MAPBOX_SECRET_TOKEN` server-side |

**Mobile-consumed API routes (rep scope):**

| Route | Purpose |
| :--- | :--- |
| `POST /api/auth/login` | Optional — prefer Supabase `signInWithPassword` on device |
| `GET /api/v1/shifts/current` | Active shift |
| `POST /api/v1/shifts/start` | Clock in |
| `POST /api/v1/shifts/end` | Clock out |
| `POST /api/v1/gps/pings` | Background trail |
| `GET /api/v1/knocks?bbox=` | Map pins |
| `POST /api/v1/knocks/sync` | Batch offline knock upload |
| `POST /api/v1/knocks` | Online single knock (optional if sync covers all) |
| `GET /api/v1/knocks/history` | History list |
| `GET /api/v1/territories/mine` | Territory polygons |
| `GET /api/v1/geocode/reverse` | Address from lat/lng |
| `GET/POST /api/v1/contacts/*` | Contact search/create |
| `GET/POST /api/v1/calls/*` | Call logging |
| `GET/PATCH /api/v1/leads/*` | Pipeline |
| `POST /api/v1/push/subscribe` | **Extend** — accept Expo push token payload |

### Frontend Architecture (Mobile)

| Decision | Choice | Rationale |
| :--- | :--- | :--- |
| Navigation | **Expo Router** — `(tabs)` + stacks | Map, Pipeline, Calls, History, Profile |
| UI kit | **React Native core + small primitives** | No shadcn on RN; optional `nativewind` v4 later for Tailwind parity |
| Map | **`@rnmapbox/maps`** | Same provider/styles as web Mapbox |
| State | **TanStack Query** + React Context for Shift session | `useActiveShift` port |
| Forms | **React Hook Form + Zod** | Fast knock form |
| Location | **expo-location** + **expo-task-manager** | Background pings FR-7 |
| Notifications | **expo-notifications** | FCM on Android |
| Offline | **SQLite outbox + NetInfo-triggered sync loop** | Port `useKnockSyncLoop` semantics |

### Infrastructure & Deployment

| Decision | Choice | Rationale |
| :--- | :--- | :--- |
| Build service | **EAS Build** | APK/AAB, signing, CI |
| Dev | **Expo dev client** | Mapbox native module |
| OTA | **EAS Update** — `preview` / `production` channels | FR-25 |
| CI | **GitHub Actions** — `eas build --profile preview-apk` on tag | Same repo |
| Crash reporting | **Sentry** (`@sentry/react-native`) | NFR-M7 |
| Env | **EAS secrets** + `apps/mobile/.env.example` | No secrets in git |

**EAS profiles (`eas.json`):**

```json
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "android": { "buildType": "apk" }
    },
    "preview-apk": {
      "distribution": "internal",
      "android": { "buildType": "apk" }
    },
    "production": {
      "android": { "buildType": "app-bundle" }
    }
  }
}
```

---

## Implementation Patterns & Consistency Rules

### Naming Patterns

Inherit web architecture rules for **API JSON and DB** (snake_case). Mobile-specific:

| Layer | Convention | Example |
| :--- | :--- | :--- |
| Screens | `kebab-case` route files | `app/(tabs)/map/index.tsx` |
| Components | `PascalCase` | `DoorOutcomeSheet.tsx` |
| Hooks | `use` prefix | `useKnockSyncLoop.ts` |
| SQLite tables | `snake_case` | `pending_knocks` |
| Query keys | Match web | `['knocks', { bbox }]` |

### Mobile Offline Knock Flow

1. User submits knock → insert SQLite `pending_knocks` with `client_id` (UUID) + `idempotency_key`
2. Optimistic pin on Map (muted style) — same UX as web
3. `useKnockSyncLoop` polls every 10s when online + NetInfo connected
4. `POST {API_URL}/api/v1/knocks/sync` with Bearer token, batch ≤ `SYNC_KNOCKS_MAX_BATCH`
5. Requires active shift (403 `NO_ACTIVE_SHIFT` → surface UI prompt)
6. On success: delete pending row; on duplicate: show warning per FR-13

### Background GPS Flow

1. Shift start → register `TaskManager` task `SUNFLARE_GPS_PINGS`
2. Every ~120s: read location → insert to `pending_gps_pings` if offline, else `POST /api/v1/gps/pings`
3. Android foreground service notification: "Sunflare shift active"
4. Shift end → `Location.stopLocationUpdatesAsync` + unregister task

### Auth Flow

1. `supabase.auth.signInWithPassword` → store session in SecureStore
2. `apiClient` reads `session.access_token` for all `/api/v1/*` calls
3. On 401 → `supabase.auth.refreshSession()` once, retry; else logout
4. Profile role check → if `admin`, show `AdminWebOnlyScreen`

### Enforcement Guidelines

**All AI agents MUST:**

- Import enums from `packages/shared` — never duplicate door/call/pipeline enums
- Use Bearer auth for API routes from mobile
- Mirror web Zod payloads for sync/knocks/shifts exactly
- Gate GPS on active shift server-side (already enforced in `gps/pings` route)
- Use bbox-limited knock fetch — never unbounded global fetch

**Anti-patterns:**

- Embedding Mapbox secret token in APK
- Using WebView for core map/knock UX
- Cookie-based `credentials: 'include'` from React Native
- Duplicating `createKnockWithContact` logic client-side

---

## Project Structure & Boundaries

### Monorepo Layout (target)

```
sunflare/
├── package.json                 # workspaces root
├── apps/
│   └── mobile/                  # NEW Expo app
│       ├── app.json
│       ├── eas.json
│       ├── package.json
│       ├── tsconfig.json
│       ├── .env.example
│       └── app/                 # Expo Router
│           ├── _layout.tsx
│           ├── (auth)/
│           │   ├── login.tsx
│           │   └── reset-password.tsx
│           ├── (tabs)/
│           │   ├── _layout.tsx
│           │   ├── map/
│           │   ├── pipeline/
│           │   ├── calls/
│           │   └── history/
│           └── profile/
│       └── src/
│           ├── components/
│           ├── features/
│           │   ├── auth/
│           │   ├── knocks/
│           │   ├── shifts/
│           │   ├── pipeline/
│           │   ├── calls/
│           │   └── push/
│           ├── lib/
│           │   ├── api-client.ts
│           │   ├── supabase.ts
│           │   ├── sqlite/
│           │   └── geo/
│           └── tasks/
│               └── gps-background-task.ts
├── packages/
│   └── shared/
│       ├── package.json
│       └── src/
│           ├── validators/      # extracted Zod
│           ├── enums.ts
│           └── types/
├── src/                         # existing Next.js web (unchanged path for now)
├── supabase/
└── .github/workflows/
    └── eas-build.yml            # optional
```

**Migration strategy:** Add npm workspaces without moving web immediately. Extract validators to `packages/shared` in Epic 1 Story 1.

### FR → Component Mapping

| FR group | Mobile location |
| :--- | :--- |
| FR-1–4 Auth | `apps/mobile/app/(auth)/*`, `features/auth/*` |
| FR-5–7 Shift/GPS | `features/shifts/*`, `tasks/gps-background-task.ts` |
| FR-8–14 Map/Knocks | `app/(tabs)/map/*`, `features/knocks/*` |
| FR-15–18 Pipeline | `app/(tabs)/pipeline/*`, `features/pipeline/*` |
| FR-19–21 Calls | `app/(tabs)/calls/*`, `features/calls/*` |
| FR-22–23 Push/History | `features/push/*`, `app/(tabs)/history/*` |
| FR-24–25 Distribution | `eas.json`, `app/profile/index.tsx` |

### Web Backend Extensions (boundary)

| Change | File | Purpose |
| :--- | :--- | :--- |
| Bearer auth | `src/lib/supabase/server.ts` | `createClientFromRequest(request)` |
| Guards | `src/lib/auth/guards.ts` | Pass Request into session resolution |
| Push | `src/app/api/v1/push/subscribe/route.ts` | Accept `expo_push_token` + platform |
| CORS | `next.config.ts` | If needed for dev; production uses same-origin API URL |

### Data Flow

```
[Mobile App]
    ├─(JWT)──► [Supabase] ── RLS ──► Postgres
    └─(Bearer)──► [Vercel Next.js /api/v1] ──► Postgres
                         │
                         └──► Mapbox Geocoding (secret)
```

---

## Architecture Validation

### Coherence Check

| Check | Status |
| :--- | :--- |
| PRD FR coverage | All 25 FRs mapped to modules |
| Web enum parity | Shared package enforced |
| Offline sync parity | Same sync route + idempotency |
| GPS gating | Server validates active shift |
| Security | No service role in mobile; Bearer + RLS |
| Admin separation | Mobile block + web unchanged |

### Gaps Requiring Stories Before Build

1. **`createClientFromRequest`** — web API Bearer support (blocker)
2. **Validator extraction** to `packages/shared` (blocker for type safety)
3. **Expo push subscribe** API extension (blocker for FR-22)
4. **EAS project** + Android signing credentials (blocker for FR-24)

### Implementation Sequence

1. npm workspaces + `packages/shared` (enums + knock/shift validators)
2. Web: Bearer token auth on API routes
3. `create-expo-app` scaffold + dev client + Mapbox token
4. Auth + api-client + role gate
5. Shift start/end + background GPS task
6. Map + knock form + SQLite outbox + sync loop
7. Pipeline + Calls ports
8. Push notifications
9. EAS preview APK + internal distribution
10. Field pilot → production profile

---

## Relationship to Web Architecture

| Concern | Web (`architecture.md`) | Mobile (this doc) |
| :--- | :--- | :--- |
| Manager dashboard | `/admin/*` | Not built |
| Rep UI | `/rep/*` PWA | `apps/mobile` native |
| Offline store | Dexie (IndexedDB) | expo-sqlite |
| Service worker | Serwist | N/A |
| GPS | Foreground geolocation API | Background TaskManager |
| Auth transport | Cookies (SSR) | SecureStore + Bearer |
| Deployment | Vercel | EAS APK/AAB |

Both surfaces share **Supabase schema, RLS, enums, and `/api/v1` business logic**.

---

_Complete — ready for `bmad-create-epics-and-stories` or `bmad-quick-dev` scaffold._
