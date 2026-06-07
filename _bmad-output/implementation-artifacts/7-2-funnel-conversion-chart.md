---
baseline_commit: 161aab2
---

# Story 7.2: Funnel Conversion Chart

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an **admin**,
I want a step-down conversion funnel,
so that I see where deals drop off.

## Acceptance Criteria

1. **Given** I am an authenticated admin on `/admin/dashboard`  
   **When** the page loads  
   **Then** a **Funnel conversion** panel appears on the dashboard (FR46)  
   **And** it uses the global date range from `useDashboardDateRange()` (Story 7.1) — refetches when `from`/`to` change  
   **And** styling matches existing admin zinc cards (border, white background, section header)

2. **Given** leads exist with `created_at` within the selected Sydney date range  
   **When** the funnel renders  
   **Then** five step-down stages display in order with absolute counts (FR46):
   - **Interacted**
   - **Interested**
   - **Appt Set**
   - **Pitched**
   - **Closed-Won**  
   **And** each step’s count is **≤** the previous step (monotonic funnel)  
   **And** counts exclude leads in `lost` stage

3. **Given** the PRD funnel labels vs pipeline `lead_stage` enum  
   **When** counts are computed  
   **Then** mapping uses **cumulative current-stage** on leads created in range:
   | Funnel label | Includes leads where `stage` is |
   | :--- | :--- |
   | Interacted | any stage except `lost` (all leads created in range) |
   | Interested | `interested`, `appointment_set`, `pitched`, `proposal_sent`, `signed` |
   | Appt Set | `appointment_set`, `pitched`, `proposal_sent`, `signed` |
   | Pitched | `pitched`, `proposal_sent`, `signed` |
   | Closed-Won | `signed` only |  
   **And** `knocked_called` leads count only in **Interacted**  
   **And** `proposal_sent` rolls into **Pitched** (not a separate funnel step)

4. **Given** the selected date range  
   **When** filtering leads  
   **Then** `created_at >= startOfDaySydney(from)` AND `created_at <= endOfDaySydney(to)`  
   **And** the same `from`/`to` query validation applies as summary/activity APIs (366-day max, `from <= to`)

5. **Given** the funnel panel  
   **When** data is loading  
   **Then** skeleton/loading state shows (match summary grid pulse pattern)  
   **And** when zero leads in range, an empty state reads e.g. “No leads in this period”  
   **And** API errors show inline message (no page crash)

6. **Given** performance (NFR3)  
   **When** the funnel API is called  
   **Then** admin role is enforced server-side (`requireRoleForApi(["admin"])`)  
   **And** rep/unauthenticated callers get 403  
   **And** aggregation is **one SQL RPC round trip** per range change (not N client queries)  
   **And** typical team size loads in under **3 seconds**

7. **Given** the chart visualization  
   **When** counts render  
   **Then** a horizontal step-down bar chart shows relative width by count (largest stage = 100% width)  
   **And** each row shows stage label + count  
   **And** optional conversion % from previous stage is shown when prior count > 0 (e.g. “62% from Interested”)  
   **And** **no new chart library** is installed — pure Tailwind/CSS or minimal inline SVG

8. **Given** implementation is complete  
   **When** `npm run build` and `npm run lint` run  
   **Then** they pass  
   **And** leaderboard (7.3), geographic yield (7.5), CSV export (7.6), and rep deep-dive (7.4) are **not** added

**Implements:** FR46  
**NFRs:** NFR3 (aggregated queries), NFR10 (admin guards), UX-DR5 (desktop manager dashboard)

## Tasks / Subtasks

- [x] **Database RPC** (AC: 2, 3, 4, 6)
  - [x] Create migration `supabase/migrations/*_get_admin_funnel_conversion.sql`:
    - `get_admin_funnel_conversion(p_from timestamptz, p_to timestamptz)`
    - Returns rows: `stage_key text`, `label text`, `sort_order int`, `count bigint`
    - Filter: `leads.created_at` between bounds, `stage != 'lost'`
    - Compute five cumulative counts per mapping table in AC3
    - `security invoker`, `stable`, `set search_path = public`
    - `grant execute` to `authenticated` (admin enforced at API layer — same pattern as `get_admin_daily_rep_summary`)
  - [x] Apply via Supabase MCP or `npm run db:push`; regenerate types if needed

- [x] **Validators + server fetch** (AC: 4, 6)
  - [x] Create `src/lib/validators/funnel-conversion.ts`:
    - `funnelStageKeySchema` — `interacted | interested | appointment_set | pitched | closed_won`
    - `funnelStageRowSchema` — `{ stage_key, label, sort_order, count }`
    - `funnelConversionResponseSchema` — `{ from, to, stages: [...] }`
    - Reuse `dashboardDateRangeQuerySchema` / parse pattern for `from`/`to` query params
  - [x] Create `src/features/dashboard/get-funnel-conversion.ts`:
    - Call RPC with `startOfDaySydney(from)` / `endOfDaySydney(to)`
    - Parse with Zod; return `{ from, to, stages }`

- [x] **API route** (AC: 6)
  - [x] Create `GET /api/v1/admin/dashboard/funnel/route.ts`
    - `requireRoleForApi(["admin"])`
    - Parse `from`/`to`; default to today (Sydney) when omitted
    - Return `{ data: { from, to, stages } }` via `apiSuccess`

- [x] **Client hook + fetch** (AC: 1, 5, 6)
  - [x] Add `fetchFunnelConversion(from, to, signal?)` to `src/features/dashboard/api.ts` (new file) or `src/features/admin/api.ts` — prefer **`features/dashboard/api.ts`** per architecture
  - [x] Create `src/features/dashboard/use-funnel-conversion.ts`:
    - Consume `useDashboardDateRange()` → `{ from, to }`
    - Abort-on-unmount + refetch on range change (mirror `use-daily-rep-summary.ts`)

- [x] **Funnel chart component** (AC: 1, 5, 7)
  - [x] Create `src/components/admin/funnel-chart.tsx`:
    - Props: `{ stages, loading, error }` or self-fetch via hook — prefer shell passes hook result for consistency with `ActivityFeed`
    - Horizontal bars, zinc admin styling
    - Accessibility: list semantics or table with headers; counts readable without color alone

- [x] **Wire dashboard shell** (AC: 1)
  - [x] Update `src/components/admin/admin-dashboard-shell.tsx`:
    - Add `<FunnelChart />` below date range control (and below coaching row when Today)
    - Full-width section above activity + summary grid
    - Pass `from`/`to` label in section subtitle optional: “Leads created in selected period”

- [x] **Verify** (AC: 6, 8)
  - [x] Manual: Today preset — funnel reflects today’s new leads
  - [x] Manual: Week preset — counts aggregate leads created across week
  - [x] Manual: Empty range — empty state, no crash
  - [x] Manual: Rep 403 on funnel API
  - [x] Manual: Stage monotonicity — each step ≤ previous
  - [x] `npm run build` && `npm run lint`

### Review Findings

- [x] [Review][Patch] Funnel panel goes blank while refetching on date change [`funnel-chart.tsx:40-57`] — fixed: skeleton shows whenever `loading && !error`.
- [x] [Review][Patch] Conversion rate label generic vs AC7 example [`funnel-chart.tsx:16`] — fixed: uses previous stage label (e.g. “62% from Interested”).
- [x] [Review][Defer] `grant execute` on funnel RPC to `authenticated` — admin enforced at API route only; same pattern as `get_admin_daily_rep_summary` (rep direct RPC would scope to own leads via RLS).
- [x] [Review][Defer] Client `fetchFunnelConversion` does not re-validate response with Zod — matches project fetch+hooks convention.
- [x] [Review][Defer] `as never` RPC cast — local `db:types` may lag new function signature (6.x pattern).

## Dev Notes

### Critical constraints

- **Do NOT** install Recharts, Chart.js, D3, or other chart libraries — horizontal bar funnel in Tailwind/CSS only (AC7).
- **Do NOT** install TanStack Query — extend existing fetch + hooks pattern from Epic 3 / 7.1.
- **Do NOT** build leaderboard (7.3), rep deep-dive (7.4), geographic yield (7.5), or CSV export (7.6).
- **Do NOT** sync funnel to `/admin/map` or `/admin/pipeline` — dashboard-only.
- **Do NOT** count door knocks or call logs directly for funnel stages — **leads created in range** are the funnel population (AC2 “lead data in range”). Every lead originates from a knock/call promotion.
- **Do NOT** include `lost` leads in any funnel stage count.
- **Do NOT** add Realtime subscription on funnel — REST refetch on range change only (historical analytics widget).
- **Do NOT** expose contact PII in funnel API — counts only.

### Funnel semantics (read before coding)

PRD labels (`Total Interacted → … → Closed-Won`) differ from raw `lead_stage` enum values (`knocked_called`, `proposal_sent`, etc.). The **cumulative current-stage** model in AC3 is intentional:

- A lead created as `interested` from a door promotion counts in Interacted **and** Interested.
- A lead still at `knocked_called` counts only in Interacted — shows drop-off before qualification.
- Snapshot is **current stage** at query time, not stage-at-time-of-creation — acceptable v1 per PRD “absolute conversions” wording; stage-history refinement is out of scope.

If product later wants “ever reached stage in period” analytics, that requires `lead_activity` stage_change audit — **not this story**.

### RPC sketch (reference — implement in migration)

```sql
-- Pseudologic inside get_admin_funnel_conversion(p_from, p_to):
-- base: leads where created_at between bounds and stage != 'lost'
-- interacted: count(*)
-- interested: count(*) filter (stage in ('interested','appointment_set','pitched','proposal_sent','signed'))
-- appointment_set: count(*) filter (stage in ('appointment_set','pitched','proposal_sent','signed'))
-- pitched: count(*) filter (stage in ('pitched','proposal_sent','signed'))
-- closed_won: count(*) filter (stage = 'signed')
```

Return fixed labels matching FR46 display copy: `Interacted`, `Interested`, `Appt Set`, `Pitched`, `Closed-Won`.

### API contract

**Request:** `GET /api/v1/admin/dashboard/funnel?from=2026-06-01&to=2026-06-07`  
**Default when omitted:** today (Sydney)

**Response:**

```json
{
  "data": {
    "from": "2026-06-01",
    "to": "2026-06-07",
    "stages": [
      { "stage_key": "interacted", "label": "Interacted", "sort_order": 1, "count": 42 },
      { "stage_key": "interested", "label": "Interested", "sort_order": 2, "count": 28 },
      { "stage_key": "appointment_set", "label": "Appt Set", "sort_order": 3, "count": 12 },
      { "stage_key": "pitched", "label": "Pitched", "sort_order": 4, "count": 5 },
      { "stage_key": "closed_won", "label": "Closed-Won", "sort_order": 5, "count": 2 }
    ]
  }
}
```

### Dashboard layout injection

Current shell (`admin-dashboard-shell.tsx`) after 7.1:

```tsx
<DashboardDateRangeProvider>
  <AdminDashboardContent /> {/* date control, coaching (Today), feed + summary */}
</DashboardDateRangeProvider>
```

Insert funnel between coaching block and the activity/summary grid:

```tsx
<FunnelChart {...funnel} />
<div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
  <ActivityFeed ... />
  <DailyRepSummaryGrid ... />
</div>
```

### Files to read before editing

| File | Current behavior | 7.2 change |
| :--- | :--- | :--- |
| `admin-dashboard-shell.tsx` | Date range + feed + summary; no funnel | Add funnel hook + component |
| `dashboard-date-range-context.tsx` | `{ from, to, label, isToday, … }` | Funnel consumes `from`/`to` only |
| `use-daily-rep-summary.ts` | Range-keyed fetch + abort | Copy pattern for funnel hook |
| `get-daily-rep-summary.ts` | RPC wrapper + Zod | Model for `get-funnel-conversion.ts` |
| `daily-rep-summary.ts` validator | Range query schema | Reuse date range query rules |
| `get_admin_daily_rep_summary.sql` | Aggregated RPC pattern | Model for funnel RPC |
| `enums.ts` / `pipeline-stage-labels.ts` | Stage enum + display labels | Reference only; funnel uses FR46 labels |

### Previous story intelligence (7.1)

- `features/dashboard/` is the home for analytics — add funnel fetch/hook here, not scattered in `features/admin/` except API route under `admin/dashboard/`.
- `useDashboardDateRange()` exposes applied `from`/`to` (not draft custom inputs) — always use for widget fetches.
- Date range APIs share 366-day max and Sydney boundary helpers — funnel route must reuse same validators.
- Review patches applied: custom range validates before apply; no throws in resolver; build/lint gate required.
- **No new migrations in 7.1** — 7.2 **requires one** for funnel RPC.

### Cross-story dependencies

| Story | Relationship |
| :--- | :--- |
| 7.1 | **Requires** — global date range hook |
| 2.9 / 4.x | **Requires** — `leads` table + stages |
| 3.3 | **Pattern** — aggregated admin dashboard RPC |
| 7.3 leaderboard | **Independent** — may share date hook later |
| 7.5 geographic yield | **Independent** — different data source |

### Git intelligence

Baseline commit `161aab2`; Epic 5–7 dashboard work may exist locally uncommitted — dev agent must read live files under `src/components/admin/`, `src/features/dashboard/`, and `supabase/migrations/` before editing.

### Testing

- **Required:** `npm run build`, `npm run lint`
- **Manual:** Switch Today → Week → Custom; funnel refetches without full page reload
- **Manual:** Spot-check one lead per stage in DB vs funnel counts for a single-day range
- **No** Playwright unless trivial
- **Migration:** apply and verify RPC via Supabase MCP or `db:push`

### References

- [Source: `_bmad-output/planning-artifacts/epics.md` — Story 7.2, FR46]
- [Source: `docs/Solar_CRM_PRD_v1.md` — Funnel Conversion Chart]
- [Source: `_bmad-output/planning-artifacts/architecture.md` — `funnel-chart.tsx`, `features/dashboard/`]
- [Source: `_bmad-output/implementation-artifacts/7-1-global-date-range-control.md` — date range hook]
- [Source: `_bmad-output/implementation-artifacts/3-3-daily-rep-summary-grid.md` — RPC aggregation pattern]
- [Source: `src/lib/validators/enums.ts` — `lead_stage` values]
- [Source: `supabase/migrations/20260603180000_leads_minimal.sql` — leads schema]

## Dev Agent Record

### Agent Model Used

Claude (Cursor Agent)

### Debug Log References

- Migration first attempt failed: `ORDER BY sort_order` invalid inside RPC body — fixed to `ORDER BY 3`.

### Completion Notes List

- Added `get_admin_funnel_conversion` RPC with cumulative stage counts on leads created in Sydney date range.
- Created funnel validators, server fetch, admin API route, client hook, and Tailwind horizontal bar chart component.
- Wired funnel panel into admin dashboard shell; refetches on global date range change via `useDashboardDateRange()`.
- Migration applied via Supabase MCP; `npm run lint` and `npm run build` pass.
- Code review: loading skeleton on all refetches; conversion % uses previous stage label.

### File List

- `supabase/migrations/20260612120000_get_admin_funnel_conversion.sql` (new)
- `src/lib/validators/funnel-conversion.ts` (new)
- `src/features/dashboard/get-funnel-conversion.ts` (new)
- `src/features/dashboard/api.ts` (new)
- `src/features/dashboard/use-funnel-conversion.ts` (new)
- `src/app/api/v1/admin/dashboard/funnel/route.ts` (new)
- `src/components/admin/funnel-chart.tsx` (new)
- `src/components/admin/admin-dashboard-shell.tsx` (modified)
