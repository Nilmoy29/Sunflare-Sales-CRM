---
baseline_commit: NO_VCS
---

# Story 2.9: Promote Interested Door to Lead

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **rep**,
I want Interested or Callback knocks to create pipeline leads,
so that hot prospects enter follow-up immediately.

## Acceptance Criteria

1. **Given** the `leads` table does not exist yet  
   **When** migrations run  
   **Then** a **minimal** `public.leads` table is created per PRD Section 5 (Lead entity): `id`, `contact_id`, `rep_id`, `source`, `stage`, `door_knock_id`, `call_log_id` (nullable, no FK until Story 5.1), `created_at`, `updated_at`  
   **And** `source` uses frozen enum `lead_source` (`d2d`, `call`)  
   **And** `stage` uses frozen enum `lead_stage`  
   **And** a partial unique index on `door_knock_id` WHERE NOT NULL prevents duplicate leads per knock  
   **And** minimal RLS: reps `SELECT`/`INSERT` own leads (`rep_id = auth.uid()`); admins `SELECT` all  
   **And** `lead_activity` and `follow_ups` tables are **not** created (Story 4.1)

2. **Given** I save a knock with outcome `interested` or `callback_requested` during an active shift  
   **When** `POST /api/v1/knocks` succeeds  
   **Then** a `leads` row is created atomically with the knock (FR15, FR37, FR54)  
   **And** `source = 'd2d'`, `stage = 'interested'`, `rep_id = auth.uid()`  
   **And** `contact_id` and `door_knock_id` link to the rows created by `create_knock_with_contact`  
   **And** the API response includes optional `lead: { id, stage, source }` when promotion occurred  
   **And** knocks with other outcomes do **not** create leads

3. **Given** a pending knock with outcome `interested` or `callback_requested` is synced offline  
   **When** `POST /api/v1/knocks/sync` replays the knock  
   **Then** lead promotion runs in the same RPC path (no separate client step)  
   **And** idempotent replay returns the existing knock **and** does not create a duplicate lead  
   **And** sync result may include `lead` when promotion occurred

4. **Given** the door outcome sheet is open  
   **When** I select `interested` or `callback_requested`  
   **Then** a non-blocking hint shows the knock will add to the pipeline (FR15 one-tap — no extra confirm modal)  
   **And** on successful save, feedback mentions pipeline when a lead was created  
   **And** other outcomes show no promotion hint

5. **Given** implementation scope for this story  
   **When** reviewing the diff  
   **Then** there is **no** Kanban/pipeline UI, `lead_activity`, `follow_ups`, or re-knock warning (Stories 4.1–4.2, 2.10)  
   **And** Story 2.7 offline queue, 2.8 PWA, and online knock flow still work  
   **And** `npm run build` and `npm run lint` pass

**Implements:** FR15, FR37, FR54  
**NFRs:** NFR9 (rep-scoped lead RLS)

## Tasks / Subtasks

- [x] **Migration: minimal `leads` table** (AC: 1)
  - [x] Create `supabase/migrations/*_leads_minimal.sql`
  - [x] Table columns per PRD + `updated_at` with `default now()`
  - [x] FK: `contact_id` → `contacts`, `rep_id` → `profiles`, `door_knock_id` → `door_knocks` ON DELETE SET NULL
  - [x] `call_log_id uuid null` — no FK until `call_logs` exists (Story 5.1)
  - [x] Index: `idx_leads_rep_id`, partial unique `idx_leads_door_knock_id` on `door_knock_id` WHERE NOT NULL
  - [x] Apply via Supabase MCP; `npm run db:types`

- [x] **Migration: leads RLS** (AC: 1, NFR9)
  - [x] Create `supabase/migrations/*_leads_rls.sql`
  - [x] Enable RLS on `leads`
  - [x] Rep: `SELECT` + `INSERT` where `rep_id = auth.uid()`
  - [x] Admin: `SELECT` all via `public.is_admin()`
  - [x] No rep `UPDATE`/`DELETE` in this story (Epic 4 governance)
  - [x] `GRANT SELECT, INSERT ON leads TO authenticated`

- [x] **Extend `create_knock_with_contact` RPC** (AC: 2, 3)
  - [x] Create `supabase/migrations/*_create_knock_with_contact_lead.sql`
  - [x] After knock insert, when `p_outcome IN ('interested', 'callback_requested')`:
    - Insert lead: `source := 'd2d'`, `stage := 'interested'`, link `contact_id`, `door_knock_id`, `rep_id`
    - Use `ON CONFLICT` or pre-check on `door_knock_id` for idempotency
  - [x] On idempotency duplicate knock path: look up existing lead by `door_knock_id` and return it
  - [x] Extend return columns: `lead_id uuid`, `lead_created boolean` (false when not promotable or already existed)
  - [x] Keep `security invoker`; rep must own knock

- [x] **Validators + types** (AC: 2, 3)
  - [x] Create `src/lib/validators/leads.ts` — `leadSummarySchema`, `PROMOTABLE_DOOR_OUTCOMES` constant
  - [x] Extend `src/lib/validators/knocks.ts` — optional `lead` on create/sync responses
  - [x] Update `src/types/database.ts` — `Lead`, `LeadInsert`, `LeadUpdate` exports
  - [x] Update `src/lib/validators/enums.ts` if needed (enums already frozen)

- [x] **Server + client parsing** (AC: 2, 3)
  - [x] Update `src/features/knocks/create-knock.ts` — parse `lead_id`, `lead_created`; return `lead` summary
  - [x] Update `src/app/api/v1/knocks/route.ts` — include `lead` in `{ data }` when present
  - [x] Update `src/app/api/v1/knocks/sync/route.ts` — pass `lead` through sync results
  - [x] Update `src/features/knocks/api.ts` — `createKnock` returns `{ knock, lead? }`

- [x] **Door outcome sheet UX** (AC: 4, FR15)
  - [x] Update `src/components/rep/door-outcome-sheet.tsx`:
    - Show hint when `selectedOutcome` ∈ `PROMOTABLE_DOOR_OUTCOMES`: e.g. "Adds to pipeline"
    - On success, if `lead` returned, show "Knock saved · Added to pipeline" (or equivalent)
    - Offline pending path: no client-side lead creation; promotion happens on sync (no UI change needed beyond hint)

- [x] **Verify** (AC: 5)
  - [x] Manual: Save `interested` knock → `leads` row in DB with `source=d2d`, linked IDs
  - [x] Manual: Save `not_home` knock → no lead row
  - [x] Manual: Offline `callback_requested` → sync → lead created once
  - [x] Manual: Replay sync (duplicate idempotency) → one lead, one knock
  - [x] `npm run build` && `npm run lint`

### Review Findings

- [x] [Review][Defer] No post-sync pipeline toast after offline queue drains [`use-knock-sync-loop.ts`] — AC4 satisfied on save (anticipatory offline message); optional confirmation when sync creates lead can wait for Epic 4 pipeline UI.
- [x] [Review][Defer] `leads.updated_at` has no auto-update trigger [`leads_minimal.sql`] — no UPDATE paths in 2.9; Story 4.1 full leads model can add trigger.

## Dev Notes

### Critical constraints

- **Do NOT** build Kanban board, lead cards, or pipeline routes — Story 4.2.
- **Do NOT** create `lead_activity` or `follow_ups` — Story 4.1 (full model + hardened RLS).
- **Do NOT** add re-knock / duplicate-address warning UI — Story 2.10.
- **Do NOT** promote on offline client before sync — promotion is **server-side only** in RPC.
- **Do NOT** fail knock save if lead insert fails — prefer single RPC transaction so both succeed or both roll back.
- **Do NOT** install TanStack Query / React Hook Form — `fetch` + state + Zod.
- **Do NOT** add `call_log_id` FK — table does not exist until Story 5.1.

### Promotion rules (FR15, FR37)

| Door outcome | Create lead? | `source` | Initial `stage` |
| :--- | :--- | :--- | :--- |
| `interested` | Yes | `d2d` | `interested` |
| `callback_requested` | Yes | `d2d` | `interested` |
| All others | No | — | — |

**One-tap (FR15):** Promotion is automatic on **Save knock** — no second button or confirm modal. The sheet hint sets expectation; save is the single action.

**Creator (FR37):** `rep_id` on the lead row is the creating rep (same as knock `rep_id`).

### RPC extension pattern (reference)

Extend existing `create_knock_with_contact` (Story 2.7 idempotency) — do not bypass with raw inserts from API.

```sql
-- After successful knock insert (v_new_knock_id, v_contact_id):
if p_outcome in ('interested', 'callback_requested') then
  insert into public.leads (
    contact_id, rep_id, source, stage, door_knock_id
  )
  values (
    v_contact_id, v_rep_id, 'd2d', 'interested', v_new_knock_id
  )
  on conflict do nothing  -- via unique index on door_knock_id
  returning id into v_lead_id;
  -- set lead_created flag
end if;
```

On idempotency duplicate path, `select id from leads where door_knock_id = v_existing.id`.

Return shape addition:

```sql
returns table (
  id uuid,
  lat double precision,
  lng double precision,
  outcome public.door_outcome,
  knocked_at timestamptz,
  was_duplicate boolean,
  lead_id uuid,
  lead_created boolean
)
```

### API response shape

**POST `/api/v1/knocks`** — extend success payload:

```json
{
  "data": {
    "knock": { "id": "...", "lat": -33.87, "lng": 151.21, "outcome": "interested", "knocked_at": "..." },
    "lead": { "id": "...", "stage": "interested", "source": "d2d" }
  }
}
```

`lead` omitted or `null` when outcome not promotable.

**POST `/api/v1/knocks/sync`** — optional `lead` per result item when promotion occurred.

### Minimal `leads` DDL (reference)

```sql
create table public.leads (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references public.contacts(id) on delete restrict,
  rep_id uuid not null references public.profiles(id) on delete restrict,
  source public.lead_source not null,
  stage public.lead_stage not null default 'interested',
  door_knock_id uuid references public.door_knocks(id) on delete set null,
  call_log_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index idx_leads_door_knock_id
  on public.leads (door_knock_id)
  where door_knock_id is not null;
```

Enums `lead_source` and `lead_stage` already exist (`20260601120100_create_enums.sql`).

### UI hint (AC: 4)

When `selectedOutcome` is `interested` or `callback_requested`, show below outcome grid:

```
Adds to pipeline when you save
```

Use `text-sm text-emerald-700` or subtle zinc/emerald — non-blocking, no checkbox.

Success feedback examples:
- With lead: "Knock saved · Added to pipeline"
- Without lead: existing "Knock saved" / sheet close behavior

### Files to read before coding (UPDATE)

| File | Current state | This story changes |
| :--- | :--- | :--- |
| `supabase/migrations/20260603170100_create_knock_with_contact_idempotency.sql` | Knock + contact + idempotency | Extend via new migration |
| `src/features/knocks/create-knock.ts` | Parses knock row only | Parse `lead_id`, `lead_created` |
| `src/app/api/v1/knocks/route.ts` | Returns `{ knock }` | Add optional `lead` |
| `src/app/api/v1/knocks/sync/route.ts` | Sync results with knock | Add optional `lead` per result |
| `src/features/knocks/api.ts` | `createKnock` → `KnockPin` | Return lead summary when present |
| `src/components/rep/door-outcome-sheet.tsx` | Save knock only | Promotion hint + success copy |
| `src/lib/validators/knocks.ts` | Knock/sync schemas | Optional lead on responses |
| `src/types/supabase.generated.ts` | No `leads` table | Regenerate after migration |
| `src/types/database.ts` | Contact, DoorKnock aliases | Add Lead aliases |

**Preserve:** Shift gates, offline Dexie queue, geocode fields, PWA shell, map refresh on knock save.

### Previous story intelligence

**Story 2.8:**
- No knock/lead code touched — unrelated.

**Story 2.7:**
- Sync replays via `createKnockWithContact` — extending RPC automatically promotes on sync; no Dexie schema change (outcome already stored).
- Idempotency on `door_knocks` — mirror with unique `door_knock_id` on leads.

**Story 2.5:**
- Explicitly deferred lead creation on `interested` — **implement now**.
- `follow_up_at` on knock is separate from Epic 4 `follow_ups` table — do not create `follow_ups` rows.

**Story 2.1:**
- `leads` table intentionally omitted — **add minimal version now**; full activity log in 4.1.

### Cross-story dependencies

| Story | Relationship |
| :--- | :--- |
| 2.5–2.7 | **Requires** — knock create + sync RPC paths |
| 2.10 | Re-knock history separate from lead promotion |
| 4.1 | Expands leads model (`lead_activity`, `follow_ups`, full RLS) — do not duplicate |
| 4.2 | Pipeline UI consumes leads created here |
| 5.4 | Call-sourced promotion (`source=call`) — parallel pattern later |

### Testing (this story)

- **Required:** `npm run build`, `npm run lint`, `npm run db:types` after migrations
- **Manual:** Online `interested` → verify lead in Supabase table
- **Manual:** Online `not_home` → no lead
- **Manual:** Offline `callback_requested` → sync → lead appears
- **Manual:** Duplicate sync → single lead
- **No** Playwright unless trivial

### Project Structure Notes

New / modified files:

```
supabase/migrations/*_leads_minimal.sql
supabase/migrations/*_leads_rls.sql
supabase/migrations/*_create_knock_with_contact_lead.sql
src/lib/validators/leads.ts                         (new)
src/lib/validators/knocks.ts                        (response schemas)
src/types/database.ts                               (Lead aliases)
src/types/supabase.generated.ts                     (regenerated)
src/features/knocks/create-knock.ts                   (lead parsing)
src/app/api/v1/knocks/route.ts                      (response)
src/app/api/v1/knocks/sync/route.ts                 (response)
src/features/knocks/api.ts                            (client types)
src/components/rep/door-outcome-sheet.tsx             (hint + feedback)
```

Optional: `src/features/leads/` folder with `promotable-outcomes.ts` re-export — only if it reduces duplication; otherwise keep `PROMOTABLE_DOOR_OUTCOMES` in `validators/leads.ts`.

### References

- [Source: `_bmad-output/planning-artifacts/epics.md` — Story 2.9, FR15, FR37]
- [Source: `docs/Solar_CRM_PRD_v1.md` — Section 5 Lead entity]
- [Source: `supabase/migrations/20260601120100_create_enums.sql` — lead_source, lead_stage]
- [Source: `supabase/migrations/20260603170100_create_knock_with_contact_idempotency.sql`]
- [Source: `_bmad-output/implementation-artifacts/2-5-door-outcome-form-and-submission.md` — deferred promotion]
- [Source: `_bmad-output/implementation-artifacts/2-7-offline-knock-queue-and-sync.md` — sync RPC path]
- [Source: `src/components/rep/door-outcome-sheet.tsx`]
- [Source: `src/features/knocks/create-knock.ts`]

## Dev Agent Record

### Agent Model Used

Composer

### Debug Log References

- Applied `leads_minimal`, `leads_rls`, `create_knock_with_contact_lead` migrations via Supabase MCP.

### Completion Notes List

- Minimal `leads` table + RLS; promotion in `create_knock_with_contact` for `interested` / `callback_requested`.
- API returns optional `lead` on knock create and sync; one-tap UX hint + save notice banner.
- `npm run build`, `npm run lint`, and `npm run db:types` pass.

### File List

- `supabase/migrations/20260603180000_leads_minimal.sql` (new)
- `supabase/migrations/20260603180100_leads_rls.sql` (new)
- `supabase/migrations/20260603180200_create_knock_with_contact_lead.sql` (new)
- `src/lib/validators/leads.ts` (new)
- `src/lib/validators/knocks.ts` (modified)
- `src/types/database.ts` (modified)
- `src/types/supabase.generated.ts` (modified)
- `src/features/knocks/create-knock.ts` (modified)
- `src/features/knocks/api.ts` (modified)
- `src/features/knocks/submit-knock.ts` (modified)
- `src/app/api/v1/knocks/route.ts` (modified)
- `src/app/api/v1/knocks/sync/route.ts` (modified)
- `src/components/rep/door-outcome-sheet.tsx` (modified)
- `src/app/(rep)/rep/map/rep-map-shift-shell.tsx` (modified)

## Change Log

- 2026-06-03: Story 2.9 — minimal leads table, D2D promotion in knock RPC, pipeline UX hints.

### Senior Developer Review (AI)

**Outcome:** Approve  
**Date:** 2026-06-03  
**Layers:** Blind Hunter, Edge Case Hunter, Acceptance Auditor (inline)

**Summary:** All ACs met. Atomic RPC promotion for `interested`/`callback_requested`, idempotent lead dedup via partial unique index, one-tap UX. No patches required.

## Story Completion Status

- **Status:** done
- **Completion note:** All ACs satisfied; clean code review; build and lint pass.
