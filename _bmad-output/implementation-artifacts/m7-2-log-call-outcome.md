---
story: M7.2
epic: 7
title: Log Call with Outcome
status: done
date: 2026-06-26
---

# Story M7.2: Log Call with Outcome

Status: **done**

## File List

- `src/components/call-log-form.tsx` — six outcomes, duration, notes, follow-up
- `src/features/calls/api.ts` — `POST /api/v1/calls`
- `src/features/calls/labels.ts` — `CALL_OUTCOMES`, outcome button colors
- `src/components/contact-call-history-list.tsx` — per-contact history

## Notes

- Payload matches web `createCallBodySchema` (snake_case, duration in minutes).
- Daily call count shown at top via `GET /api/v1/calls/daily-count`.
