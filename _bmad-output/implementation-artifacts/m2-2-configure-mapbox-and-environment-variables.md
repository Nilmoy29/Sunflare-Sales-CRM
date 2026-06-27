---
story: M2.2
epic: 2
title: Configure Mapbox and Environment Variables
status: done
date: 2026-06-26
---

# Story M2.2: Configure Mapbox and Environment Variables

Status: **done**

## File List

- `apps/mobile/app.config.ts` — Expo config + `@rnmapbox/maps` plugin
- `apps/mobile/src/lib/env.ts` — `EXPO_PUBLIC_*` accessors
- `apps/mobile/src/lib/geo/mapbox.ts` — token init, default center/style
- `apps/mobile/app/_layout.tsx` — calls `configureMapbox()` on startup
- `apps/mobile/app/(tabs)/map/index.tsx` — MapView when token present

## Note

Mapbox requires a **dev client build** (`npx expo prebuild` + `expo run:android` or EAS). Does not run in Expo Go.
