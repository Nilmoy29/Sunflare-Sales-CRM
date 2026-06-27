---
story: M5.1
epic: 5
title: Rep Map with Live Location and Historic Pins
status: done
date: 2026-06-26
---

# Story M5.1: Rep Map with Live Location and Historic Pins

Status: **done**

## File List

- `src/components/knock-map.tsx` — Mapbox map, user location, clustered knock pins
- `src/features/knocks/use-map-knocks.ts` — bbox fetch hook
- `src/features/knocks/api.ts` — `fetchKnocksInBbox`
- `src/lib/geo/door-outcome-colors.ts` — pin colors by outcome
- `src/lib/geo/map-geojson.ts` — knock GeoJSON helpers
- `app/(tabs)/map/index.tsx` — active-shift map shell

## Notes

- Pins load on viewport change (debounced) via `GET /api/v1/knocks?bbox=` with `clampMapBbox` from `@sunflare/shared`.
- Pending offline knocks merged into the same ShapeSource layer.
