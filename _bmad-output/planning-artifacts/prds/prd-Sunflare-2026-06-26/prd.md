---
title: Sunflare Mobile — Android Field App (Expo)
status: draft
created: 2026-06-26
updated: 2026-06-26
parent_product: Sunflare Solar CRM (web PWA v1)
input_documents:
  - docs/Solar_CRM_PRD_v1.md
  - _bmad-output/planning-artifacts/architecture.md
---

# PRD: Sunflare Mobile — Android Field App (Expo)

*Working title — confirm.*

## 0. Document Purpose

This PRD defines the **native Android field app** for Sunflare (Solar CRM), built with **Expo SDK**, distributable as an **APK**. It is scoped to **sales reps** doing door-to-door canvassing and mobile cold calling — not the manager/admin console, which remains on the existing **Next.js web PWA**.

Downstream owners: UX (`bmad-ux`), architecture (`bmad-create-architecture`), epics (`bmad-create-epics-and-stories`). This document builds on **Solar CRM PRD v1** and the **architecture decision record**; it does not duplicate manager-dashboard or territory-drawing requirements. Technical stack choices (Expo modules, monorepo layout, EAS) live in `addendum.md`.

**Structure:** Glossary-anchored vocabulary, features grouped with globally numbered FRs, assumptions tagged inline and indexed in §9.

---

## 1. Vision

Sunflare's web PWA already lets reps log doors, manage pipelines, and run shifts from a mobile browser. That works on day one, but field teams hit real limits: **background GPS drops when the browser is backgrounded**, **offline sync is fragile on some Android devices**, and **push reminders depend on browser support**. Reps also ask for an app icon on the home screen without fighting "Add to Home Screen" flows.

Sunflare Mobile is a **rep-facing Android app** that connects to the **same Supabase backend and data model** as the web product. Reps get reliable shift GPS trails, durable offline knock logging, and native push notifications — while managers continue using the desktop web dashboard unchanged.

`[ASSUMPTION: Primary driver for APK is reliable background GPS during active Shifts, with offline durability and push as secondary drivers.]`

`[ASSUMPTION: Stakes = internal launch for 10–30 field reps; not a public consumer app store marketing launch in v1.]`

---

## 2. Target User

### 2.1 Jobs To Be Done

- **Log every door fast** while walking a neighborhood, without losing data when signal drops.
- **Stay inside my Territory** and see my assigned zone on the map at shift start.
- **Clock in and out** so GPS and daily metrics reflect real field time, not pocket time.
- **Promote interested doors to Leads** and manage follow-ups from the same Pipeline as the web app.
- **Log cold calls on the go** when not at a desk (phone in hand between doors).
- **Trust the app on Android** — install once, open from home screen, session persists across days.

### 2.2 Non-Users (v1)

- **Admin / Manager** — territory drawing, team analytics, global map, user provisioning remain **web-only**.
- **Proposal / billing / SMS** — still out of scope (per Solar CRM PRD v1 Phase 4+).

### 2.3 Key User Journeys

**UJ-1. Marcus starts a Saturday canvassing shift.**

- **Persona + context:** Marcus, D2D rep, Android phone, assigned to a suburban Territory polygon.
- **Entry state:** Authenticated; app installed via APK; opened from home screen.
- **Path:** Opens app → sees Map with Territory highlight → taps **Start Shift** → grants location permissions (foreground + background) → walks block → taps map at a door → confirms reverse-geocoded Address → picks Door Outcome in &lt;10s → repeats.
- **Climax:** Each Knock syncs (or queues offline); manager web dashboard shows live activity within seconds of sync.
- **Resolution:** Marcus taps **End Shift**; GPS stops; daily summary available on web; Marcus sees personal History.
- **Edge case:** Cell dead zone — knock saves locally; banner shows "N pending sync"; auto-sync on reconnect within 30s.

**UJ-2. Priya converts an Interested knock to a Lead with follow-up.**

- **Persona + context:** Priya, rep, mid-shift after a positive conversation.
- **Entry state:** Active Shift; Map open.
- **Path:** Logs Knock as **Interested** → Lead card created → adds notes → sets follow-up date → returns to Map.
- **Climax:** Lead appears in Pipeline at `Interested` stage; follow-up scheduled.
- **Resolution:** Push notification fires on follow-up day (when online).
- **Edge case:** Duplicate knock same Address same day by another rep — warning shown with prior log summary; Priya can still submit with acknowledgment.

**UJ-3. James logs cold calls between doors.**

- **Persona + context:** James, hybrid rep, uses phone for quick call logging.
- **Entry state:** Authenticated; may or may not have active Shift.
- **Path:** Opens **Calls** tab → searches Contact → taps `tel:` to dial → logs Call Outcome + notes → promotes to Lead if interested.
- **Climax:** Call Log attached to Contact; counters update.
- **Resolution:** Returns to Map or Pipeline.

---

## 3. Glossary

- **Sunflare Mobile** — This Android native app (Expo), rep-facing only.
- **Web PWA** — Existing Next.js progressive web app (rep + admin surfaces).
- **Rep** — Field sales user role; RLS-scoped to own data.
- **Admin** — Manager role; web-only in this PRD.
- **Shift** — Explicit clock-in/clock-out session gating GPS pings and daily metrics.
- **Territory** — PostGIS polygon assigned to a Rep for a date range; highlighted on Map.
- **Knock** — Door interaction log (DoorKnock) with Door Outcome enum and optional Address.
- **Door Outcome** — One of: Interested, Not Home, Not Interested, Do Not Knock, Callback Requested, Already Has Solar.
- **Contact** — Unified person/address record; hub for Knocks, Call Logs, and Leads.
- **Lead** — Pipeline card linked to a Contact, with stage and follow-up.
- **Pipeline** — Kanban stages from Knocked/Called through Signed/Lost.
- **Call Log** — Outbound call record with Call Outcome enum.
- **Outbox** — Local queue of unsynced Knocks/Call Logs until API sync succeeds.
- **APK** — Android installable package produced via EAS Build for distribution.

---

## 4. Features

### 4.1 Authentication & Session

**Description:** Reps sign in with the same credentials as the Web PWA. Sessions persist securely on device. Admin accounts that open the mobile app are blocked or redirected to web. Realizes UJ-1 entry.

**Functional Requirements:**

#### FR-1: Email/password login

Rep can authenticate with email and password against Supabase Auth and receive a JWT session.

**Consequences (testable):**
- Invalid credentials show error without leaking whether email exists.
- Successful login routes Rep to Map home.
- Session refresh works after app restart without re-entering password (within token TTL).

#### FR-2: Rep-only mobile access

Rep role can use all mobile features; Admin role sees message to use Web PWA for management tasks.

**Consequences (testable):**
- Admin JWT on mobile does not expose admin-only data views in v1.
- RLS continues to enforce row scope server-side regardless of client.

#### FR-3: Secure session storage

App stores refresh tokens in OS secure storage (not plain AsyncStorage).

**Consequences (testable):**
- Tokens not readable from unrooted backup inspection paths documented in security review.
- Logout clears secure storage and invalidates local Outbox identity binding.

#### FR-4: Password reset deep link

Rep can complete password reset from email link opening the app or fallback browser.

**Consequences (testable):**
- Reset link with valid token allows new password set.
- Expired token shows actionable error.

`[ASSUMPTION: Invite-via-link onboarding uses same deep-link pattern as password reset.]`

---

### 4.2 Shift & Background GPS

**Description:** Explicit Start/End Shift controls gate background location sampling (~120s interval) so managers see breadcrumb trails on the web admin map. Realizes UJ-1.

**Functional Requirements:**

#### FR-5: Start Shift

Rep can start a Shift from Map; system records `shift_started_at` and begins GPS sampling.

**Consequences (testable):**
- GPS does not sample before Shift start.
- Android shows required foreground-service notification while Shift active and app backgrounded.
- Permission denial blocks Shift start with explanation and settings link.

#### FR-6: End Shift

Rep can end Shift; GPS sampling stops immediately.

**Consequences (testable):**
- No GPS pings recorded after end timestamp.
- End Shift confirm dialog prevents accidental tap.

#### FR-7: Background GPS trail

While Shift is active, app records location pings to backend at ~120s interval even when backgrounded.

**Consequences (testable):**
- Pings appear on admin web map within one interval + sync latency.
- Battery: no sampling when Shift inactive.

**Feature-specific NFRs:**
- Ping upload payload ≤ 1 KB per point.
- Queue pings locally if offline; flush on reconnect without duplicates (idempotent keys).

---

### 4.3 Field Map & Door Logging

**Description:** Core canvassing UI — Mapbox map, Territory overlay, tap-to-log Knock, color-coded historic pins, reverse geocoding. Realizes UJ-1, UJ-2.

**Functional Requirements:**

#### FR-8: Interactive map

Rep can view Map centered on current location with historic Knock pins for own logs (viewport-limited fetch).

**Consequences (testable):**
- Up to 500 pins in viewport render within 2s on mid-range Android (2024+).
- Pin colors match Door Outcome enum.

#### FR-9: Territory highlight

Rep sees assigned Territory polygon(s) for today highlighted on Map when Shift starts.

**Consequences (testable):**
- No assignment shows neutral map with informational empty state.
- Polygon renders from same data as Web PWA.

#### FR-10: Tap to log Knock

Rep can tap Map (or snap to current GPS) to open Door Outcome form with Address pre-filled via reverse geocode.

**Consequences (testable):**
- Form submission target &lt;10s for typical flow.
- Rep can edit Address before submit.

#### FR-11: Door Outcome form

Rep selects one of six Door Outcomes, optional notes, optional follow-up date.

**Consequences (testable):**
- Enum values match web/database exactly.
- Interested and Callback Requested enable Lead promotion flow (FR-14).

#### FR-12: Offline Knock capture

Rep can submit Knocks with no network; entries land in Outbox.

**Consequences (testable):**
- Zero data loss across app kill/restart while offline.
- Sync within 30s of connectivity restore for typical queue sizes (&lt;50 items).
- UI shows pending sync count.

#### FR-13: Duplicate knock warning

Rep sees warning if Address has Knock today by any rep, with summary of prior log.

**Consequences (testable):**
- Warning does not hard-block submit (per PRD v1 decision #5).
- Acknowledgment required to proceed when warning shown.

#### FR-14: Lead promotion from Knock

Rep can create/update Lead when outcome warrants promotion.

**Consequences (testable):**
- Lead appears in Pipeline with correct channel tag (D2D).
- Contact record created or linked.

---

### 4.4 Pipeline & Follow-ups

**Description:** Rep manages personal Leads — list, detail, stage moves allowed for rep-owned cards, follow-up dates. Realizes UJ-2.

**Functional Requirements:**

#### FR-15: Pipeline list

Rep can view own Leads grouped by Pipeline stage.

**Consequences (testable):**
- Stages match web enums.
- Pull-to-refresh syncs latest state.

#### FR-16: Lead detail

Rep can open Lead detail with Contact info, Knock/Call history, notes, follow-up.

**Consequences (testable):**
- Activity stream matches web data for same Lead.
- Rep cannot open another rep's Lead (RLS).

#### FR-17: Stage update

Rep can move own Leads across allowed stages with required fields (e.g. Lost reason).

**Consequences (testable):**
- Invalid transitions rejected server-side.
- Audit trail records actor and timestamp.

#### FR-18: Follow-up scheduling

Rep can set follow-up date/time on Lead.

**Consequences (testable):**
- Follow-up persisted to same field as web.
- Triggers push reminder (FR-22) when due.

---

### 4.5 Cold Calling (Mobile)

**Description:** Mobile-optimized Call logging — search/create Contact, log outcomes, click-to-dial. Realizes UJ-3. `[ASSUMPTION: Mobile cold call is in MVP; web PRD showed desktop/tablet but reps need phone-native dialer.]`

**Functional Requirements:**

#### FR-19: Contact search and create

Rep can search Contacts by name, phone, or address and create new Contact.

**Consequences (testable):**
- Search debounced; results &lt;1s on 4G.
- Duplicate detection suggests existing Contact.

#### FR-20: Call log entry

Rep can log Call Outcome, duration, notes, follow-up for a Contact.

**Consequences (testable):**
- Call Outcome enums match web.
- Interested / Callback Scheduled enables Lead promotion.

#### FR-21: Click-to-call

Rep can launch device dialer via `tel:` link from Contact.

**Consequences (testable):**
- Tapping phone number opens native dialer with number pre-filled.

---

### 4.6 Notifications & History

**Description:** Native push for follow-ups; personal Knock/Call history. Realizes UJ-2 resolution.

**Functional Requirements:**

#### FR-22: Push notifications (Android)

Rep receives push for scheduled follow-ups and optional shift reminders.

**Consequences (testable):**
- Opt-in permission flow on first relevant action.
- Tapping notification opens correct Lead or Shift screen.
- Token registered server-side per device.

#### FR-23: Personal history

Rep can view paginated History of own Knocks and Call Logs with date/outcome filters.

**Consequences (testable):**
- Filters match web rep history semantics.
- Offline history shows synced items only (pending marked).

---

### 4.7 App Distribution & Updates

**Description:** Installable APK for internal rollout; OTA JS updates via Expo where possible.

**Functional Requirements:**

#### FR-24: APK install

Organization can distribute signed APK for Android install (sideload or private track).

**Consequences (testable):**
- APK installs on Android 10+ without root.
- App displays version and build number in Profile/Settings.

#### FR-25: Over-the-air updates

App can receive JS bundle updates without full APK reinstall for non-native changes.

**Consequences (testable):**
- Critical native module changes still require new APK build.
- Update check on cold start (configurable interval).

`[ASSUMPTION: First distribution is internal sideload or private Play track, not public Play Store marketing launch.]`

---

## 5. Non-Goals (Explicit)

- **Admin/manager dashboard on mobile** — web-only.
- **Territory drawing/editing** — web-only admin tool.
- **Team leaderboard, funnel charts, CSV export** — web-only analytics.
- **Proposal/PDF quotes, SMS/email integrations** — deferred per Solar CRM v1.
- **iOS App Store build** — deferred post-Android pilot `[ASSUMPTION]`.
- **Replacing Web PWA for reps** — PWA remains supported fallback.
- **Public multi-tenant SaaS** — single-tenant internal deployment unchanged.

---

## 6. MVP Scope

### 6.1 In Scope

- Android APK via Expo SDK + EAS Build
- Rep auth, session, logout
- Shift start/end + background GPS
- Map, Territory highlight, Knock logging, offline Outbox, sync
- Pipeline list/detail, stage moves, follow-ups
- Mobile cold call logging + click-to-dial
- Push notifications (follow-ups)
- Personal history
- Shared Supabase backend + existing API routes

### 6.2 Out of Scope for MVP

| Item | Reason |
| :--- | :--- |
| iOS build | Android-first per user request; addendum tracks later path |
| Admin features on mobile | Desktop-first manager UX |
| Street View deep link | v2 nice-to-have on web PRD |
| Bulk CSV import | Admin web feature |
| Inactivity guard alerts | Phase 2 automation |
| Biometric login | Fast-follow after email/password stable |
| Full UI parity polish with web | Iterate after field pilot |

---

## 7. Success Metrics

**Primary**

- **SM-1:** **APK adoption** — ≥80% of active D2D reps install and log in within 14 days of rollout. Validates FR-1, FR-24.
- **SM-2:** **Shift GPS completeness** — ≥90% of active Shifts have ≥1 ping per 5 minutes of shift duration (when connectivity permits). Validates FR-7. Counterbalances SM-1 (install ≠ usage).

**Secondary**

- **SM-3:** **Offline reliability** — &lt;0.1% Knock submissions lost in 30-day window (support tickets + server reconciliation). Validates FR-12.
- **SM-4:** **Knock log latency** — median submit-to-sync &lt;3s on 4G when online. Validates FR-10, FR-11.

**Counter-metrics (do not optimize)**

- **SM-C1:** **Battery drain complaints** — should not increase vs PWA baseline; if &gt;10% of reps report unacceptable drain, reduce ping frequency. Counterbalances SM-2.

---

## 8. Cross-Cutting NFRs

| ID | Requirement |
| :--- | :--- |
| NFR-M1 | Touch targets ≥44×44dp; thumb-reachable primary actions on Map |
| NFR-M2 | HTTPS only; certificate pinning optional Phase 2 |
| NFR-M3 | PII encrypted at rest in local Outbox DB |
| NFR-M4 | JWT + RLS unchanged from web; no service-role keys in APK |
| NFR-M5 | App cold start to interactive Map &lt;4s on reference device |
| NFR-M6 | Accessibility: TalkBack labels on Knock form and Shift controls |
| NFR-M7 | Crash-free sessions ≥99.5% (Expo/Sentry) |

---

## 9. Open Questions

1. **Distribution:** Sideload APK only, or Google Play private/internal track? (Affects signing and update policy.)
2. **Code sharing:** Monorepo now vs mobile-only repo with copied types? (See addendum recommendation.)
3. **Admin on mobile:** Hard block vs read-only dashboard teaser?
4. **Cold call in MVP:** Confirm mobile Calls tab in first release vs Phase 2 mobile.
5. **Branding:** Same Sunflare icon/colors as PWA manifest or distinct store listing assets?

---

## 10. Assumptions Index

- §1 — Primary driver is background GPS reliability during Shifts.
- §1 — Internal launch for 10–30 reps, not public store marketing.
- §4.1 FR-4 — Invite links use same deep-link pattern as password reset.
- §4.5 — Mobile cold calling included in MVP.
- §4.7 FR-25 — First distribution is internal sideload or private Play track.
- §5 — iOS deferred until Android pilot stable.
- §6 — Web PWA remains supported; mobile is preferred path for D2D reps.

---

*Draft — Fast path. Review assumptions in §10 before finalize.*
