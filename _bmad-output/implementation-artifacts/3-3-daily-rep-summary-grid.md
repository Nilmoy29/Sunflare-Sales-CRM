---
baseline_commit: NO_VCS
---

# Story 3.3: Daily Rep Summary Grid

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an **admin**,
I want a table of each rep's daily metrics,
so that I can compare productivity at a glance.

## Acceptance Criteria

1. **Given** I am an authenticated admin on `/admin/dashboard`  
   **When** the page loads  
   **Then** I see a **Daily rep summary** table listing every profile with `role = 'rep'` (active and inactive) (FR43)  
   **And** each row shows **rep name** and four counts for the selected calendar day (**Australia/Sydney**): **doors knocked**, **calls made**, **leads added**, **appointments set**  
   **And** reps with no activity show **0** for all metrics (row still present)  
   **And** rows are sorted alphabetically by rep name

2. **Given** the summary grid is visible  
   **When** I change the **date** control  
   **Then** all four metrics refetch for that Sydney calendar day (FR43)  
   **And** default date is **today (Sydney)** on first load  
   **And** I can pick any past date via a native date input (`type="date"`) — no custom range picker (Story 7.1)

3. **Given** metric definitions for the selected Sydney day `[dayStart, dayEnd]`  
   **When** counts are computed server-side  
   **Then** **doors** = `COUNT(door_knocks)` where `knocked_at` between bounds, grouped by `rep_id`  
   **And** **leads added** = `COUNT(leads)` where `created_at` between bounds, grouped by `rep_id`  
   **And** **appointments set** = `COUNT(leads)` where `stage = 'appointment_set'` AND `updated_at` between bounds AND `updated_at > created_at` (stage change proxy until Story 4.7 `lead_activity`)  
   **And** **calls** = `0` for all reps until Story 5.1 (`call_logs` table does not exist) — column still rendered with header for future wiring  
   **And** selecting **today** after midnight Sydney automatically reflects the new day (no manual reset job — calendar-day aggregation IS the nightly reset) (FR43)

4. **Given** authorization boundaries  
   **When** a rep or unauthenticated user hits the summary API  
   **Then** the API returns 403 (NFR10)  
   **And** rep-facing routes are unchanged

5. **Given** performance requirements (NFR3)  
   **When** an admin loads the summary for any single date  
   **Then** one aggregated API round trip returns all rep rows (no per-rep N+1 queries)  
   **And** typical team size (≤20 reps) loads in under **3 seconds** on normal network

6. **Given** implementation is complete  
   **When** `npm run build` and `npm run lint` run  
   **Then** they pass  
   **And** the dashboard placeholder aside from Story 3.2 is replaced with the working grid  
   **And** the live activity feed (Story 3.2) behavior is unchanged  
   **And** there is no low-activity flagging (3.4), global date engine (7.1), leaderboard (7.3), or Realtime subscription on the summary grid (REST refetch on mount/date change is sufficient)

**Implements:** FR43 (doors + leads + appointments in v1; calls when 5.1/5.6 land)  
**NFRs:** NFR3 (single aggregated query, <3s), NFR10 (admin server guards), UX-DR5 (desktop manager dashboard, dense data table)

## Tasks / Subtasks

- [x] **Validators + types** (AC: 1, 2, 3)
  - [x] Create `src/lib/validators/daily-rep-summary.ts`:
    - `dailyRepSummaryRowSchema` — `rep_id`, `rep_name`, `doors`, `calls`, `leads_added`, `appointments_set` (all counts non-negative integers)
    - `dailyRepSummaryResponseSchema` — `{ date: string, rows: DailyRepSummaryRow[] }` where `date` is YYYY-MM-DD echoed back
    - `dailyRepSummaryQuerySchema` — optional `date` (YYYY-MM-DD); default today Sydney when omitted
    - Export `parseDailyRepSummarySearchParams(searchParams)`

- [x] **Database RPC** (AC: 3, 5)
  - [x] Create migration `supabase/migrations/*_get_admin_daily_rep_summary.sql`:
    - `get_admin_daily_rep_summary(p_from timestamptz, p_to timestamptz)`
    - Returns one row per `profiles` where `role = 'rep'`: `rep_id`, `rep_name`, `doors`, `calls`, `leads_added`, `appointments_set`
    - Use CTEs or subquery aggregates to avoid join fan-out (see Reference SQL below)
    - `calls` hardcoded `0` until `call_logs` exists — add SQL comment for Story 5.1
    - `security invoker`, `stable`, `search_path = public`
    - `grant execute ... to authenticated`
  - [x] Apply via Supabase MCP or `npx supabase db push`
  - [x] Regenerate types if project uses `supabase gen types`

- [x] **Server query + API route** (AC: 1, 2, 4, 5)
  - [x] Create `src/features/admin/get-daily-rep-summary.ts` — calls RPC via `createClient()` session auth
  - [x] Create `GET /api/v1/admin/dashboard/summary/route.ts` (architecture endpoint)
  - [x] `requireRoleForApi(["admin"])`
  - [x] Parse query; resolve `date` default to `formatSydneyDateString(new Date())`
  - [x] Convert date to `startOfDaySydney` / `endOfDaySydney` bounds
  - [x] Return `{ data: DailyRepSummaryResponse }` / standard error envelope

- [x] **Client fetch + hook** (AC: 1, 2)
  - [x] Add `fetchDailyRepSummary(date?, signal?)` to `src/features/admin/api.ts`
  - [x] Create `src/features/admin/use-daily-rep-summary.ts` — `loadedKey` = selected date string; follow `use-admin-activity-feed` abort/cleanup pattern

- [x] **Summary grid UI** (AC: 1, 2, 6)
  - [x] Create `src/components/admin/daily-rep-summary-grid.tsx` (client)
    - Date input bound to hook state
    - Semantic `<table>` with Tailwind (match admin zinc palette from `activity-feed.tsx`)
    - Columns: Rep | Doors | Calls | Leads | Appts
    - Loading skeleton, error message, empty-team message (no reps in system)
    - Abbreviate headers on narrow aside; use `title` tooltips for full labels if needed
  - [x] Update `src/components/admin/admin-dashboard-shell.tsx` — replace dashed placeholder aside with `<DailyRepSummaryGrid />`

- [x] **Verify** (AC: 4, 5, 6)
  - [x] Manual: Admin dashboard shows counts matching known knocks/leads for today
  - [x] Manual: Changing date shows historical counts; yesterday excludes today's knocks
  - [x] Manual: Rep account gets 403 on summary API
  - [x] Manual: Activity feed still live-updates independently
  - [x] `npm run build` && `npm run lint`

### Review Findings

- [x] [Review][Patch] Error path left `loadedKey` unset so loading skeleton persisted alongside error message [`src/features/admin/use-daily-rep-summary.ts:40`]
- [x] [Review][Patch] Cleared date input triggered invalid API request — ignore empty `onChange` values [`src/components/admin/daily-rep-summary-grid.tsx:24`]
- [x] [Review][Defer] Stale summary rows remain visible while date refetch is in flight — acceptable v1; matches Story 3.1/2.11 deferred pattern [`src/features/admin/use-daily-rep-summary.ts`]
- [x] [Review][Defer] RPC `grant execute` to `authenticated` (not admin-only) — same pattern as `get_admin_knocks_in_bbox`; API route enforces admin role [`supabase/migrations/20260606140000_get_admin_daily_rep_summary.sql:65`]

## Dev Notes

### Critical constraints

- **Do NOT** create `call_logs` table — Story 5.1. Render calls column as `0`.
- **Do NOT** build low-activity flags or morning overview — Story 3.4.
- **Do NOT** build global date engine affecting all widgets — Story 7.1 (local date input on this grid only).
- **Do NOT** add Realtime subscription or polling interval for summary — REST on mount + date change.
- **Do NOT** install TanStack Query — `fetch` + hooks (project convention).
- **Do NOT** modify activity feed hook/API except coexist on dashboard layout.
- **Do NOT** filter reps by `active = true` — include all `role = 'rep'` (Story 3.1 review fix).
- **Do NOT** expose contact PII in summary — counts only, no addresses/names beyond rep name.

### Scope vs epic AC (calls & appointments)

Epic AC lists four metrics. Current schema state:

| Metric | Story 3.3 | Later |
| :--- | :--- | :--- |
| Doors knocked | Full — `door_knocks.knocked_at` | — |
| Leads added | Full — `leads.created_at` (Story 2.9 minimal table) | — |
| Appointments set | Interim — `leads` where `stage = 'appointment_set'` and `updated_at` in day | Story 4.7 switches to `lead_activity` stage_change events |
| Calls made | Column shows `0` | Story 5.1 creates `call_logs`; Story 5.6 wires rep counter + extend RPC |

When Story 5.1 lands, update RPC to `COUNT(call_logs)` where `called_at` between bounds. Keep response shape stable so UI needs no structural change.

### Nightly reset semantics

There is **no cron job or materialized daily table** in v1. "Resets nightly" means:

- Day boundaries use **midnight Australia/Sydney** via existing `startOfDaySydney` / `endOfDaySydney`.
- Default view = today; after Sydney midnight, "today" is a new empty window.
- Story 7.7 (end-of-shift summaries) may add shift-scoped rollups later — do not preempt.

### API contract

**GET `/api/v1/admin/dashboard/summary?date=2026-06-06`**

```json
{
  "data": {
    "date": "2026-06-06",
    "rows": [
      {
        "rep_id": "uuid",
        "rep_name": "Jane Smith",
        "doors": 42,
        "calls": 0,
        "leads_added": 3,
        "appointments_set": 1
      }
    ]
  }
}
```

Errors: `400 VALIDATION_ERROR`, `401`, `403 FORBIDDEN`, `500 SUMMARY_FAILED`

### Reference SQL — aggregated RPC

```sql
create or replace function public.get_admin_daily_rep_summary(
  p_from timestamptz,
  p_to timestamptz
)
returns table (
  rep_id uuid,
  rep_name text,
  doors bigint,
  calls bigint,
  leads_added bigint,
  appointments_set bigint
)
language sql
stable
security invoker
set search_path = public
as $$
  with reps as (
    select id, name
    from public.profiles
    where role = 'rep'
  ),
  door_counts as (
    select rep_id, count(*)::bigint as doors
    from public.door_knocks
    where knocked_at >= p_from and knocked_at <= p_to
    group by rep_id
  ),
  lead_counts as (
    select rep_id, count(*)::bigint as leads_added
    from public.leads
    where created_at >= p_from and created_at <= p_to
    group by rep_id
  ),
  appointment_counts as (
    select rep_id, count(*)::bigint as appointments_set
    from public.leads
    where stage = 'appointment_set'
      and updated_at >= p_from
      and updated_at <= p_to
      and updated_at > created_at
    group by rep_id
  )
  select
    r.id as rep_id,
    r.name as rep_name,
    coalesce(d.doors, 0) as doors,
    0::bigint as calls, -- Story 5.1: count from call_logs
    coalesce(l.leads_added, 0) as leads_added,
    coalesce(a.appointments_set, 0) as appointments_set
  from reps r
  left join door_counts d on d.rep_id = r.id
  left join lead_counts l on l.rep_id = r.id
  left join appointment_counts a on a.rep_id = r.id
  order by r.name asc;
$$;
```

Direct Supabase query (without RPC) is acceptable only if it matches single-round-trip performance; **prefer RPC** for NFR3 parity with Story 3.1 bbox pattern.

### UI sketch (UX-DR5)

```
Admin dashboard
┌──────────────────────────────┬─────────────────────────┐
│ Live activity (2fr)          │ Daily rep summary (1fr) │
│ …feed rows…                  │ Date: [2026-06-06    ▼] │
│                              │ ┌──────┬───┬───┬───┬──┐│
│                              │ │ Rep  │ D │ C │ L │ A││
│                              │ ├──────┼───┼───┼───┼──┤│
│                              │ │ Jane │42 │ 0 │ 3 │ 1││
│                              │ │ Bob  │38 │ 0 │ 1 │ 0││
│                              │ └──────┴───┴───┴───┴──┘│
└──────────────────────────────┴─────────────────────────┘
D=Doors  C=Calls  L=Leads  A=Appts
```

On `sm`/`md` breakpoints the existing `grid gap-6 lg:grid-cols-[...]` stacks vertically — table should scroll horizontally inside aside if needed (`overflow-x-auto`).

### Files to touch (expected)

| File | Action |
| :--- | :--- |
| `supabase/migrations/*_get_admin_daily_rep_summary.sql` | **New** |
| `src/lib/validators/daily-rep-summary.ts` | **New** |
| `src/features/admin/get-daily-rep-summary.ts` | **New** |
| `src/features/admin/api.ts` | **Update** — add fetch helper |
| `src/features/admin/use-daily-rep-summary.ts` | **New** |
| `src/app/api/v1/admin/dashboard/summary/route.ts` | **New** |
| `src/components/admin/daily-rep-summary-grid.tsx` | **New** |
| `src/components/admin/admin-dashboard-shell.tsx` | **Update** — replace placeholder |

**Unchanged:** `src/features/admin/use-admin-activity-feed.ts`, activity API routes, admin map, rep knock routes.

### Current code state (read before editing)

**`src/components/admin/admin-dashboard-shell.tsx`** — Two-column layout: `ActivityFeed` (left) + dashed placeholder aside (right). Replace aside only.

**`src/features/admin/api.ts`** — Pattern for admin fetch helpers with credentials + error parsing.

**`src/app/api/v1/admin/activity/route.ts`** — Pattern for admin-only GET routes (`requireRoleForApi(["admin"])`).

**`src/features/knocks/format-knock-date.ts`** — `formatSydneyDateString`, `startOfDaySydney`, `endOfDaySydney` for day bounds.

**`src/app/(admin)/admin/map/page.tsx`** — Rep list query: `profiles` where `role = 'rep'`, order by name (no `active` filter).

**`supabase/migrations/20260603180000_leads_minimal.sql`** — Minimal `leads` table exists; admin RLS `leads_select_admin`.

**No `call_logs` table** — confirmed absent from migrations and generated types.

**No HTML tables in codebase yet** — first admin data table; use semantic markup + Tailwind consistent with `activity-feed.tsx` borders/spacing.

### Previous story intelligence

**Story 3.2 (done):**
- Dashboard shell + activity feed live on `/admin/dashboard`.
- Placeholder aside explicitly reserved for this story.
- Realtime on feed only — do not add second subscription here.
- Merge/dedupe hook patterns; use similar abort-on-unmount in summary hook.
- PII minimization — counts only.

**Story 3.1 (done):**
- Admin RPC pattern (`get_admin_knocks_in_bbox`) for performant aggregated reads.
- Sydney date handling shared utilities.
- All reps in filters (not active-only).

**Story 2.9 (done):**
- `leads` table with `rep_id`, `created_at`, `stage`, `updated_at`.
- Leads created on D2D promotion start at `stage = 'interested'`.

### Cross-story dependencies

| Story | Relationship |
| :--- | :--- |
| 2.1, 2.5–2.7 | **Requires** — `door_knocks` data |
| 2.9 | **Requires** — `leads` for leads_added count |
| 3.2 | **Preserve** — activity feed unchanged; replace placeholder aside |
| 3.4 | **Deferred** — low-activity flags use summary data later |
| 4.7 | **Future** — appointment metric may switch to `lead_activity` |
| 5.1, 5.6 | **Future** — wire `calls` column from `call_logs` |
| 7.1 | **Future** — global date engine may sync with this date input |
| 7.7 | **Future** — shift-close summaries complement daily grid |

### Testing

- **Required:** `npm run build`, `npm run lint`
- **Manual:** Seed knocks/leads for two reps; verify counts match SQL
- **Manual:** Date picker to yesterday — today's knocks excluded
- **Manual:** Rep 403 on `/api/v1/admin/dashboard/summary`
- **No** Playwright unless trivial

### References

- [Source: `_bmad-output/planning-artifacts/epics.md` — Story 3.3, FR43]
- [Source: `_bmad-output/planning-artifacts/architecture.md` — `GET /api/v1/admin/dashboard/summary`, dashboard aggregates, NFR3]
- [Source: `docs/Solar_CRM_PRD_v1.md` — Daily Rep Summary Grid]
- [Source: `_bmad-output/implementation-artifacts/3-2-live-activity-feed.md` — dashboard layout, scope boundary]
- [Source: `_bmad-output/implementation-artifacts/3-1-admin-global-map-with-filters.md` — RPC pattern, Sydney dates, rep list]
- [Source: `supabase/migrations/20260603180000_leads_minimal.sql`]
- [Source: `src/features/knocks/format-knock-date.ts`]

## Dev Agent Record

### Agent Model Used

Claude (Cursor Agent)

### Debug Log References

### Completion Notes List

- Added `get_admin_daily_rep_summary` RPC (migration applied via Supabase MCP) — single-query aggregates for doors, leads, appointments; calls hardcoded 0 until Story 5.1.
- `GET /api/v1/admin/dashboard/summary?date=` returns per-rep rows for Sydney calendar day; defaults to today.
- Dashboard aside replaced with `DailyRepSummaryGrid` — date picker, compact table, loading/error/empty states.
- Activity feed unchanged; no Realtime on summary grid.
- Updated `supabase.generated.ts` with admin RPC types.
- `npm run lint` and `npm run build` pass.
- Code review: fixed error-path loading state; guard empty date input.

### Senior Developer Review (AI)

**Outcome:** Approve (2 patches applied)  
**Date:** 2026-06-06  
**Layers:** Blind Hunter, Edge Case Hunter, Acceptance Auditor (inline)

**Summary:** All ACs met after patches. Aggregated RPC, admin API guard, Sydney day bounds, dashboard grid, and scope boundaries (no Realtime, calls=0, activity feed unchanged) align with FR43/NFR3/NFR10.

### File List

- `supabase/migrations/20260606140000_get_admin_daily_rep_summary.sql`
- `src/lib/validators/daily-rep-summary.ts`
- `src/features/admin/get-daily-rep-summary.ts`
- `src/features/admin/use-daily-rep-summary.ts`
- `src/features/admin/api.ts`
- `src/app/api/v1/admin/dashboard/summary/route.ts`
- `src/components/admin/daily-rep-summary-grid.tsx`
- `src/components/admin/admin-dashboard-shell.tsx`
- `src/types/supabase.generated.ts`

## Change Log

- 2026-06-06: Story 3.3 implemented — daily rep summary grid on admin dashboard (FR43).
