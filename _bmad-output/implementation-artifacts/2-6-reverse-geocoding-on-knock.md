---
baseline_commit: NO_VCS
---

# Story 2.6: Reverse Geocoding on Knock

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **rep**,
I want the address filled from my GPS point,
so that I don't type addresses in the field.

## Acceptance Criteria

1. **Given** the door outcome sheet is open with knock coordinates (`KnockDraft` lat/lng)  
   **When** the form loads  
   **Then** the app requests a reverse-geocoded address for those coordinates (FR14)  
   **And** while loading, the address section shows a clear loading state  
   **And** on success, **Address**, **Suburb**, and **Postcode** fields are pre-filled with the proposal  
   **And** each field remains editable (`min-h-11` inputs, NFR6)

2. **Given** a proposed or edited address  
   **When** I tap **Save knock** (Story 2.5 flow)  
   **Then** `POST /api/v1/knocks` includes the confirmed address fields  
   **And** the created `contacts` row stores `address`, `suburb`, `postcode` (FR54)  
   **And** lat/lng on contact and knock remain the draft coordinates  
   **And** empty strings are stored as `NULL` in Postgres

3. **Given** reverse geocoding is unavailable (`MAPBOX_SECRET_TOKEN` missing or Mapbox API error)  
   **When** the form loads  
   **Then** address fields are empty but editable  
   **And** a non-blocking hint explains manual entry (reference `docs/SETUP_KEYS.md` when token missing)  
   **And** I can still save a knock without an address (do not block submit on missing geocode)

4. **Given** implementation scope for this story  
   **When** reviewing the diff  
   **Then** geocoding runs **server-side** only (secret token never exposed to client)  
   **And** there is **no** Dexie/offline queue, sync API, or lead promotion (Stories 2.7, 2.9)  
   **And** Story 2.4/2.5 map tap, shift gates, and knock POST behavior still work  
   **And** `npm run build` and `npm run lint` pass

**Implements:** FR14, FR54  
**NFRs:** NFR6 (touch targets on address inputs)

## Tasks / Subtasks

- [x] **Server: Mapbox reverse geocode** (AC: 1, 3, 4)
  - [x] Extend `src/lib/geo/mapbox.ts` — `getMapboxSecretToken()` reading `MAPBOX_SECRET_TOKEN` (server-only)
  - [x] Create `src/lib/geo/parse-mapbox-reverse.ts` — map Mapbox Geocoding API v6 reverse response → `{ address, suburb, postcode }` (AU-oriented)
  - [x] Create `src/features/geocode/reverse-geocode.ts` — call Mapbox, handle errors, return typed result
  - [x] Create `GET /api/v1/geocode/reverse?lat=&lng=` — `requireRoleForApi(["rep"])`, Zod lat/lng, return `{ data: { address, suburb, postcode } }` or `503 GEOCODE_NOT_CONFIGURED` / `502 GEOCODE_FAILED`
  - [x] Document `MAPBOX_SECRET_TOKEN` in `docs/SETUP_KEYS.md` as **required for Story 2.6** (optional for map-only dev)

- [x] **Validators** (AC: 2)
  - [x] Add `contactAddressFieldsSchema` in `src/lib/validators/knocks.ts` (or `src/lib/validators/contacts.ts`) — optional nullable `address`, `suburb`, `postcode` with trim + max lengths
  - [x] Extend `createKnockBodySchema` to merge address fields (all optional; empty → null)

- [x] **Database: persist address on contact create** (AC: 2)
  - [x] Migration `*_create_knock_with_contact_address.sql` — extend `create_knock_with_contact` with `p_address`, `p_suburb`, `p_postcode`; set on `contacts` INSERT
  - [x] **Drop** prior 5-arg function signature before `CREATE OR REPLACE` (Postgres overload rules)
  - [x] Apply via Supabase MCP `apply_migration`; run `npm run db:types`

- [x] **Knock create path** (AC: 2)
  - [x] Update `src/features/knocks/create-knock.ts` — pass address params to RPC
  - [x] `POST /api/v1/knocks` — no route logic change beyond extended Zod body

- [x] **Client API + sheet UI** (AC: 1, 2, 3)
  - [x] Extend `src/features/knocks/api.ts` — `fetchReverseGeocode(lat, lng, signal?)`
  - [x] Update `src/components/rep/door-outcome-sheet.tsx`:
    - Remove placeholder *“Address auto-fill in Story 2.6”*
    - `useEffect` on mount/draft: fetch reverse geocode (respect `AbortController` on unmount / draft `key` remount from 2.5 review)
    - Editable address / suburb / postcode inputs
    - Include address fields in `createKnock` payload
  - [x] Keep existing outcome grid, notes, follow-up, save/cancel, and review patches (sheet `key`, notes `maxLength`, follow-up validation)

- [x] **Verify** (AC: 4)
  - [x] Manual: with `MAPBOX_SECRET_TOKEN` → sheet pre-fills AU address; edit suburb → save → verify `contacts` row in Supabase
  - [x] Manual: without secret token → manual entry still saves knock
  - [x] Manual: map + knock flow regression (tap, quick-add, pin refresh)
  - [x] `npm run build` && `npm run lint`

### Review Findings

- [x] [Review][Patch] Keep address fields editable during geocode load [`door-outcome-sheet.tsx:149`] — only disable on `submitting`.
- [x] [Review][Patch] Prefer street line over `full_address` [`parse-mapbox-reverse.ts:23`] — address_line/context street before full_address fallback.
- [x] [Review][Patch] Treat all-null geocode as failure [`reverse-geocode.ts:51`] — throw `GeocodeFailedError` when all address fields null.

## Dev Notes

### Critical constraints

- **Do NOT** call Mapbox Geocoding from the browser with the secret token — use Route Handler proxy only.
- **Do NOT** require address on submit — geocode failure must not block knock logging (AC3).
- **Do NOT** implement offline geocode cache or Dexie — Story 2.7 will replay the same POST body shape including address fields.
- **Do NOT** add TanStack Query or React Hook Form — `fetch` + `useState` + `useEffect` + Zod (project convention).
- **Do NOT** break `create_knock_with_contact` atomicity — address belongs on the same `INSERT` as contact + knock.

### Mapbox Geocoding API (server)

Architecture: **Mapbox Geocoding API** aligned with map vendor ([architecture.md](_bmad-output/planning-artifacts/architecture.md)).

**Reverse endpoint (v6 recommended):**

```http
GET https://api.mapbox.com/search/geocode/v6/reverse
  ?longitude={lng}
  &latitude={lat}
  &country=au
  &language=en
  &access_token={MAPBOX_SECRET_TOKEN}
```

Parse the first feature:

| UI field | Mapbox v6 hints |
| :--- | :--- |
| `address` | `properties.full_address` or combine `address_line1` + `address_line2` |
| `suburb` | `properties.context.place.name` or `locality` |
| `postcode` | `properties.context.postcode.name` |

If v6 response shape differs in practice, adjust parser once and unit-test the mapper with a fixture JSON snippet.

**Token helper** (mirror public token pattern):

```typescript
// src/lib/geo/mapbox.ts
export function getMapboxSecretToken(): string | null {
  const token = process.env.MAPBOX_SECRET_TOKEN?.trim();
  return token || null;
}
```

### GET reverse geocode API contract

**GET `/api/v1/geocode/reverse?lat=-33.8688&lng=151.2093`**

Response:

```json
{
  "data": {
    "address": "1 Martin Place",
    "suburb": "Sydney",
    "postcode": "2000"
  }
}
```

Errors:

| Code | HTTP | When |
| :--- | :--- | :--- |
| `VALIDATION_ERROR` | 400 | Invalid lat/lng |
| `GEOCODE_NOT_CONFIGURED` | 503 | `MAPBOX_SECRET_TOKEN` missing |
| `GEOCODE_FAILED` | 502 | Mapbox non-OK or unparseable response |

Auth: `requireRoleForApi(["rep"])` — no active-shift gate (read-only proxy; sheet only opens on shift anyway).

### Extend POST knocks body

```json
{
  "lat": -33.8688,
  "lng": 151.2093,
  "outcome": "interested",
  "notes": null,
  "follow_up_at": null,
  "address": "1 Martin Place",
  "suburb": "Sydney",
  "postcode": "2000"
}
```

Suggested Zod max lengths: `address` 500, `suburb` 120, `postcode` 16 — trim; `""` → `null`.

### RPC migration pattern

Current function (Story 2.5) — 5 args, no address:

```sql
create_knock_with_contact(p_lat, p_lng, p_outcome, p_notes, p_follow_up_at)
```

**Migration must:**

```sql
drop function if exists public.create_knock_with_contact(
  double precision, double precision, public.door_outcome, text, timestamptz
);

create or replace function public.create_knock_with_contact(
  p_lat double precision,
  p_lng double precision,
  p_outcome public.door_outcome,
  p_notes text,
  p_follow_up_at timestamptz,
  p_address text,
  p_suburb text,
  p_postcode text
) ...
  insert into public.contacts (lat, lng, address, suburb, postcode, created_by)
  values (p_lat, p_lng, p_address, p_suburb, p_postcode, v_rep_id);
```

Re-grant `EXECUTE` to `authenticated`; revoke from `public`.

### Door outcome sheet UX

Replace placeholder block at ```107:109:src/components/rep/door-outcome-sheet.tsx``` with:

```
[ Loading address… ]  OR  [ Address input ]
[ Suburb input      ]
[ Postcode input    ]
[ Optional hint if geocode skipped ]
```

- Loading: disable address inputs or show skeleton text; **do not** disable outcome buttons.
- On geocode success: pre-fill state; user edits are kept on submit.
- On geocode failure: amber hint, empty fields, submit still enabled.
- Reuse sheet `key` from shell so draft change aborts in-flight geocode (`AbortController` in effect cleanup).

### Files to read before coding (UPDATE — not greenfield)

| File | Current state | This story changes |
| :--- | :--- | :--- |
| `src/components/rep/door-outcome-sheet.tsx` | Outcomes, notes, follow-up, POST knock | Address section + geocode effect |
| `src/lib/validators/knocks.ts` | `createKnockBodySchema`, `NOTES_MAX_LENGTH` | Add address fields |
| `src/features/knocks/create-knock.ts` | RPC 5-arg | RPC 8-arg |
| `src/features/knocks/api.ts` | `createKnock`, `fetchKnocksInBbox` | `fetchReverseGeocode` |
| `src/app/api/v1/knocks/route.ts` | POST validates body | Extended schema only |
| `src/lib/geo/mapbox.ts` | Public token helpers | Secret token helper |
| `supabase/migrations/20260603150100_create_knock_with_contact_rpc.sql` | Baseline RPC | New migration replaces signature |

**Preserve:** shift gates on POST knocks, `knockRefreshKey` pin refresh, sheet dismiss on success, review patches from 2.5.

### Previous story intelligence

**Story 2.5:**
- `create_knock_with_contact` RPC — extend, do not replace with two-step client INSERT+UPDATE (orphan risk).
- `DoorOutcomeSheet` + `key` on draft — abort geocode fetch on coordinate change.
- `NOTES_MAX_LENGTH`, follow-up validation — do not regress.

**Story 2.4:**
- Sheet only mounts during active shift; coords from map tap or GPS quick-add.

**Story 2.3:**
- Public Mapbox token for map display is **separate** from geocoding secret — map can work without geocode.

**Story 2.1:**
- `contacts.address`, `suburb`, `postcode` columns exist; rep can UPDATE contacts they own (future edits; this story sets on create).

### Cross-story dependencies

| Story | Relationship |
| :--- | :--- |
| 2.5 | **Requires** working POST knocks + sheet |
| 2.7 | Offline queue must store same address fields in pending payload |
| 2.9 | Lead promotion reads contact/knock — richer address helps |
| 2.10 | Re-knock warnings may display address later |

### Testing (this story)

- **Required:** `npm run build`, `npm run lint`
- **Manual:** Secret token set → pre-fill → edit → save → Supabase `contacts` address columns
- **Manual:** No secret token → manual address → save succeeds
- **Manual:** Regression — tap map, save knock, pin appears
- **Optional:** unit test `parse-mapbox-reverse.ts` with static JSON fixture (recommended, not mandatory)

### Project Structure Notes

New/ modified files:

```
src/lib/geo/mapbox.ts                          (secret token helper)
src/lib/geo/parse-mapbox-reverse.ts            (new)
src/lib/validators/knocks.ts                   (address fields on create body)
src/features/geocode/reverse-geocode.ts        (new)
src/app/api/v1/geocode/reverse/route.ts        (new)
src/features/knocks/api.ts                     (fetchReverseGeocode)
src/features/knocks/create-knock.ts            (RPC args)
src/app/api/v1/knocks/route.ts                 (schema only)
src/components/rep/door-outcome-sheet.tsx      (address UI + geocode)
supabase/migrations/*_create_knock_with_contact_address.sql
src/types/supabase.generated.ts
docs/SETUP_KEYS.md                             (2.6 geocode token note)
```

### References

- [Source: `_bmad-output/planning-artifacts/epics.md` — Story 2.6]
- [Source: `docs/Solar_CRM_PRD_v1.md` — Address Auto-Fill]
- [Source: `_bmad-output/planning-artifacts/architecture.md` — Mapbox geocoding, contact-first flow]
- [Source: `_bmad-output/implementation-artifacts/2-5-door-outcome-form-and-submission.md` — POST + RPC]
- [Source: `docs/SETUP_KEYS.md` — MAPBOX_SECRET_TOKEN]
- [Source: `src/components/rep/door-outcome-sheet.tsx`]
- [Source: Mapbox Geocoding API — Reverse geocoding](https://docs.mapbox.com/api/search/geocoding/#reverse-geocoding)

## Dev Agent Record

### Agent Model Used

Composer

### Debug Log References

- Applied `create_knock_with_contact_address` migration via Supabase MCP.
- ESLint `set-state-in-effect`: rely on sheet `key` remount for address reset; geocode fetch only updates state in async callback.

### Completion Notes List

- `GET /api/v1/geocode/reverse` proxies Mapbox v6 reverse geocode server-side (`MAPBOX_SECRET_TOKEN`).
- Door outcome sheet: loading state, editable address/suburb/postcode, hints when geocode unavailable; address included on POST knocks.
- Extended `create_knock_with_contact` RPC to persist address on `contacts` at create time.
- `npm run build` and `npm run lint` pass.
- Code review patches: editable address during load, street-line parser priority, all-null geocode treated as failure.

### File List

- `supabase/migrations/20260603160000_create_knock_with_contact_address.sql` (new)
- `src/lib/geo/mapbox.ts` (modified)
- `src/lib/geo/parse-mapbox-reverse.ts` (new)
- `src/lib/validators/geocode.ts` (new)
- `src/lib/validators/knocks.ts` (modified)
- `src/features/geocode/reverse-geocode.ts` (new)
- `src/app/api/v1/geocode/reverse/route.ts` (new)
- `src/features/knocks/create-knock.ts` (modified)
- `src/features/knocks/api.ts` (modified)
- `src/components/rep/door-outcome-sheet.tsx` (modified)
- `src/types/supabase.generated.ts` (modified)
- `docs/SETUP_KEYS.md` (modified)

## Change Log

- 2026-06-03: Story 2.6 — reverse geocoding on knock, address on contact create.
- 2026-06-03: Code review patches — editable during load, street-line parser, all-null geocode failure.

### Senior Developer Review (AI)

**Outcome:** Approve (after patches)  
**Date:** 2026-06-03  
**Layers:** Blind Hunter, Edge Case Hunter, Acceptance Auditor (inline)

**Summary:** FR14/54 address auto-fill complete. Patches: address fields editable during lookup, street line before full_address, all-null geocode shows manual-entry hint.

## Story Completion Status

- **Status:** done
- **Completion note:** All ACs satisfied; code review patches applied; build and lint pass.
