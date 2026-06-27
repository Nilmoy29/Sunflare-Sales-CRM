---
story: M4.2
epic: 4
title: Background GPS Pings (~120s)
status: done
date: 2026-06-26
---

# Story M4.2: Background GPS Pings

Status: **done**

## File List

- `src/tasks/gps-background-task.ts` — `TaskManager.defineTask` for `SUNFLARE_GPS_PINGS`
- `src/features/shifts/shift-gps-tracking.ts` — start/stop `Location.startLocationUpdatesAsync`
- `src/features/shifts/gps-ping-worker.ts` — `recordGpsSample` → `POST /api/v1/gps/pings`
- `src/features/shifts/types.ts` — `GPS_PING_INTERVAL_MS = 120_000`, task name constant
- `app/_layout.tsx` — side-effect import registers background task
- `app.config.ts` — `expo-location` plugin with Android foreground service + background location

## Notes

- Android foreground service notification shown while shift is active.
- `active_shift_id` stored in SQLite `app_meta` so background task knows which shift to ping.
- On app launch, resumes GPS tracking if an open shift is returned from `/api/v1/shifts/current`.
