---
story: M5.8
epic: 5
title: Promote Interested Door to Lead
status: done
date: 2026-06-26
---

# Story M5.8: Promote Interested Door to Lead

Status: **done**

## File List

- `src/features/knocks/submit-knock.ts` — `isPromotableDoorOutcome` (interested + callback_requested)
- `src/features/knocks/api.ts` — create/sync responses include optional `lead`
- `app/(tabs)/map/index.tsx` — save notice for pipeline promotion

## Notes

- Lead creation handled server-side via `create_knock_with_contact` RPC (same as web).
- Offline promotable knocks show “Will add to pipeline when synced” notice.
