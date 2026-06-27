---
story: M4.1
epic: 4
title: Start/End Shift on Map
status: done
date: 2026-06-26
---

# Story M4.1: Start/End Shift on Map

Status: **done**

## File List

- `app/(tabs)/map/index.tsx` — Map tab with shift controls and end-shift confirm dialog
- `src/components/shift-controls.tsx` — Start/End UI overlay
- `src/features/shifts/api.ts` — `fetchCurrentShift`, `startShift`, `endShift`
- `src/features/shifts/types.ts` — shift summary types
- `src/features/shifts/use-active-shift.ts` — shift state hook
- `src/lib/location/permissions.ts` — foreground + background permission flow

## Notes

- End shift uses native `Alert` confirmation before calling `POST /api/v1/shifts/end`.
- Shift summary banner shown after end (doors, calls, leads).
- Permission denial surfaces inline message with link to system Settings.
