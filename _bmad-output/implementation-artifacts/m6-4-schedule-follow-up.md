---
story: M6.4
epic: 6
title: Schedule Follow-Up on Lead
status: done
date: 2026-06-26
---

# Story M6.4: Schedule Follow-Up on Lead

Status: **done**

## File List

- `src/components/lead-follow-up-form.tsx` — native `DateTimePicker` + note
- `src/features/pipeline/api.ts` — `POST /api/v1/leads/[id]/follow-ups`
- `app.config.ts` — `@react-native-community/datetimepicker` plugin

## Notes

- Due date/time uses platform datetime picker with 44dp touch targets.
- Follow-up stored via same API as web; eligible for push dispatch in Epic 8.
