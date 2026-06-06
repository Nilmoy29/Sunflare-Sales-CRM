---
baseline_commit: NO_VCS
---

# Story 2.4: Tap to Log a Door Knock

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **rep**,
I want to tap the map to open the knock form,
so that logging a door is fast at the doorstep.

## Acceptance Criteria

1. **Given** an active shift and Mapbox map is visible  
   **When** I tap empty map canvas (not on an existing knock pin, cluster, or my location marker)  
   **Then** the door outcome sheet opens (FR9, UX-DR4)  
   **And** the tap coordinates are captured as `lat` / `lng` for the pending knock (FR9)  
   **And** coordinates display in the sheet (e.g. 6 decimal places)

2. **Given** an active shift and my live GPS position is known  
   **When** I tap the **Log knock** quick-add control (prominent floating affordance near map controls)  
   **Then** the door outcome sheet opens with coordinates set to my current GPS position (FR9)  
   **And** if GPS is unavailable, the control is disabled and shows why (consistent with map geo warnings)

3. **Given** the door outcome sheet is open  
   **When** I inspect the UI  
   **Then** it is a mobile bottom sheet (`role="dialog"`, `aria-modal`) with a close/dismiss action (44×44px min, NFR6, UX-DR2)  
   **And** it shows captured coordinates and placeholder copy for address (“Address auto-fill in Story 2.6”)  
   **And** it does **not** persist a knock to the database (Story 2.5)  
   **And** it does **not** include working outcome selection or notes submit (Story 2.5 wires six outcomes + POST)

4. **Given** no active shift  
   **When** I am on `/rep/map`  
   **Then** map tap and quick-add are unavailable (map not mounted — same as Story 2.3)

5. **Given** implementation is complete  
   **When** `npm run build` and `npm run lint` run  
   **Then** they pass  
   **And** no `POST /api/v1/knocks`, offline queue, reverse geocoding, or lead promotion is added (Stories 2.5–2.7, 2.9)

**Implements:** FR9, UX-DR4 (partial — full micro-flow in 2.5)  
**NFRs:** NFR6 (44×44px controls)

## Tasks / Subtasks

- [x] **Knock draft model** (AC: 1, 2)
  - [x] Extend `src/lib/validators/knocks.ts` — `knockDraftSchema` with `lat`, `lng`, `source: "map_tap" | "gps_quick_add"`
  - [x] Export `KnockDraft` type

- [x] **Draft state hook** (AC: 1, 2, 3)
  - [x] Create `src/features/knocks/use-knock-draft.ts` — `draft`, `openDraft(draft)`, `closeDraft()`, `isOpen`

- [x] **Door outcome sheet shell** (AC: 1, 2, 3)
  - [x] Create `src/components/rep/door-outcome-sheet.tsx` — bottom sheet UI; display lat/lng; close button; placeholder for outcomes/notes
  - [x] Use `DOOR_OUTCOME_COLORS` / labels only for visual preview if desired — buttons **disabled** or omitted (Story 2.5 enables selection)
  - [x] Backdrop click + Close dismisses sheet

- [x] **Map tap handler** (AC: 1)
  - [x] Update `src/components/rep/map-canvas.tsx` — add `onMapClick?: (coords: { lat: number; lng: number }) => void`
  - [x] On `map.on("click")`, `queryRenderedFeatures` for knock cluster, unclustered, and user-location layers — ignore hits on those layers
  - [x] Call `onMapClick` with `e.lngLat` for bare-map taps only

- [x] **Log knock quick-add** (AC: 2, UX-DR4)
  - [x] Create `src/components/rep/log-knock-button.tsx` — floating FAB-style control, min 44×44px, disabled without `userLocation`
  - [x] Place in `rep-map-shift-shell.tsx` (e.g. fixed bottom-left stack: Recenter above, Log knock below — avoid overlapping Shift controls on right)

- [x] **Wire rep map shell** (AC: 1–4)
  - [x] Update `src/app/(rep)/rep/map/rep-map-shift-shell.tsx` — `useKnockDraft`, pass `onMapClick` to `MapCanvas`, render `DoorOutcomeSheet` + `LogKnockButton` when `isActive`
  - [x] Pass `userLocation` from `MapCanvas` to shell for quick-add (lift state or callback `onUserLocationChange`) — **prefer lifting** `userLocation` to shell so quick-add and sheet share GPS without duplicating `watchPosition`

- [x] **Verify** (AC: 5)
  - [x] Manual: active shift → tap map → sheet opens with tap coords
  - [x] Manual: Log knock → sheet opens with GPS coords
  - [x] Manual: tap cluster/pin → sheet does **not** open
  - [x] `npm run build` && `npm run lint`

### Review Findings

- [x] [Review][Patch] Disabled Log knock reason hidden on mobile [`src/components/rep/log-knock-button.tsx:19`] — Fixed: visible amber hint below button + `aria-describedby` when disabled.

- [x] [Review][Patch] Map click handler runs before layers load [`src/components/rep/map-canvas.tsx:245-256`] — Fixed: click handler registered inside `map.on("load")` after layers exist.

- [x] [Review][Patch] Knock draft survives shift end [`src/app/(rep)/rep/map/rep-map-shift-shell.tsx`] — Fixed: `useEffect` calls `closeDraft()` when `!isActive`.

- [x] [Review][Defer] Two geolocation consumers while on shift [`use-rep-location.ts`, `use-gps-ping-loop.ts`] — `watchPosition` (map/quick-add) plus interval `getCurrentPosition` (GPS pings) is acceptable for v1; consolidating is a future optimization, not a 2.4 regression.

- [x] [Review][Dismiss] `openDraft` skips runtime Zod parse [`use-knock-draft.ts`] — coords originate from Mapbox/GPS APIs; schema validation belongs at 2.5 submit boundary.

## Dev Notes

### Critical constraints

- **Do NOT** implement `POST /api/v1/knocks` or contact creation — Story 2.5.
- **Do NOT** add notes, follow-up date fields with validation, or outcome submit — Story 2.5.
- **Do NOT** reverse geocode — Story 2.6.
- **Do NOT** add Dexie / offline queue — Story 2.7.
- **Do NOT** add re-knock warnings on pin tap — Story 2.10.
- **Do NOT** install shadcn/ui or React Hook Form for this story — use Tailwind bottom sheet (no `src/components/ui/` yet).
- **Do NOT** duplicate `watchPosition` — lift GPS from `MapCanvas` to shell **or** expose `userLocation` via callback prop once.

### Scope boundary: 2.4 vs 2.5

| Story | Delivers |
| :--- | :--- |
| **2.4 (this)** | Open sheet + capture coordinates (map tap or GPS quick-add) + dismissible shell UI |
| **2.5** | Six outcome buttons (enabled), notes, follow-up, `POST /api/v1/knocks`, pin refresh on map |
| **2.6** | Reverse geocode → address on contact |
| **2.7** | Offline queue + optimistic pins |

FR9 is satisfied in 2.4 by **opening the sheet with coordinates**. FR10/FR11 complete in 2.5.

### Active shift gate

Same as Stories 2.2–2.3: only wire tap/quick-add/sheet when `useActiveShift().isActive === true`. Map and GPS loop already gated in `rep-map-shift-shell.tsx`.

### Map click implementation (Mapbox GL)

```typescript
// Layers to exclude from opening sheet (constants in map-canvas.tsx):
const INTERACTIVE_LAYERS = [
  CLUSTER_LAYER_ID,
  CLUSTER_COUNT_LAYER_ID,
  UNCLUSTERED_LAYER_ID,
  USER_LAYER_ID,
];

map.on("click", (e) => {
  const hits = map.queryRenderedFeatures(e.point, { layers: INTERACTIVE_LAYERS });
  if (hits.length > 0) return;
  onMapClick?.({ lat: e.lngLat.lat, lng: e.lngLat.lng });
});
```

- Set `map.getCanvas().style.cursor = "crosshair"` on load optional — not required for AC.
- Do not use CDP `Input.*` for map; use Mapbox click handler only.

### Lift `userLocation` to shell (recommended)

**Current:** `userLocation` state lives inside `MapCanvas`.

**Change for 2.4:**
- `rep-map-shift-shell` holds `userLocation` state
- `MapCanvas` accepts `userLocation` + `onUserLocationChange` (from existing `watchPosition` effect — move watch to shell OR callback up on each fix)
- **Simplest:** move `watchPosition` effect from `MapCanvas` to `rep-map-shift-shell` (only when `isActive`), pass `userLocation` into `MapCanvas` for marker + into `LogKnockButton`

This avoids dual geolocation watchers (map marker + quick-add).

### Knock draft shape

```typescript
export const knockDraftSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  source: z.enum(["map_tap", "gps_quick_add"]),
});
```

Display: `lat.toFixed(6), lng.toFixed(6)` in sheet header.

### Door outcome sheet UI (UX-DR3 shell only)

```
┌─────────────────────────────────┐
│  Log door knock            [×]  │
│  -33.868800, 151.209300         │
│  Address auto-fill in Story 2.6 │
│                                 │
│  (Outcome buttons — Story 2.5)  │
└─────────────────────────────────┘
```

Tailwind pattern:

- Overlay: `fixed inset-0 z-20 bg-black/40`
- Sheet: `fixed inset-x-0 bottom-0 z-30 rounded-t-2xl bg-white p-4 pb-safe shadow-xl`
- Close: `min-h-11 min-w-11` icon button

### Floating controls layout (UX-DR4)

```
        [map]
[Recenter]              [Shift]
[Log knock]
```

- Recenter: existing `fixed bottom-6 left-4` in `map-canvas.tsx` — consider moving all left floats to shell in 2.4 for consistent layout, or stack Log knock at `bottom-20 left-4` to avoid overlap.
- Shift: keep `fixed bottom-6 right-4` (`shift-controls.tsx`)

### Files to modify (read before editing)

**`src/components/rep/map-canvas.tsx`**
- Today: full Mapbox init, pins, recenter, `watchPosition`, no click handler
- Add: `onMapClick` prop; feature-query guard; optionally accept `userLocation` as prop if lifted
- Preserve: clustering, bbox fetch, `clampMapBbox`, token-missing fallback

**`src/app/(rep)/rep/map/rep-map-shift-shell.tsx`**
- Today: `MapCanvas` when active, `ShiftControls`, GPS ping loop
- Add: knock draft state, sheet, log button, wire map click

### Previous story intelligence

**Story 2.3:**
- `MapCanvas` dynamic import, `mapLoaded` + pin sync pattern
- `useMapKnocks`, `GET /api/v1/knocks?bbox=`
- Review fixes: `clampMapBbox`, geo warning overlay — preserve
- Explicit note: “Will add `onMapClick` prop to `MapCanvas`”

**Story 2.2:**
- `ShiftControls` floating right — do not relocate
- `useGpsPingLoop` separate from map marker — keep ping loop in shell

**Story 2.1:**
- `door_knocks` requires `contact_id` on insert — 2.5 must create contact + knock; 2.4 has no DB writes

### Cross-story dependencies

| Story | Relationship |
| :--- | :--- |
| 2.3 | **Requires** map canvas + active shift |
| 2.5 | **Next** — enables outcome grid, POST, refresh pins |
| 2.6 | Address field in sheet |
| 2.7 | Optimistic pin on submit while offline |
| 2.10 | Tap existing pin → history/warning instead of new draft |

### Testing (this story)

- **Required:** `npm run build`, `npm run lint`
- **Manual:** Start shift → tap bare map → sheet shows tap coordinates
- **Manual:** Log knock with GPS → sheet shows current location coords
- **Manual:** Tap clustered pin → sheet stays closed
- **Manual:** Close sheet → returns to map
- **No** Playwright required unless trivial

### Project Structure Notes

New files:

```
src/lib/validators/knocks.ts          (extend knockDraftSchema)
src/features/knocks/use-knock-draft.ts
src/components/rep/door-outcome-sheet.tsx
src/components/rep/log-knock-button.tsx
```

Modify:

```
src/components/rep/map-canvas.tsx
src/app/(rep)/rep/map/rep-map-shift-shell.tsx
```

### References

- [Source: `_bmad-output/planning-artifacts/epics.md` — Story 2.4]
- [Source: `docs/Solar_CRM_PRD_v1.md` — §3.2 D2D journey, §4.2 Tap to Log]
- [Source: `_bmad-output/planning-artifacts/architecture.md` — `door-outcome-sheet.tsx`, knock data flow]
- [Source: `_bmad-output/implementation-artifacts/2-3-rep-map-with-live-location-and-historic-pins.md` — MapCanvas, onMapClick note]
- [Source: `src/components/rep/map-canvas.tsx` — integration point]
- [Source: `src/app/(rep)/rep/map/rep-map-shift-shell.tsx` — shell wiring]

## Dev Agent Record

### Agent Model Used

Composer

### Debug Log References

- Lifted `watchPosition` to `useRepLocation` in shell — single GPS watcher for map marker + Log knock button.

### Completion Notes List

- Map tap on empty canvas opens `DoorOutcomeSheet` with captured lat/lng; taps on pins/clusters/user marker are ignored via `queryRenderedFeatures`.
- **Log knock** quick-add at `bottom-20 left-4` opens sheet at current GPS; disabled shows visible amber hint when location unavailable.
- Bottom sheet shows coordinates (6 decimals), address placeholder, and Story 2.5 copy — no POST or outcome submit.
- `npm run build` and `npm run lint` pass.

### File List

- `src/lib/validators/knocks.ts` (modified — `knockDraftSchema`)
- `src/features/knocks/use-knock-draft.ts` (new)
- `src/features/gps/use-rep-location.ts` (new)
- `src/components/rep/door-outcome-sheet.tsx` (new)
- `src/components/rep/log-knock-button.tsx` (new)
- `src/components/rep/map-canvas.tsx` (modified — props, map click, lifted GPS)
- `src/app/(rep)/rep/map/rep-map-shift-shell.tsx` (modified — wiring)

## Change Log

- 2026-06-03: Story 2.4 — tap-to-log knock, outcome sheet shell, GPS quick-add.
- 2026-06-03: Code review patches — visible GPS-disabled hint, map click after load, clear draft on shift end.

### Senior Developer Review (AI)

**Outcome:** Approve (after patches)  
**Date:** 2026-06-03  
**Layers:** Blind Hunter, Edge Case Hunter, Acceptance Auditor (inline)

**Summary:** FR9 tap-to-log flow complete. Patches: mobile-visible GPS disabled hint, map click deferred until load, draft cleared on shift end.

## Story Completion Status

- **Status:** done
- **Completion note:** All ACs satisfied; code review patches applied; build and lint pass.
