---
baseline_commit: NO_VCS
---

# Story 5.6: Daily Call Counters

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **rep**,
I want to see how many calls I've made today,
so that I track pace against goals.

## Acceptance Criteria

1. **Given** I am a rep on `/rep/calls` (Story 5.2)  
   **When** the page loads  
   **Then** the header shows my **today** call count for the current Sydney calendar day (FR29)  
   **And** copy is clear (e.g. "12 calls today" or "0 calls today")  
   **And** the count uses `call_logs.called_at` bounded by `startOfDaySydney` / `endOfDaySydney` (same semantics as Story 3.3)

2. **Given** I log a call successfully (Story 5.3)  
   **When** `POST /api/v1/calls` returns success  
   **Then** the header counter increments **without** a full page reload (FR29)  
   **And** the new count matches a refetch of today's total

3. **Given** the admin daily rep summary grid (Story 3.3)  
   **When** a manager views `/admin/dashboard` for a selected date  
   **Then** the **Calls** column shows `COUNT(call_logs)` per rep for that Sydney day (FR29, FR43)  
   **And** reps with zero calls still show `0`  
   **And** morning overview totals (Story 3.4) reflect the same counts automatically (reuses `getDailyRepSummary`)

4. **Given** authorization (NFR9, NFR10)  
   **When** a rep calls `GET /api/v1/calls/daily-count`  
   **Then** only **their** calls are counted (RLS `call_logs_select_rep`)  
   **When** an admin calls the rep daily-count API  
   **Then** `403 FORBIDDEN` (rep-only; admins use summary grid)  
   **When** an unauthenticated user calls either API  
   **Then** `401`  
   **And** there is **no** active-shift gate (cold-call session, same as Stories 5.3–5.5)

5. **Given** day boundary behavior (FR43 alignment)  
   **When** Sydney midnight passes  
   **Then** the rep counter resets to the new day on next page load or refetch (no cron — calendar-day window, same as doors metric)

6. **Given** implementation scope boundaries  
   **When** this story ships  
   **Then** `get_admin_daily_rep_summary` hardcoded `0::bigint as calls` is replaced with a real `call_logs` aggregate  
   **And** there is **no** rep map counter, script widget, `tel:` dial, Realtime subscription, or low-activity RPC change (Story 3.4 knock-only activity remains)  
   **And** promote flow, call history UI, and Kanban are unchanged  
   **And** `npm run build` and `npm run lint` pass

**Implements:** FR29, FR43 (calls column wiring)  
**NFRs:** NFR9 (rep-scoped count), NFR10 (API guards)

## Tasks / Subtasks

- [x] **Migration: wire calls in admin summary RPC** (AC: 3, 6)
  - [x] Create `supabase/migrations/*_get_admin_daily_rep_summary_calls.sql` (sort after `20260610130000_promote_call_to_lead.sql`)
  - [x] `create or replace function public.get_admin_daily_rep_summary(...)` — add `call_counts` CTE
  - [x] Replace `0::bigint as calls` with `coalesce(c.calls, 0) as calls`
  - [x] Add `left join call_counts c on c.rep_id = r.id`
  - [x] Preserve return shape, `security invoker`, grants — **no** admin-only grant change (Story 3.3 pattern)
  - [x] Apply via Supabase MCP; `npm run db:types` if needed

- [x] **Validators** (AC: 1, 4)
  - [x] Extend `src/lib/validators/call-logs.ts` (or new `src/lib/validators/rep-daily-stats.ts`):
    - `repDailyCallCountResponseSchema` — `{ date: YYYY-MM-DD, count: non-negative int }`
    - Optional query schema for `?date=` override (default today Sydney)

- [x] **Server: rep daily call count** (AC: 1, 2, 4, 5)
  - [x] Create `src/features/calls/get-rep-daily-call-count.ts`:
    - Resolve date (default `formatSydneyDateString(new Date())`)
    - `supabase.from('call_logs').select('*', { count: 'exact', head: true })`
    - `.gte('called_at', startOfDaySydney(date)).lte('called_at', endOfDaySydney(date))`
    - RLS scopes to `rep_id = auth.uid()` automatically
    - Return `{ date, count }`
  - [x] Create `GET /api/v1/calls/daily-count/route.ts` — `requireRoleForApi(["rep"])`, optional `?date=YYYY-MM-DD`

- [x] **Client: calls panel counter** (AC: 1, 2)
  - [x] Extend `src/features/calls/api.ts` — `fetchRepDailyCallCount(signal?, date?)`
  - [x] Create `src/features/calls/use-rep-daily-call-count.ts` — mount fetch + `refreshKey` param (mirror `use-contact-call-history` / `use-lead-detail`)
  - [x] Update `src/components/calls/calls-panel-shell.tsx`:
    - Show counter in page header (below or beside "Calls" title)
    - Bump `counterRefreshKey` in `handleCallLogged` (can share `historyRefreshKey` increment — one bump refreshes both)
    - Loading state: subtle placeholder or last known count during refetch

- [x] **Verify admin grid** (AC: 3)
  - [x] Manual: Log 2 calls as Rep A today → admin summary **today** shows `calls: 2` for Rep A
  - [x] Manual: Select yesterday → Rep A shows historical count or `0` as appropriate
  - [x] Manual: Morning overview team totals include call counts
  - [x] **No** `daily-rep-summary-grid.tsx` structural changes expected — RPC drives column

- [x] **Verify** (AC: 6)
  - [x] Manual: Rep sees "0 calls today" on fresh day / before logging
  - [x] Manual: Log call → header updates
  - [x] Manual: Admin `GET /api/v1/calls/daily-count` → 403
  - [x] `npm run build` && `npm run lint`

### Review Findings

- [x] [Review][Defer] `get_admin_daily_rep_summary` `grant execute` to `authenticated` — same pattern as Story 3.3; API route enforces admin role [`supabase/migrations/20260610140000_get_admin_daily_rep_summary_calls.sql`]
- [x] [Review][Defer] Counter refetches after log rather than optimistic +1 — matches AC2 "matches refetch"; brief stale count during reload acceptable v1 [`use-rep-daily-call-count.ts`]
- [x] [Review][Defer] No in-session midnight rollover — AC5 satisfied by calendar-day window on next load/refetch only [`use-rep-daily-call-count.ts`]

## Dev Notes

### Critical constraints

- **Do NOT** change `get_admin_low_activity_reps` — Story 3.4 activity = door knocks only; call-based coaching is a future enhancement.
- **Do NOT** add counters to `/rep/map`, pipeline, or history — epic AC specifies **calls header**; no separate rep dashboard page exists.
- **Do NOT** add Realtime/polling interval — REST on mount + post-log refetch (Story 3.3 pattern).
- **Do NOT** install TanStack Query — extend `src/features/calls/api.ts` + hooks.
- **Do NOT** add shift gate on count APIs — cold calls are not shift-gated.
- **Do NOT** change `create_call_log`, promote, or call history components beyond header counter wiring.
- **Do NOT** add script widget or `tel:` dial — Story 5.7.

### Brownfield: what exists today

| Piece | Status | 5.6 behavior |
|-------|--------|--------------|
| `call_logs` + `idx_call_logs_rep_called_at` | ✅ Story 5.1 | Count source for rep + admin |
| `get_admin_daily_rep_summary` | ⏳ `calls = 0` hardcoded | Add `call_counts` CTE |
| `daily-rep-summary-grid.tsx` | ✅ Story 3.3 | Column already renders `calls` — no layout change |
| `get-morning-overview.ts` | ✅ Story 3.4 | Reuses `getDailyRepSummary` — auto-wired |
| `/rep/calls` header | ⏳ Title + subtitle only | Add today counter |
| Rep daily-count API | ❌ Missing | **Create** |

### Count semantics (canonical)

- **One row = one call** — count all `call_logs` inserts for the rep in the Sydney day window.
- **Timestamp field:** `called_at` (set by `create_call_log` default `now()`).
- **Timezone:** Australia/Sydney via existing `startOfDaySydney` / `endOfDaySydney` / `formatSydneyDateString` from `src/features/knocks/format-knock-date.ts`.
- **Nightly reset:** implicit — new calendar day = new `p_from`/`p_to` window (Story 3.3 semantics).

### API contract — rep daily count

```typescript
// GET /api/v1/calls/daily-count?date=2026-06-06  (date optional; default today Sydney)
// Auth: rep only

// 200
{ data: { date: "2026-06-06", count: 12 } }

// 400 VALIDATION_ERROR (bad date format)
// 401 / 403
```

### Reference SQL — admin RPC patch

```sql
-- Add to get_admin_daily_rep_summary CTEs:
call_counts as (
  select rep_id, count(*)::bigint as calls
  from public.call_logs
  where called_at >= p_from and called_at <= p_to
  group by rep_id
),

-- In SELECT:
coalesce(c.calls, 0) as calls,

-- In FROM:
left join call_counts c on c.rep_id = r.id
```

### UI structure — calls panel header

```
Calls                                    [optional badge area]
12 calls today                           ← NEW (prominent, mobile-readable)
Search for a contact or quick-add...
```

Place counter between `<h1>` and subtitle, or as a pill/badge aligned with the title. Use `text-sm font-medium text-zinc-700` or similar — match zinc palette.

### Files to UPDATE (read before editing)

| File | Current state | This story changes |
|------|---------------|-------------------|
| `supabase/migrations/20260606140000_get_admin_daily_rep_summary.sql` | `calls = 0` | **New** replace migration (do not edit applied migration in place) |
| `src/lib/validators/call-logs.ts` | Call CRUD schemas | Add daily count response schema |
| `src/features/calls/api.ts` | search/create/promote/history | `fetchRepDailyCallCount` |
| `src/components/calls/calls-panel-shell.tsx` | Header + form + history | Today counter + refresh on log |

### File structure (new)

```
supabase/migrations/*_get_admin_daily_rep_summary_calls.sql
src/features/calls/get-rep-daily-call-count.ts
src/app/api/v1/calls/daily-count/route.ts
src/features/calls/use-rep-daily-call-count.ts
```

### Previous story intelligence

**Story 5.5 (done):**
- `handleCallLogged` already bumps `historyRefreshKey` — reuse same increment for counter refresh (one state bump, two hooks).
- `use-contact-call-history` `contactChanged` gating — counter hook does not need contact scope; always loads rep-wide today count.

**Story 5.3 (done):**
- Each successful log inserts one `call_logs` row with `called_at = now()` — counter +1 per log.
- No shift gate on call APIs.

**Story 5.1 (done):**
- `idx_call_logs_rep_called_at` on `(rep_id, called_at desc)` — supports rep day count query.
- Deferred explicitly: dashboard counter wiring → **this story**.

**Story 3.3 (done):**
- `get_admin_daily_rep_summary(p_from, p_to)` aggregated RPC pattern.
- Sydney day bounds helper already used in `get-daily-rep-summary.ts`.
- Calls column UI exists — **RPC-only change** for admin side.

**Story 3.4 (done):**
- Morning overview aggregates `getDailyRepSummary` rows — calls total auto-updates when RPC wired.
- Low-activity detection still knock-based only — **do not change** in 5.6.

### Cross-story dependencies

| Story | Relationship |
|-------|--------------|
| 5.1 | **Requires** — `call_logs` table + indexes |
| 5.3 | **Requires** — logged calls to count |
| 3.3 | **Requires** — admin summary grid + RPC shell |
| 3.4 | **Reuse** — morning overview picks up counts via same RPC |
| 5.7 | **Future** — scripts + dial (no counter work) |

### Testing

- **Required:** `npm run build`, `npm run lint`
- **Required manual:** Rep header counter; post-log increment; admin grid calls column; morning overview totals; admin 403 on rep count API
- **No** Playwright unless requested

### References

- [Source: `_bmad-output/planning-artifacts/epics.md` — Story 5.6, FR29]
- [Source: `docs/Solar_CRM_PRD_v1.md` — Daily Call Counters (Must Have v1)]
- [Source: `_bmad-output/implementation-artifacts/3-3-daily-rep-summary-grid.md` — calls=0 placeholder, RPC pattern]
- [Source: `_bmad-output/implementation-artifacts/5-1-calllog-schema-and-rls.md` — `idx_call_logs_rep_called_at`, defer counter to 5.6]
- [Source: `_bmad-output/implementation-artifacts/5-5-contact-call-activity-stream.md` — scope boundary, refreshKey pattern]
- [Source: `supabase/migrations/20260606140000_get_admin_daily_rep_summary.sql` — function to extend]
- [Source: `src/features/knocks/format-knock-date.ts` — Sydney day bounds]
- [Source: `src/components/admin/daily-rep-summary-grid.tsx` — existing Calls column]

## Dev Agent Record

### Agent Model Used

Composer

### Debug Log References

- Migration applied via Supabase MCP (`get_admin_daily_rep_summary_calls`).
- Unified `refreshKey` bumps both call history and daily counter on log.
- Admin summary grid unchanged — RPC `call_counts` CTE drives Calls column.

### Completion Notes List

- Extended `get_admin_daily_rep_summary` with `call_logs` aggregate (Sydney day bounds).
- `GET /api/v1/calls/daily-count` rep-only; head count via RLS-scoped `call_logs` select.
- Calls panel header shows "N calls today"; refetches after successful log.
- Morning overview inherits counts via existing `getDailyRepSummary` reuse.
- `npm run lint` and `npm run build` pass.
- Code review: approved with 3 deferrals; no patches required.

### Senior Developer Review (AI)

**Outcome:** Approved (0 patches)  
**Date:** 2026-06-06  
**Layers:** Blind Hunter, Edge Case Hunter, Acceptance Auditor

**Summary:** Rep daily-count API + calls header counter; admin RPC `call_counts` CTE wires FR43 Calls column and morning overview via existing `getDailyRepSummary`. Sydney day bounds, RLS-scoped rep count, rep-only API guard, scope boundaries held.

### File List

- `supabase/migrations/20260610140000_get_admin_daily_rep_summary_calls.sql` (new)
- `src/lib/validators/call-logs.ts` (updated)
- `src/features/calls/get-rep-daily-call-count.ts` (new)
- `src/app/api/v1/calls/daily-count/route.ts` (new)
- `src/features/calls/use-rep-daily-call-count.ts` (new)
- `src/features/calls/api.ts` (updated)
- `src/components/calls/calls-panel-shell.tsx` (updated)

## Change Log

- 2026-06-06: Story 5.6 implemented — daily call counters on rep calls header + admin summary RPC (FR29, FR43).
- 2026-06-06: Code review — approved, no patches.

## Story Completion Status

- **Status:** done
- **Completion note:** Daily call counters approved; ready for Story 5.7 scripts + dial.
