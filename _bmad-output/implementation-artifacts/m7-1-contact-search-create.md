---
story: M7.1
epic: 7
title: Contact Search and Create
status: done
date: 2026-06-26
---

# Story M7.1: Contact Search and Create

Status: **done**

## File List

- `app/(tabs)/calls/index.tsx` — Calls tab shell
- `src/features/calls/use-contact-search.ts` — debounced search hook
- `src/features/calls/api.ts` — `GET /api/v1/contacts/search`, `POST /api/v1/contacts`
- `src/components/contact-quick-add-sheet.tsx` — create contact modal
- `src/features/calls/labels.ts` — display name / address helpers

## Notes

- Search requires ≥2 characters (`CONTACT_SEARCH_MIN_LENGTH`).
- Duplicate phone returns 409 `DUPLICATE_CONTACT` with existing contact selected.
