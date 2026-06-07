---
baseline_commit: 161aab2
---

# Story 7.1: Global Date Range Control

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an **admin**,
I want to change the date range for all dashboard widgets,
so that I analyze any period.

## Acceptance Criteria

1. **Given** I am an authenticated admin on `/admin/dashboard`  
   **When** the page loads  
   **Then** a **global date range control** appears in the dashboard header area (FR48)  
   **And** presets are available: **Today**, **This Week**, **This Month**, **Custom**  
   **And** default preset is **Today** (Sydney calendar)  
   **And** all boundaries use **Australia/Sydney** via existing `formatSydneyDateString`, `startOfDaySydney`, `endOfDaySydney`

2. **Given** I select **Today**, **This Week**, or **This Month**  
   **When** the preset applies  
   **Then** resolved bounds are:
   - **Today** — `from = to =` today (Sydney)
   - **This Week** — Monday 00:00 Sydney through Sunday 23:59:59 Sydney of the week containing today
   - **This Month** — 1st 00:00 Sydney through last day 23:59:59 Sydney of the month containing today  
   **And** a human-readable label shows the active range (e.g. "6–12 Jun 2026" for week, "Jun 2026" for month)

3. **Given** I select **Custom**  
   **When** I pick `from` and `to` dates (native `type="date"` inputs)  
   **Then** both dates are required, `from <= to`, and each is a valid YYYY-MM-DD Sydney calendar date  
   **And** custom range is capped at **366 days** (validation error if exceeded)  
   **And** changing either date refetches linked widgets

4. **Given** the global date range changes  
   **When** linked widgets refresh  
   **Then** **Daily rep summary** table aggregates metrics across the full selected range (doors, calls, leads, appointments) using existing `get_admin_daily_rep_summary(p_from, p_to)` — **no new migration**  
   **And** **Live activity** feed lists events with `occurred_at` within the range (newest first, same 50-item default limit)  
   **And** the per-widget local date picker on the summary grid is **removed** — global control is the single source of truth  
   **And** dashboard subtitle copy reflects the active range (not hardcoded "today")

5. **Given** operational coaching widgets (Story 3.4)  
   **When** global preset is **Today**  
   **Then** **Morning overview** (yesterday totals) and **Needs attention** (low-activity flags) render as today  
   **And** low-activity row highlighting in the summary grid works as before (amber rows for flagged reps)

6. **Given** global preset is **This Week**, **This Month**, or **Custom** (any non-today range)  
   **When** the dashboard renders  
   **Then** Morning overview and Needs attention panels are **hidden** (live coaching is today-only)  
   **And** Realtime subscription on the activity feed is **disabled** (historical view — REST fetch only)  
   **And** Realtime-triggered low-activity refetch is **not** wired when coaching panels are hidden

7. **Given** authorization and performance (NFR10, NFR3)  
   **When** summary or activity APIs receive `from`/`to`  
   **Then** admin role is enforced server-side  
   **And** rep/unauthenticated callers get 403  
   **And** summary remains one aggregated RPC round trip per range change  
   **And** typical team size (≤20 reps) loads in under **3 seconds**

8. **Given** future Epic 7 widgets (7.2–7.7)  
   **When** this story is complete  
   **Then** a shared **`useDashboardDateRange()`** hook (or equivalent context) exposes `{ preset, from, to, label, setPreset, setCustomRange, isToday }` for downstream charts/tables  
   **And** `/admin/map` filters remain **independent** — not synced to dashboard global range

9. **Given** implementation is complete  
   **When** `npm run build` and `npm run lint` run  
   **Then** they pass  
   **And** no funnel chart (7.2), leaderboard (7.3), CSV export (7.6), or new DB tables are added

**Implements:** FR48  
**NFRs:** NFR3 (aggregated queries), NFR10 (admin guards), UX-DR5 (desktop manager dashboard)

## Tasks / Subtasks

- [x] **Date range validators + resolvers** (AC: 1, 2, 3)
  - [x] Create `src/lib/validators/dashboard-date-range.ts`:
    - `dashboardDatePresetSchema` — `z.enum(["today", "week", "month", "custom"])`
    - `dashboardDateRangeSchema` — `{ preset, from, to, label }` (from/to YYYY-MM-DD)
    - `dashboardDateRangeQuerySchema` — optional `from`, `to` for API query strings
    - `parseDashboardDateRangeSearchParams(searchParams)`
    - Export max custom span constant (366 days)
  - [x] Create `src/features/dashboard/resolve-dashboard-date-range.ts`:
    - `resolveDashboardDateRange(preset, customFrom?, customTo?)` → `{ from, to, label }`
    - Week start = **Monday** (ISO week, Sydney calendar)
    - Reuse `formatSydneyDateString`, `startOfDaySydney`, `endOfDaySydney` from `@/features/knocks/format-knock-date`
    - `formatDashboardRangeLabel(from, to)` for header display

- [x] **Shared client state** (AC: 1, 4, 8)
  - [x] Create `src/features/dashboard/dashboard-date-range-context.tsx`:
    - Provider holds preset + custom from/to
    - `useDashboardDateRange()` hook
    - `isToday` derived when preset is `today` OR custom range is exactly today
  - [x] Create `src/components/admin/dashboard-date-range-control.tsx`:
    - Segmented preset buttons (Today | Week | Month | Custom)
    - Custom panel: two native date inputs (match zinc styling from `daily-rep-summary-grid.tsx`)
    - Show resolved label below controls

- [x] **Extend summary API for ranges** (AC: 4, 7)
  - [x] Update `src/lib/validators/daily-rep-summary.ts`:
    - Add `from`/`to` optional query fields; validate `from <= to` and max span
    - Response: `{ from, to, rows }` (keep backward compat: single `date` query maps to `from = to = date`)
  - [x] Update `src/features/admin/get-daily-rep-summary.ts` — accept `{ from, to }`, pass to RPC
  - [x] Update `GET /api/v1/admin/dashboard/summary/route.ts` — parse range params
  - [x] Update `fetchDailyRepSummary` in `src/features/admin/api.ts` — pass `from`/`to`
  - [x] Refactor `src/features/admin/use-daily-rep-summary.ts` — consume `useDashboardDateRange()` instead of local date state

- [x] **Extend activity feed for ranges** (AC: 4, 6, 7)
  - [x] Update `src/lib/validators/activity-feed.ts` — optional `from`, `to` on query schema
  - [x] Update `src/features/admin/get-recent-activity.ts` — filter by range bounds instead of hardcoded today
  - [x] Update `GET /api/v1/admin/activity/route.ts` — parse and validate range (default today when omitted for backward compat)
  - [x] Update `fetchRecentActivity` — accept optional `from`/`to`
  - [x] Update `src/features/admin/use-admin-activity-feed.ts`:
    - Accept `{ from, to, realtimeEnabled }` from shell
    - Refetch initial list when range changes
    - Subscribe to Realtime **only when** `realtimeEnabled === true` (Today preset)

- [x] **Wire dashboard shell** (AC: 1, 4, 5, 6, 8)
  - [x] Update `src/components/admin/admin-dashboard-shell.tsx`:
    - Wrap content in `DashboardDateRangeProvider`
    - Render `<DashboardDateRangeControl />` in header
    - Pass `isToday` to conditionally render Morning overview + Low activity panels
    - Pass range + `realtimeEnabled: isToday` to activity feed hook
    - Update page subtitle to use range label
  - [x] Update `src/components/admin/daily-rep-summary-grid.tsx`:
    - Remove local date `<input type="date">`
    - Update section title: "Rep summary" (drop "Daily" when range ≠ single day) or show range in subtitle
    - Flag highlighting: only when `isToday` from context

- [x] **Verify** (AC: 7, 9)
  - [x] Manual: Today preset — behavior matches pre-7.1 (summary, feed, coaching panels, Realtime)
  - [x] Manual: This Week — summary totals aggregate 7 days; feed shows week events; coaching hidden; no Realtime
  - [x] Manual: Custom range spanning two months — validation passes; counts aggregate correctly
  - [x] Manual: Custom `from > to` or >366 days — 400 validation error
  - [x] Manual: Rep 403 on summary + activity APIs with range params
  - [x] Manual: `/admin/map` date filters unchanged
  - [x] `npm run build` && `npm run lint`

### Review Findings

- [x] [Review][Patch] Custom range >366 days crashes the dashboard [`resolve-dashboard-date-range.ts:133`, `dashboard-date-range-context.tsx:41`] — fixed: validate before apply; widgets keep last valid range.
- [x] [Review][Patch] Invalid custom range (`from > to`) can throw during date editing [`resolve-dashboard-date-range.ts:130`, `dashboard-date-range-control.tsx:54`] — fixed: draft vs applied range split; no throws in resolver.
- [x] [Review][Patch] No inline validation message for custom range errors (AC3) [`dashboard-date-range-control.tsx`] — fixed: `customRangeError` shown inline with `role="alert"`.
- [x] [Review][Patch] AC9 build gate currently fails (workspace) [`src/app/api/auth/login/route.ts:66`] — fixed: explicit `LoginProfileRow` cast on profile query.
- [x] [Review][Defer] `addDaysSydney` uses fixed 24h ms arithmetic — DST week boundaries could drift by one day [`resolve-dashboard-date-range.ts:28`] — deferred, matches existing `yesterdaySydneyDateString` pattern in codebase.
- [x] [Review][Defer] No unit tests for Sydney week/month preset resolution — story scoped manual verification only.
- [x] [Review][Defer] Span validation duplicated across three Zod schemas — maintenance overhead, acceptable v1 [`dashboard-date-range.ts`, `daily-rep-summary.ts`, `activity-feed.ts`].

## Dev Notes

### Critical constraints

- **Do NOT** add new database migrations — `get_admin_daily_rep_summary(p_from, p_to)` already supports arbitrary ranges (Story 3.3 + 5.6).
- **Do NOT** install TanStack Query or new date libraries (date-fns, dayjs) — extend existing Sydney helpers in `format-knock-date.ts` only if a small helper is needed (e.g. `startOfWeekSydney`).
- **Do NOT** sync global range to `/admin/map`, `/admin/pipeline`, or rep routes — dashboard-only scope (FR48).
- **Do NOT** build funnel chart (7.2), leaderboard (7.3), geographic yield (7.5), CSV export (7.6), or end-of-shift summaries (7.7).
- **Do NOT** add Realtime subscription when viewing historical ranges — prevents misleading live inserts outside the selected window.
- **Do NOT** change low-activity RPC or morning overview logic — only hide panels when not Today; APIs stay as-is.
- **Do NOT** break activity feed Realtime for Today — preserve Story 3.2 INSERT subscription + enrichment pattern.
- **Do NOT** expose contact PII in summary or feed — counts and knock addresses only (existing pattern).

### Widget linkage matrix

| Widget | Linked to global range? | Notes |
| :--- | :--- | :--- |
| Daily rep summary | **Yes** | Remove local date picker; aggregate via RPC |
| Live activity feed | **Yes** | REST filtered by range; Realtime only on Today |
| Morning overview | **Today only** | Hidden for week/month/custom |
| Needs attention (low activity) | **Today only** | Hidden for week/month/custom |
| Future 7.2 funnel | **Hook ready** | Consumes `useDashboardDateRange()` |
| Future 7.3 leaderboard | **Hook ready** | May use same presets independently |
| `/admin/map` filters | **No** | Independent per Story 3.1 |

### Preset resolution (Sydney)

```typescript
// Today
from = to = formatSydneyDateString(new Date())

// This Week (Monday-start, ISO)
// Find Monday of the week containing today in Sydney, Sunday = Monday + 6 days

// This Month
from = YYYY-MM-01 of current Sydney month
to = last day of that month (compute via Date.UTC + formatSydneyDateString)
```

All API timestamps: `startOfDaySydney(from)` … `endOfDaySydney(to)`.

### Summary API contract (extended)

**Request:** `GET /api/v1/admin/dashboard/summary?from=2026-06-01&to=2026-06-07`  
**Legacy:** `?date=2026-06-07` still works (`from = to = date`)

**Response:**

```json
{
  "data": {
    "from": "2026-06-01",
    "to": "2026-06-07",
    "rows": [{ "rep_id": "...", "rep_name": "...", "doors": 12, "calls": 3, "leads_added": 2, "appointments_set": 1 }]
  }
}
```

Single-day Today response shape change is acceptable — update client parser; no external consumers.

### Activity feed API contract (extended)

**Request:** `GET /api/v1/admin/activity?from=2026-06-01&to=2026-06-07&limit=50`  
**Default when omitted:** today (Sydney) — preserves backward compat

Filter: `knocked_at >= startOfDaySydney(from) AND knocked_at <= endOfDaySydney(to)`  
Order: `knocked_at DESC LIMIT 50` (same as today)

Call events still deferred — door knocks only until wired in a future story.

### Dashboard shell injection point

Current shell (`admin-dashboard-shell.tsx`) is the correct mount point per Epic 6 retro prep item #5:

```tsx
// Today: header + coaching row + feed + summary
<DashboardDateRangeProvider>
  <DashboardDateRangeControl />
  {isToday && <MorningOverviewCard ... />}
  {isToday && <LowActivityPanel ... />}
  <ActivityFeed {...feed} />
  <DailyRepSummaryGrid flaggedRepIds={isToday ? flaggedRepIds : undefined} />
</DashboardDateRangeProvider>
```

Architecture mentions `features/dashboard/` — **create this folder** in 7.1 as the home for date-range logic; analytics queries for 7.2+ can colocate here.

### Files to read before editing (current state)

| File | Current behavior | 7.1 change |
| :--- | :--- | :--- |
| `admin-dashboard-shell.tsx` | No global date; coaching + feed + summary | Provider, control, conditional coaching |
| `daily-rep-summary-grid.tsx` | Local `type="date"` input | Remove picker; use context |
| `use-daily-rep-summary.ts` | Local `date` state | Derive `from`/`to` from context |
| `get-daily-rep-summary.ts` | Single `date` → RPC bounds | Accept `{ from, to }` |
| `daily-rep-summary.ts` validator | `date` query only | Add `from`/`to`, extend response |
| `get-recent-activity.ts` | Hardcoded today filter | Range params |
| `activity-feed.ts` validator | `limit` only | Add `from`/`to` |
| `use-admin-activity-feed.ts` | Mount-only fetch; always Realtime | Refetch on range; conditional Realtime |

### Previous story intelligence

**Epic 6 retro (2026-06-07):**
- First Epic 7 story — establishes shared date-range state before 7.2 charts.
- Audit dashboard widget coupling — this story is that audit's implementation.
- Sydney date checklist applies to all preset resolution.

**Story 3.3 (done):**
- Summary RPC already takes `p_from`/`p_to` — range aggregation is a **client + API param** change only.
- Explicitly deferred global date engine to 7.1; local date picker was intentional interim.

**Story 3.2 (done):**
- Activity feed hardcoded to today; Realtime on INSERT — extend query, gate Realtime to Today.

**Story 3.4 (done):**
- Morning overview + low activity are **operational** (yesterday + live shift idle) — hide when not Today; do not force into historical range.

**Story 6.5 pattern:**
- `fetch` + hooks, no TanStack Query; abort-on-unmount; admin zinc Tailwind styling; `npm run build` + lint gate.

### Cross-story dependencies

| Story | Relationship |
| :--- | :--- |
| 3.2, 3.3, 3.4 | **Requires** — existing dashboard widgets to wire |
| 5.6 | **Requires** — calls column in summary RPC (already wired) |
| 7.2–7.7 | **Enables** — shared date-range hook for charts/tables/exports |
| 7.8 | **Independent** — call script config, not date-scoped |

### Git intelligence

Recent committed baseline `161aab2` (epic 5.4). Epic 5–6 dashboard/territory work may exist locally uncommitted — dev agent should read live files under `src/components/admin/` and `src/features/admin/` before editing; do not assume stale snapshots.

### Testing

- **Required:** `npm run build`, `npm run lint`
- **Manual:** Preset switching refetches summary + feed without full page reload
- **Manual:** Today Realtime still prepends new knocks; Week view does not
- **Manual:** Summary row totals for week = sum of daily SQL spot checks for one rep
- **No** Playwright unless trivial
- **No** new migration expected — verify before closing story

### References

- [Source: `_bmad-output/planning-artifacts/epics.md` — Story 7.1, FR48]
- [Source: `docs/Solar_CRM_PRD_v1.md` — Global Date Engine]
- [Source: `_bmad-output/planning-artifacts/architecture.md` — `features/dashboard/`, `['dashboard', 'summary', dateRange]`, Sydney dates]
- [Source: `_bmad-output/implementation-artifacts/epic-6-retro-2026-06-07.md` — Epic 7 prep, dashboard coupling]
- [Source: `_bmad-output/implementation-artifacts/3-3-daily-rep-summary-grid.md` — RPC pattern, deferred 7.1]
- [Source: `_bmad-output/implementation-artifacts/3-2-live-activity-feed.md` — Realtime pattern]
- [Source: `_bmad-output/implementation-artifacts/3-4-low-activity-and-morning-overview-flags.md` — coaching scope]
- [Source: `src/features/knocks/format-knock-date.ts`]
- [Source: `supabase/migrations/20260610140000_get_admin_daily_rep_summary_calls.sql`]

## Dev Agent Record

### Agent Model Used

Claude (Cursor Agent)

### Debug Log References

### Completion Notes List

- Added global date range engine with Today / This Week / This Month / Custom presets (Sydney calendar, Monday-start weeks).
- Created `features/dashboard/` with `DashboardDateRangeProvider`, `useDashboardDateRange()`, and preset resolver utilities.
- Extended summary and activity APIs to accept `from`/`to` query params (366-day max, legacy `date` param preserved).
- Wired rep summary grid and live activity feed to shared range; removed per-widget date picker.
- Morning overview and low-activity panels + Realtime subscription active only on Today preset.
- `npm run lint` and `npm run build` pass; no new migrations.

### File List

- `src/lib/validators/dashboard-date-range.ts` (new)
- `src/lib/validators/daily-rep-summary.ts` (modified)
- `src/lib/validators/activity-feed.ts` (modified)
- `src/features/dashboard/resolve-dashboard-date-range.ts` (new)
- `src/features/dashboard/dashboard-date-range-context.tsx` (new)
- `src/components/admin/dashboard-date-range-control.tsx` (new)
- `src/components/admin/admin-dashboard-shell.tsx` (modified)
- `src/components/admin/daily-rep-summary-grid.tsx` (modified)
- `src/features/admin/get-daily-rep-summary.ts` (modified)
- `src/features/admin/get-recent-activity.ts` (modified)
- `src/features/admin/get-morning-overview.ts` (modified)
- `src/features/admin/api.ts` (modified)
- `src/features/admin/use-daily-rep-summary.ts` (modified)
- `src/features/admin/use-admin-activity-feed.ts` (modified)
- `src/features/admin/use-low-activity-reps.ts` (modified)
- `src/features/admin/use-morning-overview.ts` (modified)
- `src/app/api/v1/admin/dashboard/summary/route.ts` (modified)
- `src/app/api/v1/admin/activity/route.ts` (modified)
