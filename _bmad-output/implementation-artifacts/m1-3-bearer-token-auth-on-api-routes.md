---
story: M1.3
epic: 1
title: Bearer Token Auth on Next.js API Routes
status: done
date: 2026-06-26
---

# Story M1.3: Bearer Token Auth on Next.js API Routes

Status: **done**

## Acceptance Criteria

- [x] `Authorization: Bearer <access_token>` resolves user on `/api/v1/*`
- [x] Cookie auth unchanged for web
- [x] Unauthenticated API returns `401` JSON (not redirect)
- [x] `npm run verify:bearer` script for rep token smoke check

## File List

- `src/lib/supabase/server.ts` — `createClientFromRequest`, Bearer via headers
- `src/lib/auth/session.ts` — `requireRoleForApiSession`
- `src/lib/auth/guards.ts` — JSON errors for API auth failures
- `scripts/verify-bearer-auth.mjs`
- `package.json` — `verify:bearer` script

## Verify

```bash
npm run dev   # separate terminal
npm run verify:bearer
```
