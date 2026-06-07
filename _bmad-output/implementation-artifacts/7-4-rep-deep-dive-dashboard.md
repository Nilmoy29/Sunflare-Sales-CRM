---
baseline_commit: 161aab2
---

# Story 7.4: Rep Deep-Dive Dashboard

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an **admin**,
I want a per-rep analytics page,
so that I prepare coaching conversations.

## Acceptance Criteria

1. **Given** I am an authenticated admin  
   **When** I navigate to `/admin/reps/[repId]`  
   **Then** a **Rep deep dive** page loads for a valid rep profile (`role = 'rep'`) (FR47)  
   **And** the page shows the rep's **name** in the header  
   **And** a **rep selector** dropdown lets me switch to another rep (updates URL to `/admin/reps/{id}`)  
   **And** a **Back to dashboard** link returns to `/admin/dashboard`  
   **And** styling matches existing admin zinc cards and typography

2. **Given** I am on the leaderboard or daily rep summary grid on `/admin/dashboard`  
   **When** I click a **rep name**  
   **Then** I navigate to `/admin/reps/{repId}` for that rep (FR47 entry point)

3. **Given** the deep-dive page  
   **When** it loads  
   **Then** a **global date range control** appears (reuse Story 7.1 presets: Today / Week / Month / Custom)  
   **And** the control drives **activity trend** and **period totals** sections  
   **And** Sydney boundaries use `startOfDaySydney` / `endOfDaySydney` / 366-day max (same validators as dashboard)

4. **Given** a selected rep and date range `[from, to]`  
   **When** activity trend data loads  
   **Then** one row per **Sydney calendar day** in the range shows daily counts for: **doors**, **calls**, **leads added**, **appointments set**  
   **And** metric definitions match `get_admin_daily_rep_summary` (Story 3.3 + 5.6) scoped to **this rep only**  
   **And** days with zero activity still appear (count = 0)  
   **And** **period totals** at the top sum the daily rows and match that rep's row in the summary grid for the same range

5. **Given** the activity trend section  
   **When** I view the chart  
   **Then** a **metric toggle** (Doors | Calls | Leads | Appts) selects which metric the trend displays (client-side, no refetch)  
   **And** the chart is a **horizontal bar per day** (same Tailwind bar pattern as `funnel-chart.tsx` — relative width by max day in range)  
   **And** each row shows date label + count  
   **And** **no new chart library** is installed

6. **Given** the deep-dive page  
   **When** pipeline snapshot loads  
   **Then** a **Current pipeline** panel shows **live** stage counts for leads assigned to this rep (`rep_id = repId`, `stage != 'lost'`)  
   **And** stages display in pipeline order with labels from `LEAD_STAGE_LABELS` (exclude `lost`)  
   **And** stages with zero leads still show (count = 0)  
   **And** snapshot is **not** filtered by the date range (current inventory, not historical)

7. **Given** loading and error states  
   **When** trend or pipeline data is fetching  
   **Then** skeleton/pulse loading shows on **every** refetch (match funnel/leaderboard: `loading && !error`)  
   **And** API errors show inline messages (no page crash)  
   **And** invalid / non-rep `repId` returns **404** (`notFound()` on page; API returns 404)

8. **Given** authorization and performance (NFR10, NFR3)  
   **When** deep-dive APIs are called  
   **Then** admin role is enforced server-side (`requireRoleForApi(["admin"])`)  
   **And** rep/unauthenticated callers get 403  
   **And** activity trend uses **one aggregated RPC round trip** per range change  
   **And** pipeline snapshot uses **one aggregated RPC round trip** per rep (not per day)  
   **And** typical ranges (≤31 days) load in under **3 seconds**

9. **Given** implementation is complete  
   **When** `npm run build` and `npm run lint` run  
   **Then** they pass  
   **And** geographic yield (7.5), CSV export (7.6), end-of-shift summaries (7.7), GPS breadcrumb map overlay, and admin call-script config (7.8) are **not** added

**Implements:** FR47  
**NFRs:** NFR3 (aggregated queries), NFR10 (admin guards), UX-DR5 (desktop manager dashboard)

## Tasks / Subtasks

- [x] **Database RPCs** (AC: 4, 6, 8)
  - [x] Create migration `supabase/migrations/*_get_admin_rep_deep_dive.sql`:
    - `get_admin_rep_activity_trend(p_rep_id uuid, p_from timestamptz, p_to timestamptz)`
      - Returns `(activity_date date, doors, calls, leads_added, appointments_set)` — one row per Sydney calendar day in range, ascending
      - `generate_series` on Sydney dates from `p_from`..`p_to`; left-join daily counts for **one rep**
      - Doors: `door_knocks` where `rep_id = p_rep_id`, bucket by Sydney date of `knocked_at`
      - Calls: `call_logs` where `rep_id = p_rep_id`, bucket by Sydney date of `called_at`
      - Leads: `leads` created in range where `rep_id = p_rep_id`, bucket by Sydney date of `created_at`
      - Appts: `leads` where `rep_id = p_rep_id`, `stage = 'appointment_set'`, `updated_at > created_at`, bucket by Sydney date of `updated_at` (same semantics as summary RPC)
    - `get_admin_rep_pipeline_snapshot(p_rep_id uuid)`
      - Returns `(stage_key text, label text, sort_order int, count bigint)` for all stages except `lost`
      - Count current leads where `rep_id = p_rep_id` and `stage = stage_key`; include zero-count stages
      - Labels: Knocked/Called, Interested, Appointment set, Pitched, Proposal sent, Signed
    - `security invoker`, `stable`, `set search_path = public`
    - `grant execute` to `authenticated` (admin enforced at API — same pattern as funnel/summary)
  - [x] Apply via Supabase MCP or `npm run db:push`; regenerate types if needed

- [x] **Validators + server fetch** (AC: 4, 6, 7, 8)
  - [x] Create `src/lib/validators/rep-deep-dive.ts`:
    - `repActivityTrendDaySchema` — `{ activity_date, doors, calls, leads_added, appointments_set }`
    - `repActivityTrendResponseSchema` — `{ rep_id, from, to, days: [...] }`
    - `repPipelineStageRowSchema` — `{ stage_key, label, sort_order, count }`
    - `repPipelineSnapshotResponseSchema` — `{ rep_id, stages: [...] }`
    - Reuse `dashboardDateRangeQuerySchema` / Sydney date parsing for trend query params
    - `repIdParamSchema` — UUID for route param validation
  - [x] Create `src/features/dashboard/get-rep-activity-trend.ts` — RPC wrapper + Zod parse
  - [x] Create `src/features/dashboard/get-rep-pipeline-snapshot.ts` — RPC wrapper + Zod parse
  - [x] Create `src/features/admin/get-rep-profile.ts` (or inline in page):
    - Load profile by id; return `{ id, name, role }` or null if not found / not rep

- [x] **API routes** (AC: 7, 8)
  - [x] Create `GET /api/v1/admin/reps/[repId]/activity-trend/route.ts`
    - `requireRoleForApi(["admin"])`
    - Validate `repId` UUID; verify rep profile exists → 404 if not
    - Parse `from`/`to`; default to **This Week** (Sydney) when omitted
    - Return `{ data: { rep_id, from, to, days } }`
  - [x] Create `GET /api/v1/admin/reps/[repId]/pipeline/route.ts`
    - Same auth + rep validation
    - Return `{ data: { rep_id, stages } }`

- [x] **Client hooks + fetch** (AC: 3, 4, 5, 7)
  - [x] Add `fetchRepActivityTrend(repId, from, to, signal?)` and `fetchRepPipelineSnapshot(repId, signal?)` to `src/features/dashboard/api.ts`
  - [x] Create `src/features/dashboard/use-rep-activity-trend.ts`:
    - Args: `repId`, consume `useDashboardDateRange()` → `{ from, to }`
    - Abort-on-unmount; `loadedKey = repId:from:to`; skeleton on every refetch
    - Local `metric` state (default `doors`); derive display rows client-side
    - Compute **period totals** via `useMemo` sum over `days`
  - [x] Create `src/features/dashboard/use-rep-pipeline-snapshot.ts`:
    - Args: `repId`; refetch when `repId` changes only

- [x] **UI components** (AC: 1, 3, 5, 6, 7)
  - [x] Create `src/components/admin/rep-deep-dive-shell.tsx`:
    - Wrap in `DashboardDateRangeProvider` (default preset: **week** — coaching view)
    - Header: rep name, rep selector, back link
    - Layout: period totals → activity trend → pipeline snapshot
  - [x] Create `src/components/admin/rep-selector.tsx`:
    - `<select>` or button list of reps `{ id, name }`; `onChange` → `router.push(/admin/reps/{id})`
  - [x] Create `src/components/admin/rep-period-totals.tsx`:
    - Four metric cards (Doors, Calls, Leads, Appts) from period totals
  - [x] Create `src/components/admin/rep-activity-trend-chart.tsx`:
    - Metric toggle (reuse `LEADERBOARD_METRIC_OPTIONS` labels)
    - Daily bar rows; empty range message if no days
  - [x] Create `src/components/admin/rep-pipeline-snapshot.tsx`:
    - Stage table with counts; horizontal bars optional (match funnel width pattern)

- [x] **Page + navigation links** (AC: 1, 2)
  - [x] Create `src/app/(admin)/admin/reps/[repId]/page.tsx`:
    - `requireRole(["admin"])`
    - Validate rep exists; `notFound()` otherwise
    - Load rep list for selector (profiles where `role = 'rep'`, ordered by name)
    - Render `<RepDeepDiveShell rep={...} reps={...} />`
  - [x] Update `src/components/admin/team-leaderboard.tsx`:
    - Rep name → `<Link href={/admin/reps/${row.rep_id}}>`
  - [x] Update `src/components/admin/daily-rep-summary-grid.tsx`:
    - Rep name → same deep-dive link

- [x] **Verify** (AC: 8, 9)
  - [x] Manual: Click rep from leaderboard → deep dive loads correct rep
  - [x] Manual: Week range daily doors sum = summary grid doors for same rep/range
  - [x] Manual: Pipeline snapshot counts match admin pipeline filtered to that rep (spot-check)
  - [x] Manual: Invalid rep UUID → 404
  - [x] Manual: Rep role caller → 403 on APIs
  - [x] `npm run build` && `npm run lint`

### Review Findings

- [x] [Review][Patch] Invalid rep UUID returns 400 on APIs, not 404 [`activity-trend/route.ts:24`, `pipeline/route.ts:20`] — AC7 requires 404 for invalid rep id; page uses `notFound()` but direct API calls get 400.

- [x] [Review][Patch] Trend date labels use browser-local parsing [`rep-activity-trend-chart.tsx:22`] — `new Date(\`${dateStr}T12:00:00\`)` can shift the displayed day for admins outside Sydney; reuse `startOfDaySydney(dateStr)` like `formatSydneyMorningLabel`.

- [x] [Review][Patch] Duplicate trend error in period totals [`rep-period-totals.tsx:34`, `rep-deep-dive-shell.tsx:52`] — same `trend.error` renders in both Period totals and Activity trend panels; show error only in the trend section.

- [x] [Review][Defer] RPC `grant execute` to `authenticated` — admin enforced at API route; same pattern as 7.2/7.3 summary and funnel RPCs.

- [x] [Review][Defer] Stale error persists during range/rep refetch — matches funnel/leaderboard deferred stale-state pattern.

- [x] [Review][Defer] Pipeline stage labels hardcoded in SQL vs `LEAD_STAGE_LABELS` — labels match today; funnel RPC uses same pattern.

- [x] [Review][Defer] Client `fetchRepActivityTrend` / `fetchRepPipelineSnapshot` do not re-validate with Zod — matches project fetch+hooks convention.

- [x] [Review][Defer] Date range resets to default week when switching reps via selector — full navigation remounts provider; acceptable v1.

## Dev Notes

### Critical constraints

- **Do NOT** install chart libraries (Recharts, Chart.js, etc.) — Tailwind horizontal bars only (Story 7.2 pattern).
- **Do NOT** install TanStack Query — use existing `useEffect` + abort pattern from `use-funnel-conversion.ts`.
- **Do NOT** fetch all pipeline leads client-side for snapshot — use the new aggregated RPC.
- **Do NOT** filter pipeline snapshot by date range — it is **current** inventory.
- **Do NOT** build geographic yield (7.5), CSV export (7.6), end-of-shift summaries (7.7), or GPS breadcrumb overlay on this page (future enhancement; breadcrumbs API exists at `/api/v1/admin/gps/breadcrumbs`).
- **Do NOT** expose contact PII on deep dive — rep metrics and stage counts only (no lead/contact names in v1 snapshot table).
- **Do NOT** sync deep-dive date range back to main dashboard — independent `DashboardDateRangeProvider` instance on this page.

### Metric definitions (must match summary RPC)

| UI label | Field | Source (per day, one rep) |
| :--- | :--- | :--- |
| Doors | `doors` | `door_knocks.knocked_at` Sydney date |
| Calls | `calls` | `call_logs.called_at` Sydney date |
| Leads | `leads_added` | `leads.created_at` Sydney date |
| Appts | `appointments_set` | `leads.updated_at` Sydney date where `stage = 'appointment_set'` and `updated_at > created_at` |

Period totals = sum of daily rows (must equal that rep's column in `get_admin_daily_rep_summary` for the same range).

### Pipeline snapshot stages

Use `LEAD_STAGES` minus `lost`, in order, with `LEAD_STAGE_LABELS` from `@/features/pipeline/pipeline-stage-labels.ts`:

| sort_order | stage_key | label |
| :--- | :--- | :--- |
| 1 | knocked_called | Knocked / Called |
| 2 | interested | Interested |
| 3 | appointment_set | Appointment set |
| 4 | pitched | Pitched |
| 5 | proposal_sent | Proposal sent |
| 6 | signed | Signed |

### Page layout (reference)

```tsx
<DashboardDateRangeProvider defaultPreset="week">
  <main>
    <header>
      <Link href="/admin/dashboard">← Dashboard</Link>
      <h1>{rep.name}</h1>
      <RepSelector reps={reps} value={rep.id} />
    </header>
    <DashboardDateRangeControl />
    <RepPeriodTotals totals={periodTotals} loading={trend.loading} />
    <RepActivityTrendChart metric={...} days={...} loading={...} error={...} />
    <RepPipelineSnapshot stages={...} loading={...} error={...} />
  </main>
</DashboardDateRangeProvider>
```

Extend `DashboardDateRangeProvider` with optional `defaultPreset` prop if not already supported (7.1 may default to `today` — deep dive should default to **week** for meaningful trends).

### RPC reference (activity trend)

```sql
-- Pseudocode: one row per Sydney day, zero-filled
with days as (
  select generate_series(
    (p_from at time zone 'Australia/Sydney')::date,
    (p_to at time zone 'Australia/Sydney')::date,
    interval '1 day'
  )::date as activity_date
)
select d.activity_date,
       coalesce(door_counts.doors, 0),
       ...
from days d
left join ... on ...
order by d.activity_date asc;
```

### Files to read before editing

| File | Current behavior | 7.4 change |
| :--- | :--- | :--- |
| `team-leaderboard.tsx` | Rep name plain text | Link to `/admin/reps/[id]` |
| `daily-rep-summary-grid.tsx` | Rep name plain text | Link to `/admin/reps/[id]` |
| `dashboard-date-range-context.tsx` | Provider defaults to Today | Optional `defaultPreset` for deep dive |
| `funnel-chart.tsx` | Horizontal bar rows | Model for trend chart |
| `use-funnel-conversion.ts` | Range-keyed fetch + abort | Model for trend hook |
| `get-funnel-conversion.ts` | RPC + Zod | Model for server fetchers |
| `get_admin_daily_rep_summary.sql` | Per-rep range metrics | Same definitions, daily grain |
| `pipeline-stage-labels.ts` | Stage labels/order | Pipeline snapshot labels |
| `admin/team/page.tsx` | Rep list from profiles | Model for rep selector data |

### Previous story intelligence

**7.1:** Reuse `DashboardDateRangeControl`, Sydney resolvers, 366-day validation. Deep dive gets its own provider instance.

**7.2:** `features/dashboard/` owns analytics hooks and RPC wrappers; funnel bar chart is the visualization pattern; skeleton on every refetch.

**7.3:** Metric toggle labels (Doors, Calls, Leads, Appts) — reuse `LEADERBOARD_METRIC_OPTIONS` / `leaderboardMetricSchema` for trend metric selection. Leaderboard rep names are the primary navigation entry point for this story.

**3.3 / 5.6:** Summary RPC metric semantics are canonical — deep-dive daily buckets must not redefine SQL differently.

**4.x pipeline:** Stage enum and labels exist; do not duplicate stage definitions.

### Cross-story dependencies

| Story | Relationship |
| :--- | :--- |
| 7.1 | **Requires** — date range control + validators |
| 7.3 | **Entry** — link rep names from leaderboard |
| 3.3 / 5.6 | **Requires** — metric definitions |
| 4.x | **Reference** — pipeline stages |
| 3.5 | **Future** — breadcrumbs map on deep dive (out of scope) |
| 7.5–7.8 | **Independent** — not in this story |

### Git intelligence

Baseline commit `161aab2`; Epic 7 dashboard work may exist locally uncommitted — read live `features/dashboard/`, `components/admin/`, and `supabase/migrations/` before editing.

### Testing

- **Required:** `npm run build`, `npm run lint`
- **Manual:** Leaderboard rep link → deep dive; rep selector switches URL
- **Manual:** Sum of daily doors = summary grid cell for same rep/range
- **Manual:** Pipeline stage totals vs admin pipeline board filtered by rep
- **Migration:** apply and verify RPCs via Supabase MCP or `db:push`
- **No** Playwright unless trivial

### References

- [Source: `_bmad-output/planning-artifacts/epics.md` — Story 7.4, FR47]
- [Source: `docs/Solar_CRM_PRD_v1.md` — Rep Deep Dive Views]
- [Source: `_bmad-output/implementation-artifacts/7-1-global-date-range-control.md` — date range hook]
- [Source: `_bmad-output/implementation-artifacts/7-2-funnel-conversion-chart.md` — RPC + bar chart pattern]
- [Source: `_bmad-output/implementation-artifacts/7-3-team-leaderboard.md` — metric labels, leaderboard links]
- [Source: `_bmad-output/implementation-artifacts/3-3-daily-rep-summary-grid.md` — summary RPC metrics]
- [Source: `supabase/migrations/20260610140000_get_admin_daily_rep_summary_calls.sql`]
- [Source: `src/features/pipeline/pipeline-stage-labels.ts`]

## Dev Agent Record

### Agent Model Used

Claude (Cursor Agent)

### Debug Log References

### Completion Notes List

- Added `get_admin_rep_activity_trend` and `get_admin_rep_pipeline_snapshot` RPCs; migration applied via Supabase MCP.
- Built rep deep-dive page at `/admin/reps/[repId]` with date range control (default week), period totals, daily activity trend chart, and current pipeline snapshot.
- Linked rep names from leaderboard and summary grid; extended `DashboardDateRangeProvider` with optional `defaultPreset`.
- `npm run lint` and `npm run build` pass.

- Code review: API invalid UUID → 404; Sydney-safe trend date labels; error only in activity trend panel.

### File List

- `supabase/migrations/20260613120000_get_admin_rep_deep_dive.sql` (new)
- `src/lib/validators/rep-deep-dive.ts` (new)
- `src/features/admin/get-rep-profile.ts` (new)
- `src/features/dashboard/get-rep-activity-trend.ts` (new)
- `src/features/dashboard/get-rep-pipeline-snapshot.ts` (new)
- `src/features/dashboard/use-rep-activity-trend.ts` (new)
- `src/features/dashboard/use-rep-pipeline-snapshot.ts` (new)
- `src/features/dashboard/api.ts` (modified)
- `src/features/dashboard/dashboard-date-range-context.tsx` (modified)
- `src/app/api/v1/admin/reps/[repId]/activity-trend/route.ts` (new)
- `src/app/api/v1/admin/reps/[repId]/pipeline/route.ts` (new)
- `src/app/(admin)/admin/reps/[repId]/page.tsx` (new)
- `src/components/admin/rep-deep-dive-shell.tsx` (new)
- `src/components/admin/rep-selector.tsx` (new)
- `src/components/admin/rep-period-totals.tsx` (new)
- `src/components/admin/rep-activity-trend-chart.tsx` (new)
- `src/components/admin/rep-pipeline-snapshot.tsx` (new)
- `src/components/admin/team-leaderboard.tsx` (modified)
- `src/components/admin/daily-rep-summary-grid.tsx` (modified)
