---
story: M5.2
epic: 5
title: Assigned Territory Overlay
status: done
date: 2026-06-26
---

# Story M5.2: Assigned Territory Overlay

Status: **done**

## File List

- `src/features/territories/use-rep-territories.ts` — `GET /api/v1/territories/mine`
- `src/components/knock-map.tsx` — territory fill + line layers
- `app/(tabs)/map/index.tsx` — empty/error territory banners

## Notes

- Territories load when shift is active; translucent green fill matches web rep map.
- Outside-territory warning shown in knock form when logging.
