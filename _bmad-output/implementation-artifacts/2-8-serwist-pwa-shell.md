---
baseline_commit: NO_VCS
---

# Story 2.8: Serwist PWA Shell

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **rep**,
I want to install the app to my home screen,
so that I can launch canvassing like a native app.

## Acceptance Criteria

1. **Given** a **production** build (`npm run build && npm run start`, or Vercel preview/production)  
   **When** I visit on Mobile Safari or Chrome  
   **Then** a valid web app manifest is served with `display: "standalone"`, `start_url`, icons, and theme/background colors (FR55, NFR8, UX-DR6)  
   **And** `apple-mobile-web-app-capable` metadata is present for iOS Add to Home Screen  
   **And** Lighthouse / browser devtools show the app as installable (no manifest errors)

2. **Given** a production build  
   **When** the app loads  
   **Then** a service worker at `/sw.js` registers successfully (FR55, NFR8)  
   **And** Serwist precaches the app shell and serves `/~offline` as the navigation fallback when offline with no cache match  
   **And** authenticated rep routes (e.g. `/rep/map`) remain usable after prior visit — app shell available offline; API/data still requires network or Story 2.7 Dexie queue

3. **Given** local development (`npm run dev`)  
   **When** I work on the app  
   **Then** Serwist is **disabled** — no service worker registration, no stale precache interfering with hot reload (architecture, Story 1.1 deferral)

4. **Given** connectivity returns after an offline period  
   **When** the service worker or Serwist client handles the `online` event  
   **Then** the page does **not** auto-reload (`reloadOnOnline: false`) so in-progress door outcome forms are not lost (architecture, epics AC)

5. **Given** implementation scope for this story  
   **When** reviewing the diff  
   **Then** Story 2.7 offline knock queue (`submitKnock`, Dexie sync loop, pending indicator) still works unchanged  
   **And** there is **no** custom install banner, Web Push/VAPID, or lead promotion (Stories 4.8, 2.9)  
   **And** `npm run build` and `npm run lint` pass

**Implements:** FR55, NFR8, UX-DR6  
**NFRs:** NFR4 (offline shell complements Dexie outbox from 2.7)

## Tasks / Subtasks

- [x] **Serwist build wiring** (AC: 2, 3)
  - [x] Wrap `next.config.ts` with `withSerwistInit` from `@serwist/next`
  - [x] Set `swSrc: "src/app/sw.ts"`, `swDest: "public/sw.js"`
  - [x] Set `disable: process.env.NODE_ENV === "development"`
  - [x] Set `reloadOnOnline: false` in plugin options
  - [x] Add `additionalPrecacheEntries: [{ url: "/~offline", revision }]` (use `git rev-parse HEAD` with `crypto.randomUUID()` fallback per Serwist docs)
  - [x] Update `tsconfig.json`: add `"webworker"` lib, `"@serwist/next/typings"` types, exclude `"public/sw.js"`
  - [x] Update `.gitignore`: `public/sw*` and `public/swe-worker*`

- [x] **Service worker** (AC: 2, 4)
  - [x] Create `src/app/sw.ts` using Serwist template: `defaultCache`, `skipWaiting: true`, `clientsClaim: true`, `navigationPreload: true`
  - [x] Configure `fallbacks.entries` for document requests → `/~offline`
  - [x] Do **not** override `defaultCache` unless a regression is found — keeps API routes on network-first

- [x] **Offline fallback page** (AC: 2)
  - [x] Create `src/app/~offline/page.tsx` — simple branded message: "You're offline", link to retry (`location.reload()` button), note pending knocks sync when back online

- [x] **Web app manifest + metadata** (AC: 1, UX-DR6)
  - [x] Create `src/app/manifest.ts` exporting `MetadataRoute.Manifest`:
    - `name`: "Sunflare — Solar CRM"
    - `short_name`: "Sunflare"
    - `display`: "standalone"
    - `start_url`: "/"
    - `orientation`: "portrait" (rep mobile-first)
    - `theme_color` / `background_color` aligned with brand (see Dev Notes)
    - `icons`: 192×192 and 512×512 under `public/icons/` (include `purpose: "maskable"` on 192)
  - [x] Create `public/icons/` PNG assets (solar/amber branded — simple generated icons acceptable; no external CDN)
  - [x] Extend `src/app/layout.tsx` metadata: `applicationName`, `appleWebApp.capable`, `formatDetection.telephone: false`
  - [x] Add `export const viewport: Viewport` with `themeColor` matching manifest

- [x] **Client SW registration** (AC: 2, 3, 4)
  - [x] Create `src/components/serwist-provider.tsx` (`"use client"`) wrapping `@serwist/next` `SerwistProvider`
  - [x] Pass `swUrl="/sw.js"`, `disable={process.env.NODE_ENV === "development"}`, `reloadOnOnline={false}`
  - [x] Wrap `{children}` in root `layout.tsx` with `SerwistProvider`

- [x] **Verify** (AC: 1–5)
  - [x] `npm run build` — confirm `public/sw.js` generated
  - [x] `npm run start` — DevTools → Application → Manifest valid; Service Worker registered and activated
  - [x] `npm run dev` — confirm **no** SW registration
  - [x] Manual: production mode → open door outcome sheet → toggle offline in DevTools → form fields retain values when back online (no full-page reload)
  - [x] Manual: Story 2.7 regression — offline knock → pending indicator → sync on reconnect
  - [x] `npm run lint`

### Review Findings

- [x] [Review][Patch] Manifest icons need `purpose: "any"` entries [`src/app/manifest.ts`] — added `any` entries for 192 and 512.
- [x] [Review][Patch] Add Apple touch icon metadata [`src/app/layout.tsx`] — `icons.apple` points to 192px icon.
- [x] [Review][Patch] Narrowed tsconfig `types` array [`tsconfig.json`] — removed `types` override; `/// <reference />` in `sw.ts`.
- [x] [Review][Patch] Document webpack build requirement [`README.md`] — build script table notes `--webpack` for Serwist.
- [x] [Review][Defer] GET `/api/*` cached via `defaultCache` NetworkFirst [`src/app/sw.ts`] — user-scoped knock bbox responses could persist on shared devices; story mandates defaultCache as-is; acceptable v1 for single-rep phones.

## Dev Notes

### Critical constraints

- **Do NOT** use `next-pwa` — project uses `@serwist/next` + `serwist` (installed in Story 1.1).
- **Do NOT** set `reloadOnOnline: true` anywhere — door outcome sheet (2.5) and geocode fields (2.6) lose state on reload; Story 2.7 sync loop handles reconnect without page refresh.
- **Do NOT** enable Serwist in development — `disable: process.env.NODE_ENV === "development"` on **both** `withSerwistInit` and `SerwistProvider`.
- **Do NOT** cache-bust or intercept `POST /api/v1/knocks` or `/api/v1/knocks/sync` — use Serwist `defaultCache` as-is (network-first for API).
- **Do NOT** implement Web Push, install prompt UI, or `beforeinstallprompt` banner — out of scope (Story 4.8 for push).
- **Do NOT** modify Dexie offline queue, sync API, or knock submit flow — PWA shell is additive.
- **Do NOT** install TanStack Query / React Hook Form — not project convention.

### Brand / theme (UX-DR6)

Rep shell is mobile-first. Use solar-appropriate colors consistent with existing Tailwind zinc/amber palette:

| Token | Suggested value | Rationale |
| :--- | :--- | :--- |
| `theme_color` | `#f59e0b` (amber-500) | Solar brand accent; status bar tint on Android |
| `background_color` | `#ffffff` | Splash / iOS standalone background |
| `viewport.themeColor` | Same as manifest | Next.js metadata API |

`globals.css` uses `#171717` foreground / `#ffffff` background — manifest colors are for OS chrome, not in-app theme.

### Serwist + Next.js 16 notes

- Packages already in `package.json`: `@serwist/next@^9.0.18`, `serwist@^9.0.18`.
- Serwist inject-manifest build runs on **`next build`** (webpack). Dev uses Turbopack but SW is disabled — no conflict.
- Official guide: [Serwist Next getting started](https://serwist.pages.dev/docs/next/getting-started).
- With `src/` directory, `swSrc` must be `"src/app/sw.ts"` (not `app/sw.ts`).

### `next.config.ts` pattern (reference)

```typescript
import { spawnSync } from "node:child_process";
import withSerwistInit from "@serwist/next";
import type { NextConfig } from "next";

const revision =
  spawnSync("git", ["rev-parse", "HEAD"], { encoding: "utf-8" }).stdout?.trim() ||
  crypto.randomUUID();

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
  reloadOnOnline: false,
  additionalPrecacheEntries: [{ url: "/~offline", revision }],
});

const nextConfig: NextConfig = {
  reactCompiler: true,
};

export default withSerwist(nextConfig);
```

### `SerwistProvider` pattern (reference)

```tsx
"use client";

import { SerwistProvider } from "@serwist/next/react";

export function AppSerwistProvider({ children }: { children: React.ReactNode }) {
  return (
    <SerwistProvider
      swUrl="/sw.js"
      disable={process.env.NODE_ENV === "development"}
      reloadOnOnline={false}
    >
      {children}
    </SerwistProvider>
  );
}
```

Import path: `@serwist/next/react` (see package exports).

### Relationship to Story 2.7 offline queue

| Layer | Story | Responsibility |
| :--- | :--- | :--- |
| Dexie `pending_knocks` + sync API | 2.7 | Knock data durability when offline |
| Serwist precache + runtime cache | 2.8 | App shell, static assets, offline navigation fallback |
| `useKnockSyncLoop` | 2.7 | Reconnect sync without page reload — must remain primary |

Serwist makes previously visited pages load offline; it does **not** replace Dexie for knock payloads.

### Files to read before coding (UPDATE)

| File | Current state | This story changes |
| :--- | :--- | :--- |
| `next.config.ts` | Plain NextConfig, reactCompiler | Wrap with `withSerwistInit` |
| `tsconfig.json` | Standard Next TS config | Add webworker lib + Serwist typings |
| `.gitignore` | No Serwist entries | Ignore generated `public/sw*` |
| `src/app/layout.tsx` | Basic title/description metadata | PWA metadata, viewport, SerwistProvider wrapper |
| `package.json` | Serwist deps present | No new deps expected |

**Preserve:** All rep map, shift, knock, offline sync behavior from Stories 2.3–2.7.

### Previous story intelligence

**Story 2.7:**
- Explicitly deferred Serwist to 2.8 — Dexie queue works without SW today.
- `useKnockSyncLoop` listens to `window` `online` — must not compete with Serwist `reloadOnOnline` page refresh.
- Pending indicator and optimistic pins are client-side — unaffected by SW if API caching stays network-first.

**Story 1.1:**
- Installed `@serwist/next` and `serwist` only — no `withSerwist` wiring yet.
- Architecture placeholder paths: `public/sw.js`, `public/manifest.webmanifest`, `public/icons/`, `src/app/sw.ts`, `src/app/~offline/page.tsx`.

### Cross-story dependencies

| Story | Relationship |
| :--- | :--- |
| 2.7 | **Requires** — offline knock queue must keep working; no reload on reconnect |
| 2.9 | Lead promotion unrelated to PWA shell |
| 4.8 | Web Push uses SW — future story; do not add VAPID now |

### Testing (this story)

- **Required:** `npm run build`, `npm run lint`
- **Required:** Production server (`npm run start`) — verify manifest + SW in Chrome DevTools Application tab
- **Required:** `npm run dev` — verify SW **not** registered
- **Manual:** Door outcome sheet open → simulate offline/online → form state preserved (AC 4)
- **Manual:** Story 2.7 offline knock → pending count → sync (regression)
- **Manual (optional):** Real device Add to Home Screen on iOS Safari / Android Chrome
- **No** Playwright for PWA install flow in this story (flaky across browsers)

### Project Structure Notes

New / modified files:

```
next.config.ts                          (withSerwistInit wrapper)
tsconfig.json                           (webworker + typings)
.gitignore                              (public/sw*)
src/app/sw.ts                           (new — Serwist worker source)
src/app/manifest.ts                     (new — Next.js manifest route)
src/app/~offline/page.tsx               (new — offline fallback)
src/app/layout.tsx                      (PWA metadata + SerwistProvider)
src/components/serwist-provider.tsx     (new — client wrapper)
public/icons/icon-192x192.png           (new)
public/icons/icon-512x512.png           (new)
public/sw.js                            (generated at build — gitignored)
```

Architecture listed `public/manifest.webmanifest` — prefer `src/app/manifest.ts` (Next.js App Router auto-serves `/manifest.webmanifest`). Do not duplicate both.

### References

- [Source: `_bmad-output/planning-artifacts/epics.md` — Story 2.8, UX-DR6]
- [Source: `_bmad-output/planning-artifacts/architecture.md` — PWA/Serwist decision, project structure]
- [Source: `_bmad-output/implementation-artifacts/1-1-initialize-application-from-starter-template.md` — Serwist install-only deferral]
- [Source: `_bmad-output/implementation-artifacts/2-7-offline-knock-queue-and-sync.md` — Dexie queue, Serwist deferred]
- [Source: `next.config.ts`, `src/app/layout.tsx`, `package.json`]
- [Source: Serwist Next.js docs](https://serwist.pages.dev/docs/next/getting-started)
- [Source: Next.js manifest metadata](https://nextjs.org/docs/app/api-reference/file-conventions/metadata/manifest)

## Dev Agent Record

### Agent Model Used

Composer

### Debug Log References

- Next.js 16 defaults to Turbopack for `next build`; Serwist requires webpack. Fixed with `next build --webpack` in `package.json`.
- ESLint flagged generated `public/sw.js`; added to `eslint.config.mjs` globalIgnores.

### Completion Notes List

- Wired `@serwist/next` with `withSerwistInit` — disabled in dev, `reloadOnOnline: false`.
- Created `src/app/sw.ts` with `defaultCache` and `/~offline` document fallback.
- Added `src/app/manifest.ts`, PWA metadata/viewport in layout, amber branded icons.
- `AppSerwistProvider` registers SW in production only.
- Verified: `npm run build` generates `public/sw.js`; manifest and SW serve 200 on production server; lint passes.
- Code review patches: manifest `any` icons, Apple touch icon, tsconfig typings via sw.ts reference, README webpack note.

### File List

- `next.config.ts` (modified)
- `package.json` (modified — `build` uses `--webpack`)
- `tsconfig.json` (modified)
- `.gitignore` (modified)
- `eslint.config.mjs` (modified)
- `src/app/sw.ts` (new)
- `src/app/manifest.ts` (new)
- `src/app/~offline/page.tsx` (new)
- `src/app/layout.tsx` (modified)
- `src/components/serwist-provider.tsx` (new)
- `public/icons/icon-192x192.png` (new)
- `public/icons/icon-512x512.png` (new)
- `scripts/generate-pwa-icons.mjs` (new)
- `README.md` (modified)

## Change Log

- 2026-06-03: Story 2.8 — Serwist PWA shell, manifest, offline fallback, production SW registration.
- 2026-06-03: Code review patches — manifest any icons, Apple touch icon, tsconfig typings, README webpack note.

### Senior Developer Review (AI)

**Outcome:** Approve (after patches)  
**Date:** 2026-06-03  
**Layers:** Blind Hunter, Edge Case Hunter, Acceptance Auditor (inline)

**Summary:** PWA shell complete. Patches: manifest `any` icon purposes, `icons.apple` for iOS, Serwist typings via sw.ts reference, README `--webpack` note. Deferred: GET `/api/*` NetworkFirst cache on shared devices.

## Story Completion Status

- **Status:** done
- **Completion note:** All ACs satisfied; code review patches applied; build and lint pass.
