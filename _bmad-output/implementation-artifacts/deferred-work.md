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

## Deferred from: code review of 4-8-web-push-reminders-for-follow-ups (2026-06-06)

- Due follow-ups with no push subscription marked `reminded_at` on cron skip — rep who subscribes later won't get retroactive push for already-due items.
- Cron every 5 minutes — follow-up reminders may arrive up to ~5 min after `due_at`; acceptable v1.
- Global unique `push_subscriptions.endpoint` — shared-device rep account switch may fail subscribe until stale row cleared.
- iOS Safari Web Push requires installed PWA (iOS 16.4+) for reliable delivery — manual QA note only.

## Deferred from: code review of 4-9-lost-reasons-and-lead-reassignment (2026-06-06)

- Reassign lead + follow_ups not atomic — partial failure can leave lead on new rep with incomplete follow_ups still on old rep; acceptable v1 (4.7 stage+audit pattern).
- Migration must be applied before deploy — `leads.lost_reason` column absent from generated types until `npx supabase db push` after `supabase login`.

## Deferred from: code review of 5-1-calllog-schema-and-rls (2026-06-07)

- RLS smoke documented as policy-structure review, not live rep A/B session — same pattern as Stories 2.1 and 4.1; add explicit rep-isolation smoke when calls API exists in 5.3.
- `door_knocks_insert_rep` not extended with `call_logs` contact linkage — knock-after-call-only path not required for 5.1; extend if product needs rep to knock a contact they only called.
- First call on another rep's contact blocked by `call_logs_insert_rep` until knock/call link exists — Story 5.2 contact search must use API/RPC with appropriate scope.
- Multiple permissive SELECT policies on `call_logs` (rep + admin) — same split admin/rep pattern as `door_knocks`; consolidate when optimizing RLS performance.

## Deferred from: code review of 5-2-contact-search-and-create (2026-06-07)

- `normalize_phone_digits` granted to `authenticated` — low risk internal helper; revoke if unused client-side.
- Duplicate detection skipped when normalized phone has fewer than 3 digits — acceptable v1.
- Global `%ilike%` contact search capped at 50 — add pagination/index tuning when volume grows.

## Deferred from: code review of 5-3-log-a-call-with-outcome (2026-06-09)

- `is_linked` badge not updated after first cross-rep call — cosmetic; refreshes on re-search.
- RPC does not reject negative `p_duration_seconds` at DB layer — API/client validation sufficient v1.
- `create_call_log` SECURITY DEFINER allows any rep to log on any existing contact UUID — intentional cross-rep design; `rep_id` on row provides audit trail.

## Deferred from: code review of 5-4-promote-call-to-lead (2026-06-11)

- Logging a second call without promoting hides promote UI for earlier unpromoted interested call — edge case; API promote by call id still works.
- `promoteCallResponseSchema` unused in route — RPC parse sufficient v1.
- `promotedCallIds` not cleared on contact switch — harmless session state.

## Deferred from: code review of 5-5-contact-call-activity-stream (2026-06-06)

- `contactCallHistoryResponseSchema` parsed in feature layer only, not re-validated in route — acceptable v1 (same pattern as 5.4).
- `CallHistoryCard` duplicates `TimelineItemCard` markup — cosmetic; extract shared component if a third call-history surface appears.
- Sub-minute call durations display as "1 min" via `Math.max(1, round(seconds/60))` — acceptable v1 rounding.

## Deferred from: code review of 5-6-daily-call-counters (2026-06-06)

- `get_admin_daily_rep_summary` `grant execute` to `authenticated` — same pattern as Story 3.3; API route enforces admin role.
- Counter refetches after log rather than optimistic +1 — matches AC2 refetch semantics; brief stale count during reload acceptable v1.
- No in-session midnight rollover — AC5 satisfied by calendar-day window on next load/refetch only.

## Deferred from: code review of 5-7-call-scripts-and-click-to-dial (2026-06-06)

- `get-call-script.ts` uses `limit(1)` + type cast instead of typed `.eq("id", 1)` — works for singleton v1.
- Script fetched on panel mount even when no contact selected — acceptable v1 per AC5; no refetch on contact select until 7.8.
- No `updated_at` trigger on `call_script` UPDATE — Story 7.8 admin PATCH should set timestamps explicitly.

## Deferred from: code review of 6-1-territory-and-assignment-schema (2026-06-07)

- RLS smoke documented as policy-structure review, not live rep A/B session — same pattern as schema-only stories 2.1, 4.1, 5.1.
- Multiple permissive SELECT policies on `territories` and `territory_assignments` (admin `FOR ALL` + rep `SELECT`) — same split pattern as `call_logs`; consolidate when optimizing RLS performance.
- Rep cannot `SELECT` territory via `profiles.territory_id` alone — only via `territory_assignments`; revisit in Story 6.4 if FR3 home territory should render without a dated assignment.
- `TERRITORY_NAME_MAX_LENGTH` / `TERRITORY_NOTES_MAX_LENGTH` unused until Story 6.2 create/update validators.
- `territoryRowSchema.polygon_geojson` as `z.string()` vs generated `unknown` — align when 6.2 draw API defines PostgREST geometry encoding.

## Deferred from: code review of 6-2-draw-and-save-territories (2026-06-07)

- RPC `grant execute` to `authenticated` (not admin-only) on territory CRUD RPCs — same pattern as Stories 3.3 and 5.6; API routes enforce admin role.
- No polygon redraw UI despite `updateTerritoryBodySchema` supporting `polygon` — AC4 minimum is name/notes edit; geometry redraw optional v1.
- Client `fetchTerritories` / create / update do not re-validate responses with Zod schemas — matches project fetch+hooks convention.
- `getTerritoriesForAdmin` silently drops rows when `parseTerritorySummary` fails — acceptable v1; revisit if geometry encoding drifts.
- `geoJsonLinearRingSchema` closed-ring check uses strict coordinate equality — Mapbox Draw closes rings; server `ST_IsValid` is backstop.
- No territory DELETE in UI or API — story defers delete; schema RLS allows admin DELETE for a future story.
- Map height uses same `min-h-0 flex-1` chain as `/admin/map`, not explicit `h-screen` — consistent with existing admin map layout.

## Deferred from: code review of 6-3-assign-territory-to-rep-by-date (2026-06-07)

- RPC `grant execute` to `authenticated` on assignment RPCs — same pattern as 6.2/3.3/5.6; API routes enforce admin role.
- `getTerritoryAssignmentsForAdmin` silently drops rows when `parseTerritoryAssignmentSummary` fails — acceptable v1; same as 6.2.
- Client assignment API calls do not re-validate responses with Zod — matches project fetch+hooks convention.
- Assignment list highlight keyed by `territory_id` not `assignment.id` — cosmetic when multiple reps share a zone same day.
- GET assignments without `assigned_date` returns unfiltered list — UI always sends date; acceptable v1 team size.
- Local `npm run db:types` may lag remote RPC signatures — `as never` RPC casts used (6.2 pattern).

## Deferred from: code review of 6-4-show-assigned-territory-on-rep-map (2026-06-07)

- RPC `grant execute` to `authenticated` on `get_rep_territories_for_date` — same pattern as 6.2/6.3; RPC scopes via `auth.uid()`; API enforces rep role.
- `getRepTerritoriesForDate` silently drops rows when `parseRepTerritoryOverlay` fails — acceptable v1; same as 6.2/6.3.
- Client `fetchRepTerritoriesForDate` does not re-validate responses with Zod — matches project fetch+hooks convention.
- Client fetch omits optional `assigned_date` query param — rep map uses server Sydney-today default.
- `useRepTerritoryOverlay` swallows fetch errors with no `error` exposure — AC2 non-blocking; empty overlay on failure acceptable v1.
- Point-in-polygon uses outer ring only (ignores GeoJSON holes) — admin draw produces simple polygons v1.
- Local `npm run db:types` may lag remote RPC signatures — `as never` RPC casts used (6.2/6.3 pattern).

## Deferred from: code review of 6-5-coverage-heatmap-layer (2026-06-07)

- Heatmap GeoJSON syncs even when layer hidden — acceptable v1 at ≤500 points.
- Duplicate `adminKnocksToFeatureCollection` build per knock update (pins + heatmap) — negligible at NFR1 scale.
- Stale heatmap during filter/bbox refetch — same deferred pattern as Story 3.1 pins.
- Heatmap density limited to truncated 500-pin viewport sample — Phase 3 grid out of scope.
- Heatmap renders above breadcrumb route lines per story layer stack — route may be partially obscured when both on.
- Default opacity `0.6` triplicated across shell/canvas/map init — `setPaintProperty` corrects on load.

## Deferred from: code review of 7-1-global-date-range-control (2026-06-07)

- `addDaysSydney` uses fixed 24h ms arithmetic — DST week boundaries could drift by one day; matches existing `yesterdaySydneyDateString` pattern.
- No unit tests for Sydney week/month preset resolution — story scoped manual verification only.
- Span validation duplicated across three Zod schemas — maintenance overhead, acceptable v1.

## Deferred from: code review of 7-2-funnel-conversion-chart (2026-06-07)

- `grant execute` on funnel RPC to `authenticated` — admin enforced at API route; same pattern as summary RPC.
- Client `fetchFunnelConversion` does not re-validate response with Zod — matches fetch+hooks convention.
- `as never` RPC cast — local `db:types` may lag new function signature.

## Deferred from: code review of 7-3-team-leaderboard (2026-06-07)

- Duplicate summary API call on dashboard load — story explicitly accepts leaderboard + grid both calling `fetchDailyRepSummary` for v1.
- Stale error persists during range refetch — matches funnel/summary deferred stale-state pattern (7.2, 3.3).
- No unit tests for `rankRepMetrics` competition ranking — story scoped manual verification only.
- Metric toggle buttons lack `aria-pressed` — date range preset buttons use the same pattern (7.1).

## Deferred from: code review of 7-4-rep-deep-dive-dashboard (2026-06-07)

- RPC `grant execute` to `authenticated` on rep deep-dive RPCs — admin enforced at API route; same pattern as 7.2/7.3.
- Stale error persists during range/rep refetch — matches funnel/leaderboard deferred stale-state pattern.
- Pipeline stage labels hardcoded in SQL vs `LEAD_STAGE_LABELS` — labels match today; funnel RPC uses same pattern.
- Client fetch helpers do not re-validate responses with Zod — matches project fetch+hooks convention.
- Date range resets to default week when switching reps via selector — full navigation remounts provider; acceptable v1.

## Deferred from: code review of 7-5-geographic-yield-by-suburb (2026-06-07)

- Stale error persists during range refetch — matches funnel/leaderboard deferred stale-state pattern (7.2, 7.3).
- RPC `grant execute` to `authenticated` on `get_admin_geographic_yield` — admin enforced at API route; same pattern as 7.2/7.3.
- Client `fetchGeographicYield` does not re-validate response with Zod — matches project fetch+hooks convention.
- Metric toggle buttons lack `aria-pressed` — same pattern as 7.3 team leaderboard / 7.1 date presets.

## Deferred from: code review of 7-6-csv-export (2026-06-07)

- No unit tests for `escapeCsvCell` quoting edge cases — story scoped optional manual verification only.
- CSV formula-injection prefix for spreadsheet formula characters — admin-only internal export; not in story AC.
- Client-side export relies on dashboard `requireRole` gate — matches 7.6 story intent; no server export route in v1.

## Deferred from: code review of 7-7-end-of-shift-daily-summaries (2026-06-07)

- Silent RPC failure in `getRepDailySummaryForDate` — story accepts zeroed summary without blocking shift end; optional server logging not required v1.
- Admin daily summary refetches on Realtime activity, not shift-end event — AC5 ties refresh to field activity; last knock/call during shift already triggers refetch before end.
- Rep shift end reuses admin `getDailyRepSummary` via cross-feature import — no new migration; RLS scopes rep to own row; dedicated rep RPC optional cleanup.
- Client `endShift()` does not Zod-validate `ShiftEndResponse` — matches project fetch+hooks convention.

## Deferred from: code review of 7-8-admin-call-script-configuration (2026-06-07)

- Client `fetchAdminCallScript` / `updateAdminCallScript` do not re-validate with Zod — matches project fetch+hooks convention.
- `getCallScript` uses `limit(1)` instead of `.eq("id", 1)` — Story 5.7 deferral; singleton table.
- Rep script refetch on calls panel mount only — Story 7.8 AC5 accepts reload/navigation v1.
- `updated_by` set server-side but not shown in admin UI — not in story AC; audit UI optional future.

## Deferred from: code review of fix-map-knock-pin-click-details (2026-07-11)

- Web knock detail dialog has Escape + backdrop close but no full focus trap / `inert` on background — matches other rep sheets; optional a11y hardening later.
- Cluster pin taps still ignore (no zoom-in) on web and mobile — pre-existing; optional follow-up.

