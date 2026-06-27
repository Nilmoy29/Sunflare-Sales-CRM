---
story: M5.7
epic: 5
title: Duplicate Knock Warning
status: done
date: 2026-06-26
---

# Story M5.7: Duplicate Knock Warning

Status: **done**

## File List

- `src/features/knocks/use-prior-knocks.ts` — `GET /api/v1/knocks/near`
- `src/components/door-outcome-sheet.tsx` — duplicate alert + prior knocks list

## Notes

- Warning is informational; rep can still submit (PRD v1 decision #5).
- Prior knocks hidden when offline.
