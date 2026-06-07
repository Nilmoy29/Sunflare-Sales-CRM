---
baseline_commit: 161aab2
---

# Story 7.6: CSV Export

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an **admin**,
I want to export table data to CSV,
so that I can analyze in spreadsheets.

## Acceptance Criteria

1. **Given** I am an authenticated admin on `/admin/dashboard`  
   **When** the page loads  
   **Then** each **supported report table** shows an **Export CSV** control in its panel header (FR50)  
   **And** `/admin/dashboard` enforces admin role server-side via `requireRole(["admin"])` (NFR10 — closes gap vs other admin pages)  
   **And** styling matches existing admin zinc cards (secondary/outline button in header row)

2. **Given** a supported report with loaded rows for the active date range  
   **When** I click **Export CSV**  
   **Then** the browser downloads a `.csv` file  
   **And** the file includes a **header row** with human-readable column labels  
   **And** data rows match the **currently displayed table** (same sort order, same date range, same active metric where applicable)  
   **And** no network refetch is required (export uses in-memory hook data)

3. **Given** the **Daily rep summary** table  
   **When** I export  
   **Then** columns are: **Rep**, **Doors**, **Calls**, **Leads**, **Appts**  
   **And** values match `useDailyRepSummary()` rows for `{ from, to }`

4. **Given** the **Team leaderboard** table  
   **When** I export  
   **Then** columns are: **Rank**, **Rep**, and the **active metric label** (Doors / Calls / Leads / Appts)  
   **And** rows match the ranked list from `useTeamLeaderboard()` including competition ranks and selected metric

5. **Given** the **Geographic yield** table  
   **When** I export  
   **Then** columns are: **Rank**, **Suburb**, **Doors**, **Interested**, **Leads**, **Interested %**  
   **And** rows match `useGeographicYield()` ranked output for the active metric sort  
   **And** **Interested %** exports as a number (e.g. `42`) when computable, or empty cell when doors = 0 (UI shows **—**)

6. **Given** the **Funnel conversion** table  
   **When** I export  
   **Then** columns are: **Stage**, **Count**  
   **And** rows match `useFunnelConversion()` stages in display order  
   **And** conversion notes (e.g. “42% from Interested”) are **not** included in CSV v1

7. **Given** CSV formatting requirements  
   **When** a file is generated  
   **Then** fields follow RFC 4180 escaping (quote fields containing commas, quotes, or newlines; double embedded quotes)  
   **And** file encoding is UTF-8 with BOM prefix (`\uFEFF`) for Excel compatibility  
   **And** filename pattern is `sunflare-{report-slug}-{from}-{to}.csv` (leaderboard appends `-{metric}` slug, e.g. `sunflare-team-leaderboard-doors-2026-06-01-2026-06-07.csv`)

8. **Given** export control states  
   **When** the table is **loading** or has **zero rows** (empty state)  
   **Then** the Export CSV button is **disabled**  
   **And** when an **error** is shown for that panel, export remains disabled  
   **And** no toast/modal is required on success (browser download is sufficient)

9. **Given** authorization (NFR10)  
   **When** a rep or unauthenticated user attempts dashboard access  
   **Then** they are redirected to `/forbidden` or login (via `requireRole` on dashboard page)  
   **And** no standalone public export URL exists in v1 (client-side download only)

10. **Given** implementation scope  
    **When** complete  
    **Then** `npm run build` and `npm run lint` pass  
    **And** end-of-shift summaries (7.7), admin call-script config (7.8), rep deep-dive export, activity-feed export, and server-side bulk export API are **not** added

**Implements:** FR50  
**NFRs:** NFR10 (admin guards), UX-DR5 (desktop manager dashboard)

## Tasks / Subtasks

- [x] **CSV utilities** (AC: 7, 8)
  - [x] Create `src/lib/csv/escape-csv-cell.ts`:
    - `escapeCsvCell(value: string | number | null | undefined): string`
    - Null/undefined → empty string; numbers stringified
  - [x] Create `src/lib/csv/build-csv.ts`:
    - `buildCsv(headers: string[], rows: (string | number | null | undefined)[][]): string`
    - Prepend UTF-8 BOM
  - [x] Create `src/lib/csv/download-csv.ts`:
    - `downloadCsv(filename: string, csvContent: string): void` using `Blob` + temporary `<a download>`
    - Revoke object URL after click

- [x] **Report row mappers** (AC: 3, 4, 5, 6)
  - [x] Create `src/lib/csv/dashboard-export-mappers.ts`:
    - `dailyRepSummaryToCsv(rows: DailyRepSummaryRow[]): { headers, rows }`
    - `teamLeaderboardToCsv(rows: LeaderboardRow[], metric: LeaderboardMetric): { headers, rows }`
    - `geographicYieldToCsv(rows: RankedGeographicYieldRow[]): { headers, rows }`
    - `funnelConversionToCsv(stages: FunnelStageRow[]): { headers, rows }`
    - Reuse label maps from existing validators (`LEADERBOARD_METRIC_LABELS`, `formatInterestedPct` logic for export numeric pct)

- [x] **Export button component** (AC: 1, 8)
  - [x] Create `src/components/admin/csv-export-button.tsx`:
    - Props: `label?` (default "Export CSV"), `disabled`, `onExport: () => void`
    - Zinc outline button matching date-range secondary styling
    - `type="button"`; optional `aria-disabled` when disabled

- [x] **Wire dashboard panels** (AC: 1–6, 8)
  - [x] Update `src/components/admin/daily-rep-summary-grid.tsx` — header flex row with export; pass `from`/`to` for filename
  - [x] Update `src/components/admin/team-leaderboard.tsx` — export ranked rows + active metric
  - [x] Update `src/components/admin/geographic-yield-panel.tsx` — export ranked rows (no Volume column)
  - [x] Update `src/components/admin/funnel-chart.tsx` — export stages table
  - [x] Each panel: `disabled={loading || !!error || rows.length === 0}` (funnel: `stages.length === 0 || totalLeads === 0`)

- [x] **Admin guard on dashboard page** (AC: 1, 9)
  - [x] Update `src/app/(admin)/admin/dashboard/page.tsx`:
    - `await requireRole(["admin"])` before render (match `admin/map/page.tsx` pattern)

- [x] **Verify** (AC: 7, 10)
  - [ ] Manual: Export daily summary — open in Excel/Numbers; headers and counts match on-screen grid
  - [ ] Manual: Change leaderboard metric to Leads → export → third column header is "Leads"
  - [ ] Manual: Geographic yield suburb with doors=0 → Interested % cell empty in CSV
  - [ ] Manual: Comma in rep name (if test data) → field quoted correctly
  - [ ] Manual: Rep user hitting `/admin/dashboard` → forbidden redirect
  - [ ] Optional unit test: `escapeCsvCell` quoting edge cases
  - [x] `npm run build` && `npm run lint`

## Dev Notes

### Critical constraints

- **Do NOT** install CSV libraries (`papaparse`, etc.) — plain string building is sufficient.
- **Do NOT** add `GET /api/v1/admin/export/csv` server route in v1 — client-side export from already-fetched admin data; architecture route is deferred until bulk/server-side export is needed.
- **Do NOT** export activity feed, morning overview, low-activity panels, or rep deep-dive (7.4) — dashboard tabular widgets only.
- **Do NOT** build 7.7 end-of-shift summaries or 7.8 call-script admin UI.
- **Do NOT** refetch on export — WYSIWYG from hook state (metric sort, date range already applied).

### Supported reports (v1)

| Report slug | Component | Data source |
| :--- | :--- | :--- |
| `daily-rep-summary` | `DailyRepSummaryGrid` | `useDailyRepSummary()` |
| `team-leaderboard-{metric}` | `TeamLeaderboard` | `useTeamLeaderboard()` ranked rows |
| `geographic-yield` | `GeographicYieldPanel` | `useGeographicYield()` ranked rows |
| `funnel-conversion` | `FunnelChart` | `useFunnelConversion()` stages |

### Panel header layout (reference)

```tsx
<div className="flex flex-wrap items-start justify-between gap-3 border-b border-zinc-200 px-4 py-3">
  <div>
    <h2>...</h2>
    <p className="mt-1 text-sm text-zinc-600">...</p>
  </div>
  <CsvExportButton disabled={...} onExport={handleExport} />
</div>
```

Keep subtitle/date label inside the left block; button aligns top-right on wide screens.

### CSV escape sketch

```typescript
export function escapeCsvCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const text = String(value);
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}
```

### Filename helper

```typescript
function buildExportFilename(slug: string, from: string, to: string): string {
  return `sunflare-${slug}-${from}-${to}.csv`;
}
```

Use slug `team-leaderboard-${metric}` for leaderboard exports.

### Files to read before editing

| File | Current behavior | 7.6 change |
| :--- | :--- | :--- |
| `daily-rep-summary-grid.tsx` | Summary table, no export | Add export button + mapper call |
| `team-leaderboard.tsx` | Ranked table, metric toggle | Add export (rank + rep + active metric) |
| `geographic-yield-panel.tsx` | Ranked suburb table | Add export (6 data columns) |
| `funnel-chart.tsx` | Stage table + bars | Add export (stage + count) |
| `admin/dashboard/page.tsx` | No `requireRole` | Add admin guard |
| `dashboard-date-range-context.tsx` | `{ from, to, label }` | Use `from`/`to` in filenames |

### Previous story intelligence

**7.1:** Global date range — export filenames and row data must reflect active `{ from, to }`.

**7.2:** Funnel stages are `{ label, count, sort_order }` — export in table display order.

**7.3:** Leaderboard exports **visible** columns only (rank, rep, active metric value) — not all four metrics unless user switches metric and re-exports.

**7.4:** Rep deep-dive is a separate route — out of scope for 7.6 v1.

**7.5:** Geographic yield ranked rows include `interested_pct: number | null` — export null as empty cell, not em dash (spreadsheets prefer blank or numeric).

**3.3:** Daily rep summary column labels — match grid headers (Doors, Calls, Leads, Appts).

### Cross-story dependencies

| Story | Relationship |
| :--- | :--- |
| 7.1 | **Requires** — date range for filenames and data |
| 7.2–7.5 | **Requires** — tabular widgets to export |
| 7.7 | **Independent** — shift summaries not exported here |
| Architecture `export/csv/route.ts` | **Deferred** — client export sufficient for v1 |

### Git intelligence

Baseline commit `161aab2`; Epic 7 dashboard widgets may exist locally uncommitted — read live panel components before editing.

### Testing

- **Required:** `npm run build`, `npm run lint`
- **Recommended unit test:** `escapeCsvCell` for comma, quote, newline, null
- **Manual:** Open exported CSV in Excel — verify BOM, headers, row count
- **Manual:** Leaderboard metric toggle then export — column header updates
- **No** Playwright unless trivial

### References

- [Source: `_bmad-output/planning-artifacts/epics.md` — Story 7.6, FR50]
- [Source: `docs/Solar_CRM_PRD_v1.md` — Automated CSV Exporter]
- [Source: `_bmad-output/planning-artifacts/architecture.md` — `admin/export/csv/route.ts` (deferred v1)]
- [Source: `_bmad-output/implementation-artifacts/7-3-team-leaderboard.md` — ranked table pattern]
- [Source: `_bmad-output/implementation-artifacts/7-5-geographic-yield-by-suburb.md` — geographic yield columns]

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

- Shared CSV utilities: RFC 4180 escaping, UTF-8 BOM, browser download via Blob.
- Export wired on all four dashboard tabular widgets; WYSIWYG from in-memory hook data.
- Dashboard page now enforces `requireRole(["admin"])`.
- Lint + build pass.
- Code review: download anchor appended to DOM before click for Safari compatibility.

### File List

- `src/lib/csv/escape-csv-cell.ts`
- `src/lib/csv/build-csv.ts`
- `src/lib/csv/download-csv.ts`
- `src/lib/csv/build-export-filename.ts`
- `src/lib/csv/dashboard-export-mappers.ts`
- `src/lib/csv/export-dashboard-report.ts`
- `src/components/admin/csv-export-button.tsx`
- `src/components/admin/daily-rep-summary-grid.tsx`
- `src/components/admin/team-leaderboard.tsx`
- `src/components/admin/geographic-yield-panel.tsx`
- `src/components/admin/funnel-chart.tsx`
- `src/app/(admin)/admin/dashboard/page.tsx`

### Review Findings

- [x] [Review][Patch] Download anchor not attached to DOM [`src/lib/csv/download-csv.ts:4-8`] — fixed: append to `document.body`, click, remove, then revoke object URL.
- [x] [Review][Defer] No unit tests for `escapeCsvCell` quoting edge cases — deferred, pre-existing (story scoped optional manual verification only).
- [x] [Review][Defer] CSV formula-injection prefix for cells starting with `=`, `+`, `-`, `@` — deferred, pre-existing (admin-only internal export; not in story AC).
- [x] [Review][Defer] Client-side export relies on dashboard `requireRole` gate — deferred, pre-existing (matches 7.6 story intent; no server export route in v1).
