---
baseline_commit: NO_VCS
---

# Story 2.5: Door Outcome Form and Submission

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **rep**,
I want to select an outcome and optional notes quickly,
so that I can move to the next door without delay.

## Acceptance Criteria

1. **Given** the door outcome sheet is open (Story 2.4 draft with lat/lng)  
   **When** I view the form  
   **Then** six outcome buttons are enabled with PRD colors and labels (FR11, UX-DR8)  
   **And** each button meets 44×44px minimum touch target (NFR6, UX-DR2)  
   **And** optional **Notes** (textarea) and optional **Follow-up** (`datetime-local`) fields are visible

2. **Given** I selected an outcome  
   **When** I tap **Save knock**  
   **Then** `POST /api/v1/knocks` persists the knock online (FR10, FR11)  
   **And** the API creates a minimal `contacts` row (lat/lng, `created_by = rep`) then inserts `door_knocks` with `contact_id`, `rep_id`, `outcome`, `notes`, `lat`, `lng`, `synced = true`  
   **And** optional `follow_up_at` is stored when provided (FR57)  
   **And** request requires an **active shift** (`403 NO_ACTIVE_SHIFT` if not on shift)  
   **And** response returns `{ data: { knock: KnockPin } }` on success

3. **Given** a knock was saved successfully  
   **When** the sheet closes  
   **Then** the new pin appears on the map without a full page reload (refetch viewport knocks or merge into GeoJSON source)  
   **And** the sheet dismisses and draft state clears

4. **Given** validation or server errors  
   **When** submit fails  
   **Then** the sheet stays open with a clear error message  
   **And** no partial orphan knock is left without a valid contact (use transaction or ordered rollback)

5. **Given** implementation scope for this story  
   **When** reviewing the diff  
   **Then** there is **no** Dexie/offline queue, reverse geocoding, lead promotion, or `Idempotency-Key` header (Stories 2.6–2.7, 2.9)  
   **And** `npm run build` and `npm run lint` pass

**Implements:** FR10, FR11, FR57  
**NFRs:** NFR2 (online submit &lt;1s on 4G — keep handler lean), NFR6 (touch targets), UX-DR3 (single-screen micro-flow)

## Tasks / Subtasks

- [x] **Schema: follow_up_at** (AC: 2)
  - [x] Migration `door_knocks_follow_up_at.sql` — `ALTER TABLE public.door_knocks ADD COLUMN follow_up_at timestamptz NULL`
  - [x] Regenerate `src/types/supabase.generated.ts` via `npm run db:types`
  - [x] Apply via Supabase MCP `apply_migration`

- [x] **Validators & labels** (AC: 1, 2)
  - [x] Extend `src/lib/validators/knocks.ts` — `createKnockBodySchema` (lat, lng, outcome, notes?, follow_up_at?)
  - [x] Add `DOOR_OUTCOME_LABELS` (human labels) — e.g. in `src/lib/geo/door-outcome-colors.ts` or `enums.ts` companion

- [x] **POST knocks API** (AC: 2, 4)
  - [x] Add `POST` handler to `src/app/api/v1/knocks/route.ts` (keep existing GET)
  - [x] `requireRoleForApi(["rep"])` + `getActiveShiftForRep` gate
  - [x] Create `src/features/knocks/create-knock.ts` — insert contact + knock in one logical transaction (Supabase RPC or sequential with error handling)
  - [x] Return created knock as `KnockPin` shape

- [x] **Client API** (AC: 2, 3)
  - [x] Extend `src/features/knocks/api.ts` — `createKnock(payload)`
  - [x] Optional: `src/features/knocks/use-create-knock.ts` — skipped; sheet uses local state

- [x] **Door outcome sheet form** (AC: 1, 3, 4)
  - [x] Upgrade `src/components/rep/door-outcome-sheet.tsx` — outcome grid, notes, follow-up, Save/Cancel  
  - [x] Props: `draft`, `onClose`, `onSuccess?: (knock: KnockPin) => void`  
  - [x] Disable Save until outcome selected; show loading on submit  
  - [x] Remove Story 2.4 placeholder copy

- [x] **Map pin refresh** (AC: 3)
  - [x] Add refresh trigger to `useMapKnocks` (e.g. `refreshKey` bump) or callback from shell after success  
  - [x] Wire in `rep-map-shift-shell.tsx` — `onSuccess` closes draft + triggers refetch

- [x] **Verify** (AC: 5)
  - [x] Manual: open sheet → select outcome → save → pin appears on map  
  - [x] Manual: submit without shift → 403 (API direct test)  
  - [x] `npm run build` && `npm run lint`

### Review Findings

- [x] [Review][Patch] Reset sheet when draft coordinates change [`rep-map-shift-shell.tsx:88`] — `key` on `DoorOutcomeSheet` from lat/lng/source.
- [x] [Review][Patch] Enforce notes length in the UI [`door-outcome-sheet.tsx:147`] — exported `NOTES_MAX_LENGTH`, `maxLength` on textarea.
- [x] [Review][Patch] Reject invalid follow-up datetime [`door-outcome-sheet.tsx:19`] — `parseFollowUpLocal` blocks save with inline error.
- [x] [Review][Defer] Pin appears after async bbox refetch — acceptable for 2.5; optimistic merge deferred to 2.7.

## Dev Notes

### Critical constraints

- **Do NOT** implement offline/Dexie/`POST /api/v1/knocks/sync` — Story 2.7.
- **Do NOT** reverse geocode or require address fields — Story 2.6 (contact may have null `address` for now).
- **Do NOT** create leads on `interested` — Story 2.9.
- **Do NOT** add `idempotency_key` column — Story 2.7.
- **Do NOT** install TanStack Query or React Hook Form — use `fetch` + local state + Zod (project convention).
- **Do NOT** break Story 2.4 map tap / quick-add / shift gates.

### Contact + knock create flow

Architecture: *“Contact record required before knock; knock may create contact.”*

**Online v1 (this story):**

```typescript
// 1. Insert contact (minimal placeholder until 2.6 geocoding)
{ lat, lng, created_by: repId }

// 2. Insert door_knock
{
  contact_id,
  rep_id: repId,
  outcome,
  notes: notes ?? null,
  lat,
  lng,
  follow_up_at: followUpAt ?? null,
  synced: true,
}
```

RLS (Story 2.1 hardened):
- Contact INSERT requires `created_by = auth.uid()`
- Knock INSERT requires `rep_id = auth.uid()` and contact owned by rep (new contact satisfies this)

Prefer **Postgres RPC** `create_knock_with_contact(...)` with `security invoker` for atomic insert if sequential client calls risk orphan contacts on partial failure.

### POST API contract

**POST `/api/v1/knocks`**

```json
{
  "lat": -33.8688,
  "lng": 151.2093,
  "outcome": "interested",
  "notes": "Asked for brochure",
  "follow_up_at": "2026-06-10T09:00:00.000Z"
}
```

Response:

```json
{
  "data": {
    "knock": {
      "id": "uuid",
      "lat": -33.8688,
      "lng": 151.2093,
      "outcome": "interested",
      "knocked_at": "2026-06-03T10:00:00.000Z"
    }
  }
}
```

Errors: `400 VALIDATION_ERROR`, `401`, `403 NO_ACTIVE_SHIFT`, `500 KNOCK_CREATE_FAILED`

Zod notes: trim notes; max length ~2000; `follow_up_at` ISO datetime or null; lat/lng match draft bounds.

### follow_up_at (FR57)

- Add nullable `follow_up_at timestamptz` on `door_knocks` (Story 2.1 deferred this column intentionally).
- UI: optional `datetime-local` — convert to ISO UTC on submit.
- Show for all outcomes (rep may schedule callback on any door); not required.
- Epic 4 `follow_ups` table is for **leads** — do not create `follow_ups` rows in 2.5.

### Outcome button UI (UX-DR3)

Use existing colors from `DOOR_OUTCOME_COLORS`:

| Outcome | Label | Color |
| :--- | :--- | :--- |
| `interested` | Interested | `#22c55e` |
| `not_home` | Not home | `#eab308` |
| `not_interested` | Not interested | `#ef4444` |
| `do_not_knock` | Do not knock | `#374151` |
| `callback_requested` | Callback | `#3b82f6` |
| `already_has_solar` | Has solar | `#a855f7` |

Grid: 2×3 or stacked full-width buttons, `min-h-11`, high contrast text on colored background.

### Door outcome sheet props (extend 2.4)

```typescript
type DoorOutcomeSheetProps = {
  draft: KnockDraft;
  onClose: () => void;
  onSuccess: (knock: KnockPin) => void;
};
```

Remove placeholder: *“Outcome selection and save arrive in Story 2.5.”*

Keep coordinate display and *“Address auto-fill in Story 2.6”* until 2.6.

### Map pin refresh (AC 3)

`useMapKnocks` today refetches when bbox changes. After create:

- **Option A (preferred):** add `refreshKey: number` prop; bump in shell on success → effect refetches same bbox.
- **Option B:** optimistically append pin to local knocks state (Story 2.7 pattern) — minimal scope: refetch is enough for 2.5.

Pass `refreshKey` from `rep-map-shift-shell` → `MapCanvas` → `useMapKnocks`.

### Previous story intelligence

**Story 2.4:**
- `DoorOutcomeSheet` shell with coords, backdrop dismiss
- `useKnockDraft`, `KnockDraft` with `source`
- `closeDraft()` on shift end — preserve
- No POST yet

**Story 2.3:**
- `GET /api/v1/knocks?bbox=`, `useMapKnocks`, pin GeoJSON layers
- `get_knocks_in_bbox` RPC — new pins appear after refetch

**Story 2.2:**
- Active shift gate pattern on knock GET — reuse on POST

**Story 2.1:**
- Schema + RLS; contact/knock linkage; no API until now

### Cross-story dependencies

| Story | Relationship |
| :--- | :--- |
| 2.4 | **Requires** sheet + draft coordinates |
| 2.6 | Fills contact address from geocode before/after submit enhancement |
| 2.7 | Offline queue + idempotency + optimistic pins |
| 2.9 | Lead promotion on `interested` reads knock + follow_up_at |
| 2.10 | Re-knock warnings |

### Reference SQL — follow_up migration

```sql
alter table public.door_knocks
  add column if not exists follow_up_at timestamptz null;

comment on column public.door_knocks.follow_up_at is
  'Optional rep follow-up reminder for this knock (FR57); lead follow_ups table is separate (Epic 4).';
```

### Reference SQL — create knock RPC (optional but recommended)

```sql
create or replace function public.create_knock_with_contact(
  p_lat double precision,
  p_lng double precision,
  p_outcome public.door_outcome,
  p_notes text,
  p_follow_up_at timestamptz
)
returns table (
  id uuid,
  lat double precision,
  lng double precision,
  outcome public.door_outcome,
  knocked_at timestamptz
)
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_rep_id uuid := auth.uid();
  v_contact_id uuid;
begin
  if v_rep_id is null then
    raise exception 'Not authenticated';
  end if;

  insert into public.contacts (lat, lng, created_by)
  values (p_lat, p_lng, v_rep_id)
  returning id into v_contact_id;

  return query
  insert into public.door_knocks (
    contact_id, rep_id, outcome, notes, lat, lng, follow_up_at, synced
  )
  values (
    v_contact_id, v_rep_id, p_outcome, p_notes, p_lat, p_lng, p_follow_up_at, true
  )
  returning door_knocks.id, door_knocks.lat, door_knocks.lng,
            door_knocks.outcome, door_knocks.knocked_at;
end;
$$;
```

Grant execute to `authenticated`. Revoke from `public`. Use `as never` cast pattern if needed for Supabase client RPC typing.

### Testing (this story)

- **Required:** `npm run build`, `npm run lint`
- **Manual:** Start shift → tap map → select outcome → save → pin on map with correct color
- **Manual:** Save with notes + follow-up → verify rows in Supabase (`door_knocks.follow_up_at`, `contacts.lat/lng`)
- **Manual:** API POST without active shift → 403
- **No** Playwright unless trivial

### Project Structure Notes

New/ modified files:

```
supabase/migrations/*_door_knocks_follow_up_at.sql
supabase/migrations/*_create_knock_with_contact_rpc.sql  (optional)
src/lib/validators/knocks.ts
src/lib/geo/door-outcome-colors.ts          (labels)
src/features/knocks/create-knock.ts
src/features/knocks/api.ts
src/features/knocks/use-create-knock.ts     (optional)
src/features/knocks/use-map-knocks.ts       (refreshKey)
src/app/api/v1/knocks/route.ts              (POST)
src/components/rep/door-outcome-sheet.tsx
src/app/(rep)/rep/map/rep-map-shift-shell.tsx
src/components/rep/map-canvas.tsx           (refreshKey passthrough)
src/types/supabase.generated.ts
```

### References

- [Source: `_bmad-output/planning-artifacts/epics.md` — Story 2.5]
- [Source: `docs/Solar_CRM_PRD_v1.md` — §4.2 Door Outcome Form, §5 DoorKnock/Contact]
- [Source: `_bmad-output/planning-artifacts/architecture.md` — POST /knocks, contact-first flow]
- [Source: `_bmad-output/implementation-artifacts/2-4-tap-to-log-a-door-knock.md` — sheet shell, draft]
- [Source: `_bmad-output/implementation-artifacts/2-1-contacts-and-doorknocks-schema.md` — RLS, follow_up_at deferred]
- [Source: `src/components/rep/door-outcome-sheet.tsx`]
- [Source: `src/app/api/v1/knocks/route.ts`]

## Dev Agent Record

### Agent Model Used

Composer

### Debug Log References

- Applied `follow_up_at` and `create_knock_with_contact` migrations via Supabase MCP.

### Completion Notes List

- `POST /api/v1/knocks` with active-shift gate; atomic `create_knock_with_contact` RPC (contact + knock).
- Door outcome sheet: 2×3 outcome grid (PRD colors/labels), notes, optional follow-up, Save/Cancel with inline errors.
- `knockRefreshKey` bumps `useMapKnocks` refetch after save; sheet closes on success.
- `npm run build` and `npm run lint` pass.

### File List

- `supabase/migrations/20260603150000_door_knocks_follow_up_at.sql` (new)
- `supabase/migrations/20260603150100_create_knock_with_contact_rpc.sql` (new)
- `src/lib/validators/knocks.ts` (modified)
- `src/lib/geo/door-outcome-colors.ts` (modified)
- `src/features/knocks/create-knock.ts` (new)
- `src/features/knocks/api.ts` (modified)
- `src/features/knocks/use-map-knocks.ts` (modified)
- `src/app/api/v1/knocks/route.ts` (modified)
- `src/components/rep/door-outcome-sheet.tsx` (modified)
- `src/components/rep/map-canvas.tsx` (modified)
- `src/app/(rep)/rep/map/rep-map-shift-shell.tsx` (modified)
- `src/types/supabase.generated.ts` (modified)

## Change Log

- 2026-06-03: Story 2.5 — door outcome form, POST knocks, follow_up_at, map pin refresh.
- 2026-06-03: Code review patches — sheet key on draft change, notes maxLength, follow-up validation.

### Senior Developer Review (AI)

**Outcome:** Approve (after patches)  
**Date:** 2026-06-03  
**Layers:** Blind Hunter, Edge Case Hunter, Acceptance Auditor (inline)

**Summary:** FR10/11 knock submit complete. Patches: reset form when draft coords change, notes maxLength, invalid follow-up blocked with error.

## Story Completion Status

- **Status:** done
- **Completion note:** All ACs satisfied; code review patches applied; build and lint pass.
