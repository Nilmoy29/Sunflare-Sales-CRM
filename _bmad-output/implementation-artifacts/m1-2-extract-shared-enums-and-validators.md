---
story: M1.2
epic: 1
title: Extract Shared Enums and Validators
status: done
date: 2026-06-26
---

# Story M1.2: Extract Shared Enums and Validators

Status: **done**

## File List

- `packages/shared/src/enums.ts`
- `packages/shared/src/map-bbox.ts`
- `packages/shared/src/gps-ping.ts`
- `packages/shared/src/knock-sync.ts`
- `packages/shared/src/index.ts`
- `src/lib/validators/enums.ts` — re-exports `@sunflare/shared`
- `src/lib/validators/knocks.ts` — imports shared bbox/sync schemas
- `src/lib/validators/shifts.ts` — imports `gpsPingBodySchema`
- `package.json` — `@sunflare/shared` dependency
- `next.config.ts` — `transpilePackages`
- `tsconfig.json` — path alias
