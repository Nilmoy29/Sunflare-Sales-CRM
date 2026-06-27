---
story: M7.3
epic: 7
title: Click-to-Call
status: done
date: 2026-06-26
---

# Story M7.3: Click-to-Call

Status: **done**

## File List

- `src/components/phone-dial-link.tsx` — `Linking.openURL(tel:…)`
- `src/features/calls/labels.ts` — `toTelHref`, phone normalization

## Notes

- Used on search results and selected contact panel.
- Min 44dp touch target; stops event propagation so row selection still works.
