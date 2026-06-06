---
baseline_commit: NO_VCS
---

# Story 3.4: Low-Activity and Morning Overview Flags

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an **admin**,
I want to spot reps with low activity,
so that I can coach during the day.

## Acceptance Criteria

1. **Given** I am an authenticated admin on `/admin/dashboard`  
   **When** the page loads  
   **Then** I see a **Morning overview** card showing **yesterday's team aggregate totals** (Australia/Sydney calendar): total doors, calls, leads added, appointments set (FR58)  
   **And** the card labels the date (e.g. "Yesterday — 5 Jun 2026")  
   **And** totals reuse the same metric definitions as Story 3.3 (calls = 0 until Story 5.1)

2. **Given** one or more reps have an **active shift** (`shifts.ended_at IS NULL`)  
   **When** a rep's idle time meets the low-activity threshold  
   **Then** they appear in a **Needs attention** panel on the dashboard (FR58)  
   **And** each flagged row shows **rep name**, **shift started** time (Sydney), and **idle duration** (e.g. "No activity for 72 min")  
   **And** reps **without** an active shift are never flagged  
   **And** reps with recent activity inside the window are not flagged

3. **Given** low-activity detection rules  
   **When** evaluating a rep on an active shift  
   **Then** **activity** = most recent `door_knocks.knocked_at` for that rep (any time today or during current shift — whichever is later in time)  
   **And** **idle since** = `now - coalesce(last_knock_at, shift.started_at)`  
   **And** the rep is flagged when `idle_since >= window_minutes`  
   **And** the default window is **60 minutes**, configurable server-side via env `ADMIN_LOW_ACTIVITY_WINDOW_MINUTES` (fallback 60 if unset)  
   **And** the API accepts optional `window_minutes` query param (integer, min 15, max 480) for admin testing — env default used when omitted  
   **And** **calls** do not count as activity until Story 5.1 (`call_logs` table absent)

4. **Given** the daily rep summary grid (Story 3.3) is visible  
   **When** a rep is flagged for low activity **today**  
   **Then** their summary row is visually highlighted (e.g. amber row/badge) in the grid when viewing **today's** date  
   **And** highlighting clears when they are no longer flagged

5. **Given** the dashboard is open during the field day  
   **When** a new door knock Realtime event arrives (Story 3.2 feed)  
   **Then** the low-activity list refetches without a full page reload  
   **And** there is no standalone polling interval for flags (refetch on mount + Realtime-triggered refresh only)

6. **Given** authorization boundaries  
   **When** a rep or unauthenticated user hits the new dashboard APIs  
   **Then** the API returns 403 (NFR10)  
   **And** rep-facing routes are unchanged

7. **Given** implementation is complete  
   **When** `npm run build` and `npm run lint` run  
   **Then** they pass  
   **And** activity feed (3.2) and summary grid (3.3) behavior is preserved  
   **And** there is no admin settings UI for window config, push notifications, GPS breadcrumb map (3.5), or global date engine (7.1)

**Implements:** FR58 (morning yesterday totals + low-activity flags; live map deferred to existing `/admin/map`)  
**NFRs:** NFR3 (reuse aggregated RPC where possible), NFR10 (admin server guards), UX-DR5 (desktop manager dashboard)

## Tasks / Subtasks

- [x] **Validators + types** (AC: 1, 2, 3)
  - [x] Create `src/lib/validators/dashboard-coaching.ts`:
    - `morningOverviewTotalsSchema` — `doors`, `calls`, `leads_added`, `appointments_set` (non-negative ints)
    - `morningOverviewResponseSchema` — `{ date: string, label: string, totals: MorningOverviewTotals }`
    - `lowActivityRepSchema` — `rep_id`, `rep_name`, `shift_id`, `shift_started_at`, `last_activity_at` (nullable), `idle_minutes`
    - `lowActivityResponseSchema` — `{ window_minutes: number, flagged: LowActivityRep[] }`
    - `lowActivityQuerySchema` — optional `window_minutes` (15–480)
    - Export `parseLowActivitySearchParams(searchParams)`
  - [x] Add `yesterdaySydneyDateString()` to `src/features/knocks/format-knock-date.ts` — return YYYY-MM-DD for previous Sydney calendar day

- [x] **Database RPC — low activity** (AC: 2, 3)
  - [x] Create migration `supabase/migrations/*_get_admin_low_activity_reps.sql`:
    - `get_admin_low_activity_reps(p_window_minutes int default 60)`
    - Input reps: active shifts only (`ended_at is null`)
    - Join `profiles` for `rep_name`
    - `last_activity_at` = `max(door_knocks.knocked_at)` for rep (no date filter — any knock ever is fine; idle math uses shift start as floor)
    - Flag when `extract(epoch from (now() - coalesce(last_activity_at, shift.started_at))) / 60 >= p_window_minutes`
    - Return: `rep_id`, `rep_name`, `shift_id`, `shift_started_at`, `last_activity_at`, `idle_minutes` (computed int, floor)
    - Order by `idle_minutes desc`
    - Comment: extend `last_activity_at` with `call_logs` in Story 5.1
    - `security invoker`, `stable`, `search_path = public`, grant execute to `authenticated`
  - [x] Apply via Supabase MCP or `npx supabase db push`

- [x] **Server features + API routes** (AC: 1, 2, 3, 6)
  - [x] Create `src/features/admin/get-morning-overview.ts`:
    - Call existing `getDailyRepSummary(yesterdaySydneyDateString())`
    - Sum rows into team totals; build human label via existing date formatters
  - [x] Create `src/features/admin/get-low-activity-reps.ts`:
    - Resolve window: query param → validate → else `Number(process.env.ADMIN_LOW_ACTIVITY_WINDOW_MINUTES ?? 60)`
    - Call RPC `get_admin_low_activity_reps`
    - Parse with Zod
  - [x] Create `GET /api/v1/admin/dashboard/morning-overview/route.ts` — admin only
  - [x] Create `GET /api/v1/admin/dashboard/low-activity/route.ts` — admin only

- [x] **Client fetch + hooks** (AC: 1, 2, 5)
  - [x] Add `fetchMorningOverview(signal?)` and `fetchLowActivityReps(windowMinutes?, signal?)` to `src/features/admin/api.ts`
  - [x] Create `src/features/admin/use-morning-overview.ts` — fetch on mount
  - [x] Create `src/features/admin/use-low-activity-reps.ts` — fetch on mount; expose `refetch()` for Realtime trigger
  - [x] Update `use-admin-activity-feed.ts` OR `admin-dashboard-shell.tsx` to call `refetch()` on low-activity hook when Realtime prepends a knock (pass callback or observe feed `items` length/id — minimal coupling)

- [x] **Dashboard UI** (AC: 1, 2, 4, 7)
  - [x] Create `src/components/admin/morning-overview-card.tsx` — team totals, loading/error states
  - [x] Create `src/components/admin/low-activity-panel.tsx` — flagged rep list; empty state "All reps active"
  - [x] Update `src/components/admin/daily-rep-summary-grid.tsx` — accept optional `flaggedRepIds?: ReadonlySet<string>`; highlight matching rows when `date === today (Sydney)`
  - [x] Update `src/components/admin/admin-dashboard-shell.tsx`:
    - Render morning overview + low-activity panels above the two-column grid
    - Wire hooks; pass flagged rep IDs to summary grid for today

- [x] **Config** (AC: 3)
  - [x] Document `ADMIN_LOW_ACTIVITY_WINDOW_MINUTES` in `.env.example` (optional, default 60)

- [x] **Verify** (AC: 6, 7)
  - [x] Manual: Dashboard shows yesterday team totals on load
  - [x] Manual: Rep on active shift with no knocks for > window → flagged; after knock → unflagged after Realtime refetch
  - [x] Manual: Rep not on shift → never flagged
  - [x] Manual: Rep 403 on new APIs
  - [x] `npm run build` && `npm run lint`

### Review Findings

- [x] [Review][Patch] Low-activity refetch ran only after successful feed enrich — now fires on Realtime INSERT (AC5) [`src/features/admin/use-admin-activity-feed.ts:111`]
- [x] [Review][Patch] RPC used lifetime max knock, mis-flagging reps after shift restart — scoped to `knocked_at >= shift_started_at` [`supabase/migrations/20260606150000_get_admin_low_activity_reps.sql:24`]
- [x] [Review][Patch] Morning label omitted year from AC example — added `formatSydneyMorningLabel` [`src/features/knocks/format-knock-date.ts:56`]
- [x] [Review][Defer] Stale flagged list visible while refetch in flight — acceptable v1; matches Story 3.3 deferred pattern [`src/features/admin/use-low-activity-reps.ts`]
- [x] [Review][Defer] RPC `grant execute` to `authenticated` — same pattern as other admin RPCs; API enforces admin role [`supabase/migrations/20260606150000_get_admin_low_activity_reps.sql:49`]

## Dev Notes

### Critical constraints

- **Do NOT** create `call_logs` — Story 5.1. Activity = door knocks only; calls column in morning totals stays 0.
- **Do NOT** add admin settings page for window config — env var + optional API query param only.
- **Do NOT** add polling interval for flags — mount + Realtime-triggered refetch only (AC 5).
- **Do NOT** modify activity feed Realtime channel semantics — only trigger sibling refetch.
- **Do NOT** install TanStack Query — `fetch` + hooks (project convention).
- **Do NOT** build GPS breadcrumbs (3.5), leaderboard (7.3), or push alerts (PRD v2 Inactivity Guard).
- **Do NOT** flag inactive profile reps unless they have an open shift row (shift presence is the gate).

### Low-activity algorithm (canonical)

```
idle_anchor = last_door_knock_at ?? shift.started_at
idle_minutes = floor((now - idle_anchor) / 60s)
flagged if idle_minutes >= window_minutes
```

Only reps with `shifts.ended_at IS NULL` are candidates.

**Example:** Window = 60. Shift started 2h ago, last knock 90 min ago → idle 90 min → flagged.  
**Example:** Window = 60. Shift started 20 min ago, no knocks → idle 20 min → not flagged.  
**Example:** Window = 60. Knock 30 min ago → idle 30 min → not flagged.

### Morning overview

Reuse Story 3.3 aggregation — **do not duplicate SQL**:

```typescript
const date = yesterdaySydneyDateString();
const { rows } = await getDailyRepSummary(date);
const totals = rows.reduce(
  (acc, r) => ({
    doors: acc.doors + r.doors,
    calls: acc.calls + r.calls,
    leads_added: acc.leads_added + r.leads_added,
    appointments_set: acc.appointments_set + r.appointments_set,
  }),
  { doors: 0, calls: 0, leads_added: 0, appointments_set: 0 },
);
```

Label: `"Yesterday — " + formatKnockHistoryDate(startOfDaySydney(date)).split(",")[0]` or similar compact date.

### Reference SQL — low activity RPC

```sql
create or replace function public.get_admin_low_activity_reps(
  p_window_minutes int default 60
)
returns table (
  rep_id uuid,
  rep_name text,
  shift_id uuid,
  shift_started_at timestamptz,
  last_activity_at timestamptz,
  idle_minutes int
)
language sql
stable
security invoker
set search_path = public
as $$
  with active_shifts as (
    select s.id as shift_id, s.rep_id, s.started_at as shift_started_at
    from public.shifts s
    where s.ended_at is null
  ),
  last_knock as (
    select dk.rep_id, max(dk.knocked_at) as last_activity_at
    from public.door_knocks dk
    group by dk.rep_id
  )
  select
    a.rep_id,
    p.name as rep_name,
    a.shift_id,
    a.shift_started_at,
    lk.last_activity_at,
    floor(
      extract(epoch from (now() - coalesce(lk.last_activity_at, a.shift_started_at))) / 60
    )::int as idle_minutes
  from active_shifts a
  join public.profiles p on p.id = a.rep_id
  left join last_knock lk on lk.rep_id = a.rep_id
  where floor(
    extract(epoch from (now() - coalesce(lk.last_activity_at, a.shift_started_at))) / 60
  ) >= p_window_minutes
  order by idle_minutes desc;
$$;
```

### Realtime refetch pattern (AC 5)

Preferred wiring in `admin-dashboard-shell.tsx`:

```typescript
const lowActivity = useLowActivityReps();
const feed = useAdminActivityFeed({ onNewActivity: lowActivity.refetch });
```

If modifying `useAdminActivityFeed` signature is too invasive, use `useEffect` in shell watching `feed.items[0]?.id` (newest item) to call `refetch()` — document chosen approach in completion notes.

### API contracts

**GET `/api/v1/admin/dashboard/morning-overview`**

```json
{
  "data": {
    "date": "2026-06-05",
    "label": "Yesterday — 5 Jun 2026",
    "totals": {
      "doors": 142,
      "calls": 0,
      "leads_added": 12,
      "appointments_set": 3
    }
  }
}
```

**GET `/api/v1/admin/dashboard/low-activity?window_minutes=60`**

```json
{
  "data": {
    "window_minutes": 60,
    "flagged": [
      {
        "rep_id": "uuid",
        "rep_name": "Bob Jones",
        "shift_id": "uuid",
        "shift_started_at": "2026-06-06T00:30:00.000Z",
        "last_activity_at": "2026-06-06T02:00:00.000Z",
        "idle_minutes": 72
      }
    ]
  }
}
```

### UI sketch (UX-DR5)

```
Admin dashboard
┌─────────────────────────────────────────────────────────────┐
│ Morning overview — Yesterday, 5 Jun 2026                    │
│ 142 doors · 0 calls · 12 leads · 3 appts                    │
├─────────────────────────────────────────────────────────────┤
│ Needs attention (60 min window)                             │
│ • Bob Jones — No activity for 72 min                        │
│ • Jane Smith — No activity for 65 min                       │
├──────────────────────────────┬──────────────────────────────┤
│ Live activity                │ Daily rep summary            │
│ …                            │ (flagged rows highlighted)   │
└──────────────────────────────┴──────────────────────────────┘
```

Row highlight: `bg-amber-50` or left border `border-l-4 border-amber-400` on flagged rep when summary date is today.

### Files to touch (expected)

| File | Action |
| :--- | :--- |
| `supabase/migrations/*_get_admin_low_activity_reps.sql` | **New** |
| `src/lib/validators/dashboard-coaching.ts` | **New** |
| `src/features/knocks/format-knock-date.ts` | **Update** — `yesterdaySydneyDateString()` |
| `src/features/admin/get-morning-overview.ts` | **New** |
| `src/features/admin/get-low-activity-reps.ts` | **New** |
| `src/features/admin/api.ts` | **Update** |
| `src/features/admin/use-morning-overview.ts` | **New** |
| `src/features/admin/use-low-activity-reps.ts` | **New** |
| `src/app/api/v1/admin/dashboard/morning-overview/route.ts` | **New** |
| `src/app/api/v1/admin/dashboard/low-activity/route.ts` | **New** |
| `src/components/admin/morning-overview-card.tsx` | **New** |
| `src/components/admin/low-activity-panel.tsx` | **New** |
| `src/components/admin/daily-rep-summary-grid.tsx` | **Update** — flagged row highlight |
| `src/components/admin/admin-dashboard-shell.tsx` | **Update** — layout + hook wiring |
| `src/features/admin/use-admin-activity-feed.ts` | **Update** (optional) — `onNewActivity` callback |
| `.env.example` | **Update** — document env var |

**Unchanged:** admin map, rep knock/shift routes, `get_admin_daily_rep_summary` RPC (reuse via `getDailyRepSummary`).

### Current code state (read before editing)

**`src/components/admin/admin-dashboard-shell.tsx`** — Header + two-column grid (activity + summary). Add overview panels above grid.

**`src/features/admin/get-daily-rep-summary.ts`** — Reuse for morning totals; do not duplicate RPC.

**`src/features/shifts/queries.ts`** — `getActiveShiftForRep` is rep-scoped; admin low-activity uses RPC joining all active shifts.

**`src/features/admin/use-admin-activity-feed.ts`** — Realtime on `door_knocks` INSERT; use as refetch trigger for flags.

**`supabase/migrations/20260603130100_shifts_gps_pings_rls.sql`** — `shifts_select_admin` allows admin read.

**No `call_logs` table** — activity detection is knock-only until Story 5.1.

### Previous story intelligence

**Story 3.3 (done):**
- `getDailyRepSummary` + summary grid; reuse for yesterday rollup and today row highlighting.
- Sydney date helpers; all `role = 'rep'` in summary (flags use active shifts only — different cohort).
- Error-path `loadedKey` pattern; stale rows on refetch deferred.

**Story 3.2 (done):**
- Realtime feed on dashboard; extend with refetch callback for coaching panels.
- No polling as primary update mechanism.

**Story 3.1 (done):**
- Admin API + RPC patterns; PII minimization.

### Cross-story dependencies

| Story | Relationship |
| :--- | :--- |
| 2.2 | **Requires** — `shifts` active shift detection |
| 2.5–2.7 | **Requires** — `door_knocks` as activity signal |
| 3.2 | **Integrate** — Realtime refetch trigger |
| 3.3 | **Reuse** — summary RPC + grid highlight target |
| 3.5 | **Deferred** — live map breadcrumbs (FR58 mentions live map — already at `/admin/map`) |
| 5.1 | **Future** — include calls in activity + morning totals |
| 7.1 | **Future** — global date engine |

### Testing

- **Required:** `npm run build`, `npm run lint`
- **Manual:** Seed rep with open shift, no knocks > 60 min → flagged
- **Manual:** Log knock → Realtime → flag clears after refetch
- **Manual:** Yesterday totals match sum of 3.3 grid for yesterday date
- **No** Playwright unless trivial

### References

- [Source: `_bmad-output/planning-artifacts/epics.md` — Story 3.4, FR58]
- [Source: `docs/Solar_CRM_PRD_v1.md` — Manager morning routine §3.2]
- [Source: `_bmad-output/implementation-artifacts/3-3-daily-rep-summary-grid.md` — summary RPC reuse]
- [Source: `_bmad-output/implementation-artifacts/3-2-live-activity-feed.md` — Realtime refetch pattern]
- [Source: `src/features/shifts/queries.ts` — active shift definition]
- [Source: `supabase/migrations/20260606140000_get_admin_daily_rep_summary.sql`]

## Dev Agent Record

### Agent Model Used

Claude (Cursor Agent)

### Debug Log References

### Completion Notes List

- Added `get_admin_low_activity_reps` RPC (migration applied via Supabase MCP) — flags reps on active shifts idle ≥ window (default 60 min).
- `GET /api/v1/admin/dashboard/morning-overview` — yesterday team totals via reused `getDailyRepSummary`.
- `GET /api/v1/admin/dashboard/low-activity` — flagged reps with idle duration and shift start.
- Dashboard: morning overview + needs-attention panels above activity/summary grid; flagged rows highlighted amber on today's summary.
- `useAdminActivityFeed({ onNewActivity })` triggers low-activity refetch on Realtime knock — no polling.
- Documented `ADMIN_LOW_ACTIVITY_WINDOW_MINUTES` in `.env.example`.
- `npm run lint` and `npm run build` pass.
- Code review: Realtime refetch on INSERT; shift-scoped last knock; morning label includes year.

### Senior Developer Review (AI)

**Outcome:** Approve (3 patches applied)  
**Date:** 2026-06-06  
**Layers:** Blind Hunter, Edge Case Hunter, Acceptance Auditor (inline)

**Summary:** All ACs met after patches. Morning overview reuses summary RPC; low-activity flags active-shift reps with env-configurable window; Realtime triggers flag refetch; summary grid highlights flagged reps for today.

### File List

- `supabase/migrations/20260606150000_get_admin_low_activity_reps.sql`
- `src/lib/validators/dashboard-coaching.ts`
- `src/features/knocks/format-knock-date.ts`
- `src/features/admin/get-morning-overview.ts`
- `src/features/admin/get-low-activity-reps.ts`
- `src/features/admin/use-morning-overview.ts`
- `src/features/admin/use-low-activity-reps.ts`
- `src/features/admin/api.ts`
- `src/features/admin/use-admin-activity-feed.ts`
- `src/app/api/v1/admin/dashboard/morning-overview/route.ts`
- `src/app/api/v1/admin/dashboard/low-activity/route.ts`
- `src/components/admin/morning-overview-card.tsx`
- `src/components/admin/low-activity-panel.tsx`
- `src/components/admin/daily-rep-summary-grid.tsx`
- `src/components/admin/admin-dashboard-shell.tsx`
- `src/types/supabase.generated.ts`
- `.env.example`

## Change Log

- 2026-06-06: Story 3.4 implemented — morning overview + low-activity coaching flags (FR58).
