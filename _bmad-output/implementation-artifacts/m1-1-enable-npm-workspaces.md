---
story: M1.1
epic: 1
title: Enable npm Workspaces
status: done
date: 2026-06-26
---

# Story M1.1: Enable npm Workspaces

Status: **done**

## Story

As a **developer**,
I want npm workspaces configured at the repo root,
So that `apps/mobile` and `packages/shared` can be developed in one repository.

## Acceptance Criteria

- [x] Root `package.json` defines `workspaces: ["apps/*", "packages/*"]`
- [x] `packages/shared` (`@sunflare/shared`) exists and links on `npm install`
- [x] `apps/` directory reserved for Expo app (Epic 2)
- [x] `npm run build` at root still passes (web unchanged)
- [x] README documents monorepo layout

## File List

- `package.json` — workspaces field
- `tsconfig.json` — exclude `apps`, `packages` from Next.js project
- `packages/shared/package.json`
- `packages/shared/tsconfig.json`
- `packages/shared/src/index.ts`
- `apps/.gitkeep`
- `README.md` — Monorepo section

## Dev Agent Record

- Workspaces added without moving web `src/` to `apps/web` (incremental per architecture-mobile-expo.md).
- `@sunflare/shared` placeholder export; M1.2 extracts validators.
