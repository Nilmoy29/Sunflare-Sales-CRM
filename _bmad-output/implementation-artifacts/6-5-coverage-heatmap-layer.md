---
baseline_commit: 161aab2
---

# Story 6.5: Coverage Heatmap Layer

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an **admin**,
I want a heatmap of knock density,
so that I see over- and under-worked areas.

## Acceptance Criteria

1. **Given** knock data exists for the current admin map viewport and filters  
   **When** I enable the heatmap toggle on `/admin/map`  
   **Then** a density heatmap renders over the map (FR22)  
   **And** it uses the **same filtered knock points** as the pin layer (rep, date range, outcome, bbox)  
   **And** the heatmap layer sits **below** knock pin/cluster layers (pins remain visible and clickable)  
   **And** missing Mapbox token shows the existing setup message pattern (`docs/SETUP_KEYS.md`)

2. **Given** the heatmap is enabled  
   **When** I adjust the opacity control  
   **Then** heatmap intensity updates live (FR22 — variable alpha opacity)  
   **And** opacity range is bounded (e.g. 0.2–0.9) with a sensible default (~0.6)

3. **Given** the heatmap is disabled  
   **When** I view the admin map  
   **Then** the map behaves as before (pins, filters, breadcrumbs, popups) with no heatmap layer visible  
   **And** disabling does not clear or refetch pin data

4. **Given** performance (NFR1)  
   **When** the heatmap is enabled in a typical suburb viewport  
   **Then** map interaction remains smooth using the existing ≤500-pin bbox fetch (no second API call, no global knock load)  
   **And** pan/zoom debounce behavior is unchanged

5. **Given** scope boundaries  
   **When** implementation is complete  
   **Then** heatmap exists **only** on admin map (`/admin/map`) — not rep map, not `/admin/territories`  
   **And** `GET /api/v1/admin/knocks` and rep knock routes are unchanged  
   **And** there is no PostGIS grid aggregation RPC or materialized view (deferred Phase 3 per architecture.md)  
   **And** `npm run build` and `npm run lint` pass

**Implements:** FR22  
**NFRs:** NFR1 (reuse bbox-limited pin data; no extra global fetch)

## Tasks / Subtasks

- [x] **Admin map controls** (AC: 1, 2, 3)
  - [x] Extend `src/components/admin/admin-map-shell.tsx`:
    - Add **Coverage heatmap** section below Outcome filters (or after date filters)
    - Toggle checkbox: `heatmapEnabled` (default `false`)
    - Opacity slider: `heatmapOpacity` (default `0.6`, min `0.2`, max `0.9`, step `0.05`)
    - Pass `heatmapEnabled` and `heatmapOpacity` to `AdminMapCanvas`
    - Toggle does not bump `refreshKey` — visual layer only; pins refetch unchanged

- [x] **Mapbox heatmap layer** (AC: 1, 2, 4)
  - [x] Extend `src/components/admin/admin-map-canvas.tsx`:
    - New constants: `HEATMAP_SOURCE_ID = "admin-knocks-heatmap"`, `HEATMAP_LAYER_ID = "admin-knocks-heatmap-layer"`
    - Add **non-clustered** GeoJSON source for heatmap (separate from clustered `admin-knocks` source)
    - Add `type: "heatmap"` layer inserted **after** breadcrumb layers, **before** knock cluster layers
    - `syncHeatmapToMap(knocks)` — reuse `adminKnocksToFeatureCollection` (same point features as pins)
    - `heatmap-opacity` bound to `heatmapOpacity` prop via `map.setPaintProperty`
    - `layout.visibility`: `'visible'` when enabled, `'none'` when disabled
    - Suggested paint (tune for readability over `DEFAULT_MAP_STYLE`):
      - `heatmap-weight`: 1 (uniform per knock)
      - `heatmap-intensity`: zoom-interpolated (e.g. 1 at z9 → 3 at z15)
      - `heatmap-radius`: zoom-interpolated (e.g. 15 at z9 → 25 at z15)
      - `heatmap-color`: standard blue→red density ramp (Mapbox example expression)
    - Do **not** add heatmap layers to `INTERACTIVE_LAYERS` — map clicks still target pins only

- [x] **State wiring** (AC: 1, 3, 4)
  - [x] `AdminMapCanvas` new props: `heatmapEnabled: boolean`, `heatmapOpacity: number`
  - [x] `useEffect` to sync knock data to heatmap source when `knocks` changes (same timing as `syncKnocksToMap`)
  - [x] `useEffect` to update visibility + opacity when toggle/opacity props change
  - [x] Heatmap hidden when `heatmapEnabled` false even if knock data present

- [x] **Verify** (AC: 4, 5)
  - [x] Manual: Enable heatmap with today's knocks → density visible; disable → pins only
  - [x] Manual: Opacity slider changes heatmap intensity live
  - [x] Manual: Rep/date/outcome filters narrow both pins and heatmap together
  - [x] Manual: Pin popup still works with heatmap enabled; breadcrumbs unchanged
  - [x] Manual: Rep `/rep/map` unchanged (no heatmap)
  - [x] `npm run build` && `npm run lint`
  - [x] No new migration required — confirm before closing story

### Review Findings

- [x] [Review][Defer] Heatmap GeoJSON syncs even when layer hidden [`admin-map-canvas.tsx:509-510`] — deferred — acceptable v1; ≤500 points; skip-when-disabled optimization optional.
- [x] [Review][Defer] Duplicate `adminKnocksToFeatureCollection` build per knock update (pins + heatmap sources) [`admin-map-canvas.tsx:225-243`] — deferred — micro-optimization; negligible at NFR1 scale.
- [x] [Review][Defer] Stale heatmap data during filter/bbox refetch — same deferred pattern as Story 3.1 pin layer [`use-admin-map-knocks.ts`] — deferred — acceptable v1.
- [x] [Review][Defer] Heatmap density limited to truncated 500-pin viewport sample — deferred — documented in story; Phase 3 grid aggregation out of scope.
- [x] [Review][Defer] Heatmap layer renders above breadcrumb route lines (per story layer stack) [`admin-map-canvas.tsx:327-378`] — deferred — route may be partially obscured when both enabled; pins remain above heatmap per AC1.
- [x] [Review][Defer] Default opacity `0.6` duplicated in shell constant, canvas prop default, and map init paint [`admin-map-shell.tsx:33`, `admin-map-canvas.tsx:201,356`] — deferred — cosmetic; `setPaintProperty` corrects on first `mapLoaded` effect.

## Dev Notes

### Critical constraints

- **Do NOT** add a new API route or PostGIS aggregation RPC — v1 heatmap uses existing `useAdminMapKnocks` data (≤500 points per viewport). Architecture.md Phase 3 grid/materialized view is **out of scope**.
- **Do NOT** fetch knocks globally without bbox — same NFR1 anti-pattern as Story 3.1.
- **Do NOT** add heatmap to rep `MapCanvas` or `/rep/map`.
- **Do NOT** modify `AdminMapCanvas` knock clustering, popup, or breadcrumb logic beyond layer insert + new source sync.
- **Do NOT** modify `/admin/territories`, `TerritoryDrawTool`, or territory APIs — Epic 6 territory work is complete.
- **Do NOT** install Turf, deck.gl, or new map libraries — Mapbox GL JS native `heatmap` layer only (`mapbox-gl` ^3.12 already installed).
- **Do NOT** install TanStack Query — local React state in shell for toggle/opacity.
- **Do NOT** add territory polygon overlay to admin map — Story 6.4 was rep-scoped only.

### Why a separate GeoJSON source (not clustered `admin-knocks`)

The pin source uses `cluster: true`. Heatmap density needs **raw point features** at all zoom levels. A dedicated `admin-knocks-heatmap` source (no clustering) synced from the same `AdminKnockPin[]` avoids cluster-aggregated points skewing density at low zoom.

### Layer stack (admin map after this story)

```
admin-breadcrumbs-line / admin-breadcrumbs-point
admin-knocks-heatmap-layer     ← NEW (visibility toggle)
admin-knocks-clusters
admin-knocks-cluster-count
admin-knocks-unclustered
```

### Mapbox heatmap layer reference (mapbox-gl ^3.12)

Insert in `map.on("load")` after breadcrumb layers, before `KNOCKS_SOURCE_ID` layers:

```typescript
map.addSource(HEATMAP_SOURCE_ID, {
  type: "geojson",
  data: emptyFeatureCollection(),
});

map.addLayer({
  id: HEATMAP_LAYER_ID,
  type: "heatmap",
  source: HEATMAP_SOURCE_ID,
  paint: {
    "heatmap-weight": 1,
    "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 9, 1, 15, 3],
    "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 9, 15, 15, 25],
    "heatmap-opacity": heatmapOpacity, // updated via setPaintProperty
    "heatmap-color": [
      "interpolate", ["linear"], ["heatmap-density"],
      0, "rgba(33,102,172,0)",
      0.2, "rgb(103,169,207)",
      0.4, "rgb(209,229,240)",
      0.6, "rgb(253,219,199)",
      0.8, "rgb(239,138,98)",
      1, "rgb(178,24,43)",
    ],
  },
  layout: {
    visibility: heatmapEnabled ? "visible" : "none",
  },
});
```

Update opacity without remounting map:

```typescript
map.setPaintProperty(HEATMAP_LAYER_ID, "heatmap-opacity", heatmapOpacity);
map.setLayoutProperty(HEATMAP_LAYER_ID, "visibility", enabled ? "visible" : "none");
```

### Files to modify (no new files required unless splitting helpers)

| File | Change |
|------|--------|
| `src/components/admin/admin-map-shell.tsx` | Toggle + opacity slider; pass props |
| `src/components/admin/admin-map-canvas.tsx` | Heatmap source/layer, sync, paint updates |

**No changes expected:** `use-admin-map-knocks.ts`, `GET /api/v1/admin/knocks`, rep map, territory features.

### Story 6.1–6.4 foundation (context only)

| Story | Relevance to 6.5 |
|-------|------------------|
| 6.1 | Knock `lat`/`lng` on `door_knocks` — heatmap input data |
| 6.2–6.3 | Territory admin UI — orthogonal; do not touch |
| 6.4 | Rep territory overlay — orthogonal; do not touch |

Heatmap shows **knock density**, not territory boundaries. Territory GiST index (6.1) is indirect — no spatial join needed for v1 point heatmap.

### Epic 3 admin map foundation (must reuse)

| Asset | Location | 6.5 use |
|-------|----------|---------|
| Admin map shell | `admin-map-shell.tsx` | Add heatmap controls |
| Admin map canvas | `admin-map-canvas.tsx` | Add heatmap layer |
| Knock fetch hook | `use-admin-map-knocks.ts` | **Reuse as-is** — same `knocks` array feeds heatmap |
| Admin knocks API | `GET /api/v1/admin/knocks` | Unchanged |
| Breadcrumb overlay | Story 3.5 in canvas | Preserve layer order below heatmap |
| Filter state | `AdminMapFilters` | Heatmap respects active filters automatically |

### Distinction from architecture Phase 3 heatmap

| | v1 (this story) | Phase 3 (deferred) |
| :--- | :--- | :--- |
| Data | Viewport pins (≤500) | PostGIS grid / materialized view |
| API | None new | Aggregated bbox endpoint |
| Use case | Manager spot-check coverage in view | City-wide density at all zoom levels |

If viewport has 500+ knocks (truncated), heatmap reflects the 500 most recent pins in bbox — same truncation semantics as pins (show existing truncated banner; no new warning required).

### UX placement (admin sidebar)

Add after **Outcome** section:

```
Coverage heatmap
[ ] Show knock density
Opacity: [====●-----] 60%
```

Use existing sidebar typography (`text-sm font-medium`, `min-h-10` controls). Slider: native `<input type="range">` with `aria-valuenow` / `aria-label`.

### Learnings from Epic 6 code reviews (apply proactively)

- Avoid `setState` synchronously in effects for derived UI state — pass props and use `setPaintProperty` / `setLayoutProperty` on the map instance instead.
- Layer ordering matters — insert heatmap before pin layers in `map.on("load")`.
- Do not add heatmap to `INTERACTIVE_LAYERS` — preserves pin click/popup behavior from Story 3.1.
- Stale data while refetching is acceptable v1 (deferred in 3.1 review) — heatmap follows same knock array; no extra gating needed.

### Testing requirements

- **No new Playwright/e2e tests** unless requested — manual QA checklist in Dev Agent Record.
- **Manual QA prerequisites:** Multiple knocks logged across a suburb (Epic 2 data); admin access to `/admin/map`.
- **Manual QA:**
  - Toggle on → heatmap visible; toggle off → gone
  - Opacity slider adjusts density fade
  - Filter by rep/date/outcome → heatmap and pins both narrow
  - Pin click popup still works with heatmap on
  - Breadcrumb route overlay still works (single rep + single day)
  - Rep map has no heatmap controls
- **Regression:** admin knock filters, breadcrumbs (3.5), territories UI (6.2–6.3), rep map overlay (6.4).

### References

- [Source: docs/Solar_CRM_PRD_v1.md#module-3--territory-management] — Coverage Heatmaps (FR22)
- [Source: _bmad-output/planning-artifacts/epics.md#story-65] — AC summary
- [Source: _bmad-output/planning-artifacts/architecture.md#spatial-query-patterns] — bbox pins NFR1; Phase 3 grid deferred
- [Source: _bmad-output/implementation-artifacts/3-1-admin-global-map-with-filters.md] — admin map, filters, layer IDs, deferred heatmap toggle
- [Source: _bmad-output/implementation-artifacts/3-5-shift-gps-breadcrumbs-on-admin-map.md] — breadcrumb layers in canvas
- [Source: _bmad-output/implementation-artifacts/6-4-show-assigned-territory-on-rep-map.md] — rep overlay scope boundary (admin map unchanged)
- [Source: src/components/admin/admin-map-canvas.tsx] — current layer stack and knock sync
- [Source: src/components/admin/admin-map-shell.tsx] — filter sidebar layout
- [Source: Mapbox GL JS heatmap layer example](https://docs.mapbox.com/mapbox-gl-js/example/heatmap-layer/) — native heatmap paint properties

## Dev Agent Record

### Agent Model Used

Composer

### Debug Log References

- No migration required — heatmap uses existing `useAdminMapKnocks` bbox data.
- `npm run lint` and `npm run build` pass (0 errors).
- Map init uses default heatmap visibility/opacity; `setPaintProperty` / `setLayoutProperty` apply toggle/slider without remounting map.

### Completion Notes List

- Added Coverage heatmap section to admin map sidebar: toggle (default off) + opacity slider (0.2–0.9, default 0.6).
- Added separate non-clustered `admin-knocks-heatmap` GeoJSON source and Mapbox `heatmap` layer below pin clusters.
- Heatmap syncs from same `AdminKnockPin[]` as pins; filters/bbox/truncation semantics unchanged.
- Toggle does not bump `refreshKey` — visual-only layer control.

### File List

- `src/components/admin/admin-map-shell.tsx` (modified)
- `src/components/admin/admin-map-canvas.tsx` (modified)

## Change Log

- 2026-06-07: Story 6.5 created — admin map knock density heatmap toggle with configurable opacity; client-side Mapbox layer reusing existing bbox pin data.
- 2026-06-07: Story 6.5 implemented — admin map heatmap toggle + opacity slider, Mapbox heatmap layer below pins, build/lint pass.
- 2026-06-07: Code review — clean; 6 deferrals logged, 0 patches.
