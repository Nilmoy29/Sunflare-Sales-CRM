---
story: M5.6
epic: 5
title: Knock Sync Loop
status: done
date: 2026-06-26
---

# Story M5.6: Knock Sync Loop

Status: **done**

## File List

- `src/features/knocks/use-knock-sync-loop.ts` — 10s poll + NetInfo reconnect
- `src/features/knocks/api.ts` — `syncPendingKnocks` → `POST /api/v1/knocks/sync`
- `app/(tabs)/map/index.tsx` — wires sync when shift active

## Notes

- Batches ≤ `SYNC_KNOCKS_MAX_BATCH` (50); `NO_ACTIVE_SHIFT` surfaces banner message.
- Successful sync removes rows and refreshes map pins.
