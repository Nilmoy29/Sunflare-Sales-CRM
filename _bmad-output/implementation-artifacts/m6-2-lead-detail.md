---
story: M6.2
epic: 6
title: Lead Detail and Activity Stream
status: done
date: 2026-06-26
---

# Story M6.2: Lead Detail and Activity Stream

Status: **done**

## File List

- `app/(tabs)/pipeline/[leadId].tsx` — lead detail screen
- `src/components/lead-detail-timeline.tsx` — header + activity cards
- `src/features/pipeline/api.ts` — `GET /api/v1/leads/[id]`
- `src/components/lead-note-form.tsx` — add notes from detail

## Notes

- Route `/(tabs)/pipeline/[leadId]` supports Expo deep links at `sunflare://pipeline/{leadId}` (Epic 8 push).
- Timeline renders knocks, calls, notes, stage changes, and follow-ups.
