---
story: M6.3
epic: 6
title: Pipeline Stage Updates
status: done
date: 2026-06-26
---

# Story M6.3: Pipeline Stage Updates

Status: **done**

## File List

- `src/components/stage-picker-modal.tsx` — stage list + lost reason flow
- `src/features/pipeline/api.ts` — `PATCH /api/v1/leads/[id]/stage`
- `app/(tabs)/pipeline/index.tsx` — stage change from list
- `app/(tabs)/pipeline/[leadId].tsx` — stage change from detail

## Notes

- Moving to Lost requires lost reason enum selection before PATCH.
- Optimistic update via TanStack Query `onMutate`.
