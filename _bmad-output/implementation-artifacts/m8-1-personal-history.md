---
story: M8.1
epic: 8
title: Personal Knock and Call History
status: done
date: 2026-06-26
---

# Story M8.1: Personal Knock and Call History

Status: **done**

## File List

- `app/(tabs)/history/index.tsx` — History tab with Knocks/Calls segments
- `src/features/history/api.ts` — `GET /api/v1/knocks/mine`, `GET /api/v1/calls/mine`
- `src/features/history/use-knock-history.ts` — filters, pagination, pending merge
- `src/features/history/use-call-history.ts` — filters, pagination
- `src/features/history/date-range.ts` — Sydney date range helpers
- `src/features/history/format.ts` — row labels and address formatting
- `src/components/history-filters.tsx` — date range + outcome chips
- `src/components/knock-history-row.tsx` — knock/pending row
- `src/components/call-history-row.tsx` — call row
- `src/app/api/v1/calls/mine/route.ts` — rep-scoped call history API (web)
- `src/features/calls/get-my-calls.ts` — call history query
- `src/lib/validators/call-logs.ts` — call history schemas

## Notes

- Pending unsynced knocks from SQLite appear at top with “Pending sync” badge.
- Default date range: last 7 days (Sydney), matching web knock history.
- Outcome filters mirror web semantics (all outcomes vs selected chips).
