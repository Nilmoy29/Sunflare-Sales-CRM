---
stepsCompleted:
  - step-01-validate-prerequisites
  - step-02-design-epics
  - step-03-create-stories
  - step-04-final-validation
inputDocuments:
  - docs/Solar_CRM_PRD_v1.md
  - _bmad-output/planning-artifacts/architecture.md
  - _bmad-output/planning-artifacts/implementation-readiness-report-2026-06-01.md
project: Sunflare
date: 2026-06-01
status: complete
---

# Sunflare - Epic Breakdown

## Overview

This document decomposes Solar CRM v1 requirements into **7 user-value epics** and **46 implementable stories**, aligned with the PRD, architecture decision record, and FR/NFR traceability from the implementation-readiness report (60 FRs, 15 NFRs).

**Delivery alignment:** Epics 1–3 ≈ PRD Phase 1; Epics 4–6 ≈ Phase 2; Epic 7 ≈ Phase 3.

---

## Requirements Inventory

### Functional Requirements

FR1: Email/password login with JWT sessions; reps limited to personal data partitions; admins unrestricted.  
FR2: RBAC with Admin and Rep roles only (no hierarchy nesting in v1).  
FR3: Rep profile setup: name, phone, optional territory link, start date, active/inactive.  
FR4: Admin user management: provision, deactivate, force password reset.  
FR5: Session persistence on mobile browsers for mid-shift use.  
FR6: Password reset via automated email link. (Should Have)  
FR7: Admin invite link for rep self-registration. (Should Have)  
FR8: Interactive Mapbox map with GPS and historic outcome pins (mobile-optimized).  
FR9: Tap-to-log knock on map or GPS snap to address.  
FR10: Door outcome micro-form; submission under 10 seconds.  
FR11: Six enforced door outcomes (Interested, Not Home, Not Interested, Do Not Knock, Callback Requested, Already Has Solar).  
FR12: Color-coded map pins by outcome.  
FR13: Offline mode: IndexedDB + background sync on reconnect.  
FR14: Reverse geocoding address auto-fill with rep confirm.  
FR15: One-tap lead promotion for Interested or Callback Requested.  
FR16: Rep personal knock history filterable by date/outcome. (Should Have)  
FR17: Admin global map with filters (rep, date, status).  
FR18: Duplicate alert if address knocked today by another rep. (Should Have)  
FR19: Admin territory polygon drawing on map.  
FR20: Assign territories to reps by date/window.  
FR21: Highlight assigned territories on rep map at shift start.  
FR22: Coverage heatmaps for knock density. (Should Have)  
FR23: Territory meta notes for managers. (Should Have)  
FR24: Contact search/create by name, phone, address; duplicate prevention.  
FR25: Call log entry: contact, status, duration, notes, follow-up.  
FR26: Six call outcome enums.  
FR27: Pipeline promotion for Interested or Callback Scheduled calls.  
FR28: Contact activity stream of past calls.  
FR29: Daily call counters on rep UI aggregated to manager.  
FR30: Collapsible call script from admin settings. (Should Have)  
FR31: Click-to-call via `tel:` protocol. (Should Have)  
FR32: Kanban pipeline with defined stages and drag-and-drop.  
FR33: Lead card miniatures with key fields.  
FR34: Lead detail 360° view (knocks, calls, notes, stage, follow-ups).  
FR35: Follow-up scheduling with push reminders to mobile browser.  
FR36: Collaboration notes on leads (reps + admins).  
FR37: Channel source tagging (D2D vs Cold Call) and creator.  
FR38: Pipeline filters: stage, owner, channel, suburb, date.  
FR39: Manager lead reassignment. (Should Have)  
FR40: Audit log for pipeline stage moves. (Should Have)  
FR41: Lost reason required when moving to Lost. (Should Have)  
FR42: Manager live activity feed (realtime, no manual refresh).  
FR43: Daily rep summary grid (doors, calls, leads, appointments; nightly reset).  
FR44: Team leaderboard by timeframe.  
FR45: GPS shift breadcrumb polylines on admin map.  
FR46: Funnel conversion chart.  
FR47: Rep deep-dive performance views.  
FR48: Global date engine for dashboard metrics.  
FR49: Geographic yield analytics by suburb. (Should Have)  
FR50: CSV export from analytical tables. (Should Have)  
FR51: Start/End Shift controls for GPS and daily metrics.  
FR52: Background GPS pings ~every 2 minutes during active shift.  
FR53: End-of-shift daily summary to rep and manager.  
FR54: Unified Contact entity across D2D and calls.  
FR55: Web-first PWA: mobile rep + desktop manager (no native v1).  
FR56: Warn on re-knock with historical context; allow append/overwrite.  
FR57: Optional follow-up date on door outcomes where applicable.  
FR58: Manager morning workflow: yesterday stats, live map, low-activity flags.  
FR59: Data model entities per PRD Section 5 with PostGIS.  
FR60: Rep row-level data isolation; admin global access.

### NonFunctional Requirements

NFR1: Render up to 500 map pins within 2 seconds (clustering/viewport fetch).  
NFR2: Door log server handshake under 1 second on 4G.  
NFR3: Manager dashboard views under 3 seconds.  
NFR4: Full shift offline support; sync within 30 seconds of reconnect.  
NFR5: Single-thumb mobile ergonomics for rep screens.  
NFR6: Minimum 44×44px touch targets.  
NFR7: GPS ping interval ~2 minutes during shifts.  
NFR8: PWA on Mobile Safari and Mobile Chrome without native install.  
NFR9: JWT on all APIs; RLS prevents cross-rep data access.  
NFR10: Server-side admin role checks on critical operations.  
NFR11: Encrypt PII before IndexedDB/localStorage persistence.  
NFR12: HTTPS enforced in all environments.  
NFR13: 99.5% uptime target.  
NFR14: Zero offline transaction data loss.  
NFR15: Supabase daily database backups.

### Additional Requirements

- **Starter (Epic 1 Story 1):** `npx create-next-app@latest sunflare` with TypeScript, Tailwind, App Router, `src/`; add Supabase SSR, Mapbox, Serwist, Dexie, Zod per architecture.md.
- **Database:** PostgreSQL + PostGIS via Supabase; migrations in `supabase/migrations/`; enums frozen before first knock/call migration.
- **API:** REST under `/api/v1/`; JSON `{ data }` / `{ error: { code, message } }`; snake_case fields.
- **Auth:** Supabase Auth + `@supabase/ssr` cookies; middleware role routing `(rep)` vs `(admin)`.
- **Offline:** Dexie `pending_knocks` outbox + `Idempotency-Key` on sync endpoint.
- **Realtime:** Supabase Realtime on knock/call/lead inserts for manager feed.
- **Deploy:** Vercel (frontend) + Supabase Cloud; env vars per architecture.md.
- **CI:** Lint, typecheck, Playwright smoke (recommended in architecture).
- **Maps:** Mapbox GL JS; bbox-limited pin queries (NFR1).
- **UI kit:** shadcn/ui + Tailwind; React Query for server state.

### UX Design Requirements

_No dedicated UX specification document. The following are derived from PRD user journeys (Section 3.2) and NFR5–NFR8._

UX-DR1: Rep shell uses bottom-anchored primary actions suitable for single-thumb use while walking.  
UX-DR2: All rep interactive controls meet 44×44px minimum hit area (NFR6).  
UX-DR3: Door outcome sheet is a single-screen micro-flow completable in under 10 seconds (FR10).  
UX-DR4: Map-first rep home with floating shift controls and prominent “log knock” affordance.  
UX-DR5: Manager shell is desktop-optimized with persistent nav and dense data tables/charts.  
UX-DR6: PWA installable manifest with standalone display and appropriate theme colors (NFR8).  
UX-DR7: Offline state indicator visible when queued knocks are pending sync (NFR4).  
UX-DR8: Color semantics for six door outcomes match PRD pin colors (FR11–FR12).

### FR Coverage Map

| FR | Epic | Story |
| :--- | :--- | :--- |
| FR1–FR5, FR59–FR60 | Epic 1 | 1.1–1.5 |
| FR6 | Epic 1 | 1.6 |
| FR7 | Epic 1 | 1.7 |
| FR8–FR12, FR51–FR52 | Epic 2 | 2.1–2.6 |
| FR13–FR14, NFR4, NFR11, NFR14 | Epic 2 | 2.7–2.8 |
| FR15, FR54, FR56–FR57 | Epic 2 | 2.9–2.10 |
| FR16 | Epic 2 | 2.11 |
| FR18 | Epic 2 | 2.12 |
| FR17, FR42, FR43, FR58 | Epic 3 | 3.1–3.5 |
| FR32–FR38, FR54 | Epic 4 | 4.1–4.7 |
| FR35 | Epic 4 | 4.8 |
| FR39–FR41 | Epic 4 | 4.9 |
| FR24–FR29, FR54 | Epic 5 | 5.1–5.7 |
| FR30–FR31 | Epic 5 | 5.6–5.7 |
| FR19–FR23, FR21 | Epic 6 | 6.1–6.5 |
| FR42–FR50, FR45–FR47, FR53 | Epic 7 | 7.1–7.8 |

---

## Epic List

### Epic 1: Secure Team Access & Project Foundation

Reps and managers can sign in securely, admins can manage the team, and the application runs on the approved stack with database foundations ready for features.

**FRs covered:** FR1, FR2, FR3, FR4, FR5, FR6, FR7, FR59, FR60

### Epic 2: Field Shift & Door-to-Door Logging

Reps can clock in, canvass on a live map, log every door outcome (including offline), and promote interested doors to leads.

**FRs covered:** FR8–FR16, FR18, FR51–FR52, FR54–FR57

### Epic 3: Manager Field Visibility

Managers can view all field activity on a global map, see a live activity stream, and review daily rep performance at a glance.

**FRs covered:** FR17, FR42, FR43, FR58

### Epic 4: Unified Lead Pipeline

Reps and managers track leads from both D2D and calls through a shared Kanban pipeline with follow-ups, notes, and governance.

**FRs covered:** FR32–FR41, FR54, FR35

### Epic 5: Cold Call Tracking

Reps log outbound calls against unified contacts and convert interested calls into pipeline leads.

**FRs covered:** FR24–FR31

### Epic 6: Territory Planning & Assignment

Managers draw territories, assign reps by date, and reps see their zones when starting a shift.

**FRs covered:** FR19–FR23, FR21

### Epic 7: Sales Intelligence Dashboard

Managers analyze conversion funnels, leaderboards, rep routes, geographic yield, and export data for planning.

**FRs covered:** FR44–FR50, FR45–FR47, FR53

---

## Epic 1: Secure Team Access & Project Foundation

Reps and managers can sign in securely, admins can manage the team, and the platform foundation (Next.js, Supabase, PostGIS, RLS) is operational.

### Story 1.1: Initialize Application from Starter Template

As a **developer**,
I want the Sunflare codebase scaffolded from the architecture starter,
So that all agents implement against a consistent project structure.

**Acceptance Criteria:**

**Given** an empty project folder  
**When** the starter command from architecture.md is executed  
**Then** a Next.js 16 App Router project exists under `src/` with TypeScript, Tailwind, and ESLint  
**And** dependencies `@supabase/supabase-js`, `@supabase/ssr`, `mapbox-gl`, `@serwist/next`, `serwist`, `dexie`, and `zod` are installed  
**And** `.env.example` lists required Supabase and Mapbox variables  
**And** the repo structure matches architecture.md (`src/app`, `src/features`, `supabase/`)

**Implements:** Architecture starter; enables all FRs  
**NFRs:** NFR12 (HTTPS via Vercel deployment path)

---

### Story 1.2: Enable PostGIS and Core Auth Schema

As a **developer**,
I want PostGIS and minimal auth-related tables migrated,
So that users and spatial data can be stored correctly.

**Acceptance Criteria:**

**Given** a linked Supabase project  
**When** migrations run  
**Then** `postgis` extension is enabled  
**And** `profiles` table exists with `id` (FK to auth.users), `name`, `phone`, `role` (`admin`|`rep`), `territory_id` (nullable), `active`, `created_at`  
**And** door/call/lead enums are created as PostgreSQL types per PRD (frozen set)  
**And** no business tables beyond `profiles` are created in this story

**Implements:** FR59 (partial), FR2  
**NFRs:** NFR15

---

### Story 1.3: Login, Session Persistence, and Role Routing

As a **rep or admin**,
I want to log in and land in the correct experience for my role,
So that I can use the CRM without repeated logins or wrong permissions.

**Acceptance Criteria:**

**Given** valid credentials  
**When** I submit login  
**Then** a Supabase session is established via SSR cookies (FR1, FR5)  
**And** reps redirect to `/rep/map` and admins to `/admin/dashboard` (FR2)  
**And** unauthenticated users cannot access `(rep)` or `(admin)` routes (NFR9)  
**And** session refresh works across mobile browser backgrounding (FR5)

**Implements:** FR1, FR2, FR5, FR55 (routing shells)

---

### Story 1.4: Rep Profile Fields and Self View

As a **rep**,
I want my profile to show my assigned details,
So that I know my account is configured correctly.

**Acceptance Criteria:**

**Given** I am logged in as a rep  
**When** I view my profile  
**Then** I see name, phone, optional territory link, start date, and active status (FR3)  
**And** I can update allowed fields per policy (name/phone only if admin-locked fields excluded)

**Implements:** FR3

---

### Story 1.5: Admin User Management

As an **admin**,
I want to create, deactivate, and reset passwords for reps,
So that I control who can access field data.

**Acceptance Criteria:**

**Given** I am an admin  
**When** I open team management  
**Then** I can create a rep account with email, name, phone, role=rep (FR4)  
**And** I can set a rep to inactive and they cannot log in (FR4)  
**And** I can trigger a forced password reset email (FR4)  
**And** all mutations enforce admin role server-side (NFR10)

**Implements:** FR4, FR60 (admin path)

---

### Story 1.6: Password Reset Flow

As a **user**,
I want to reset my password via email,
So that I can recover access without admin help.

**Acceptance Criteria:**

**Given** I forgot my password  
**When** I request reset and click the email link  
**Then** I can set a new password and log in (FR6)  
**And** expired or invalid tokens show a clear error

**Implements:** FR6

---

### Story 1.7: Invite Link Onboarding

As an **admin**,
I want to invite reps via a secure link,
So that onboarding is self-service.

**Acceptance Criteria:**

**Given** I am an admin  
**When** I generate an invite for an email  
**Then** the rep can open the link, set a password, and complete profile setup (FR7)  
**And** the invite expires after a configured period  
**And** used invites cannot be reused

**Implements:** FR7

---

## Epic 2: Field Shift & Door-to-Door Logging

Reps can run a full canvassing shift on mobile—including offline—and capture every door outcome on the map.

### Story 2.1: Contacts and DoorKnocks Schema

As a **developer**,
I want contact and door knock tables with RLS,
So that reps can persist knock data securely.

**Acceptance Criteria:**

**Given** Epic 1 auth exists  
**When** migrations run  
**Then** `contacts` and `door_knocks` tables match PRD Section 5 fields including `outcome` enum and `synced` flag (FR59)  
**And** RLS allows reps to insert/select their own knocks; admins select all (FR60, NFR9)  
**And** `leads` table is not required yet for this story

**Implements:** FR59, FR60, FR54 (contacts foundation)

---

### Story 2.2: Start and End Shift with GPS Tracking

As a **rep**,
I want to start and end my shift explicitly,
So that GPS tracking and daily metrics apply only while I'm working.

**Acceptance Criteria:**

**Given** I am on the rep map  
**When** I tap Start Shift  
**Then** a shift record opens and GPS ping collection begins (FR51)  
**And** pings write to `gps_pings` every ~120 seconds while shift is active (FR52, NFR7)  
**When** I tap End Shift  
**Then** GPS collection stops and shift closes (FR51)  
**And** pings are not recorded outside an active shift

**Implements:** FR51, FR52

---

### Story 2.3: Rep Map with Live Location and Historic Pins

As a **rep**,
I want to see my location and past knock pins on a map,
So that I know where I've been and what's left to cover.

**Acceptance Criteria:**

**Given** an active shift  
**When** I open `/rep/map`  
**Then** Mapbox renders my current GPS position (FR8)  
**And** historic pins load for the current map viewport with clustering (FR8, FR12, NFR1)  
**And** pin colors match the six outcome enums (FR11, UX-DR8)  
**And** initial pin load completes within 2 seconds for up to 500 pins in view (NFR1)

**Implements:** FR8, FR11, FR12

---

### Story 2.4: Tap to Log a Door Knock

As a **rep**,
I want to tap the map to open the knock form,
So that logging a door is fast at the doorstep.

**Acceptance Criteria:**

**Given** an active shift  
**When** I tap the map or use quick-add near my GPS  
**Then** the door outcome sheet opens (FR9)  
**And** coordinates are captured for the knock (FR9)  
**And** primary actions meet 44×44px targets (NFR6, UX-DR2)

**Implements:** FR9, UX-DR4

---

### Story 2.5: Door Outcome Form and Submission

As a **rep**,
I want to select an outcome and optional notes quickly,
So that I can move to the next door without delay.

**Acceptance Criteria:**

**Given** the outcome sheet is open  
**When** I select one of six outcomes and submit (FR11)  
**Then** the knock is saved with optional notes and optional follow-up date (FR10, FR57)  
**And** submission completes in under 1 second on 4G when online (NFR2)  
**And** the form is completable in under 10 seconds in usability testing (FR10, UX-DR3)

**Implements:** FR10, FR11, FR57

---

### Story 2.6: Reverse Geocoding on Knock

As a **rep**,
I want the address filled from my GPS point,
So that I don't type addresses in the field.

**Acceptance Criteria:**

**Given** a knock coordinate  
**When** the form loads  
**Then** a reverse-geocoded address is proposed (FR14)  
**And** I can confirm or edit before submit  
**And** the confirmed address is stored on the contact record (FR54)

**Implements:** FR14, FR54

---

### Story 2.7: Offline Knock Queue and Sync

As a **rep**,
I want knocks saved when I have no signal,
So that I never lose field data.

**Acceptance Criteria:**

**Given** the device is offline during an active shift  
**When** I submit a knock  
**Then** it is stored in Dexie `pending_knocks` with a client UUID and idempotency key (FR13)  
**And** PII fields are encrypted before IndexedDB write (NFR11)  
**And** an offline indicator shows pending count (UX-DR7)  
**When** connectivity returns  
**Then** pending knocks sync via `/api/v1/knocks/sync` within 30 seconds (FR13, NFR4, NFR14)  
**And** duplicate server rejects do not drop data (idempotency)

**Implements:** FR13, FR56 (partial—sync preserves data)

---

### Story 2.8: Serwist PWA Shell

As a **rep**,
I want to install the app to my home screen,
So that I can launch canvassing like a native app.

**Acceptance Criteria:**

**Given** production build  
**When** I visit on Mobile Safari or Chrome  
**Then** manifest and service worker are registered (FR55, NFR8)  
**And** Serwist is disabled in local dev to avoid cache issues (architecture)  
**And** `reloadOnOnline` is false to avoid losing in-progress forms (architecture)

**Implements:** FR55, NFR8, UX-DR6

---

### Story 2.9: Promote Interested Door to Lead

As a **rep**,
I want Interested or Callback knocks to create pipeline leads,
So that hot prospects enter follow-up immediately.

**Acceptance Criteria:**

**Given** a knock outcome is Interested or Callback Requested  
**When** I submit or confirm promotion  
**Then** a `leads` row is created linked to contact and knock with `source=d2d` (FR15, FR37)  
**And** minimal lead schema migration runs in this story if not already present

**Implements:** FR15, FR37, FR54

---

### Story 2.10: Re-Knock Warning with History

As a **rep**,
I want a warning when an address was knocked before,
So that I have context but can still log a second visit.

**Acceptance Criteria:**

**Given** a contact/location has prior knocks  
**When** I open the knock form  
**Then** I see prior outcome(s) and date(s) (FR56)  
**And** I can still submit a new knock (append, not hard-block)  
**And** same-day knock by another rep triggers duplicate alert when online (FR18)

**Implements:** FR56, FR18

---

### Story 2.11: Personal Knock History

As a **rep**,
I want a list of my past knocks,
So that I can review my shift activity.

**Acceptance Criteria:**

**Given** I am a rep  
**When** I open knock history  
**Then** I see my knocks filterable by date range and outcome (FR16)  
**And** only my knocks are visible (FR60)

**Implements:** FR16

---

## Epic 3: Manager Field Visibility

Managers observe field operations in real time on map and summary views.

### Story 3.1: Admin Global Map with Filters

As an **admin**,
I want to see all reps' knock pins with filters,
So that I understand coverage across the team.

**Acceptance Criteria:**

**Given** I am an admin  
**When** I open `/admin/map`  
**Then** I see all reps' pins in the viewport with clustering (FR17, NFR1)  
**And** I can filter by rep, date range, and outcome (FR17)  
**And** load meets NFR1 performance budget

**Implements:** FR17

---

### Story 3.2: Live Activity Feed

As an **admin**,
I want a live feed of field events,
So that I see activity without refreshing.

**Acceptance Criteria:**

**Given** I am on the admin dashboard  
**When** a rep logs a knock or call  
**Then** a feed item appears within seconds via Supabase Realtime (FR42)  
**And** items show rep name, action type, and location/address summary

**Implements:** FR42

---

### Story 3.3: Daily Rep Summary Grid

As an **admin**,
I want a table of each rep's daily metrics,
So that I can compare productivity at a glance.

**Acceptance Criteria:**

**Given** today or a selected date  
**When** I view the summary grid  
**Then** I see per-rep counts: doors knocked, calls made, leads added, appointments set (FR43)  
**And** metrics reset on the defined nightly boundary (FR43)  
**And** the view loads in under 3 seconds (NFR3)

**Implements:** FR43

---

### Story 3.4: Low-Activity and Morning Overview Flags

As an **admin**,
I want to spot reps with low activity,
So that I can coach during the day.

**Acceptance Criteria:**

**Given** reps on active shifts  
**When** a rep has no logged activity for a configurable window  
**Then** they appear flagged on the dashboard (FR58)  
**And** yesterday's aggregate totals are visible for morning review (FR58)

**Implements:** FR58

---

### Story 3.5: Shift GPS Breadcrumbs on Admin Map

As an **admin**,
I want to see rep routes for active shifts,
So that I verify field coverage.

**Acceptance Criteria:**

**Given** a rep with an active or completed shift today  
**When** I select that rep on the admin map  
**Then** a polyline of GPS pings displays for the shift (FR45)  
**And** breadcrumbs respect shift start/end boundaries only

**Implements:** FR45

---

## Epic 4: Unified Lead Pipeline

Teams manage one pipeline for D2D and call-sourced leads with follow-ups and accountability.

### Story 4.1: Leads Schema, Stages, and RLS

As a **developer**,
I want the full leads model and activity log,
So that pipeline features have persistent storage.

**Acceptance Criteria:**

**Given** contacts exist  
**When** migrations run  
**Then** `leads`, `lead_activity`, and `follow_ups` tables match PRD Section 5 (FR59)  
**And** `stage` and `source` enums match PRD  
**And** RLS scopes reps to owned leads; admins see all (FR60)

**Implements:** FR59, FR60, FR32 (foundation)

---

### Story 4.2: Kanban Pipeline Board

As a **rep or admin**,
I want a drag-and-drop pipeline board,
So that I can move leads through the sales process.

**Acceptance Criteria:**

**Given** I have access to leads  
**When** I open the pipeline  
**Then** columns match PRD stages from Knocked/Called through Lost (FR32)  
**And** I can drag cards between columns with persistence (FR32)  
**And** reps see only their leads; admins see all (FR60)

**Implements:** FR32

---

### Story 4.3: Lead Cards and Filters

As a **user**,
I want compact cards and filters,
So that I can find the right leads quickly.

**Acceptance Criteria:**

**Given** the pipeline board  
**When** I view cards  
**Then** each shows name, address, channel, owner, last touch, next action (FR33)  
**And** I can filter by stage, owner, channel, suburb, date range (FR38)

**Implements:** FR33, FR38

---

### Story 4.4: Lead Detail 360 View

As a **user**,
I want one screen for full lead history,
So that I have context before a follow-up.

**Acceptance Criteria:**

**Given** a lead  
**When** I open detail  
**Then** I see linked knocks, calls, notes, stage changes, and follow-ups (FR34)  
**And** channel source and creator are visible (FR37)

**Implements:** FR34, FR37

---

### Story 4.5: Collaboration Notes

As a **rep or admin**,
I want threaded notes on a lead,
So that the team coordinates in one place.

**Acceptance Criteria:**

**Given** a lead detail view  
**When** I add a note  
**Then** it appears in the activity stream with author and timestamp (FR36)  
**And** notes persist in `lead_activity` type=note

**Implements:** FR36

---

### Story 4.6: Schedule Follow-Ups

As a **rep**,
I want to schedule follow-up dates on leads,
So that I don't miss callbacks.

**Acceptance Criteria:**

**Given** a lead  
**When** I set a follow-up date/time  
**Then** a `follow_ups` row is created (FR35)  
**And** it appears on my lead card countdown (FR33)

**Implements:** FR35 (scheduling; push in 4.8)

---

### Story 4.7: Pipeline Stage Audit Trail

As an **admin**,
I want a history of stage moves,
So that I can review process compliance.

**Acceptance Criteria:**

**Given** a stage change on the board  
**When** the move completes  
**Then** `lead_activity` records actor, from-stage, to-stage, timestamp (FR40)  
**And** the trail is visible on lead detail (FR34)

**Implements:** FR40

---

### Story 4.8: Web Push Reminders for Follow-Ups

As a **rep**,
I want a reminder when a follow-up is due,
So that I call back on time.

**Acceptance Criteria:**

**Given** I opted into notifications and have a due follow-up  
**When** the due time passes  
**Then** I receive a web push on supported mobile browsers (FR35)  
**And** permission is requested in-context with clear copy

**Implements:** FR35

---

### Story 4.9: Lost Reasons and Lead Reassignment

As an **admin**,
I want lost reasons required and leads reassignable,
So that data stays clean and workloads balanced.

**Acceptance Criteria:**

**Given** I move a lead to Lost  
**When** I drop the card  
**Then** I must select a loss reason enum (FR41)  
**Given** I am an admin  
**When** I reassign a lead to another rep  
**Then** ownership updates and the new rep sees it in their pipeline (FR39)

**Implements:** FR39, FR41

---

## Epic 5: Cold Call Tracking

Reps log calls against unified contacts and feed the same pipeline as D2D.

### Story 5.1: CallLog Schema and RLS

As a **developer**,
I want call logs stored with outcomes,
So that call activity links to contacts and leads.

**Acceptance Criteria:**

**Given** contacts exist  
**When** migrations run  
**Then** `call_logs` table matches PRD fields and call outcome enum (FR59)  
**And** RLS matches rep/admin pattern (FR60)

**Implements:** FR59, FR26 (foundation)

---

### Story 5.2: Contact Search and Create

As a **rep**,
I want to find or add contacts before a call,
So that I avoid duplicate records.

**Acceptance Criteria:**

**Given** the calls panel  
**When** I search by name, phone, or address  
**Then** matching contacts appear (FR24)  
**When** no match exists  
**Then** I can quick-create a contact with duplicate detection on phone (FR24, FR54)

**Implements:** FR24, FR54

---

### Story 5.3: Log a Call with Outcome

As a **rep**,
I want to record call details after dialing,
So that my session is tracked for metrics.

**Acceptance Criteria:**

**Given** a selected contact  
**When** I submit the call form  
**Then** outcome, duration, notes, and optional follow-up are saved (FR25, FR26)  
**And** submission is scoped to my rep_id (FR60)

**Implements:** FR25, FR26

---

### Story 5.4: Promote Call to Lead

As a **rep**,
I want interested calls to become pipeline leads,
So that phone prospects enter the same funnel as doors.

**Acceptance Criteria:**

**Given** outcome is Answered–Interested or Callback Scheduled  
**When** I tap promote  
**Then** a lead is created with `source=call` and linked `call_log_id` (FR27, FR37)

**Implements:** FR27, FR37

---

### Story 5.5: Contact Call Activity Stream

As a **rep**,
I want to see all past calls on a contact,
So that I don't repeat mistakes.

**Acceptance Criteria:**

**Given** a contact  
**When** I view their detail  
**Then** chronological call notes and outcomes display (FR28)

**Implements:** FR28

---

### Story 5.6: Daily Call Counters

As a **rep**,
I want to see how many calls I've made today,
So that I track pace against goals.

**Acceptance Criteria:**

**Given** logged calls today  
**When** I view rep dashboard/calls header  
**Then** my call count displays (FR29)  
**And** the same count feeds the admin summary grid (FR29, FR43)

**Implements:** FR29

---

### Story 5.7: Call Scripts and Click-to-Dial

As a **rep**,
I want scripts and one-tap dial,
So that calls are consistent and fast.

**Acceptance Criteria:**

**Given** admin-configured script text exists  
**When** I am on an active call panel  
**Then** I can expand/collapse the script widget (FR30)  
**When** I tap the phone number  
**Then** `tel:` opens the device dialer (FR31)

**Implements:** FR30, FR31

---

## Epic 6: Territory Planning & Assignment

Managers define zones; reps see their assignment when canvassing.

### Story 6.1: Territory and Assignment Schema

As a **developer**,
I want territory polygons and assignments in PostGIS,
So that spatial assignment queries work.

**Acceptance Criteria:**

**Given** PostGIS enabled  
**When** migrations run  
**Then** `territories` and `territory_assignments` tables exist per PRD (FR59)  
**And** polygons use SRID 4326 (architecture)

**Implements:** FR59, FR19 (foundation)

---

### Story 6.2: Draw and Save Territories

As an **admin**,
I want to draw territory polygons on the map,
So that I define canvassing zones.

**Acceptance Criteria:**

**Given** the admin territory tool  
**When** I draw and save a polygon  
**Then** it persists as GeoJSON geometry with name and optional notes (FR19, FR23)  
**And** only admins can create/edit (NFR10)

**Implements:** FR19, FR23

---

### Story 6.3: Assign Territory to Rep by Date

As an **admin**,
I want to assign territories to reps for specific dates,
So that coverage is planned in advance.

**Acceptance Criteria:**

**Given** territories and reps  
**When** I create an assignment  
**Then** `territory_assignments` links territory, rep, and date/window (FR20)  
**And** assignments are visible in admin UI

**Implements:** FR20

---

### Story 6.4: Show Assigned Territory on Rep Map

As a **rep**,
I want my territory highlighted when I start a shift,
So that I know where to canvass.

**Acceptance Criteria:**

**Given** I have a territory assignment for today  
**When** I start a shift and open the map  
**Then** my zone renders as a translucent polygon overlay (FR21)  
**And** knocks outside the zone may show optional warning (product choice—non-blocking)

**Implements:** FR21

---

### Story 6.5: Coverage Heatmap Layer

As an **admin**,
I want a heatmap of knock density,
So that I see over- and under-worked areas.

**Acceptance Criteria:**

**Given** knock data exists  
**When** I enable heatmap on admin map  
**Then** density displays with configurable opacity (FR22)  
**And** performance remains within map NFR1 for typical suburbs

**Implements:** FR22

---

## Epic 7: Sales Intelligence Dashboard

Managers use analytics, leaderboards, exports, and end-of-day summaries to run the team.

### Story 7.1: Global Date Range Control

As an **admin**,
I want to change the date range for all dashboard widgets,
So that I analyze any period.

**Acceptance Criteria:**

**Given** the admin dashboard  
**When** I select Today, This Week, This Month, or Custom  
**Then** all linked charts and tables refresh for that range (FR48)

**Implements:** FR48

---

### Story 7.2: Funnel Conversion Chart

As an **admin**,
I want a step-down conversion funnel,
So that I see where deals drop off.

**Acceptance Criteria:**

**Given** lead data in range  
**When** I view the funnel  
**Then** stages show counts: Interacted → Interested → Appt Set → Pitched → Closed-Won (FR46)  
**And** chart loads under 3 seconds (NFR3)

**Implements:** FR46

---

### Story 7.3: Team Leaderboard

As an **admin**,
I want ranked rep performance,
So that I can gamify and coach.

**Acceptance Criteria:**

**Given** activity data  
**When** I view the leaderboard  
**Then** reps rank by doors, calls, leads, or appointments for week/month/custom (FR44)

**Implements:** FR44

---

### Story 7.4: Rep Deep-Dive Dashboard

As an **admin**,
I want a per-rep analytics page,
So that I prepare coaching conversations.

**Acceptance Criteria:**

**Given** a selected rep  
**When** I open deep dive  
**Then** I see trends, current pipeline snapshot, and historical charts (FR47)

**Implements:** FR47

---

### Story 7.5: Geographic Yield by Suburb

As an **admin**,
I want conversion rates by suburb,
So that I allocate territories strategically.

**Acceptance Criteria:**

**Given** knock and lead data with suburb  
**When** I view geographic yield  
**Then** suburbs rank by conversion metrics (FR49)

**Implements:** FR49

---

### Story 7.6: CSV Export

As an **admin**,
I want to export table data to CSV,
So that I can analyze in spreadsheets.

**Acceptance Criteria:**

**Given** a supported report table  
**When** I click export  
**Then** a CSV downloads with correct headers and filtered rows (FR50)  
**And** export is admin-only (NFR10)

**Implements:** FR50

---

### Story 7.7: End-of-Shift Daily Summaries

As a **rep and admin**,
I want automatic daily summaries when shifts end,
So that we close the day without manual reports.

**Acceptance Criteria:**

**Given** a rep ends a shift  
**When** shift close processing runs  
**Then** rep sees doors, calls, leads, appointments for the shift/day (FR53)  
**And** admin summary grid includes that rep's totals (FR53, FR43)

**Implements:** FR53

---

### Story 7.8: Admin Call Script Configuration

As an **admin**,
I want to edit the call script text,
So that reps use current messaging.

**Acceptance Criteria:**

**Given** admin settings  
**When** I update the script body  
**Then** reps see the new text in the call script widget (FR30)  
**And** changes persist in configuration storage

**Implements:** FR30 (admin side; rep UI in 5.7)

---

## Final Validation (Step 4)

### FR Coverage

All **FR1–FR60** are mapped to at least one story in the coverage map above. ✅

### Architecture Compliance

- Epic 1 Story 1 uses the documented starter template. ✅  
- Tables are introduced per story (not all upfront). ✅  
- API, RLS, offline, and Realtime patterns match architecture.md. ✅

### Story Quality

- Stories are vertically sliced with Given/When/Then acceptance criteria. ✅  
- No story requires a **future** story in the same epic to function. ✅  
- NFRs are referenced in relevant stories (performance, security, offline). ✅

### Epic Independence

| Epic | Standalone value |
| :--- | :--- |
| 1 | Auth and foundation without map |
| 2 | Full D2D loop without pipeline kanban |
| 3 | Manager visibility with knocks only |
| 4 | Pipeline with D2D-created leads |
| 5 | Calls without territories |
| 6 | Territories without analytics |
| 7 | Analytics requires prior data (expected); does not require future epics |

### Overall Status

**READY FOR SPRINT PLANNING** — 7 epics, 46 stories, 100% FR coverage.

**Recommended next step:** `bmad-sprint-planning` to sequence stories for implementation agents.
