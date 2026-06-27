---
story: M4.3
epic: 4
title: Offline GPS Ping Queue
status: done
date: 2026-06-26
---

# Story M4.3: Offline GPS Ping Queue

Status: **done**

## File List

- `src/lib/sqlite/database.ts` — `pending_gps_pings` + `app_meta` tables; `clearLocalUserData`
- `src/lib/sqlite/pending-gps-pings.ts` — enqueue, list, remove, clear by shift
- `src/features/shifts/gps-ping-worker.ts` — queue on POST failure; `flushPendingGpsPings`
- `src/features/shifts/use-active-shift.ts` — NetInfo listener flushes queue on reconnect
- `src/lib/local-user-data.ts` — re-exports `clearLocalUserData` for logout (M3.4)

## Notes

- Failed pings enqueued in SQLite; flushed FIFO when online.
- Pending pings for a shift discarded on shift end (`clearPendingGpsPingsForShift`).
- Requires dev client build (not Expo Go) for background location + SQLite.
