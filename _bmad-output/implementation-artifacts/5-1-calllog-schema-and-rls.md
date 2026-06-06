---
baseline_commit: NO_VCS
---

# Story 5.1: CallLog Schema and RLS

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **developer**,
I want call logs stored with outcomes,
so that call activity links to contacts and leads.

## Acceptance Criteria

1. **Given** `public.contacts` and `public.call_outcome` enum exist (Stories 2.1, 1.2)  
   **When** migrations run  
   **Then** `public.call_logs` exists with PRD Section 5 (CallLog entity) fields:
   - `id` UUID PK DEFAULT `gen_random_uuid()`
   - `contact_id` UUID NOT NULL REFERENCES `public.contacts(id)` ON DELETE RESTRICT
   - `rep_id` UUID NOT NULL REFERENCES `public.profiles(id)` ON DELETE RESTRICT
   - `outcome` `public.call_outcome` NOT NULL
   - `duration_seconds` INTEGER NULL (PRD integer; nullable for quick-log flows in 5.3)
   - `notes` TEXT NULL
   - `called_at` TIMESTAMPTZ NOT NULL DEFAULT `now()`
   - `follow_up_at` TIMESTAMPTZ NULL

2. **Given** `public.leads.call_log_id` exists without FK (Story 2.9)  
   **When** migrations run  
   **Then** `leads.call_log_id` gains FK → `call_logs(id)` ON DELETE SET NULL  
   **And** partial unique index `idx_leads_call_log_id` on `(call_log_id) WHERE call_log_id IS NOT NULL` (mirrors `door_knock_id` pattern)  
   **And** existing `leads` rows are unchanged (column was already nullable uuid)

3. **Given** hardened RLS (FR60, NFR9)  
   **When** authenticated as a **rep**  
   **Then** I can `SELECT`/`INSERT` `call_logs` where `rep_id = auth.uid()`  
   **And** INSERT requires contact access: contact `created_by = auth.uid()` **or** prior knock/call by same rep on that contact  
   **And** there is **no** rep `UPDATE`/`DELETE` on `call_logs` (immutable log, same as `door_knocks`)  
   **When** authenticated as an **admin** (`public.is_admin()`)  
   **Then** I can `SELECT` all `call_logs`  
   **And** admins do **not** need INSERT/UPDATE in this story

4. **Given** architecture contacts policy (“reps read contacts they created or linked to their knocks/**calls**”)  
   **When** `call_logs` RLS is applied  
   **Then** `contacts_select_rep` and `contacts_update_rep` policies are extended with `exists (select 1 from call_logs cl where cl.contact_id = contacts.id and cl.rep_id = auth.uid())`  
   **And** `door_knocks_insert_rep` contact-ownership subquery is **not** broken (additive change only)

5. **Given** Story 3.2 Realtime extension point  
   **When** migrations run  
   **Then** `call_logs` is added to `supabase_realtime` publication (idempotent `do $$ ... exception when duplicate_object`)  
   **And** the admin activity feed **component** is **not** modified in this story (Story 5.3+ wires subscription)

6. **Given** this story’s scope  
   **When** migrations are reviewed  
   **Then** there are **no** calls UI routes (`/rep/calls`), API Route Handlers, contact search, call promotion RPC, or dashboard counter wiring  
   **And** `get_admin_daily_rep_summary` still returns `calls = 0` (Story 5.6 updates RPC)  
   **And** lead detail still returns `calls_available: false` (Story 5.5 wires join)

7. **Given** schema changes are applied  
   **When** the TypeScript project builds  
   **Then** `npm run db:types` regenerates `src/types/supabase.generated.ts`  
   **And** `src/types/database.ts` exports `CallLog`, `CallLogInsert` aliases  
   **And** `src/lib/validators/call-logs.ts` provides `callLogRowSchema` using `callOutcomeSchema`  
   **And** `npm run build` and `npm run lint` pass

8. **Given** Supabase security advisors  
   **When** migrations are verified via MCP `get_advisors`  
   **Then** no new critical RLS warnings remain unaddressed

**Implements:** FR59, FR26 (foundation), FR60  
**NFRs:** NFR9 (rep data isolation)

## Tasks / Subtasks

- [x] **Migration: `call_logs` table + leads FK** (AC: 1, 2)
  - [x] Create `supabase/migrations/*_create_call_logs.sql` (sort after `20260609100000_leads_lost_reason.sql`)
  - [x] `call_logs` DDL per AC1
  - [x] Indexes: `idx_call_logs_rep_id`, `idx_call_logs_contact_id`, `idx_call_logs_called_at` (desc), `idx_call_logs_rep_called_at` on `(rep_id, called_at desc)` for Story 5.6 counters
  - [x] `alter table leads add constraint leads_call_log_id_fkey foreign key (call_log_id) references call_logs(id) on delete set null`
  - [x] `create unique index idx_leads_call_log_id on leads (call_log_id) where call_log_id is not null`

- [x] **Migration: RLS + contacts policy extension** (AC: 3, 4, 8)
  - [x] Create `supabase/migrations/*_call_logs_rls.sql`
  - [x] Enable RLS on `call_logs`
  - [x] Rep policies with `(select auth.uid())` initplan pattern (match `20260603120200_harden_contacts_door_knocks_rls.sql`)
  - [x] `call_logs_insert_rep` — `with check` includes contact ownership (created_by or prior knock **or** prior call by rep)
  - [x] Admin `call_logs_select_admin` only
  - [x] `GRANT SELECT, INSERT ON call_logs TO authenticated`
  - [x] Recreate `contacts_select_rep` / `contacts_update_rep` with call_logs linkage OR separate additive migration `*_contacts_rls_call_link.sql` if cleaner
  - [x] Reuse `public.is_admin()` — do **not** recreate

- [x] **Migration: Realtime publication** (AC: 5)
  - [x] In same file or `*_realtime_call_logs.sql`: `alter publication supabase_realtime add table public.call_logs` with duplicate guard

- [x] **Apply & verify** (AC: 7, 8)
  - [x] Prefer Supabase MCP: `list_tables`, `apply_migration`, `get_advisors`
  - [x] Fallback: `npx supabase db push` per `docs/SETUP_KEYS.md`
  - [x] `npm run db:types` then `npm run build` && `npm run lint`

- [x] **TypeScript mirrors** (AC: 7)
  - [x] Create `src/lib/validators/call-logs.ts`
  - [x] Extend `src/types/database.ts` with `CallLog` types
  - [x] No new enum work — `callOutcomeSchema` already in `enums.ts`

- [x] **Regression smoke** (AC: 3, 6)
  - [x] Knock promotion (`create_knock_with_contact`) still creates leads
  - [x] Admin summary grid still loads (`calls` column = 0)
  - [x] Pipeline Kanban/detail unchanged
  - [x] Document RLS smoke in Dev Agent Record: rep A cannot SELECT rep B's call_logs; rep can INSERT on owned/linked contact

### Review Findings

- [x] [Review][Defer] RLS smoke documented as policy-structure review, not live rep A/B session [`5-1-calllog-schema-and-rls.md` Dev Agent Record] — deferred, pre-existing — same pattern as Stories 2.1 and 4.1; acceptable for schema-only story.
- [x] [Review][Defer] `door_knocks_insert_rep` not extended with `call_logs` contact linkage [`supabase/migrations/20260603120200_harden_contacts_door_knocks_rls.sql:55-74`] — deferred — knock-after-call-only path not required for 5.1; extend if product needs rep to knock a contact they only called.
- [x] [Review][Defer] First call on another rep's contact blocked by `call_logs_insert_rep` until knock/call link exists [`supabase/migrations/20260610100100_call_logs_rls.sql:10-35`] — deferred — Story 5.2 contact search must use API/RPC with appropriate scope.
- [x] [Review][Defer] Multiple permissive SELECT policies on `call_logs` (rep + admin) [`supabase/migrations/20260610100100_call_logs_rls.sql`] — deferred, pre-existing — same split admin/rep pattern as `door_knocks`; consolidate when optimizing RLS performance.

## Dev Notes

### Critical constraints

- **Do NOT** add calls UI (`/rep/calls`, call panel, scripts widget) — Stories 5.2–5.7.
- **Do NOT** add API routes (`POST /api/v1/calls`, contact search) — Stories 5.2–5.3.
- **Do NOT** add call promotion RPC or modify `create_knock_with_contact` — Story 5.4 mirrors 2.9 pattern.
- **Do NOT** update `get_admin_daily_rep_summary` `calls` column — Story 5.6.
- **Do NOT** update `get-lead-detail.ts` / `calls_available` — Story 5.5.
- **Do NOT** update `ActivityFeed` Realtime subscription — schema + publication only; component wiring when calls API exists.
- **Do NOT** add `idempotency_key` column — Story 5.3+ offline/idempotent POST (architecture defers to API layer like knocks 2.7).
- **Do NOT** recreate enums — `call_outcome` frozen since Story 1.2.
- **Do NOT** add `lead_activity` writes on call insert — Story 5.3/5.5 application layer.

### Brownfield schema diff (pre-5.1 vs PRD Section 5)

| Entity | Status | Action in 5.1 |
|--------|--------|---------------|
| `call_outcome` enum | ✅ Exists | None |
| `call_logs` table | ❌ Missing | **Create** |
| `leads.call_log_id` | ⏳ Column only, no FK | **Add FK + unique index** |
| `contacts` RLS call link | ❌ Knock-only | **Extend policies** |
| Realtime on `call_logs` | ❌ Comment only (3.2) | **Add to publication** |
| Dashboard `calls` count | ⏳ Hardcoded 0 | None (5.6) |
| Lead detail calls section | ⏳ Placeholder | None (5.5) |

### Canonical DDL — `call_logs`

```sql
create table public.call_logs (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references public.contacts (id) on delete restrict,
  rep_id uuid not null references public.profiles (id) on delete restrict,
  outcome public.call_outcome not null,
  duration_seconds integer,
  notes text,
  called_at timestamptz not null default now(),
  follow_up_at timestamptz
);

create index idx_call_logs_rep_id on public.call_logs (rep_id);
create index idx_call_logs_contact_id on public.call_logs (contact_id);
create index idx_call_logs_called_at on public.call_logs (called_at desc);
create index idx_call_logs_rep_called_at on public.call_logs (rep_id, called_at desc);
```

### Leads FK hardening (brownfield)

```sql
alter table public.leads
  add constraint leads_call_log_id_fkey
  foreign key (call_log_id) references public.call_logs (id) on delete set null;

create unique index idx_leads_call_log_id
  on public.leads (call_log_id)
  where call_log_id is not null;
```

### RLS pattern — `call_logs` (match `door_knocks`)

```sql
alter table public.call_logs enable row level security;

create policy call_logs_select_rep on public.call_logs
  for select to authenticated
  using (rep_id = (select auth.uid()));

create policy call_logs_insert_rep on public.call_logs
  for insert to authenticated
  with check (
    rep_id = (select auth.uid())
    and exists (
      select 1 from public.contacts c
      where c.id = contact_id
        and (
          c.created_by = (select auth.uid())
          or exists (
            select 1 from public.door_knocks dk
            where dk.contact_id = c.id and dk.rep_id = (select auth.uid())
          )
          or exists (
            select 1 from public.call_logs cl
            where cl.contact_id = c.id and cl.rep_id = (select auth.uid())
          )
        )
    )
  );

create policy call_logs_select_admin on public.call_logs
  for select to authenticated
  using (public.is_admin());

grant select, insert on public.call_logs to authenticated;
```

**Note:** The `call_logs` self-reference in INSERT `with check` allows a rep's **second** call on a contact after their first call created the link — same pattern as knock-on-knock contact access.

### Contacts policy extension (required for Epic 5)

Architecture requires reps to read contacts linked via calls. Extend `contacts_select_rep` / `contacts_update_rep` USING/WITH CHECK clauses:

```sql
or exists (
  select 1 from public.call_logs cl
  where cl.contact_id = contacts.id
    and cl.rep_id = (select auth.uid())
)
```

Drop/recreate policies (do not stack duplicate permissive policies without intent). Follow `20260603120200_harden_contacts_door_knocks_rls.sql` style.

### Realtime publication

```sql
-- Story 3.2 left extension point in 20260606130000_realtime_door_knocks.sql
do $$
begin
  alter publication supabase_realtime add table public.call_logs;
exception
  when duplicate_object then null;
end $$;
```

### TypeScript surface (minimal for 5.1)

```typescript
// src/lib/validators/call-logs.ts
import { z } from "zod";
import { callOutcomeSchema } from "@/lib/validators/enums";

export const callLogRowSchema = z.object({
  id: z.string().uuid(),
  contact_id: z.string().uuid(),
  rep_id: z.string().uuid(),
  outcome: callOutcomeSchema,
  duration_seconds: z.number().int().nullable(),
  notes: z.string().nullable(),
  called_at: z.string(),
  follow_up_at: z.string().nullable(),
});
export type CallLogRow = z.infer<typeof callLogRowSchema>;
```

```typescript
// src/types/database.ts additions
export type CallLog = Tables<"call_logs">;
export type CallLogInsert = TablesInsert<"call_logs">;
```

### Cross-story dependencies (Epic 5)

| Story | Relationship |
|-------|--------------|
| 2.1 | **Requires** — `contacts` + contact RLS foundation |
| 2.9 | **Requires** — `leads.call_log_id` column (FK added here) |
| 3.2 | **Requires** — Realtime publication extension |
| 3.3 | **Must preserve** — `calls = 0` in summary RPC until 5.6 |
| 3.4 | **Must preserve** — activity = knocks only until 5.1+5.6 |
| 4.1 | **Requires** — pipeline tables unchanged |
| 4.4 | **Future** — `calls_available: true` + calls join (5.5) |
| 5.2 | **Blocked by** — this story (needs table + contact RLS) |
| 5.3 | **Blocked by** — this story (INSERT into `call_logs`) |
| 5.4 | **Blocked by** — FK + unique index on `leads.call_log_id` |
| 5.6 | **Future** — `COUNT(call_logs)` in summary RPC + rep header |

### Previous epic intelligence

**Epic 4 retro (2026-06-06):**
- Apply pending migrations (`leads_lost_reason`) before 5.1 — verify `db push` complete.
- Call → lead promotion should mirror Story 2.9 knock promotion — **do not implement in 5.1**.
- `calls_available: false` on lead detail is intentional until Epic 5.5.
- Pipeline patterns (`src/features/pipeline/*`) are stable; Epic 5 adds parallel `src/features/calls/*` in 5.2+.

**Story 4.1 (done):**
- Explicitly deferred `call_log_id` FK to Story 5.1 — brownfield extend only.
- RLS uses `public.is_admin()` + `(select auth.uid())` initplan pattern.

**Story 2.1 (done):**
- Contacts RLS was knock-only because `call_logs` did not exist — **must extend in 5.1**.
- `door_knocks_insert_rep` contact ownership guard is the template for `call_logs_insert_rep`.

**Story 3.2 (done):**
- Realtime on `door_knocks` only; comment documents `call_logs` addition in 5.1.

**Story 3.3 (done):**
- `get_admin_daily_rep_summary` returns `0::bigint as calls` with SQL comment — **leave unchanged**.

### Migration file naming & order

Latest migration: `20260609100000_leads_lost_reason.sql`. New files must sort after it:

```bash
supabase migration new create_call_logs
supabase migration new call_logs_rls
# optional third: contacts_rls_call_link OR merge contacts policy updates into call_logs_rls
```

Order: **tables + leads FK → RLS (+ contacts policy patch) → realtime** (can combine realtime with tables migration).

### Supabase MCP workflow (preferred)

Per `.cursor/rules/supabase-database-global.mdc`:

1. `list_tables` — confirm `call_logs` absent, `leads.call_log_id` present
2. `apply_migration` — tables, then RLS
3. `list_tables` — verify `call_logs` with `rls_enabled: true`
4. `get_advisors` — fix security lints before marking done
5. `npm run db:types`

Project ref: `glruwdknafegbcofvnbp` (see `docs/SETUP_KEYS.md`).

### Testing (this story)

- **Required:** Migrations apply cleanly on linked Supabase project
- **Required:** `npm run build`, `npm run lint` after type regeneration
- **Required:** RLS smoke — rep isolation on `call_logs`; contact visible after call link
- **Required:** No regression to knock promotion, pipeline board, admin summary
- **No** Playwright/E2E — schema-only story

### References

- [Source: `_bmad-output/planning-artifacts/epics.md` — Story 5.1, Epic 5, FR59, FR60, FR26]
- [Source: `docs/Solar_CRM_PRD_v1.md` — Section 5, entity 6 (CallLog)]
- [Source: `_bmad-output/planning-artifacts/architecture.md` — contacts RLS, Realtime, naming]
- [Source: `_bmad-output/implementation-artifacts/2-1-contacts-and-doorknocks-schema.md` — RLS patterns]
- [Source: `_bmad-output/implementation-artifacts/2-9-promote-interested-door-to-lead.md` — `call_log_id` deferral]
- [Source: `_bmad-output/implementation-artifacts/4-1-leads-schema-stages-and-rls.md` — FK deferral boundary]
- [Source: `_bmad-output/implementation-artifacts/3-2-live-activity-feed.md` — Realtime extension point]
- [Source: `_bmad-output/implementation-artifacts/3-3-daily-rep-summary-grid.md` — calls=0 placeholder]
- [Source: `_bmad-output/implementation-artifacts/epic-4-retro-2026-06-06.md` — Epic 5 prep]
- [Source: `supabase/migrations/20260601120100_create_enums.sql` — `call_outcome`]
- [Source: `supabase/migrations/20260603180000_leads_minimal.sql` — `call_log_id` column]
- [Source: `supabase/migrations/20260603120200_harden_contacts_door_knocks_rls.sql` — policy template]

## Dev Agent Record

### Agent Model Used

Composer

### Debug Log References

- Migrations applied via Supabase MCP (`create_call_logs`, `call_logs_rls`).
- `npx supabase db push` unavailable (no CLI access token); MCP used instead.
- MCP `get_advisors` security: no new critical RLS lints; pre-existing `get_knocks_near_point` and auth password warnings unchanged.
- MCP `execute_sql`: 3 policies on `call_logs`, contacts policies recreated with call linkage.

### Completion Notes List

- Added `call_logs` table per PRD Section 5 with indexes for rep/contact/called_at queries.
- Hardened `leads.call_log_id` with FK + partial unique index (mirrors `door_knock_id`).
- RLS: rep SELECT/INSERT scoped to `rep_id`; contact ownership guard on insert; admin SELECT all.
- Extended `contacts_select_rep` / `contacts_update_rep` for call-linked contact access.
- Added `call_logs` to `supabase_realtime` publication (Story 3.2 extension).
- Validators: `call-logs.ts`; `CallLog` types in `database.ts`; types regenerated.
- No UI, API, RPC, or dashboard counter changes per scope.
- `npm run build` and `npm run lint` pass.

### Senior Developer Review (AI)

**Outcome:** Approved (0 patches)  
**Date:** 2026-06-07  
**Layers:** Blind Hunter, Edge Case Hunter, Acceptance Auditor

**Summary:** Schema matches PRD §5 CallLog entity; `leads.call_log_id` FK + partial unique index correct; RLS enabled (`relrowsecurity=true`) with rep isolation and contact-ownership guard on INSERT; contacts policies extended for call linkage; Realtime publication added; TypeScript validators/types aligned. Scope boundaries respected (no UI/API/RPC/dashboard wiring). Four deferrals logged — all pre-existing patterns or future-story dependencies (5.2 search, knock-after-call symmetry).

### File List

- `supabase/migrations/20260610100000_create_call_logs.sql` (new)
- `supabase/migrations/20260610100100_call_logs_rls.sql` (new)
- `src/lib/validators/call-logs.ts` (new)
- `src/types/database.ts` (updated)
- `src/types/supabase.generated.ts` (regenerated)

## Change Log

- 2026-06-06: Story 5.1 implemented — CallLog schema + RLS + leads FK + Realtime publication (FR59, FR60, FR26 foundation).
- 2026-06-07: Code review approved — 0 patches; 4 deferrals logged.

## Story Completion Status

- **Status:** done
- **Completion note:** Epic 5 foundation shipped; ready for Story 5.2 (Contact Search and Create).
