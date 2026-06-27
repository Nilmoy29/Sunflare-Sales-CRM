---
story: M5.3
epic: 5
title: Tap to Log and Reverse Geocode
status: done
date: 2026-06-26
---

# Story M5.3: Tap to Log and Reverse Geocode

Status: **done**

## File List

- `src/components/knock-map.tsx` — map tap + pin tap opens draft
- `src/components/log-knock-fab.tsx` — “Log here” at GPS
- `src/components/door-outcome-sheet.tsx` — reverse geocode on open
- `src/features/knocks/api.ts` — `fetchReverseGeocode`

## Notes

- Address fields editable after geocode; manual entry fallback when geocoder unavailable.
