# Addendum — Sunflare Mobile (Expo APK)

_Technical options, transport decisions, and rejected alternatives. Complements `prd.md`._

---

## Why Expo SDK

| Option | Verdict |
| :--- | :--- |
| **Expo SDK (React Native)** | **Selected** — aligns with PRD v1 Phase 4 direction (React Native for background GPS); OTA updates via EAS Update; single codebase path to iOS later; strong Supabase ecosystem |
| Capacitor wrapper around PWA | Rejected — does not materially improve background GPS vs Serwist PWA; limited native feel |
| Flutter rewrite | Rejected — team stack is React/TypeScript; no shared code with Next.js web |
| React Native CLI (bare) | Deferred — Expo reduces native toolchain friction for a small team; eject only if a required native module blocks |

**Target:** Expo SDK 52+ (current stable at time of writing). Pin exact version in architecture doc.

---

## Repository Layout (options)

| Option | Trade-off |
| :--- | :--- |
| **Monorepo** `apps/web` + `apps/mobile` + `packages/shared` | Shared types, API client, enums, validation (Zod). Higher upfront setup. |
| **Separate repo** for mobile | Simpler isolation; enum/schema drift risk vs web |

**Recommendation:** Monorepo with `packages/shared` for Supabase types, enums, and API contracts. Web app stays at repo root or moves to `apps/web` incrementally.

---

## Map Engine (native)

Web uses **Mapbox GL JS**. Mobile equivalent:

- **`@rnmapbox/maps`** — feature parity with web Mapbox styles, clustering, custom pins
- Alternative: `react-native-maps` + Google — rejected to keep one map provider and style tokens

Reverse geocoding: call existing Next.js `/api/v1/...` geocode routes (server holds `MAPBOX_SECRET_TOKEN`) rather than embedding secret in APK.

---

## Offline Sync

Web uses **Dexie + Serwist outbox**. Mobile:

- **SQLite** via `expo-sqlite` or **WatermelonDB** for knock/call outbox
- Same idempotency keys and sync API contracts as web (`POST /api/v1/sync/...`)
- Conflict policy unchanged: server wins on enum conflicts; warn on duplicate knock same day

---

## Background Location

- **`expo-location`** with **TaskManager** background task while shift is active
- Android: `ACCESS_BACKGROUND_LOCATION` + foreground service notification (required for Play policy)
- Ping interval: ~120s (matches web NFR7 / architecture)
- GPS only when shift session `active`; hard stop on clock-out

---

## Push Notifications

- **Expo Notifications** + FCM for Android
- Server: extend existing web-push path or Supabase Edge Function to fan out to Expo push tokens
- Use cases: follow-up reminders, shift inactivity nudge (Phase 2)

---

## Auth

- **`@supabase/supabase-js`** with **`expo-secure-store`** for refresh token persistence
- Deep links for password reset / invite: `sunflare://` scheme + universal link fallback to web

---

## Build & Distribution

| Stage | Mechanism |
| :--- | :--- |
| Dev | Expo Go (limited — Mapbox may need dev client) |
| Internal QA | **EAS Build** → APK (`buildType: apk`) |
| Production | EAS Build → AAB for Play Store **or** signed APK sideload |

`[ASSUMPTION]` First rollout is **internal sideload / private Play track**, not public store listing.

---

## API Surface

Mobile consumes:

1. **Supabase client** (RLS-scoped reads/writes where safe)
2. **Next.js API routes** on `NEXT_PUBLIC_APP_URL` for geocoding, sync batch, any service-role operations

No duplicate backend. Manager realtime dashboards remain web-only.

---

## Rejected Alternatives Summary

- **Full feature parity including admin dashboard on phone** — rejected; admin UX is desktop-first and map analytics need large screens
- **Replace web PWA entirely** — rejected; PWA remains zero-install fallback and manager console
- **Offline-only app** — rejected; sync to Supabase is required for manager visibility
