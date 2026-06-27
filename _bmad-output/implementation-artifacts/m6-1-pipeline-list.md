---
story: M6.1
epic: 6
title: Pipeline List by Stage
status: done
date: 2026-06-26
---

# Story M6.1: Pipeline List by Stage

Status: **done**

## File List

- `app/(tabs)/pipeline/index.tsx` — SectionList grouped by stage
- `app/(tabs)/pipeline/_layout.tsx` — stack navigator for list + detail
- `src/components/pipeline-lead-row.tsx` — lead card row
- `src/features/pipeline/api.ts` — `GET /api/v1/leads`
- `src/features/pipeline/use-pipeline.ts` — TanStack Query hook
- `src/features/pipeline/labels.ts` — stage labels and default filters

## Notes

- Pull-to-refresh via `RefreshControl`.
- Rep-scoped data enforced server-side (RLS + API).
