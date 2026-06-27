---
story: M7.4
epic: 7
title: Promote Call to Lead
status: done
date: 2026-06-26
---

# Story M7.4: Promote Call to Lead

Status: **done**

## File List

- `app/(tabs)/calls/index.tsx` — promote button + pipeline link
- `src/features/calls/api.ts` — `POST /api/v1/calls/[id]/promote`
- `src/features/calls/labels.ts` — `isPromotableCallOutcome` (matches web: `answered_interested`)

## Notes

- Shown after logging a promotable outcome; invalidates pipeline query cache on success.
- Lead source is `call` (Cold Call channel) per server `promote_call_to_lead` RPC.
