---
story: M5.4
epic: 5
title: Door Outcome Form and Submit
status: done
date: 2026-06-26
---

# Story M5.4: Door Outcome Form and Submit

Status: **done**

## File List

- `src/components/door-outcome-sheet.tsx` — all nine outcomes, notes, follow-up
- `src/features/knocks/submit-knock.ts` — online/offline submit path
- `packages/shared/src/knock-sync.ts` — payload schema (shared)

## Notes

- Outcome buttons use `accessibilityLabel` per outcome (TalkBack).
- Interested and Callback Requested show pipeline promotion hint.
