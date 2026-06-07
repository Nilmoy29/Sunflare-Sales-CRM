---
baseline_commit: 161aab2
---

# Story 7.5: Geographic Yield by Suburb

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an **admin**,
I want conversion rates by suburb,
so that I allocate territories strategically.

## Acceptance Criteria

1. **Given** I am an authenticated admin on `/admin/dashboard`  
   **When** the page loads  
   **Then** a **Geographic yield** panel appears on the dashboard (FR49)  
   **And** it uses the global date range from `useDashboardDateRange()` (Story 7.1) — refetches when `from`/`to` change  
   **And** styling matches existing admin zinc cards (border, white background, section header)

2. **Given** door knocks and contacts with suburb in the selected Sydney date range  
   **When** geographic yield data loads  
   **Then** suburbs are grouped by **trimmed, case-insensitive** `contacts.suburb` from the knock's contact  
   **And** knocks with **null or blank** suburb are **excluded** (not listed as a row)  
   **And** each suburb row shows: **Suburb**, **Doors** (total knocks), **Interested** (knocks with `outcome = 'interested'`), **Leads** (leads created on contacts in that suburb), **Interested %**  
   **And** **Interested %** = `round(100 * interested / doors)` when `doors > 0`; display **—** when `doors = 0`

3. **Given** the geographic yield table  
   **When** I view the default state  
   **Then** suburbs rank **descending by Interested %** (highest conversion first)  
   **And** ties break alphabetically by suburb name (stable ordering)  
   **And** suburbs with the same Interested % share the same rank (competition ranking: 1, 2, 2, 4)

4. **Given** I want to compare a different dimension  
   **When** I select a sort metric control  
   **Then** I can rank by: **Interested %**, **Doors**, **Interested**, or **Leads**  
   **And** the list re-sorts immediately (client-side) without a new API call  
   **And** metric labels are self-explanatory (Interested %, Doors, Interested, Leads)

5. **Given** the global date range presets (Story 7.1)  
   **When** I select **Today**, **This Week**, **This Month**, or **Custom**  
   **Then** counts aggregate across that Sydney range:
   - **Doors / Interested**: `door_knocks.knocked_at` between `startOfDaySydney(from)` and `endOfDaySydney(to)`
   - **Leads**: `leads.created_at` in same bounds, joined via `leads.contact_id → contacts.suburb`  
   **And** bounds use the same 366-day max validation as other dashboard APIs

6. **Given** the geographic yield panel  
   **When** data is loading  
   **Then** skeleton/loading state shows on **every** refetch (`loading && !error`; match funnel/leaderboard)  
   **And** when no suburbs have knocks in range, empty state reads e.g. “No knocks with suburb data in this period”  
   **And** API errors show inline message (no page crash)

7. **Given** authorization and performance (NFR10, NFR3)  
   **When** the geographic yield API is called  
   **Then** admin role is enforced server-side (`requireRoleForApi(["admin"])`)  
   **And** rep/unauthenticated callers get 403  
   **And** aggregation is **one SQL RPC round trip** per range change (metric toggle does not refetch)  
   **And** typical AU team suburb counts (≤100 suburbs with data) load in under **3 seconds**

8. **Given** the chart visualization  
   **When** rows render  
   **Then** a ranked table with optional horizontal **volume bar** on the active sort metric (same Tailwind pattern as `funnel-chart.tsx` / `rep-activity-trend-chart.tsx`)  
   **And** **no new chart library** is installed

9. **Given** implementation is complete  
   **When** `npm run build` and `npm run lint` run  
   **Then** they pass  
   **And** CSV export (7.6), end-of-shift summaries (7.7), and admin call-script config (7.8) are **not** added

**Implements:** FR49  
**NFRs:** NFR3 (aggregated queries), NFR10 (admin guards), UX-DR5 (desktop manager dashboard)

## Tasks / Subtasks

- [x] **Database RPC** (AC: 2, 5, 7)
  - [x] Create migration `supabase/migrations/*_get_admin_geographic_yield.sql`:
    - `get_admin_geographic_yield(p_from timestamptz, p_to timestamptz)`
    - Returns rows: `suburb text`, `doors bigint`, `interested bigint`, `leads_added bigint`
    - **Doors / Interested**: join `door_knocks dk → contacts c`; filter `knocked_at` in range; require `trim(c.suburb) <> ''`
    - Group key: `lower(trim(c.suburb))`; display label: `max(trim(c.suburb))` (or `min` — pick one stable display form)
    - **Interested**: `count(*) filter (where dk.outcome = 'interested')`
    - **Leads**: separate subquery/CTE — `leads l join contacts c` where `created_at` in range, same suburb grouping
    - Merge lead counts onto knock suburbs; suburbs with leads but zero knocks in range **still appear** (doors=0, interested=0, leads>0)
    - `security invoker`, `stable`, `set search_path = public`
    - `grant execute` to `authenticated` (admin enforced at API — same pattern as funnel/summary)
  - [x] Apply via Supabase MCP or `npm run db:push`; regenerate types if needed

- [x] **Validators + ranking helper** (AC: 2, 3, 4)
  - [x] Create `src/lib/validators/geographic-yield.ts`:
    - `geographicYieldRowSchema` — `{ suburb, doors, interested, leads_added }`
    - `geographicYieldMetricSchema` — `z.enum(["interested_pct", "doors", "interested", "leads_added"])`
    - `GEOGRAPHIC_YIELD_METRIC_OPTIONS` + labels map
    - `rankedGeographicYieldRowSchema` — `{ rank, suburb, doors, interested, leads_added, interested_pct, sort_value }`
    - `geographicYieldResponseSchema` — `{ from, to, rows: [...] }`
    - Reuse `parseDashboardDateRangeSearchParams` for query params
  - [x] Create `src/features/dashboard/rank-geographic-yield.ts`:
    - Compute `interested_pct` per row (null when doors=0)
    - Sort by selected metric desc, suburb asc; competition ranks

- [x] **Server fetch + API route** (AC: 5, 7)
  - [x] Create `src/features/dashboard/get-geographic-yield.ts` — RPC wrapper + Zod parse
  - [x] Create `GET /api/v1/admin/dashboard/geographic-yield/route.ts`:
    - `requireRoleForApi(["admin"])`
    - Parse `from`/`to`; default to today (Sydney) when omitted (match funnel route)
    - Return `{ data: { from, to, rows } }`

- [x] **Client hook + fetch** (AC: 1, 4, 6, 7)
  - [x] Add `fetchGeographicYield(from, to, signal?)` to `src/features/dashboard/api.ts`
  - [x] Create `src/features/dashboard/use-geographic-yield.ts`:
    - Consume `useDashboardDateRange()` → `{ from, to }`
    - Local `metric` state (default `interested_pct`)
    - Abort-on-unmount; `loadedKey = from:to`; skeleton on every refetch
    - Derive ranked rows with `rankGeographicYield` when metric or rows change

- [x] **UI component + dashboard wiring** (AC: 1, 3, 4, 6, 8)
  - [x] Create `src/components/admin/geographic-yield-panel.tsx`:
    - Segmented metric buttons (Interested % | Doors | Interested | Leads) — match date-range/leaderboard styling
    - Ranked table: Rank, Suburb, Doors, Interested, Leads, Interested %
    - Horizontal bar on active sort column (optional volume column)
    - Empty + error + skeleton states
  - [x] Update `src/components/admin/admin-dashboard-shell.tsx`:
    - Insert `<GeographicYieldPanel />` **full-width** below funnel/leaderboard grid, above activity/summary grid:
      ```tsx
      <div className="grid gap-6 xl:grid-cols-2">{/* funnel + leaderboard */}</div>
      <GeographicYieldPanel ... />
      <div className="grid gap-6 lg:grid-cols-[...]">{/* feed + summary */}</div>
      ```

- [x] **Verify** (AC: 7, 9)
  - [ ] Manual: Week range — suburb doors total matches admin map knock count for same suburb/date (spot-check)
  - [ ] Manual: Interested % = interested / doors for one suburb
  - [ ] Manual: Switch sort to Doors — re-sorts without network refetch
  - [ ] Manual: Rep caller → 403 on API
  - [x] `npm run build` && `npm run lint`

## Dev Notes

### Critical constraints

- **Do NOT** install chart libraries — Tailwind horizontal bars only (Story 7.2 pattern).
- **Do NOT** install TanStack Query — use existing `useEffect` + abort pattern.
- **Do NOT** build CSV export (7.6) — export may reuse this table later but is out of scope.
- **Do NOT** add map choropleth or PostGIS suburb boundaries — table ranking only for v1.
- **Do NOT** include `callback_requested` in Interested count for v1 — use `outcome = 'interested'` only (aligns with funnel “Interested” semantics).
- **Do NOT** expose contact PII — suburb aggregates only (no addresses, names, phones).

### Metric definitions

| UI label | Field | SQL source |
| :--- | :--- | :--- |
| Doors | `doors` | `door_knocks` in range, contact has non-blank suburb |
| Interested | `interested` | subset where `outcome = 'interested'` |
| Leads | `leads_added` | `leads.created_at` in range, grouped by contact suburb |
| Interested % | `interested_pct` | client: `round(100 * interested / doors)` or null if doors=0 |

Suburb grouping: `lower(trim(contacts.suburb))` as merge key; display trimmed suburb string.

### Ranking (reference)

Same competition-rank algorithm as `rank-rep-metrics.ts`:
1. Sort by metric desc (null/`—` pct sorts last when sorting by interested_pct)
2. Tie-break suburb name asc
3. Assign ranks 1, 2, 2, 4 for ties

When sorting by **Interested %**, suburbs with `doors = 0` sort to the bottom (sort_value = -1 or null handling).

### RPC sketch

```sql
with knock_stats as (
  select
    lower(trim(c.suburb)) as suburb_key,
    max(trim(c.suburb)) as suburb,
    count(*)::bigint as doors,
    count(*) filter (where dk.outcome = 'interested')::bigint as interested
  from door_knocks dk
  join contacts c on c.id = dk.contact_id
  where dk.knocked_at >= p_from and dk.knocked_at <= p_to
    and trim(coalesce(c.suburb, '')) <> ''
  group by 1
),
lead_stats as (
  select
    lower(trim(c.suburb)) as suburb_key,
    max(trim(c.suburb)) as suburb,
    count(*)::bigint as leads_added
  from leads l
  join contacts c on c.id = l.contact_id
  where l.created_at >= p_from and l.created_at <= p_to
    and trim(coalesce(c.suburb, '')) <> ''
  group by 1
)
select
  coalesce(k.suburb, l.suburb) as suburb,
  coalesce(k.doors, 0) as doors,
  coalesce(k.interested, 0) as interested,
  coalesce(l.leads_added, 0) as leads_added
from knock_stats k
full outer join lead_stats l on l.suburb_key = k.suburb_key
order by suburb asc;
```

Note: `full outer join` ensures suburbs with leads-only activity appear; client ranks them with doors=0 at bottom for % sort.

### Dashboard layout (after 7.4)

```tsx
<DashboardDateRangeControl />
{isToday && coaching row}
<div className="grid gap-6 xl:grid-cols-2">
  <FunnelChart ... />
  <TeamLeaderboard ... />
</div>
<GeographicYieldPanel ... />   {/* NEW — full width */}
<div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
  <ActivityFeed ... />
  <DailyRepSummaryGrid ... />
</div>
```

### Files to read before editing

| File | Current behavior | 7.5 change |
| :--- | :--- | :--- |
| `admin-dashboard-shell.tsx` | Funnel + leaderboard row; feed + summary | Add geographic yield full-width row |
| `use-funnel-conversion.ts` | Range-keyed fetch + abort | Model for geographic yield hook |
| `rank-rep-metrics.ts` | Competition ranking | Model for suburb ranking |
| `team-leaderboard.tsx` | Metric toggle + ranked table | Model for geographic yield panel |
| `get_admin_funnel_conversion.sql` | Aggregated admin RPC pattern | Model for geographic yield RPC |
| `contacts.suburb` + `door_knocks` schema | Suburb on contact via knock join | Data source for grouping |
| `pipeline` suburb filter | `ilike` on contacts.suburb | Reference only — yield uses exact grouped suburb |

### Previous story intelligence

**7.1:** Global date range is source of truth — geographic yield must use `useDashboardDateRange()` applied `from`/`to`.

**7.2:** `features/dashboard/` owns analytics hooks; funnel bar chart is visualization pattern; one RPC per range change.

**7.3:** Metric toggle + client-side re-sort without refetch; competition ranking helper pattern.

**7.4:** Rep deep-dive is separate route — do not conflate; geographic yield stays on main dashboard.

**2.4 / 2.5:** Knock outcomes include `interested`; contact suburb populated via reverse geocode on knock form.

**3.1:** Admin map filters knocks by date — useful manual cross-check for door counts by area (not suburb filter on map v1).

### Cross-story dependencies

| Story | Relationship |
| :--- | :--- |
| 7.1 | **Requires** — date range hook |
| 2.1 / 2.4 | **Requires** — contacts.suburb + door_knocks |
| 2.9 | **Requires** — leads linked to contacts |
| 7.6 CSV export | **Future** — may export geographic yield table |
| 6.x territories | **Independent** — polygon zones ≠ suburb analytics |

### Git intelligence

Baseline commit `161aab2`; Epic 7 dashboard work may exist locally uncommitted — read live `admin-dashboard-shell.tsx` and `features/dashboard/` before editing.

### Testing

- **Required:** `npm run build`, `npm run lint`
- **Manual:** Interested % math for one suburb with known knock outcomes
- **Manual:** Metric toggle does not trigger second network request
- **Migration:** apply and verify RPC via Supabase MCP or `db:push`
- **No** Playwright unless trivial

### References

- [Source: `_bmad-output/planning-artifacts/epics.md` — Story 7.5, FR49]
- [Source: `docs/Solar_CRM_PRD_v1.md` — Geographic Yield Analytics]
- [Source: `_bmad-output/implementation-artifacts/7-1-global-date-range-control.md` — date range hook]
- [Source: `_bmad-output/implementation-artifacts/7-2-funnel-conversion-chart.md` — RPC + bar chart pattern]
- [Source: `_bmad-output/implementation-artifacts/7-3-team-leaderboard.md` — ranking + metric toggle]
- [Source: `supabase/migrations/20260603120000_create_contacts_door_knocks.sql`]
- [Source: `src/lib/validators/enums.ts` — `door_outcome` includes `interested`]

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

- RPC `get_admin_geographic_yield` aggregates knock + lead counts by trimmed suburb; full outer join includes lead-only suburbs.
- Client ranks by metric toggle (default Interested %) with competition ranking; metric change does not refetch.
- Panel wired full-width on admin dashboard below funnel/leaderboard grid.
- Migration applied via Supabase MCP; lint + build pass.
- Code review: volume bars skip null/zero values; bar column labeled "Volume".

### File List

- `supabase/migrations/20260613140000_get_admin_geographic_yield.sql`
- `src/lib/validators/geographic-yield.ts`
- `src/features/dashboard/rank-geographic-yield.ts`
- `src/features/dashboard/get-geographic-yield.ts`
- `src/features/dashboard/api.ts`
- `src/features/dashboard/use-geographic-yield.ts`
- `src/app/api/v1/admin/dashboard/geographic-yield/route.ts`
- `src/components/admin/geographic-yield-panel.tsx`
- `src/components/admin/admin-dashboard-shell.tsx`

### Review Findings

- [x] [Review][Patch] Zero-value suburbs show misleading 4% volume bar [`src/components/admin/geographic-yield-panel.tsx:29-36`] — fixed: null/zero sort values render no bar; max excludes non-positive values.
- [x] [Review][Patch] Bar column header duplicates active metric label [`src/components/admin/geographic-yield-panel.tsx:125-127`] — fixed: bar column header is "Volume" (matches funnel chart).
- [x] [Review][Defer] Stale error persists during range refetch [`src/features/dashboard/use-geographic-yield.ts`] — deferred, pre-existing (matches 7.2/7.3 funnel/leaderboard pattern).
- [x] [Review][Defer] RPC `grant execute` to `authenticated` on `get_admin_geographic_yield` [`supabase/migrations/20260613140000_get_admin_geographic_yield.sql:55`] — deferred, pre-existing (admin enforced at API route; same pattern as 7.2/7.3).
- [x] [Review][Defer] Client `fetchGeographicYield` does not re-validate response with Zod [`src/features/dashboard/api.ts`] — deferred, pre-existing (matches project fetch+hooks convention).
- [x] [Review][Defer] Metric toggle buttons lack `aria-pressed` [`src/components/admin/geographic-yield-panel.tsx:63-75`] — deferred, pre-existing (same pattern as 7.3 team leaderboard / 7.1 date presets).
