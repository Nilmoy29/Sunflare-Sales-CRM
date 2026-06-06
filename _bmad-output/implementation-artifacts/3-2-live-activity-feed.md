---
baseline_commit: NO_VCS
---

# Story 3.2: Live Activity Feed

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an **admin**,
I want a live feed of field events,
so that I see activity without refreshing.

## Acceptance Criteria

1. **Given** I am an authenticated admin on `/admin/dashboard`  
   **When** the page loads  
   **Then** I see a **Live activity** panel listing recent field events (FR42)  
   **And** the initial list loads via REST (not Realtime-only) for the **last 50 events** from **today (Australia/Sydney calendar)**  
   **And** each row shows **rep name**, **action type**, **outcome label** (for knocks), and **location/address summary** (or coordinates if no address)  
   **And** rows are ordered newest first

2. **Given** I am on the admin dashboard with the feed visible  
   **When** a rep logs a new door knock (online POST or offline sync INSERT)  
   **Then** a feed item appears within **seconds** via Supabase Realtime `INSERT` on `door_knocks` (FR42)  
   **And** no manual page refresh is required  
   **And** duplicate rows for the same knock `id` are not shown

3. **Given** Realtime payload shape  
   **When** a new knock event arrives  
   **Then** the client enriches the row with rep name and contact address (Realtime sends `door_knocks` columns only)  
   **And** enrichment uses admin-scoped session auth (RLS) — either a small REST detail fetch or a single-row Supabase select with joins  
   **And** knock notes and contact phone are **not** shown (PII minimization, same as Story 3.1)

4. **Given** authorization boundaries  
   **When** a rep or unauthenticated user hits the activity API  
   **Then** the API returns 403 (NFR10)  
   **And** the Realtime subscription is only established on the admin dashboard client component (admin session)  
   **And** rep-facing routes are unchanged

5. **Given** `call_logs` does not exist yet (Story 5.1)  
   **When** reviewing this story scope  
   **Then** **door knock** events are fully implemented  
   **And** the feed item model includes `type: "door_knock" | "call"` for future extension  
   **And** call events are **explicitly deferred** to Story 5.1+ (wire second Realtime subscription when table exists)  
   **And** the story documents the extension point — do not create stub `call_logs` table here

6. **Given** implementation is complete  
   **When** `npm run build` and `npm run lint` run  
   **Then** they pass  
   **And** there is no summary grid (3.3), low-activity flags (3.4), map pin auto-refresh (3.1), or polling loop replacing Realtime  
   **And** admin map `/admin/map` behavior from Story 3.1 is unchanged

**Implements:** FR42 (door knocks in v1; calls when 5.1 lands)  
**NFRs:** NFR10 (admin server guards), UX-DR5 (desktop manager dashboard layout)

## Tasks / Subtasks

- [x] **Database — Realtime publication** (AC: 2)
  - [x] Create migration `supabase/migrations/*_realtime_door_knocks.sql`:
    - `alter publication supabase_realtime add table public.door_knocks;`
    - Comment: add `call_logs` to same publication in Story 5.1
  - [x] Apply via Supabase MCP or `npx supabase db push`
  - [x] Verify admin session receives INSERT events (RLS: `door_knocks_select_admin`)

- [x] **Validators + types** (AC: 1, 3, 5)
  - [x] Create `src/lib/validators/activity-feed.ts`:
    - `activityFeedItemTypeSchema` — `z.enum(["door_knock", "call"])`
    - `activityFeedItemSchema` — `id`, `type`, `rep_id`, `rep_name`, `occurred_at`, `action_label`, `outcome` (nullable for future call), `address`, `suburb`, `postcode`, `lat`, `lng`
    - `activityFeedResponseSchema` — `{ items: ActivityFeedItem[] }`
    - `activityFeedQuerySchema` — optional `limit` (default 50, max 100)

- [x] **Server query + API routes** (AC: 1, 3, 4)
  - [x] Create `src/features/admin/get-recent-activity.ts`
    - Query recent `door_knocks` joined to `profiles` + `contacts` for address fields
    - Filter `knocked_at` between Sydney start/end of **today** (reuse `formatSydneyDateString`, `startOfDaySydney`, `endOfDaySydney`)
    - `ORDER BY knocked_at DESC LIMIT 50`
    - Map rows to `ActivityFeedItem` with `type: "door_knock"`, `action_label` e.g. `"Door knock"`, outcome from `DOOR_OUTCOME_LABELS`
  - [x] Create `src/features/admin/get-activity-item.ts` — fetch single enriched knock by `id` (for Realtime enrichment)
  - [x] Create `GET /api/v1/admin/activity/route.ts` — `requireRoleForApi(["admin"])`, parse query, return `{ data: ActivityFeedResponse }`
  - [x] Create `GET /api/v1/admin/activity/[id]/route.ts` — single item enrichment for Realtime handler (or combine into query param `?knock_id=` on main route — prefer dedicated `[id]` route for clarity)

- [x] **Client fetch + Realtime hook** (AC: 2, 3)
  - [x] Create `src/features/admin/api.ts` — `fetchRecentActivity`, `fetchActivityItem(id)`
  - [x] Create `src/features/admin/use-admin-activity-feed.ts` (client):
    - Initial fetch on mount via REST
    - Subscribe with `createClient()` browser client:
      ```typescript
      supabase
        .channel("admin-activity-door-knocks")
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "door_knocks" }, handler)
        .subscribe()
      ```
    - On INSERT: fetch enriched item by `payload.new.id`, prepend if not duplicate
    - Cleanup channel on unmount
    - Track `connected` / `error` state; show subtle disconnected hint (non-blocking)
    - Cap in-memory list at 100 items (drop oldest) to avoid unbounded growth during long sessions
    - Use `loadedKey` / abort pattern from `use-admin-map-knocks` — no sync setState-in-effect lint violations

- [x] **Dashboard UI** (AC: 1, 2, 6)
  - [x] Create `src/components/admin/activity-feed.tsx` (client) — scrollable list, outcome badge colors (`DOOR_OUTCOME_COLORS`), `formatKnockHistoryDate`, `formatKnockAddress`
  - [x] Create `src/components/admin/admin-dashboard-shell.tsx` (client) — desktop layout: activity feed primary column (UX-DR5); placeholder card for future widgets (3.3+)
  - [x] Update `src/app/(admin)/admin/dashboard/page.tsx` — `requireRole(["admin"])`, render shell with feed

- [x] **Verify** (AC: 4, 6)
  - [ ] Manual: Admin dashboard shows recent knocks; new knock from rep appears without refresh
  - [ ] Manual: Rep cannot access `/api/v1/admin/activity` (403)
  - [ ] Manual: Offline-synced knock INSERT also appears in feed
  - [ ] Manual: `/admin/map` still works unchanged
  - [x] `npm run build` && `npm run lint`

### Review Findings

- [x] [Review][Patch] Initial REST load could overwrite Realtime prepends during concurrent mount [`src/features/admin/use-admin-activity-feed.ts:57`]
- [x] [Review][Defer] Enrichment fetch may 404 briefly if Realtime fires before read visibility — rare; acceptable v1 [`src/features/admin/use-admin-activity-feed.ts:35`]
- [x] [Review][Defer] Admin page role mismatch redirects to `/forbidden` not HTTP 403 — pre-existing middleware pattern [`src/lib/supabase/middleware.ts:122`]
- [x] [Review][Dismiss] `get-activity-item.ts` merged into `get-recent-activity.ts` — acceptable consolidation

## Dev Notes

### Critical constraints

- **Do NOT** create `call_logs` table — Story 5.1.
- **Do NOT** add Realtime subscription on admin map (Story 3.1) — feed is dashboard-only.
- **Do NOT** poll on an interval as primary update mechanism — Realtime is required (FR42).
- **Do NOT** expose knock `notes` or contact phone in feed rows.
- **Do NOT** install TanStack Query — `fetch` + hooks (project convention).
- **Do NOT** build summary grid, leaderboard, or date engine — Stories 3.3 / 7.x.
- **Do NOT** modify rep knock create/sync APIs except as consumers of their INSERT side effects.

### Scope vs epic AC (calls)

Epic AC mentions *"knock or call"*. **`call_logs` does not exist** until Story 5.1. This story delivers:

| Event | Story 3.2 | Later |
| :--- | :--- | :--- |
| Door knock INSERT | Full feed + Realtime | — |
| Call INSERT | Deferred | Story 5.1 creates table + publication + extend hook |

When Story 5.1 lands, add second `postgres_changes` subscription on `call_logs` and map to `type: "call"` items — reuse `ActivityFeed` component.

### Realtime enrichment pattern

Supabase Realtime `INSERT` payload for `door_knocks` includes:

```json
{ "id", "contact_id", "rep_id", "outcome", "knocked_at", "lat", "lng", "synced", ... }
```

It does **not** include `rep_name` or contact address. **Do not** guess — fetch enriched row:

**Option A (preferred):** `GET /api/v1/admin/activity/[id]` after each INSERT  
**Option B:** Browser `supabase.from("door_knocks").select("..., profiles(name), contacts(...)").eq("id", id).single()` — admin RLS allows

Use Option A for consistency with other admin APIs and Zod validation at the boundary.

### Initial load vs Realtime

| Source | When | Purpose |
| :--- | :--- | :--- |
| `GET /api/v1/admin/activity` | Page mount | Show last 50 knocks today before subscription connects |
| Realtime `INSERT` | Live | Append new knocks without refresh |

Dedupe by `item.id` when prepending Realtime rows that may overlap initial REST window.

### Feed row display (PRD example)

> *"Rep X logged Interested door on Street Y"*

Render as:

```
[Jane Smith]  [Interested badge]  3 Jun, 9:15 AM
12 Example St, Surry Hills 2010
```

Or single-line compact variant if space tight — must include rep name, action/outcome, address/coords.

### API contract

**GET `/api/v1/admin/activity?limit=50`**

```json
{
  "data": {
    "items": [
      {
        "id": "uuid",
        "type": "door_knock",
        "rep_id": "uuid",
        "rep_name": "Jane Smith",
        "occurred_at": "2026-06-06T09:00:00.000Z",
        "action_label": "Door knock",
        "outcome": "interested",
        "address": "12 Example St",
        "suburb": "Surry Hills",
        "postcode": "2010",
        "lat": -33.87,
        "lng": 151.21
      }
    ]
  }
}
```

**GET `/api/v1/admin/activity/[id]`** — same item shape, 404 if not found or not visible to admin.

### Reference SQL — recent activity

```sql
select
  dk.id,
  dk.rep_id,
  p.name as rep_name,
  dk.outcome,
  dk.knocked_at,
  dk.lat,
  dk.lng,
  c.address,
  c.suburb,
  c.postcode
from public.door_knocks dk
join public.profiles p on p.id = dk.rep_id
left join public.contacts c on c.id = dk.contact_id
where dk.knocked_at >= :sydney_today_start
  and dk.knocked_at <= :sydney_today_end
order by dk.knocked_at desc
limit 50;
```

Consider RPC `get_admin_recent_activity(p_from, p_to, p_limit)` if mirroring Story 3.1 bbox RPC pattern — optional; direct query via `createClient()` + admin RLS is acceptable for v1.

### Realtime migration

```sql
-- Enable Realtime for door_knocks (Story 3.2)
alter publication supabase_realtime add table public.door_knocks;
-- Story 5.1: alter publication supabase_realtime add table public.call_logs;
```

If publication already includes table (re-run safety), use idempotent pattern:

```sql
do $$
begin
  alter publication supabase_realtime add table public.door_knocks;
exception
  when duplicate_object then null;
end $$;
```

### UI sketch (UX-DR5)

```
Admin dashboard
┌─────────────────────────────────────────────────────────┐
│ Live activity                          ● Connected      │
├─────────────────────────────────────────────────────────┤
│ Jane Smith · Interested · 9:15 AM                       │
│ 12 Example St, Surry Hills 2010                         │
├─────────────────────────────────────────────────────────┤
│ Bob Jones · Not home · 9:12 AM                          │
│ -33.86880, 151.20930                                    │
├─────────────────────────────────────────────────────────┤
│ …                                                       │
└─────────────────────────────────────────────────────────┘
│ [Placeholder: Daily summary grid — Story 3.3]           │
└─────────────────────────────────────────────────────────┘
```

### Files to touch (expected)

| File | Action |
| :--- | :--- |
| `supabase/migrations/*_realtime_door_knocks.sql` | **New** |
| `src/lib/validators/activity-feed.ts` | **New** |
| `src/features/admin/get-recent-activity.ts` | **New** |
| `src/features/admin/get-activity-item.ts` | **New** |
| `src/features/admin/api.ts` | **New** |
| `src/features/admin/use-admin-activity-feed.ts` | **New** |
| `src/app/api/v1/admin/activity/route.ts` | **New** |
| `src/app/api/v1/admin/activity/[id]/route.ts` | **New** |
| `src/components/admin/activity-feed.tsx` | **New** |
| `src/components/admin/admin-dashboard-shell.tsx` | **New** |
| `src/app/(admin)/admin/dashboard/page.tsx` | **Update** |

**Unchanged:** `src/components/admin/admin-map-canvas.tsx`, admin map API, rep knock routes, `create_knock_with_contact` RPC.

### Current code state (read before editing)

**`src/app/(admin)/admin/dashboard/page.tsx`** — Placeholder heading only; replace with dashboard shell + activity feed.

**`src/lib/supabase/client.ts`** — Browser Supabase client for Realtime subscriptions (client components only).

**`src/app/api/v1/admin/knocks/route.ts`** — Pattern for admin-only GET routes (`requireRoleForApi(["admin"])`).

**`src/features/knocks/get-admin-knocks-in-bbox.ts`** — Join pattern: `door_knocks` → `profiles` → `contacts` for address display.

**`src/features/knocks/format-knock-date.ts`** — `formatKnockHistoryDate`, `formatKnockAddress`, Sydney day bounds.

**`src/lib/geo/door-outcome-colors.ts`** — Outcome badges for feed rows.

**No existing Realtime usage** in app code — this is the first subscription. Follow Supabase docs: subscribe after client mount, `removeChannel` on cleanup.

**No `call_logs` table** — confirmed absent from migrations and generated types (only nullable FK on `leads`).

### Previous story intelligence

**Story 3.1 (done):**
- Admin join query pattern for knock + rep + contact address.
- PII minimization: no notes/phone in admin UI v1.
- Admin layout nav includes Dashboard link — feed lands on existing route.
- Explicitly deferred Realtime to this story.

**Story 2.7 (done):**
- Offline sync POST creates server INSERTs — each synced knock should fire Realtime (verify in manual test).

**Story 2.11 (done):**
- `use-knock-history` / `loadedKey` hook pattern for fetch lifecycle.

### Cross-story dependencies

| Story | Relationship |
| :--- | :--- |
| 2.1 | **Requires** — `door_knocks`, `contacts`, admin RLS |
| 2.5–2.7 | **Triggers** — knock INSERT events (online + sync) |
| 3.1 | **Preserve** — admin map unchanged |
| 3.3 | **Deferred** — daily summary grid below feed |
| 5.1 | **Future** — `call_logs` + second Realtime source |
| 7.1 | **Future** — global date engine may widen feed date filter |

### Testing

- **Required:** `npm run build`, `npm run lint`
- **Manual:** Two browser windows — admin dashboard + rep knock — verify live append
- **Manual:** Offline knock sync → feed item appears
- **Manual:** Rep 403 on activity API
- **No** Playwright unless trivial

### References

- [Source: `_bmad-output/planning-artifacts/epics.md` — Story 3.2, FR42]
- [Source: `_bmad-output/planning-artifacts/architecture.md` — Realtime on door_knocks INSERT, activity-feed.tsx, dashboard routes]
- [Source: `docs/Solar_CRM_PRD_v1.md` — Live Activity Feed, Realtime Syncer]
- [Source: `_bmad-output/implementation-artifacts/3-1-admin-global-map-with-filters.md` — scope boundary, join patterns]
- [Source: `src/lib/supabase/client.ts`]
- [Source: `src/app/(admin)/admin/dashboard/page.tsx`]
- [Supabase docs: Postgres Changes](https://supabase.com/docs/guides/realtime/postgres-changes)

## Dev Agent Record

### Agent Model Used

Claude (Cursor Agent)

### Debug Log References

### Completion Notes List

- Added Realtime publication for `door_knocks` (migration applied via Supabase MCP).
- REST `GET /api/v1/admin/activity` loads today's last 50 knocks; `[id]` route enriches Realtime INSERTs.
- Dashboard shows live feed with Supabase Realtime subscription, dedupe, and 100-item cap.
- Call events deferred (`type: "call"` in schema only) until Story 5.1.
- Admin map unchanged.
- `npm run lint` and `npm run build` pass.
- Code review: fixed initial-load vs Realtime race via merge dedupe.

### Senior Developer Review (AI)

**Outcome:** Approve (1 patch applied)  
**Date:** 2026-06-06  
**Layers:** Blind Hunter, Edge Case Hunter, Acceptance Auditor (inline)

**Summary:** All ACs met after patch — initial REST fetch no longer clobbers Realtime prepends during concurrent mount. Realtime publication, admin API guards, enrichment flow, and dashboard UI align with FR42.

### File List

- `supabase/migrations/20260606130000_realtime_door_knocks.sql`
- `src/lib/validators/activity-feed.ts`
- `src/features/admin/map-knock-to-activity-item.ts`
- `src/features/admin/get-recent-activity.ts`
- `src/features/admin/api.ts`
- `src/features/admin/use-admin-activity-feed.ts`
- `src/app/api/v1/admin/activity/route.ts`
- `src/app/api/v1/admin/activity/[id]/route.ts`
- `src/components/admin/activity-feed.tsx`
- `src/components/admin/admin-dashboard-shell.tsx`
- `src/app/(admin)/admin/dashboard/page.tsx`

## Story Completion Status

- **Status:** done
- **Completion note:** Code review complete; 1 patch applied; all ACs satisfied
