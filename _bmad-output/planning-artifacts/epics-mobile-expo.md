---
stepsCompleted:
  - step-01-validate-prerequisites
  - step-02-design-epics
  - step-03-create-stories
  - step-04-final-validation
inputDocuments:
  - _bmad-output/planning-artifacts/prds/prd-Sunflare-2026-06-26/prd.md
  - _bmad-output/planning-artifacts/prds/prd-Sunflare-2026-06-26/addendum.md
  - _bmad-output/planning-artifacts/architecture-mobile-expo.md
  - _bmad-output/planning-artifacts/architecture.md
project: Sunflare Mobile (Expo Android)
date: 2026-06-26
status: complete
parent_epics: _bmad-output/planning-artifacts/epics.md
---

# Sunflare Mobile (Expo Android) — Epic Breakdown

## Overview

This document decomposes the **Sunflare Mobile** PRD (FR-1–FR-25, NFR-M1–M7) into **8 user-value epics** and **30 implementable stories**, aligned with `architecture-mobile-expo.md`.

**Brownfield context:** The Next.js web PWA and Supabase backend are largely built (see `epics.md`). Mobile stories **reuse existing `/api/v1` routes and RLS** where possible. New web work is limited to Bearer auth, shared validators, and Expo push token registration.

**Delivery alignment:**

| Epic | Focus |
| :--- | :--- |
| 1–2 | Foundation + Expo scaffold (blockers) |
| 3 | Auth |
| 4 | Shift + background GPS (primary APK driver) |
| 5 | Map, knocks, offline sync |
| 6–7 | Pipeline + cold calls |
| 8 | Push, history, EAS release |

**Story ID convention:** Stories in this file are prefixed **M** in traceability tables (e.g. M2.3 = Mobile Epic 2 Story 3) to distinguish from web stories in `epics.md`.

---

## Requirements Inventory

### Functional Requirements (Mobile PRD)

FR-1: Email/password login via Supabase Auth with JWT session.  
FR-2: Rep-only mobile access; Admin redirected/blocked.  
FR-3: Secure session storage (OS secure store, not plain AsyncStorage).  
FR-4: Password reset via deep link.  
FR-5: Start Shift from Map; records `shift_started_at`; begins GPS.  
FR-6: End Shift; GPS stops immediately.  
FR-7: Background GPS trail ~120s while Shift active.  
FR-8: Interactive map with viewport-limited historic pins.  
FR-9: Territory polygon highlight for today's assignment.  
FR-10: Tap map or GPS snap to open knock flow with reverse geocode.  
FR-11: Door outcome form with six enums.  
FR-12: Offline knock capture in Outbox.  
FR-13: Duplicate knock warning (warn, don't hard-block).  
FR-14: Lead promotion from Interested / Callback Requested.  
FR-15: Pipeline list grouped by stage (own leads).  
FR-16: Lead detail with activity stream.  
FR-17: Stage update with validation (e.g. Lost reason).  
FR-18: Follow-up scheduling on Lead.  
FR-19: Contact search and create.  
FR-20: Call log entry with outcomes.  
FR-21: Click-to-call via device dialer.  
FR-22: Android push for follow-up reminders.  
FR-23: Personal knock/call history with filters.  
FR-24: Installable signed APK (Android 10+).  
FR-25: OTA JS updates via EAS Update.

### Non-Functional Requirements (Mobile PRD)

NFR-M1: Touch targets ≥44dp; thumb-reachable Map actions.  
NFR-M2: HTTPS only.  
NFR-M3: PII encrypted at rest in local Outbox DB.  
NFR-M4: JWT + RLS; no service-role in APK.  
NFR-M5: Cold start to interactive Map &lt;4s (reference device).  
NFR-M6: TalkBack labels on Shift and Knock form.  
NFR-M7: Crash-free sessions ≥99.5% (Sentry).

### Additional Requirements (Architecture)

- **Starter (Epic 2 Story 1):** `create-expo-app@sdk-56` under `apps/mobile` with dev client.
- **Monorepo:** npm workspaces; `packages/shared` for enums + Zod validators.
- **Web prerequisite:** `createClientFromRequest(request)` — Bearer + cookie auth on API routes.
- **Map:** `@rnmapbox/maps`; public Mapbox token only in APK.
- **Offline:** `expo-sqlite` outbox; same `POST /api/v1/knocks/sync` contract as web Dexie.
- **GPS:** `expo-location` + `expo-task-manager`; Android foreground service notification.
- **Push:** `expo-notifications` + extend `POST /api/v1/push/subscribe` for Expo tokens.
- **Build:** EAS Build `preview-apk` profile; internal distribution.
- **Naming:** snake_case API JSON; query keys match web patterns.

### UX Design Requirements

_No dedicated mobile UX spec. Derived from mobile PRD user journeys UJ-1–UJ-3 and NFR-M1._

UX-M1: Tab navigation — Map (home), Pipeline, Calls, History, Profile.  
UX-M2: Map-first home with floating Shift controls.  
UX-M3: Door outcome sheet completable in &lt;10s (single screen).  
UX-M4: Offline banner showing pending sync count.  
UX-M5: Pin colors match web `door-outcome-colors` semantics.  
UX-M6: End Shift requires confirmation dialog.

### FR Coverage Map

| FR | Epic | Story |
| :--- | :--- | :--- |
| — (foundation) | Epic 1 | M1.1–M1.3 |
| — (scaffold) | Epic 2 | M2.1–M2.4 |
| FR-1–FR-4 | Epic 3 | M3.1–M3.4 |
| FR-5–FR-7 | Epic 4 | M4.1–M4.3 |
| FR-8–FR-14 | Epic 5 | M5.1–M5.8 |
| FR-15–FR-18 | Epic 6 | M6.1–M6.4 |
| FR-19–FR-21 | Epic 7 | M7.1–M7.4 |
| FR-22–FR-25 | Epic 8 | M8.1–M8.4 |

---

## Epic List

### Epic 1: Monorepo Foundation & API Bridge

Developers can share types/validators between web and mobile, and mobile API calls authenticate via Bearer tokens.

**FRs covered:** Enables FR-1–FR-25 (foundation)  
**Web changes:** Yes

### Epic 2: Expo Application Scaffold

The mobile app runs in a dev client with navigation shell, environment config, and HTTP/Supabase clients wired to production backend.

**FRs covered:** Enables all mobile FRs  
**Depends on:** Epic 1 (shared package)

### Epic 3: Mobile Authentication & Rep Access

Reps sign in once, sessions persist securely, admins are directed to web, password reset works via deep link.

**FRs covered:** FR-1, FR-2, FR-3, FR-4

### Epic 4: Shift & Background GPS

Reps clock in/out and the app records reliable GPS breadcrumbs for managers on the web admin map.

**FRs covered:** FR-5, FR-6, FR-7

### Epic 5: Field Map & Door Logging

Reps canvass on a native map, log knocks (online or offline), see territories, and promote interested doors to leads.

**FRs covered:** FR-8, FR-9, FR-10, FR-11, FR-12, FR-13, FR-14

### Epic 6: Pipeline on Mobile

Reps manage their leads, update stages, and schedule follow-ups from the phone.

**FRs covered:** FR-15, FR-16, FR-17, FR-18

### Epic 7: Cold Call Tracking on Mobile

Reps search contacts, dial out, and log call outcomes between doors.

**FRs covered:** FR-19, FR-20, FR-21 (+ lead promotion reuses M5.8 / web API)

### Epic 8: Notifications, History & APK Release

Reps receive follow-up pushes, review history, and the team ships an internal APK with OTA update support.

**FRs covered:** FR-22, FR-23, FR-24, FR-25

---

## Epic 1: Monorepo Foundation & API Bridge

Developers can share types/validators between web and mobile, and mobile API calls authenticate via Bearer tokens.

### Story M1.1: Enable npm Workspaces

As a **developer**,
I want npm workspaces configured at the repo root,
So that `apps/mobile` and `packages/shared` can be developed in one repository.

**Acceptance Criteria:**

**Given** the existing Sunflare root `package.json`  
**When** workspaces are configured (`apps/*`, `packages/*`)  
**Then** `npm install` from root links local packages  
**And** `apps/mobile` can import from `@sunflare/shared`  
**And** existing web `npm run dev` / `npm run build` still work without moving `src/` yet  
**And** root `package.json` documents workspace commands in README or AGENTS.md

**Implements:** Architecture-mobile monorepo layout  
**NFRs:** —

---

### Story M1.2: Extract Shared Enums and Validators

As a **developer**,
I want door/call/pipeline enums and knock/shift Zod schemas in `packages/shared`,
So that mobile and web cannot drift on API contracts.

**Acceptance Criteria:**

**Given** `src/lib/validators/enums.ts` and knock/shift sync schemas in web  
**When** `packages/shared` is populated  
**Then** enums (`door_outcome`, `call_outcome`, `lead_stage`, `user_role`) are exported from `@sunflare/shared`  
**And** `syncKnocksBodySchema`, `gpsPingBodySchema`, and `mapBboxSchema` are exported  
**And** web code imports from `@sunflare/shared` with no enum duplication in `src/lib/validators/enums.ts`  
**And** `npm run build` passes

**Implements:** Architecture-mobile shared package  
**NFRs:** NFR-M4 (contract consistency)

---

### Story M1.3: Bearer Token Auth on Next.js API Routes

As a **mobile rep**,
I want API routes to accept my Supabase access token,
So that I can call `/api/v1/*` without browser cookies.

**Acceptance Criteria:**

**Given** a valid `Authorization: Bearer <access_token>` header on any `/api/v1/*` request  
**When** `requireRoleForApi` runs  
**Then** the user is resolved from the token via Supabase `getUser(jwt)`  
**And** role and RLS behavior match cookie-based web auth  
**And** requests without Bearer or cookie still return `401 UNAUTHORIZED`  
**And** existing web cookie auth continues to work unchanged  
**And** unit or integration test covers Bearer path for at least `GET /api/v1/shifts/current`

**Implements:** Architecture-mobile auth bridge; enables FR-1, all API-backed FRs  
**NFRs:** NFR-M2, NFR-M4

---

## Epic 2: Expo Application Scaffold

The mobile app runs in a dev client with navigation shell, environment config, and HTTP/Supabase clients wired to production backend.

### Story M2.1: Initialize Expo App with Dev Client

As a **developer**,
I want `apps/mobile` scaffolded with Expo SDK 56 and dev client,
So that native modules (Mapbox) can be developed and tested.

**Acceptance Criteria:**

**Given** an empty `apps/mobile` directory  
**When** `create-expo-app` runs with SDK 56 template  
**Then** Expo Router is configured under `apps/mobile/app/`  
**And** `expo-dev-client` is installed  
**And** `app.json` sets Android package name `com.sunflare.mobile` (or org-approved id)  
**And** `eas.json` exists with `development` and `preview-apk` profiles per architecture-mobile-expo.md  
**And** `npx expo start` launches without errors

**Implements:** Architecture-mobile starter  
**NFRs:** —

---

### Story M2.2: Configure Mapbox and Environment Variables

As a **developer**,
I want Mapbox and API env vars configured for mobile builds,
So that maps and backend URLs work across dev and EAS builds.

**Acceptance Criteria:**

**Given** `apps/mobile/.env.example`  
**When** env vars are documented and loaded via `expo-constants` / `app.config.ts`  
**Then** `EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN`, `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, and `EXPO_PUBLIC_API_URL` are defined  
**And** `@rnmapbox/maps` is installed and Mapbox access token is set at app startup  
**And** no `MAPBOX_SECRET_TOKEN` or `SUPABASE_SERVICE_ROLE_KEY` appears in mobile env  
**And** dev client build succeeds on Android emulator or device

**Implements:** Enables FR-8  
**NFRs:** NFR-M4

---

### Story M2.3: Rep Tab Navigation Shell

As a **rep**,
I want bottom-tab navigation between Map, Pipeline, Calls, and History,
So that I can reach core workflows in one tap.

**Acceptance Criteria:**

**Given** I am authenticated as a rep  
**When** I land in the app  
**Then** tabs exist for Map (default), Pipeline, Calls, and History  
**And** Profile/Settings is accessible (tab or header action)  
**And** primary tab actions meet 44dp minimum touch targets (NFR-M1)  
**And** unauthenticated users see only the auth stack

**Implements:** UX-M1; enables all feature epics  
**NFRs:** NFR-M1, NFR-M5 (shell only)

---

### Story M2.4: Supabase Client and API HTTP Client

As a **developer**,
I want reusable Supabase and REST clients for mobile,
So that features share auth headers and error handling.

**Acceptance Criteria:**

**Given** `apps/mobile/src/lib/supabase.ts` with SecureStore session adapter  
**When** `apps/mobile/src/lib/api-client.ts` wraps `fetch` to `EXPO_PUBLIC_API_URL`  
**Then** every request attaches `Authorization: Bearer` from current session  
**And** 401 triggers one `refreshSession` retry then logout  
**And** responses parse `{ data }` / `{ error: { code, message } }` per web API format  
**And** TanStack Query provider wraps the app root

**Implements:** Enables FR-1, all `/api/v1` FRs  
**NFRs:** NFR-M4

---

## Epic 3: Mobile Authentication & Rep Access

Reps sign in once, sessions persist securely, admins are directed to web, password reset works via deep link.

### Story M3.1: Email/Password Login

As a **rep**,
I want to log in with email and password,
So that I can access my field tools without using the browser.

**Acceptance Criteria:**

**Given** valid rep credentials  
**When** I submit the login form  
**Then** Supabase `signInWithPassword` succeeds and session is stored in SecureStore (FR-1, FR-3)  
**And** I am routed to the Map tab  
**And** invalid credentials show a generic error without email enumeration  
**And** session persists across app restart without re-login within token TTL

**Implements:** FR-1, FR-3  
**NFRs:** NFR-M4

---

### Story M3.2: Admin Role Block Screen

As an **admin**,
I want a clear message if I open the mobile app,
So that I use the web dashboard for management tasks.

**Acceptance Criteria:**

**Given** I log in with an admin `profiles.role`  
**When** auth profile loads  
**Then** I see an Admin Web Only screen with link to `EXPO_PUBLIC_API_URL` (or configured web URL)  
**And** I cannot access Map, Pipeline, Calls, or History tabs (FR-2)  
**And** no admin-only API data is fetched on mobile

**Implements:** FR-2  
**NFRs:** NFR-M4

---

### Story M3.3: Password Reset Deep Link

As a **rep**,
I want to reset my password from an email link on my phone,
So that I can recover access in the field.

**Acceptance Criteria:**

**Given** a Supabase password recovery link  
**When** it opens the app via `sunflare://` or universal link  
**Then** I can set a new password in-app  
**And** expired/invalid tokens show an actionable error  
**And** fallback opens web reset page if app not installed

**Implements:** FR-4  
**NFRs:** —

---

### Story M3.4: Profile, Logout, and App Version

As a **rep**,
I want to see my name, log out, and view the app version,
So that I can manage my session and report issues.

**Acceptance Criteria:**

**Given** I open Profile  
**When** the screen loads  
**Then** I see my name from `profiles` and app version + build number  
**And** Logout clears SecureStore and returns to login  
**And** logout does not leave pending outbox rows attributed to the next user (clear or re-key local DB)

**Implements:** FR-3 (session lifecycle)  
**NFRs:** NFR-M4

---

## Epic 4: Shift & Background GPS

Reps clock in/out and the app records reliable GPS breadcrumbs for managers on the web admin map.

### Story M4.1: Start and End Shift Controls

As a **rep**,
I want to start and end my shift from the Map screen,
So that GPS and metrics reflect my actual field time.

**Acceptance Criteria:**

**Given** I am on the Map tab  
**When** I tap Start Shift  
**Then** `POST /api/v1/shifts/start` succeeds and UI shows active shift state (FR-5)  
**And** location permission is requested (foreground + background) before tracking starts  
**And** permission denial blocks shift start with settings link  
**When** I tap End Shift  
**Then** confirm dialog appears; on confirm `POST /api/v1/shifts/end` runs (FR-6)  
**And** GPS task stops immediately

**Implements:** FR-5, FR-6  
**NFRs:** NFR-M1, NFR-M6 (labeled buttons)

---

### Story M4.2: Background GPS Task During Active Shift

As a **manager** (via web),
I want rep GPS breadcrumbs while their shift is active,
So that I can verify field coverage on the admin map.

**Acceptance Criteria:**

**Given** an active shift  
**When** the app is backgrounded on Android  
**Then** location updates fire approximately every 120 seconds (FR-7, NFR-M7 web parity)  
**And** a persistent foreground-service notification shows shift is active  
**And** `POST /api/v1/gps/pings` is called with `shift_id`, `lat`, `lng`  
**And** no pings are sent when shift is inactive  
**And** server rejects pings for wrong/inactive shift (existing route behavior)

**Implements:** FR-7  
**NFRs:** NFR-M2; SM-C1 (battery — use 120s interval)

---

### Story M4.3: Offline GPS Ping Queue

As a **rep** in a low-signal area,
I want GPS pings queued locally during my shift,
So that my trail is not lost until I reconnect.

**Acceptance Criteria:**

**Given** active shift and no network  
**When** a GPS interval fires  
**Then** ping is stored in SQLite `pending_gps_pings`  
**When** network returns  
**Then** queued pings flush to `/api/v1/gps/pings` without duplicates  
**And** pings older than shift end are discarded

**Implements:** FR-7 (offline resilience)  
**NFRs:** NFR-M3

---

## Epic 5: Field Map & Door Logging

Reps canvass on a native map, log knocks (online or offline), see territories, and promote interested doors to leads.

### Story M5.1: Rep Map with Live Location and Historic Pins

As a **rep**,
I want a map centered on my location with my knock pins,
So that I can see coverage while canvassing.

**Acceptance Criteria:**

**Given** the Map tab with location permission  
**When** the map loads  
**Then** user location displays and map fetches pins via `GET /api/v1/knocks?bbox=` on viewport change  
**And** up to 500 pins in viewport render within 2s on reference Android device (FR-8)  
**And** pin colors match door outcome semantics (UX-M5)  
**And** bbox span respects server `MAX_BBOX_SPAN_DEGREES`

**Implements:** FR-8  
**NFRs:** NFR-M1, NFR-M5

---

### Story M5.2: Assigned Territory Overlay

As a **rep**,
I want my assigned territory highlighted when I start a shift,
So that I know where to canvass.

**Acceptance Criteria:**

**Given** territory assignments exist for today  
**When** I view the Map (especially after shift start)  
**Then** `GET /api/v1/territories/mine` polygons render as translucent fills (FR-9)  
**And** no assignment shows an informational empty state  
**And** polygon GeoJSON matches web rep map

**Implements:** FR-9  
**NFRs:** —

---

### Story M5.3: Tap to Log and Reverse Geocode

As a **rep**,
I want to tap the map or use my GPS to start a knock,
So that the address is prefilled quickly.

**Acceptance Criteria:**

**Given** the Map tab  
**When** I tap a location or use "Log at my location"  
**Then** reverse geocode runs via `/api/v1/geocode/reverse`  
**And** I can edit the address before submitting (FR-10)  
**And** typical flow opens the outcome form in under 10 seconds (FR-11 target)

**Implements:** FR-10  
**NFRs:** NFR-M1

---

### Story M5.4: Door Outcome Form and Submit

As a **rep**,
I want a fast outcome picker with optional notes and follow-up,
So that I can log doors while walking.

**Acceptance Criteria:**

**Given** the knock form  
**When** I select one of six door outcomes and submit  
**Then** payload uses snake_case fields matching web validators  
**And** Interested and Callback Requested enable lead promotion path (FR-11)  
**And** controls have TalkBack labels (NFR-M6)

**Implements:** FR-11  
**NFRs:** NFR-M1, NFR-M6

---

### Story M5.5: SQLite Knock Outbox

As a **rep** without connectivity,
I want knocks saved locally,
So that I never lose field data.

**Acceptance Criteria:**

**Given** no network (or explicit offline simulation)  
**When** I submit a knock  
**Then** a row is inserted in SQLite `pending_knocks` with `client_id` and `idempotency_key` (FR-12)  
**And** data survives app kill and restart  
**And** PII fields are encrypted at rest (NFR-M3)  
**And** UI shows pending sync count banner (UX-M4)

**Implements:** FR-12  
**NFRs:** NFR-M3, NFR-M4

---

### Story M5.6: Knock Sync Loop

As a **rep**,
I want pending knocks to upload automatically when I'm back online,
So that managers see my activity without manual sync.

**Acceptance Criteria:**

**Given** pending knocks and an active shift  
**When** network is available  
**Then** `POST /api/v1/knocks/sync` runs in batches ≤ `SYNC_KNOCKS_MAX_BATCH`  
**And** successful rows are removed from SQLite within 30s of reconnect for typical queue sizes (FR-12)  
**And** `NO_ACTIVE_SHIFT` returns actionable UI prompting shift start  
**And** sync loop polls on interval matching web (~10s) when online

**Implements:** FR-12  
**NFRs:** NFR-M2

---

### Story M5.7: Duplicate Knock Warning

As a **rep**,
I want a warning if someone already knocked this address today,
So that I have context before logging again.

**Acceptance Criteria:**

**Given** an address with a knock logged today by any rep  
**When** I attempt to submit  
**Then** a warning shows prior log summary (FR-13)  
**And** I can acknowledge and still submit (per PRD v1 decision #5)  
**And** behavior matches web `DUPLICATE_KNOCK_TODAY` handling

**Implements:** FR-13  
**NFRs:** —

---

### Story M5.8: Promote Interested Door to Lead

As a **rep**,
I want Interested or Callback knocks to create pipeline leads,
So that follow-ups are tracked in one system.

**Acceptance Criteria:**

**Given** outcome Interested or Callback Requested  
**When** knock sync or create succeeds  
**Then** Lead appears in Pipeline with D2D channel tag (FR-14)  
**And** Contact is created or linked per web `createKnockWithContact` behavior  
**And** I can add notes and follow-up date in flow or on lead detail

**Implements:** FR-14  
**NFRs:** —

---

## Epic 6: Pipeline on Mobile

Reps manage their leads, update stages, and schedule follow-ups from the phone.

### Story M6.1: Pipeline List by Stage

As a **rep**,
I want to see my leads grouped by pipeline stage,
So that I can prioritize follow-ups in the field.

**Acceptance Criteria:**

**Given** the Pipeline tab  
**When** it loads  
**Then** my leads display grouped by stage enums matching web (FR-15)  
**And** pull-to-refresh syncs latest data  
**And** I cannot see other reps' leads (RLS)

**Implements:** FR-15  
**NFRs:** NFR-M4

---

### Story M6.2: Lead Detail and Activity Stream

As a **rep**,
I want full lead detail with knock/call history,
So that I have context before a callback.

**Acceptance Criteria:**

**Given** a lead I own  
**When** I open lead detail  
**Then** contact info, stage, notes, and activity stream match web for same lead (FR-16)  
**And** deep link from push notification opens correct lead (enables FR-22)

**Implements:** FR-16  
**NFRs:** —

---

### Story M6.3: Pipeline Stage Updates

As a **rep**,
I want to move my leads between stages,
So that pipeline state stays current.

**Acceptance Criteria:**

**Given** lead detail or stage picker  
**When** I move to a new stage  
**Then** `PATCH /api/v1/leads/[id]/stage` validates transitions server-side (FR-17)  
**And** moving to Lost requires lost reason enum  
**And** audit trail records on server per web behavior

**Implements:** FR-17  
**NFRs:** —

---

### Story M6.4: Schedule Follow-Up on Lead

As a **rep**,
I want to set follow-up date/time on a lead,
So that I am reminded to call back.

**Acceptance Criteria:**

**Given** lead detail  
**When** I set a follow-up date/time  
**Then** value persists to same DB field as web (FR-18)  
**And** UI uses native date/time pickers with 44dp targets  
**And** follow-up is eligible for push dispatch (Epic 8)

**Implements:** FR-18  
**NFRs:** NFR-M1

---

## Epic 7: Cold Call Tracking on Mobile

Reps search contacts, dial out, and log call outcomes between doors.

### Story M7.1: Contact Search and Create

As a **rep**,
I want to find or add contacts on my phone,
So that I can log calls without duplicate records.

**Acceptance Criteria:**

**Given** the Calls tab  
**When** I search by name, phone, or address  
**Then** results return within 1s on 4G via `/api/v1/contacts/search` (FR-19)  
**And** I can create a new contact when none exists  
**And** duplicate suggestions appear when matches exist

**Implements:** FR-19  
**NFRs:** —

---

### Story M7.2: Log Call with Outcome

As a **rep**,
I want to record call outcome, duration, and notes,
So that my manager sees call activity.

**Acceptance Criteria:**

**Given** a selected contact  
**When** I submit call log form  
**Then** six call outcome enums match web (FR-20)  
**And** Interested / Callback Scheduled enables lead promotion  
**And** payload validates against shared Zod schemas

**Implements:** FR-20  
**NFRs:** —

---

### Story M7.3: Click-to-Call

As a **rep**,
I want to dial a contact from the app,
So that I don't manually copy phone numbers.

**Acceptance Criteria:**

**Given** a contact with phone number  
**When** I tap the phone number  
**Then** Android dialer opens with number pre-filled via `tel:` (FR-21)

**Implements:** FR-21  
**NFRs:** NFR-M1

---

### Story M7.4: Promote Call to Lead

As a **rep**,
I want interested calls to become pipeline leads,
So that D2D and call channels share one funnel.

**Acceptance Criteria:**

**Given** call outcome Interested or Callback Scheduled  
**When** I promote to lead  
**Then** lead is created with Cold Call channel tag  
**And** lead appears on Pipeline tab  
**And** behavior matches web `promote-call-to-lead` API

**Implements:** FR-20 extension (parity with web FR-27)  
**NFRs:** —

---

## Epic 8: Notifications, History & APK Release

Reps receive follow-up pushes, review history, and the team ships an internal APK with OTA update support.

### Story M8.1: Personal Knock and Call History

As a **rep**,
I want filterable history of my knocks and calls,
So that I can review my day.

**Acceptance Criteria:**

**Given** the History tab  
**When** I load or filter by date/outcome  
**Then** list matches web rep history semantics (FR-23)  
**And** pending unsynced knocks show distinct "pending" state  
**And** pagination or infinite scroll handles long lists

**Implements:** FR-23  
**NFRs:** —

---

### Story M8.2: Expo Push Notifications for Follow-Ups

As a **rep**,
I want push reminders for scheduled follow-ups,
So that I don't miss callbacks.

**Acceptance Criteria:**

**Given** notification permission granted  
**When** I schedule a follow-up (or on first pipeline use)  
**Then** Expo push token registers via extended `POST /api/v1/push/subscribe` (FR-22)  
**And** when follow-up is due, Android notification displays  
**And** tapping notification opens lead detail (M6.2)  
**And** opt-in flow explains value before system permission prompt

**Implements:** FR-22  
**NFRs:** —

---

### Story M8.3: EAS Preview APK Build

As a **team lead**,
I want a signed APK for internal Android install,
So that reps can use the native app without the browser.

**Acceptance Criteria:**

**Given** EAS project linked and Android credentials configured  
**When** `eas build --profile preview-apk` runs in CI or locally  
**Then** a signed APK artifact is produced installable on Android 10+ (FR-24)  
**And** install instructions are documented for sideload or private track  
**And** Mapbox and Supabase env vars are injected via EAS secrets

**Implements:** FR-24  
**NFRs:** NFR-M7 (Sentry DSN in EAS secrets recommended)

---

### Story M8.4: OTA Updates and Version Display

As a **developer**,
I want JS updates without full APK reinstall for non-native changes,
So that we can ship fixes quickly after pilot.

**Acceptance Criteria:**

**Given** EAS Update configured with `preview` and `production` channels  
**When** app cold starts  
**Then** update check runs (FR-25)  
**And** Profile shows version, build number, and update channel  
**And** documentation states when a new APK is required (native module changes)

**Implements:** FR-25  
**NFRs:** —

---

## Implementation Order Summary

```
M1.1 → M1.2 → M1.3 → M2.1 → M2.2 → M2.3 → M2.4 → M3.1 → M3.2
→ M4.1 → M4.2 → M4.3 → M5.1 → M5.2 → M5.3 → M5.4 → M5.5 → M5.6
→ M5.7 → M5.8 → M6.1 → M6.2 → M6.3 → M6.4 → M7.1 → M7.2 → M7.3
→ M7.4 → M8.1 → M8.2 → M8.3 → M8.4
```

**Parallelization notes:**

- M3.3–M3.4 can run parallel to Epic 4 after M3.1.
- Epic 6–7 can overlap after M5.8.
- M8.3 can start once M2.1 + M3.1 pass smoke on device.

---

## Validation Checklist

| Check | Status |
| :--- | :--- |
| All FR-1–FR-25 mapped to stories | ✅ |
| NFR-M1–M7 addressed in story NFR lines | ✅ |
| Web Bearer auth story before mobile API features | ✅ M1.3 before M4+ |
| No admin mobile scope creep | ✅ |
| Reuses existing backend routes | ✅ |
| Distinct from web `epics.md` story IDs | ✅ M-prefix |

---

_Ready for `bmad-dev-story` / `bmad-quick-dev` starting at **M1.1**._
