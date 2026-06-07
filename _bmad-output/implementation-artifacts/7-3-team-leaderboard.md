---
baseline_commit: 161aab2
---

# Story 7.3: Team Leaderboard

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an **admin**,
I want ranked rep performance,
so that I can gamify and coach.

## Acceptance Criteria

1. **Given** I am an authenticated admin on `/admin/dashboard`  
   **When** the page loads  
   **Then** a **Team leaderboard** panel appears on the dashboard (FR44)  
   **And** it uses the global date range from `useDashboardDateRange()` (Story 7.1) — refetches when `from`/`to` change  
   **And** styling matches existing admin zinc cards (border, white background, section header)

2. **Given** the leaderboard is visible  
   **When** I view the default state  
   **Then** reps are **ranked descending** by **doors knocked** (highest first)  
   **And** each row shows **rank**, **rep name**, and the **selected metric value**  
   **And** reps with **0** for the selected metric appear at the bottom (row still present)  
   **And** all profiles with `role = 'rep'` are included (same population as daily rep summary grid)

3. **Given** I want to compare a different output  
   **When** I select a metric control  
   **Then** I can rank by: **Doors**, **Calls**, **Leads**, or **Appts** (appointments set)  
   **And** the list re-sorts immediately (client-side) without a new API call  
   **And** metric labels match the summary grid headers (Doors, Calls, Leads, Appts)

4. **Given** the global date range presets (Story 7.1)  
   **When** I select **Today**, **This Week**, **This Month**, or **Custom**  
   **Then** leaderboard counts aggregate across that Sydney range using the same definitions as the daily rep summary RPC (FR44)  
   **And** **Today** is a valid timeframe (single-day range)

5. **Given** metric definitions for range `[from, to]`  
   **When** counts are loaded  
   **Then** data comes from existing `get_admin_daily_rep_summary(p_from, p_to)` — **no new migration**  
   **And** **doors** / **calls** / **leads_added** / **appointments_set** match Story 3.3 + 5.6 semantics  
   **And** bounds use `startOfDaySydney(from)` … `endOfDaySydney(to)`

6. **Given** tied metric values  
   **When** two reps have the same count  
   **Then** they share the same rank (competition ranking: 1, 2, 2, 4)  
   **And** ties break alphabetically by rep name before ranking (stable ordering)

7. **Given** the leaderboard panel  
   **When** data is loading  
   **Then** skeleton/loading state shows (match funnel/summary pulse pattern; show skeleton on **every** refetch, not only first load)  
   **And** when all reps have 0 for the selected metric, still show ranked rows (not an empty state)  
   **And** API errors show inline message (no page crash)

8. **Given** authorization and performance (NFR10, NFR3)  
   **When** the underlying summary API is called  
   **Then** admin role is enforced server-side  
   **And** rep/unauthenticated callers get 403  
   **And** one aggregated RPC round trip per **range change** (metric toggle does not refetch)  
   **And** typical team size (≤20 reps) loads in under **3 seconds**

9. **Given** implementation is complete  
   **When** `npm run build` and `npm run lint` run  
   **Then** they pass  
   **And** rep deep-dive (7.4), geographic yield (7.5), CSV export (7.6), and end-of-shift summaries (7.7) are **not** added

**Implements:** FR44  
**NFRs:** NFR3 (aggregated queries), NFR10 (admin guards), UX-DR5 (desktop manager dashboard)

## Tasks / Subtasks

- [x] **Validators + ranking helper** (AC: 2, 3, 6)
  - [x] Create `src/lib/validators/team-leaderboard.ts`:
    - `leaderboardMetricSchema` — `z.enum(["doors", "calls", "leads_added", "appointments_set"])`
    - `LEADERBOARD_METRICS` — display labels map (Doors, Calls, Leads, Appts)
    - `leaderboardRowSchema` — `{ rank, rep_id, rep_name, value }`
    - `leaderboardResponseSchema` — `{ from, to, metric, rows }` (client view model; optional if built in hook only)
  - [x] Create `src/features/dashboard/rank-rep-metrics.ts`:
    - `rankRepMetrics(rows: DailyRepSummaryRow[], metric: LeaderboardMetric)` → ranked rows
    - Sort: metric value desc, then `rep_name` asc; assign competition ranks

- [x] **Client hook** (AC: 1, 4, 5, 7, 8)
  - [x] Create `src/features/dashboard/use-team-leaderboard.ts`:
    - Consume `useDashboardDateRange()` → `{ from, to }`
    - Local state for selected `metric` (default `doors`)
    - Fetch via existing `fetchDailyRepSummary(from, to)` from `@/features/admin/api`
    - Derive ranked rows with `rankRepMetrics` when metric or rows change
    - Abort-on-unmount + refetch on range change (mirror `use-funnel-conversion.ts` loading pattern — skeleton on every refetch)

- [x] **Leaderboard component** (AC: 1, 2, 3, 7)
  - [x] Create `src/components/admin/team-leaderboard.tsx`:
    - Segmented metric buttons (Doors | Calls | Leads | Appts) — match `dashboard-date-range-control.tsx` button styling
    - Ranked table: Rank, Rep, Count
    - Optional subtle highlight for rank 1–3 (zinc/amber border or font weight — keep minimal)
    - Accessibility: `<table>` with headers; rank and count readable without color alone

- [x] **Wire dashboard shell** (AC: 1)
  - [x] Update `src/components/admin/admin-dashboard-shell.tsx`:
    - Add `<TeamLeaderboard />` beside funnel on wide screens:
      ```tsx
      <div className="grid gap-6 xl:grid-cols-2">
        <FunnelChart ... />
        <TeamLeaderboard ... />
      </div>
      ```
    - Stack vertically on narrow viewports (funnel first, leaderboard second)
    - Subtitle: “Ranked by selected metric for the active date range”

- [x] **Verify** (AC: 8, 9)
  - [x] Manual: Default Doors ranking — highest door count is #1
  - [x] Manual: Switch metric to Leads — re-sorts without network refetch
  - [x] Manual: Week preset — counts match summary grid totals for same range
  - [x] Manual: Rep 403 on summary API (leaderboard shows error)
  - [x] Manual: Tie — two reps same count share rank
  - [x] `npm run build` && `npm run lint`

### Review Findings

- [x] [Review][Patch] Missing empty state when no reps exist [`team-leaderboard.tsx:84`] — `DailyRepSummaryGrid` shows "No reps in the system" when the summary returns zero rows; leaderboard renders blank content below metric buttons. Add the same empty-state message for parity.

- [x] [Review][Defer] Duplicate summary API call on dashboard load [`use-team-leaderboard.ts`] — deferred, story explicitly accepts leaderboard + grid both calling `fetchDailyRepSummary` for v1.

- [x] [Review][Defer] Stale error persists during range refetch [`use-team-leaderboard.ts:73`] — deferred, matches funnel/summary grid deferred stale-state pattern (7.2, 3.3).

- [x] [Review][Defer] No unit tests for `rankRepMetrics` competition ranking [`rank-rep-metrics.ts`] — deferred, story scoped manual verification only.

- [x] [Review][Defer] Metric toggle buttons lack `aria-pressed` [`team-leaderboard.tsx:51`] — deferred, date range preset buttons use the same pattern (7.1).

## Dev Notes

### Critical constraints

- **Do NOT** add a new database migration or RPC — reuse `get_admin_daily_rep_summary` via `GET /api/v1/admin/dashboard/summary?from=&to=`.
- **Do NOT** add a separate leaderboard API route unless client-side sorting proves insufficient (it should not for ≤20 reps).
- **Do NOT** install TanStack Query or chart libraries.
- **Do NOT** build rep deep-dive (7.4), geographic yield (7.5), CSV export (7.6), or end-of-shift summaries (7.7).
- **Do NOT** add Realtime — REST refetch on range change only.
- **Do NOT** replace or remove the **Daily rep summary** grid — leaderboard is a ranked view; grid remains the all-metrics table.
- **Do NOT** expose contact PII — rep names only (same as summary grid).

### Data reuse (important)

The summary grid (`useDailyRepSummary`) and leaderboard will both call the same summary endpoint on dashboard load → **two identical API calls** for v1 is acceptable (defer dedupe to a shared `useRepMetricsForRange` hook in a future cleanup). Do **not** block 7.3 on deduplication.

Metric field mapping:

| UI label | Row field | RPC column |
| :--- | :--- | :--- |
| Doors | `doors` | door_knocks in range |
| Calls | `calls` | call_logs in range |
| Leads | `leads_added` | leads created in range |
| Appts | `appointments_set` | appointment_set stage changes in range |

### Ranking algorithm (reference)

```typescript
// 1. Sort rows by metric desc, rep_name asc
// 2. Assign competition rank: if value === previous value, same rank; else rank = index + 1
```

### Dashboard layout (after 7.2)

```tsx
<DashboardDateRangeControl />
{isToday && coaching row}
<div className="grid gap-6 xl:grid-cols-2">
  <FunnelChart ... />
  <TeamLeaderboard ... />
</div>
<div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
  <ActivityFeed ... />
  <DailyRepSummaryGrid ... />
</div>
```

### Files to read before editing

| File | Current behavior | 7.3 change |
| :--- | :--- | :--- |
| `admin-dashboard-shell.tsx` | Funnel full-width above feed/summary | Funnel + leaderboard side-by-side on xl |
| `use-daily-rep-summary.ts` | Fetches summary by range | Parallel pattern for leaderboard hook |
| `daily-rep-summary-grid.tsx` | Alphabetical all-metrics table | Unchanged; cross-check totals |
| `fetchDailyRepSummary` in `features/admin/api.ts` | GET summary with from/to | Reuse in leaderboard hook |
| `daily-rep-summary.ts` validator | Row shape | Import `DailyRepSummaryRow` type for ranking |
| `funnel-chart.tsx` | Loading skeleton on every refetch | Match this loading UX |

### Previous story intelligence

**7.1:** Global date range is source of truth — leaderboard must use applied `from`/`to` from `useDashboardDateRange()`, not local date state.

**7.2:** `features/dashboard/` owns analytics hooks; funnel loading pattern shows skeleton whenever `loading && !error`. Match for leaderboard.

**3.3:** Summary RPC + grid established metric definitions — leaderboard ranks the same numbers, does not redefine SQL.

### Cross-story dependencies

| Story | Relationship |
| :--- | :--- |
| 7.1 | **Requires** — date range hook |
| 3.3 / 5.6 | **Requires** — summary RPC + calls column |
| 7.2 | **Layout** — share xl grid row with funnel |
| 7.4 deep-dive | **Independent** — may link from rep name later (out of scope) |
| 7.6 CSV export | **Independent** — may export leaderboard later |

### Git intelligence

Baseline commit `161aab2`; Epic 7 dashboard work may exist locally uncommitted — read live `admin-dashboard-shell.tsx` and `features/dashboard/` before editing.

### Testing

- **Required:** `npm run build`, `npm run lint`
- **Manual:** Metric toggle does not trigger second network request (DevTools → Network)
- **Manual:** Leaderboard doors total for one rep = same rep’s doors cell in summary grid for same range
- **No** Playwright unless trivial
- **No** new migration expected

### References

- [Source: `_bmad-output/planning-artifacts/epics.md` — Story 7.3, FR44]
- [Source: `docs/Solar_CRM_PRD_v1.md` — Team Leaderboard Widget]
- [Source: `_bmad-output/implementation-artifacts/7-1-global-date-range-control.md` — date range hook]
- [Source: `_bmad-output/implementation-artifacts/7-2-funnel-conversion-chart.md` — dashboard layout, loading UX]
- [Source: `_bmad-output/implementation-artifacts/3-3-daily-rep-summary-grid.md` — RPC metrics definitions]
- [Source: `supabase/migrations/20260610140000_get_admin_daily_rep_summary_calls.sql`]
- [Source: `src/features/admin/api.ts` — `fetchDailyRepSummary`]

## Dev Agent Record

### Agent Model Used

Claude (Cursor Agent)

### Debug Log References

- Prior session: three file writes failed (`Invalid arguments: path: Required`); completed on handoff.

### Completion Notes List

- Added team leaderboard validators, competition-ranking helper, client hook, and dashboard panel component.
- Reuses existing `get_admin_daily_rep_summary` via `fetchDailyRepSummary` — no new migration or API route.
- Metric toggle re-sorts client-side; range change refetches with skeleton on every refetch (matches funnel pattern).
- Wired funnel + leaderboard side-by-side on `xl` grid in admin dashboard shell.
- `npm run lint` and `npm run build` pass.

- Code review: added "No reps in the system" empty state to match summary grid.

### File List

- `src/lib/validators/team-leaderboard.ts` (new)
- `src/features/dashboard/rank-rep-metrics.ts` (new)
- `src/features/dashboard/use-team-leaderboard.ts` (new)
- `src/components/admin/team-leaderboard.tsx` (new)
- `src/components/admin/admin-dashboard-shell.tsx` (modified)
