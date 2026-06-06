---
baseline_commit: NO_VCS
---

# Story 4.8: Web Push Reminders for Follow-Ups

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **rep**,
I want a reminder when a follow-up is due,
so that I call back on time.

## Acceptance Criteria

1. **Given** I am an authenticated **rep** on `/rep/pipeline/[leadId]` (Story 4.4 detail)  
   **When** I view the Follow-ups section  
   **Then** I see an in-context control to enable browser reminders with clear copy (what notifications are for, that they are follow-up only)  
   **And** tapping **Enable reminders** requests `Notification` permission and registers a Web Push subscription (FR35)  
   **And** the control is hidden on admin detail pages (admin schedules for reps; owner rep receives reminders)

2. **Given** I granted notification permission and have an active push subscription  
   **When** I successfully schedule a follow-up (Story 4.6 `POST /api/v1/leads/:id/follow-ups`)  
   **Then** my subscription is stored server-side (if not already)  
   **And** no extra permission prompt is shown when already subscribed

3. **Given** an incomplete `follow_ups` row with `due_at <= now()` and `reminded_at IS NULL`  
   **When** the reminder cron job runs  
   **Then** the **owner rep** (`follow_ups.rep_id` — always `leads.rep_id` per Story 4.6) receives a web push on supported mobile browsers (FR35)  
   **And** the notification title/body identify the lead (contact name + optional note)  
   **And** tapping the notification opens `/rep/pipeline/[leadId]`  
   **And** `follow_ups.reminded_at` is set so the same follow-up is not pushed again

4. **Given** a rep has no push subscription or denied permission  
   **When** a follow-up becomes due  
   **Then** the cron job skips push for that rep (no error)  
   **And** scheduling and pipeline countdown (Story 4.6) still work

5. **Given** authorization (NFR9, NFR10)  
   **When** a rep calls `POST /api/v1/push/subscribe`  
   **Then** the subscription is stored with `rep_id = auth.uid()`  
   **When** an admin calls subscribe APIs  
   **Then** `403 FORBIDDEN` (rep-only feature)  
   **When** unauthenticated  
   **Then** `401`

6. **Given** implementation scope boundaries  
   **When** this story ships  
   **Then** there is **no** push for door-outcome optional follow-ups (Epic 2 knock form — not `follow_ups` rows)  
   **And** there is **no** follow-up edit, complete, or snooze UI  
   **And** there is **no** admin/manager push subscriptions  
   **And** there is **no** custom PWA install banner (Story 2.8 deferral stands)  
   **And** Story 4.2–4.7 pipeline, notes, stage audit, and follow-up compose still work

7. **Given** implementation is complete  
   **When** `npm run build` and `npm run lint` run  
   **Then** they pass

**Implements:** FR35 (push delivery; scheduling in 4.6)  
**NFRs:** NFR4 (PWA / Serwist SW), NFR9 (RLS on subscriptions), NFR10 (API guards)

## Tasks / Subtasks

- [x] **Schema + migration** (AC: 3)
  - [x] Create `supabase/migrations/*_push_subscriptions_follow_up_reminded.sql`:
    - `push_subscriptions` table: `id`, `rep_id` (FK `profiles`), `endpoint` (unique), `p256dh`, `auth`, `created_at`, `updated_at`
    - Index on `rep_id`
    - RLS: rep `SELECT`/`INSERT`/`DELETE` own rows (`rep_id = auth.uid()`); no rep `UPDATE` (delete + re-insert on rotation)
    - `follow_ups.reminded_at timestamptz null` column
    - Partial index helpful: incomplete + unreminded due rows (optional)
  - [x] Regenerate types: `npm run db:types` after migration
  - [x] Apply via Supabase MCP or `npx supabase db push`

- [x] **VAPID + env** (AC: 1, 3)
  - [x] Add `web-push` dependency (server send only)
  - [x] Document in `docs/SETUP_KEYS.md` (do not commit secrets):
    - `NEXT_PUBLIC_VAPID_PUBLIC_KEY` — client subscribe
    - `VAPID_PRIVATE_KEY` — server send (secret)
    - `VAPID_SUBJECT` — `mailto:support@…` or app URL
    - `CRON_SECRET` — protects cron route
  - [x] Generate keys locally: `npx web-push generate-vapid-keys`

- [x] **Validators** (AC: 2, 5)
  - [x] Create `src/lib/validators/push.ts`:
    - `pushSubscriptionKeysSchema` — `p256dh`, `auth` (base64url strings)
    - `pushSubscribeBodySchema` — `endpoint`, `keys` (Web Push subscription shape)
    - `pushSubscribeResponseSchema` — `{ subscribed: true }`

- [x] **Subscription API** (AC: 2, 5)
  - [x] Create `src/features/push/upsert-push-subscription.ts` — user-scoped `createClient()`, upsert by `endpoint`
  - [x] Create `POST /api/v1/push/subscribe/route.ts`:
    - `requireRoleForApi(['rep'])` only
    - Parse `pushSubscribeBodySchema`
    - Store subscription for `auth.id`
  - [x] Create `DELETE /api/v1/push/subscribe/route.ts`:
    - Rep-only; delete by `endpoint` body (same route file as POST)

- [x] **Service worker push handlers** (AC: 3, NFR4)
  - [x] Extend `src/app/sw.ts` (Serwist worker — already registered at `/sw.js` in production):
    - `push` event → `showNotification` with title/body from JSON payload
    - `notificationclick` → `clients.openWindow(url)` to `/rep/pipeline/[leadId]`
  - [x] Keep existing Serwist precache/runtime config unchanged (Story 2.8)

- [x] **Client subscribe flow** (AC: 1, 2)
  - [x] Create `src/features/push/client-subscribe.ts`:
    - Check `serviceWorker` + `PushManager` + `Notification` support
    - `Notification.requestPermission()` only from user gesture
    - `registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey })` using `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
    - `POST /api/v1/push/subscribe` with subscription JSON
  - [x] Create `src/features/push/api.ts` — `subscribePush`, `unsubscribePush`
  - [x] Create `src/components/push/follow-up-push-prompt.tsx`:
    - Copy: e.g. "Get a browser reminder when a follow-up is due. Sunflare only sends follow-up alerts."
    - **Enable reminders** button (min-h-11); states: unsupported / default / granted / denied
    - **Turn off** or hide when denied (link to browser settings copy only)
  - [x] Wire into rep detail only:
    - Pass `showPushPrompt` from `/rep/pipeline/[leadId]` page → `LeadDetailShell` → `LeadDetailTimeline` Follow-ups section (above compose)
    - Do **not** show on admin detail

- [x] **Reminder cron + send** (AC: 3, 4)
  - [x] Create `src/features/push/send-follow-up-reminders.ts`:
    - Use `createAdminClient()` (service role) — **only** inside cron job, not user APIs
    - Query due rows: `completed = false`, `reminded_at IS NULL`, `due_at <= now()`
    - Join lead + contact for display name
    - For each row: load `push_subscriptions` for `follow_ups.rep_id`
    - Send via `web-push` with VAPID; payload `{ title, body, url }`
    - On `410 Gone` / expired subscription: delete subscription row
    - On success: set `reminded_at = now()` on follow_up
  - [x] Create `GET /api/v1/cron/follow-up-reminders/route.ts`:
    - Auth: `Authorization: Bearer ${CRON_SECRET}` (or `x-cron-secret` header)
    - Return `{ sent, skipped, errors }` summary
  - [x] Add `vercel.json` cron schedule (e.g. every 5 minutes): `"/api/v1/cron/follow-up-reminders"`

- [x] **Verify** (AC: 4, 5, 6, 7)
  - [x] Manual: Rep enables reminders → permission granted → subscribe POST succeeds
  - [x] Manual: Schedule follow-up → cron fires (or manual GET with secret) → notification appears on device
  - [x] Manual: Notification click opens lead detail
  - [x] Manual: Second cron run does not re-notify (`reminded_at` set)
  - [x] Manual: Admin detail has no push prompt; admin subscribe returns 403
  - [x] Manual: Kanban, notes, stage audit unchanged
  - [x] `npm run build` && `npm run lint`

### Review Findings

- [x] [Review][Patch] `notificationclick` used relative path in `openWindow` — unreliable on some mobile browsers [`src/app/sw.ts:52`]
- [x] [Review][Patch] `syncPushSubscriptionIfGranted` failure could reject after successful follow-up POST [`src/components/pipeline/lead-detail-shell.tsx:44`]
- [x] [Review][Defer] Due follow-ups with no subscription marked `reminded_at` on skip — rep who subscribes later won't get retroactive push [`src/features/push/send-follow-up-reminders.ts:85`]
- [x] [Review][Defer] Cron runs every 5 minutes — up to ~5 min late delivery acceptable v1 [`vercel.json`]
- [x] [Review][Defer] Shared-device rep switch with global unique `endpoint` — second rep may fail upsert until prior subscription expires [`src/features/push/upsert-push-subscription.ts:10`]
- [x] [Review][Defer] iOS Safari requires installed PWA for reliable Web Push — document in manual QA only

## Dev Notes

### Critical constraints

- **Do NOT** use service-role client in user-facing subscribe APIs — rep JWT + RLS only; service role **only** in cron sender.
- **Do NOT** enable Serwist in development — push testing requires production build or `next start` after build (SW disabled in dev per Story 2.8).
- **Do NOT** add TanStack Query — `fetch` + hooks (Epic 2–4 convention).
- **Do NOT** push to `follow_ups.rep_id` mismatch — reminders always target owner rep (Story 4.6 invariant).
- **Do NOT** add follow-up complete/edit UI — `completed` remains false until a future story; cron only sends once via `reminded_at`.
- **Do NOT** break Story 2.8 offline shell, Dexie knock sync, or `reloadOnOnline: false` behavior.
- **Do NOT** add SMS/email comms (PRD v2).

### Brownfield: what exists today

| Piece | Status | 4.8 behavior |
|-------|--------|--------------|
| `follow_ups` table | ✅ Story 4.1/4.6 | Add `reminded_at`; cron queries due rows |
| `POST .../follow-ups` | ✅ Story 4.6 | Unchanged; push is orthogonal |
| Serwist SW `/sw.js` | ✅ Story 2.8 | Add push + notificationclick handlers |
| `createAdminClient()` | ✅ Story 1.x | Cron sender only |
| `lead-follow-up-compose` | ✅ Story 4.6 | Keep; push prompt is sibling UI in Follow-ups section |
| VAPID / push tables | ❌ | **Create** in 4.8 |

### `push_subscriptions` schema (canonical)

```sql
create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  rep_id uuid not null references public.profiles (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_push_subscriptions_rep_id on public.push_subscriptions (rep_id);

alter table public.follow_ups
  add column if not exists reminded_at timestamptz null;
```

### Subscription API contract

**POST `/api/v1/push/subscribe`** (rep only)

Request (Web Push JSON subset):

```json
{
  "endpoint": "https://fcm.googleapis.com/...",
  "keys": { "p256dh": "…", "auth": "…" }
}
```

Response: `{ "data": { "subscribed": true } }`  
Errors: `400`, `401`, `403`, `500`

### Cron contract

**GET `/api/v1/cron/follow-up-reminders`**

Headers: `Authorization: Bearer <CRON_SECRET>`

Response:

```json
{
  "data": {
    "sent": 2,
    "skipped": 1,
    "errors": 0
  }
}
```

Local test: `curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/v1/cron/follow-up-reminders` (after `npm run build && npm run start`).

### Service worker push sketch

```typescript
self.addEventListener("push", (event) => {
  const data = event.data?.json() ?? {};
  event.waitUntil(
    self.registration.showNotification(data.title ?? "Follow-up due", {
      body: data.body ?? "",
      data: { url: data.url ?? "/rep/pipeline" },
      icon: "/icons/icon-192.png",
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? "/rep/pipeline";
  event.waitUntil(clients.openWindow(url));
});
```

Add **after** `serwist.addEventListeners()` or ensure handlers are registered — test that Serwist does not swallow push events.

### Client subscribe sketch

```typescript
const registration = await navigator.serviceWorker.ready;
const sub = await registration.pushManager.subscribe({
  userVisibleOnly: true,
  applicationServerKey: urlBase64ToUint8Array(
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  ),
});
await subscribePush(sub.toJSON());
```

Call only from button `onClick` (user gesture). Check `'Notification' in window` and `'serviceWorker' in navigator` before showing prompt.

### Files to UPDATE (read before editing)

| File | Current state | This story changes | Must preserve |
|------|---------------|-------------------|---------------|
| `src/app/sw.ts` | Serwist precache only | Add push + notificationclick | `defaultCache`, offline fallback |
| `src/components/pipeline/lead-detail-timeline.tsx` | Follow-ups compose | Add push prompt slot (rep only) | Notes/follow-up compose |
| `src/components/pipeline/lead-detail-shell.tsx` | Detail layout | Pass `showPushPrompt` prop | reload, compose handlers |
| `src/app/(rep)/rep/pipeline/[leadId]/page.tsx` | Rep detail | `showPushPrompt` | auth guard |
| `docs/SETUP_KEYS.md` | No VAPID | Add VAPID + CRON_SECRET rows | existing key table |

### Files to CREATE

| File | Purpose |
|------|---------|
| `supabase/migrations/*_push_subscriptions_follow_up_reminded.sql` | Schema + RLS |
| `src/lib/validators/push.ts` | Zod schemas |
| `src/features/push/upsert-push-subscription.ts` | Rep subscription upsert |
| `src/features/push/send-follow-up-reminders.ts` | Cron send logic |
| `src/features/push/client-subscribe.ts` | Browser permission + subscribe |
| `src/features/push/api.ts` | Client fetch helpers |
| `src/app/api/v1/push/subscribe/route.ts` | POST subscribe |
| `src/app/api/v1/push/subscribe/route.ts` DELETE or separate unsubscribe route | |
| `src/app/api/v1/cron/follow-up-reminders/route.ts` | Cron entry |
| `src/components/push/follow-up-push-prompt.tsx` | In-context permission UI |
| `vercel.json` | Cron schedule |

### Previous story intelligence

**Story 4.6 (done):**
- `follow_ups.rep_id = leads.rep_id` always — push must target that rep, not the admin who scheduled.
- Follow-up compose on detail; do not break `followUpComposeDisabled={reloading}`.

**Story 2.8 (done):**
- Serwist disabled in dev — document push QA path: production build + HTTPS (or localhost with `next start`).
- `reloadOnOnline: false` — push handlers must not trigger full page reload on notification.

**Story 4.1 (done):**
- `follow_ups` RLS: rep sees own `rep_id` rows — cron uses admin client to cross-rep query.

**Epic 3 retro:**
- Service-role for system jobs is acceptable when guarded by secret (cron pattern).

### Cross-story dependencies

| Story | Relationship |
|-------|--------------|
| 4.6 | **Requires** — `follow_ups` rows to remind |
| 4.4 | **Requires** — rep detail route for notification deep link |
| 2.8 | **Requires** — service worker registration |
| 4.9 | **Unrelated** — lost reasons / reassignment |

### Platform notes (defer / document)

- **iOS Safari**: Web Push supported for installed PWAs on iOS 16.4+; rep must add to Home Screen for reliable delivery — document in manual test plan, not blocking.
- **Denied permission**: Show static copy; do not loop `requestPermission()` on every visit.
- **Cron granularity**: 5-minute schedule means up to ~5 min late — acceptable v1.

### Testing

- **Required:** `npm run build`, `npm run lint`, migration apply
- **Manual:** Rep subscribe → schedule due follow-up in near future → trigger cron → notification → click → detail page
- **Manual:** `reminded_at` prevents duplicate
- **No** Playwright unless trivial (push is hard to automate)

### References

- [Source: `_bmad-output/planning-artifacts/epics.md` — Story 4.8, FR35]
- [Source: `docs/Solar_CRM_PRD_v1.md` — Follow-Up Engine, push to mobile browser]
- [Source: `_bmad-output/planning-artifacts/architecture.md` — Serwist PWA, Web Push + VAPID]
- [Source: `_bmad-output/implementation-artifacts/4-6-schedule-follow-ups.md` — follow_ups, rep_id invariant]
- [Source: `_bmad-output/implementation-artifacts/2-8-serwist-pwa-shell.md` — SW wiring, dev disabled]
- [Source: `src/app/sw.ts` — Serwist worker entry]
- [Source: `src/lib/supabase/admin.ts` — service-role client for cron]
- [Source: Web Push (`web-push` npm)](https://www.npmjs.com/package/web-push)

## Dev Agent Record

### Agent Model Used

Composer

### Debug Log References

- Migration applied via Supabase MCP; `push_subscriptions` + `follow_ups.reminded_at`.
- Cron uses `createAdminClient()` only; subscribe APIs rep JWT + RLS.
- Push QA requires production build (`Serwist` disabled in dev).

### Completion Notes List

- `push_subscriptions` schema + RLS; `follow_ups.reminded_at` for one-shot reminders.
- Rep-only subscribe/unsubscribe API; in-context **Enable reminders** on rep lead detail.
- Serwist SW push + notificationclick handlers; cron sends due follow-ups via `web-push`.
- `syncPushSubscriptionIfGranted` after schedule when already subscribed.
- `npm run lint` and `npm run build` pass.
- Code review: absolute URL on notification click; non-blocking subscription sync after schedule.

### File List

- `supabase/migrations/20260608100000_push_subscriptions_follow_up_reminded.sql`
- `src/types/supabase.generated.ts`
- `package.json` / `package-lock.json`
- `vercel.json`
- `src/lib/validators/push.ts`
- `src/features/push/vapid-config.ts`
- `src/features/push/upsert-push-subscription.ts`
- `src/features/push/send-follow-up-reminders.ts`
- `src/features/push/client-subscribe.ts`
- `src/features/push/api.ts`
- `src/app/api/v1/push/subscribe/route.ts`
- `src/app/api/v1/cron/follow-up-reminders/route.ts`
- `src/app/sw.ts`
- `src/components/push/follow-up-push-prompt.tsx`
- `src/components/pipeline/lead-detail-timeline.tsx`
- `src/components/pipeline/lead-detail-shell.tsx`
- `src/app/(rep)/rep/pipeline/[leadId]/page.tsx`
- `docs/SETUP_KEYS.md`

## Change Log

- 2026-06-06: Story 4.8 context created — push subscriptions, VAPID cron sender, rep in-context permission UI.
- 2026-06-06: Story 4.8 — web push subscribe, cron reminders, SW handlers implemented.
- 2026-06-06: Code review — notification absolute URL + sync guard; story marked done.
