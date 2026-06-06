# Deferred Work

## Deferred from: code review of 1-1-initialize-application-from-starter-template (2026-06-01)

- ~~Root `src/middleware.ts` not created in Story 1.1~~ — completed in Story 1.3 (`src/middleware.ts` + role routing).

## Deferred from: code review of 2-1-contacts-and-doorknocks-schema (2026-06-03)

- Multiple permissive SELECT policies on `contacts` and `door_knocks` — same admin/rep split as `profiles`; consolidate when optimizing RLS performance.
- Unused indexes on empty tables — INFO-level advisor noise until Stories 2.3+ generate query traffic.
- RLS smoke-test SQL not documented in Dev Agent Record — MCP policy verification partially satisfies AC8; add explicit rep-isolation smoke when API layer exists in 2.5.

## Deferred from: code review of 2-2-start-and-end-shift-with-gps-tracking (2026-06-03)

- `getActiveShiftForRep` swallows query errors — returns null on DB failure; improve when adding observability.
- Multiple permissive SELECT policies on shifts/gps_pings — same admin/rep split as other tables.

## Deferred from: code review of 2-3-rep-map-with-live-location-and-historic-pins (2026-06-03)

- GiST location index unused by bbox RPC — remote PostGIS unavailable; lat/lng BETWEEN acceptable for AU v1; revisit when PostGIS enabled on hosted DB.

## Deferred from: code review of 2-4-tap-to-log-a-door-knock (2026-06-03)

- Dual geolocation while on shift — `watchPosition` for map/quick-add plus interval `getCurrentPosition` for GPS pings; acceptable v1 overlap.

## Deferred from: code review of 2-5-door-outcome-form-and-submission (2026-06-03)

- Pin appears after async bbox refetch — acceptable for 2.5; optimistic merge deferred to Story 2.7.

## Deferred from: code review of 2-7-offline-knock-queue-and-sync (2026-06-03)

- Pending knocks sync only during active shift — queue survives shift end; syncs when rep starts next shift.

## Deferred from: code review of 2-8-serwist-pwa-shell (2026-06-03)

- GET `/api/*` cached via Serwist `defaultCache` NetworkFirst — user-scoped knock bbox responses could persist on shared devices; story mandates defaultCache as-is; acceptable v1 for single-rep phones.

## Deferred from: code review of 2-9-promote-interested-door-to-lead (2026-06-03)

- No post-sync pipeline toast after offline queue drains — AC4 satisfied on save; optional confirmation when sync creates lead can wait for Epic 4.
- `leads.updated_at` has no auto-update trigger — no UPDATE paths in 2.9; Story 4.1 can add trigger.

## Deferred from: code review of 2-10-re-knock-warning-with-history (2026-06-03)

- `ST_DWithin` with `::geography` cast may not use the existing geometry GiST index on `door_knocks`; acceptable for v1 knock volume; revisit if proximity queries slow at scale.

## Deferred from: code review of 2-11-personal-knock-history (2026-06-03)

- Stale knock rows remain visible while filter refetch is in flight; acceptable v1; optional refetch indicator can follow user feedback.

## Deferred from: code review of 3-1-admin-global-map-with-filters (2026-06-06)

- Admin page role mismatch redirects to `/forbidden` rather than HTTP 403 — pre-existing middleware pattern for all `/admin/*` routes.
- Stale pins remain visible while admin map filters refetch — acceptable v1; matches Story 2.11 deferred pattern.

## Deferred from: code review of 3-4-low-activity-and-morning-overview-flags (2026-06-06)

- Stale flagged list remains visible while low-activity refetch is in flight — acceptable v1; matches Story 3.3 deferred pattern.
- RPC `grant execute` to `authenticated` (not admin-only) — same pattern as other admin RPCs; API route enforces admin role.

## Deferred from: code review of 3-3-daily-rep-summary-grid (2026-06-06)

- Stale summary rows remain visible while date refetch is in flight — acceptable v1; matches Story 3.1/2.11 deferred pattern.
- RPC `grant execute` to `authenticated` (not admin-only) — same pattern as `get_admin_knocks_in_bbox`; API route enforces admin role.

## Deferred from: code review of 4-3-lead-cards-and-filters (2026-06-11)

- Default 30-day `updated_at` filter on pipeline load — intentional; widen or add "All time" toggle if users report missing leads.
- No `from <= to` guard on pipeline date filters — empty board is acceptable v1 feedback.
- Batch `lead_activity` / `follow_ups` enrichment via `.in(lead_id)` — revisit pagination if pipeline volume grows.

## Deferred from: code review of 4-2-kanban-pipeline-board (2026-06-08)

- No keyboard-accessible drag-and-drop — PointerSensor only; add KeyboardSensor when pipeline a11y is prioritized.
- Unbounded `GET /api/v1/leads` — no pagination; revisit when filters (4.3) or lead volume grow.
- Admin desktop layout uses same horizontal-scroll Kanban as rep — padding-only difference; richer desktop grid deferred.

## Deferred from: code review of 4-1-leads-schema-stages-and-rls (2026-06-07)

- No admin `INSERT` policy on `leads` — knock RPC handles creation; Story 4.9 may add reassignment insert paths.
- RLS smoke for 4.1 documented as policy-structure review — live rep A/B session deferred until pipeline APIs land in 4.2+.

## Deferred from: code review of 3-5-shift-gps-breadcrumbs-on-admin-map (2026-06-06)

- Active-shift breadcrumbs include pings outside the selected calendar day — AC2 uses shift-boundary filter, not day clip; acceptable v1 when viewing past days with still-open shifts.
- No ping count cap for long multi-day active shifts — NFR1 theoretical; story does not require truncation.

## Deferred from: code review of 3-2-live-activity-feed (2026-06-06)

- Enrichment fetch may 404 briefly if Realtime INSERT fires before row is readable — rare race; acceptable v1.
- Admin page role mismatch redirects to `/forbidden` rather than HTTP 403 — pre-existing middleware pattern.

## Deferred from: code review of 4-4-lead-detail-360-view (2026-06-06)

- Rep knock history scoped to own knocks — `door_knocks_select_rep` filters `rep_id = auth.uid()`; full contact knock history on lead detail needs RLS read widening via lead/contact access.
- Malformed timeline rows silently dropped — `parseKnockRow` / `parseActivityRow` return null without partial-data error surfacing; acceptable while FK/join integrity holds.
- `follow_ups` rep SELECT keyed on `rep_id` not lead ownership — pre-existing Story 4.1 RLS; rep may miss follow-ups if `rep_id` differs from lead owner.

## Deferred from: code review of 4-5-collaboration-notes (2026-06-06)

- No keyboard submit (Enter/Cmd+Enter) on lead note textarea — button-only compose acceptable v1.

## Deferred from: code review of 4-6-schedule-follow-ups (2026-06-06)

- No server-side future-due validation on follow-up `due_at` — past dates allowed v1; matches door-outcome optional follow-up pattern.
- Duplicate `parseFollowUpRow` in `get-lead-detail.ts` and `create-lead-follow-up.ts` — consolidate when a follow-up edit/complete story touches both paths.
- Pipeline card countdown updates only on board refetch — AC3 by design; no optimistic board merge after schedule.

## Deferred from: code review of 4-7-pipeline-stage-audit-trail (2026-06-06)

- Stage update + activity insert not atomic — lead may move without audit row if insert fails after UPDATE; acceptable v1 (4.5 pattern).
- No retroactive backfill for stage moves before 4.7 — historical leads show empty Stage changes section.
- Story 3.3 appointments metric still uses `leads.updated_at` proxy — consume `stage_change` events in future metric hardening.
