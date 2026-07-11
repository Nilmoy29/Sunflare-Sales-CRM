---
title: 'Fix map knock pin click to show knock details'
type: 'bugfix'
created: '2026-07-11'
status: 'done'
baseline_commit: 'c2d58a006e4e2ef72b74347fe9e202e590ab7f2d'
context: []
---


<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** On the rep web and mobile maps, tapping an existing knock pin (colored outcome dots) does not show that knock’s details (outcome/status, when knocked). Pin taps currently open the create-knock flow at those coordinates, so the prior knock status never appears.

**Approach:** Treat unclustered pin taps as “view this knock”: surface outcome, knock time, and available address from pin GeoJSON. Keep empty-map taps / GPS quick-add as create-knock. Optionally offer a clear “knock again here” action from the detail UI so re-knock remains possible without hijacking the pin tap.

## Boundaries & Constraints

**Always:**
- Empty-map tap and Log Knock / FAB still open create `DoorOutcomeSheet`.
- Pin tap shows details for that knock (outcome label + color, knocked_at; address fields when present).
- Pass full pin identity from the map layer (`id`, `outcome`, `knocked_at`, coords, pending if any) — do not discard feature properties.
- Match existing rep UI patterns (bottom sheet / overlay), and reuse admin popup content patterns (outcome label, formatted time) where helpful.
- Cover both rep web map and mobile Expo map in this fix.

**Ask First:**
- If implementation would require a new `GET /api/v1/knocks/[id]` (or expanding pin payloads with notes/follow-up) solely for richer edit — pause and confirm before adding API/schema work. Prefer pin-local fields + existing history/near APIs if edit is needed later.
- If product wants pin tap to open full `KnockEditSheet` (edit outcome/notes) instead of read-only detail — confirm before wiring edit.

**Never:**
- Change admin map pin popup behavior (already shows details) unless a regression is found.
- Make pin tap open create-only `DoorOutcomeSheet` with no prior-knock summary.
- Broad refactor of Mapbox clustering, heatmap, or territory layers.
- Touch auth, pipeline, or unrelated map chrome.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Pin detail | Tap unclustered knock pin with `id`/`outcome`/`knocked_at` | Detail UI shows outcome label, time; pin id retained | If properties incomplete, fall back to coords-only message or no-op with no create sheet |
| Empty map | Tap map with no pin hit | Create knock draft at lat/lng (unchanged) | N/A |
| Re-knock | From detail UI, choose knock-again (if offered) | Opens create draft at pin coords | Close detail first |
| Pending pin | Tap optimistic/offline pending pin | Show outcome + pending indicator; no crash | Skip edit paths that need server id if pending-only |
| Cluster | Tap cluster circle | Do not open create or fake detail; prefer zoom-in if already supported, else ignore | N/A |
| Admin | Tap pin on admin map | Existing popup still works | N/A |

</frozen-after-approval>

## Code Map

- `src/components/rep/map-canvas.tsx` -- Rep web Mapbox canvas; `onPinClick` currently passes only `{ lat, lng }` from `queryRenderedFeatures`
- `src/app/(rep)/rep/map/rep-map-shift-shell.tsx` -- Wires `handlePinClick` → `openDraft` (create sheet); needs detail state separate from create draft
- `src/components/rep/door-outcome-sheet.tsx` -- Create-knock sheet (keep for empty-map / FAB)
- `src/components/rep/knock-edit-sheet.tsx` -- Full edit UI used from history; needs `KnockHistoryItem` (ask before using on map)
- `src/components/admin/admin-map-canvas.tsx` -- Reference: `buildPopupHtml` + Mapbox Popup for outcome/time/address
- `src/lib/validators/knocks.ts` -- `KnockPin` / `PendingKnockPin` shapes on GeoJSON features
- `src/features/knocks/format-knock-date.ts` -- Shared date/address formatting helpers
- `src/lib/geo/door-outcome-colors.ts` -- Outcome labels/colors for display
- `apps/mobile/src/components/knock-map.tsx` -- Mobile `handlePinPress` currently forwards to `onMapPress` (create)
- `apps/mobile/app/(tabs)/map/index.tsx` -- Map tab; only `onMapPress` → `openDraft`

## Tasks & Acceptance

**Execution:**
- [x] `src/components/rep/map-canvas.tsx` -- Change `onPinClick` to pass parsed `KnockPin` (or pending pin) from feature properties, not coords only -- so shells can show the right knock
- [x] `src/app/(rep)/rep/map/rep-map-shift-shell.tsx` (+ small detail sheet/component under `src/components/rep/` if needed) -- On pin click open detail UI with outcome + time; keep map/FAB create path unchanged; optional knock-again closes detail and opens create draft
- [x] `apps/mobile/src/components/knock-map.tsx` -- Add dedicated pin-press callback with pin properties; stop routing pin presses through create `onMapPress`
- [x] `apps/mobile/app/(tabs)/map/index.tsx` (+ small mobile detail UI if needed) -- Show knock detail on pin press; empty-map press still creates
- [x] Unit/logic coverage for pin property parsing / handler split where existing test patterns allow; otherwise manual matrix above

**Acceptance Criteria:**
- Given a synced knock pin on the rep web map, when the rep taps the colored dot, then a detail view shows that knock’s outcome and knock time (not the blank create form alone).
- Given the same on mobile map, when the rep taps a knock pin, then the same detail behavior occurs.
- Given a tap on empty map (no pin), when the tap lands, then create knock still opens as today.
- Given admin map, when a pin is clicked, then the existing detail popup still works.
- Given a pending/offline pin, when tapped, then the UI does not crash and still shows outcome if present.

## Spec Change Log

## Design Notes

Pin GeoJSON already carries `id`, `outcome`, `knocked_at` (and `pending` for optimistic pins). Admin already builds HTML from richer `AdminKnockPin` fields — mirror that content density on rep/mobile with a sheet/card suited to touch, not necessarily a Mapbox HTML popup.

Preferred interaction split:
1. Pin → detail
2. Empty map / FAB → create
3. Detail → optional “Knock again here” → create at same coords

Do not reuse create sheet as the primary pin UX.

## Verification

**Commands:**
- `npx tsc --noEmit -p tsconfig.json` (or project’s usual typecheck for web) -- expected: no new errors in touched files
- Mobile typecheck if available for `apps/mobile` -- expected: pass for touched files

**Manual checks:**
- Rep web `/rep/map`: log a knock → tap its dot → see outcome + time; tap empty map → create sheet
- Mobile map tab: same pin vs empty-map split
- Admin `/admin/map`: pin popup still opens with details

## Suggested Review Order

**Pin → detail (web)**

- Entry: pin click opens detail state instead of create draft
  [`rep-map-shift-shell.tsx:141`](../../src/app/(rep)/rep/map/rep-map-shift-shell.tsx#L141)

- Map passes full pin props from GeoJSON, not coords only
  [`map-canvas.tsx:60`](../../src/components/rep/map-canvas.tsx#L60)

- Detail sheet shows outcome, time, pending; Escape closes; knock-again optional
  [`knock-pin-detail-sheet.tsx:24`](../../src/components/rep/knock-pin-detail-sheet.tsx#L24)

**Pin → detail (mobile)**

- ShapeSource pin press no longer routes through create `onMapPress`
  [`knock-map.tsx:159`](../../apps/mobile/src/components/knock-map.tsx#L159)

- Map tab wires pin → detail sheet; empty map still creates
  [`index.tsx:135`](../../apps/mobile/app/(tabs)/map/index.tsx#L135)

- Mobile detail sheet mirrors web outcome/time/pending + knock-again
  [`knock-pin-detail-sheet.tsx:23`](../../apps/mobile/src/components/knock-pin-detail-sheet.tsx#L23)

**Types**

- Shared selected-pin type used by web map callback
  [`knocks.ts:54`](../../src/lib/validators/knocks.ts#L54)

- Mobile selected-pin type lives with knock domain types
  [`types.ts:11`](../../apps/mobile/src/features/knocks/types.ts#L11)
