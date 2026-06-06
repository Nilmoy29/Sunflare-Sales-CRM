---
baseline_commit: NO_VCS
---

# Story 5.4: Promote Call to Lead

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **rep**,
I want interested calls to become pipeline leads,
so that phone prospects enter the same funnel as doors.

## Acceptance Criteria

1. **Given** I logged a call on `/rep/calls` with outcome `answered_interested` or `callback_scheduled` (Story 5.3)  
   **When** the call is saved successfully  
   **Then** I see a **Promote to pipeline** affordance for that call (FR27)  
   **And** non-promotable outcomes (`voicemail`, `no_answer`, etc.) do **not** show promote  
   **And** the promote control meets 44×44px tap targets (NFR6)

2. **Given** a promotable call is shown with the promote affordance  
   **When** I tap **Promote to pipeline**  
   **Then** `POST /api/v1/calls/[callLogId]/promote` creates a `leads` row (FR27, FR37)  
   **And** `source = 'call'`, `stage = 'interested'`, `rep_id = auth.uid()`  
   **And** `contact_id` and `call_log_id` link to the call log row  
   **And** the API returns `{ data: { lead: LeadSummary, created: boolean } }`

3. **Given** a lead already exists for `call_log_id` (partial unique index from Story 5.1)  
   **When** I tap promote again on the same call  
   **Then** the API returns the existing lead with `created: false` (idempotent)  
   **And** no duplicate lead row is created

4. **Given** I tap promote on a call I do not own or that does not exist  
   **When** the API runs  
   **Then** `404 CALL_NOT_FOUND`  
   **When** the call outcome is not promotable  
   **Then** `400 CALL_NOT_PROMOTABLE`

5. **Given** authorization (NFR9, NFR10)  
   **When** an unauthenticated user calls the promote API  
   **Then** `401`  
   **When** an admin calls the promote API  
   **Then** `403 FORBIDDEN` (rep-only)  
   **And** there is **no** active-shift gate (cold-call session, same as Story 5.3)

6. **Given** successful promotion  
   **When** the API returns success  
   **Then** the UI shows confirmation (e.g. "Added to pipeline")  
   **And** the promote button is hidden or disabled for that call (already promoted)  
   **And** the lead appears on the existing rep/admin Kanban (`/rep/pipeline`, `/admin/pipeline`) without pipeline code changes

7. **Given** implementation scope boundaries  
   **When** this story ships  
   **Then** promotion is a **separate tap** after call log — **not** auto-created inside `create_call_log` / `POST /api/v1/calls` (epics: "When I tap promote")  
   **And** there is **no** `lead_activity` write on promote (Story 5.5), activity stream, daily counters, `tel:` dial, or call script widget  
   **And** knock auto-promotion in `create_knock_with_contact` is unchanged  
   **And** `npm run build` and `npm run lint` pass

**Implements:** FR27, FR37  
**NFRs:** NFR6 (tap targets), NFR9 (rep-scoped call + lead), NFR10 (API guards)

## Tasks / Subtasks

- [x] **RPC: `promote_call_to_lead`** (AC: 2, 3, 4)
  - [x] Create `supabase/migrations/*_promote_call_to_lead.sql` (sort after `20260610120000_create_call_log.sql`)
  - [x] `promote_call_to_lead(p_call_log_id uuid)` → `lead_id`, `lead_created`, `contact_id`
  - [x] `security invoker`, `set search_path = public`, require `auth.uid() is not null`
  - [x] Load call where `id = p_call_log_id` and `rep_id = auth.uid()` — else not found
  - [x] Require `outcome IN ('answered_interested', 'callback_scheduled')` — else not promotable
  - [x] Insert lead: `source := 'call'`, `stage := 'interested'`, link `contact_id`, `call_log_id`, `rep_id`
  - [x] `ON CONFLICT (call_log_id) WHERE call_log_id IS NOT NULL DO NOTHING` + lookup existing (mirror 2.9 knock pattern)
  - [x] `grant execute` to `authenticated`; revoke from `public`
  - [x] Apply via Supabase MCP; `npm run db:types`

- [x] **Validators** (AC: 2, 4)
  - [x] Extend `src/lib/validators/leads.ts`:
    - `PROMOTABLE_CALL_OUTCOMES` = `['answered_interested', 'callback_scheduled']`
    - `isPromotableCallOutcome(outcome)` helper
    - `promoteCallResponseSchema` — `{ lead: LeadSummary, created: boolean }`

- [x] **Server: promote call** (AC: 2, 3, 4, 5)
  - [x] Create `src/features/calls/promote-call-to-lead.ts` — call RPC, map errors to domain errors
  - [x] Create `POST /api/v1/calls/[id]/promote/route.ts` — `requireRoleForApi(["rep"])`, validate UUID param
  - [x] Map RPC errors: not found → 404, not promotable → 400

- [x] **Client: promote flow** (AC: 1, 6)
  - [x] Extend `src/features/calls/api.ts` — `promoteCall(callLogId)`
  - [x] Update `CallLogForm` — `onLogged(call: CallLogSummary)` passes saved call to parent
  - [x] Update `calls-panel-shell.tsx`:
    - Track `lastLoggedCall` (or promoted state per call id)
    - Show **Promote to pipeline** when `isPromotableCallOutcome(call.outcome)` and not yet promoted
    - On promote success: show "Added to pipeline", hide/disable promote button
  - [x] Optional: link text to `/rep/pipeline` (non-blocking UX polish)

- [x] **Verify** (AC: 7)
  - [x] Manual: Log `answered_interested` → promote → lead in DB with `source=call`, `call_log_id` set
  - [x] Manual: Log `voicemail` → no promote affordance
  - [x] Manual: Promote same call twice → one lead, `created: false` on second
  - [x] Manual: Promoted lead visible on rep Kanban
  - [x] Manual: Admin promote POST → 403
  - [x] `npm run build` && `npm run lint`

## Dev Notes

### Critical constraints

- **Do NOT** auto-promote inside `create_call_log` or `POST /api/v1/calls` — epics require explicit **tap promote** (contrast Story 2.9 knock auto-promote on save).
- **Do NOT** modify `create_knock_with_contact` or door promotion paths.
- **Do NOT** write `lead_activity` on promote — Story 5.5; knock promotion (2.9) also omitted activity rows.
- **Do NOT** add contact call activity stream UI — Story 5.5.
- **Do NOT** update `get_admin_daily_rep_summary` leads/calls counters — Story 5.6.
- **Do NOT** add shift gate on promote API.
- **Do NOT** add TanStack Query — extend `src/features/calls/api.ts` + local state.
- **Do NOT** change Kanban board code — existing `GET /api/v1/leads` picks up new rows with `source=call`.

### Design: explicit promote vs knock auto-promote

| Channel | Promotion trigger | Story |
|---------|-------------------|-------|
| D2D knock | Auto on save when outcome ∈ promotable | 2.9 |
| Cold call | **Separate tap** after call logged | **5.4** |

PRD Module 4: *"If a call registers Interested or Callback Scheduled, a single click generates a live pipeline card"* — satisfied by **log call → tap Promote** (two steps; promote is the single click that creates the card).

### Reference RPC — `promote_call_to_lead`

```sql
create or replace function public.promote_call_to_lead(p_call_log_id uuid)
returns table (
  lead_id uuid,
  lead_created boolean,
  contact_id uuid
)
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_rep_id uuid := auth.uid();
  v_call record;
  v_lead_id uuid;
  v_lead_created boolean := false;
begin
  if v_rep_id is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  select cl.id, cl.contact_id, cl.rep_id, cl.outcome
  into v_call
  from public.call_logs cl
  where cl.id = p_call_log_id
    and cl.rep_id = v_rep_id;

  if not found then
    raise exception 'Call log not found' using errcode = 'P0002';
  end if;

  if v_call.outcome not in ('answered_interested', 'callback_scheduled') then
    raise exception 'Call outcome is not promotable' using errcode = '22023';
  end if;

  insert into public.leads (
    contact_id,
    rep_id,
    source,
    stage,
    call_log_id
  )
  values (
    v_call.contact_id,
    v_rep_id,
    'call',
    'interested',
    p_call_log_id
  )
  on conflict (call_log_id) where call_log_id is not null do nothing
  returning leads.id into v_lead_id;

  if v_lead_id is not null then
    v_lead_created := true;
  else
    select l.id
    into v_lead_id
    from public.leads l
    where l.call_log_id = p_call_log_id
    limit 1;
  end if;

  return query
  select v_lead_id, v_lead_created, v_call.contact_id;
end;
$$;
```

**Why `security invoker`:** Rep owns the `call_logs` row (`rep_id = auth.uid()`); `leads_insert_rep` allows insert with `rep_id = auth.uid()`. No cross-rep promotion needed (unlike `create_call_log` SECURITY DEFINER).

### API contract

```typescript
// POST /api/v1/calls/{callLogId}/promote
// No body

// 200
{ data: { lead: { id, stage, source }, created: true } }

// 200 (idempotent)
{ data: { lead: { id, stage, source }, created: false } }

// 400 CALL_NOT_PROMOTABLE
// 404 CALL_NOT_FOUND
// 401 / 403
```

### UI flow (Calls panel)

```
Call logged (answered_interested)
├── "Call logged." notice (existing)
└── [Promote to pipeline]  min-h-11
    └── on success → "Added to pipeline" (hide button)
```

- Pass `CallLogSummary` from `CallLogForm` → `CallsPanelShell` via `onLogged(call)`.
- Store `lastLoggedCall` + `promotedCallIds` (or `promotedLead` on call) in shell state.
- Mirror knock success copy pattern from `rep-map-shift-shell.tsx` ("Knock saved · Added to pipeline").

### Files to UPDATE (read before editing)

| File | Current state | This story changes |
|------|---------------|-------------------|
| `src/lib/validators/leads.ts` | Door promotable helpers only | Add call promotable constants + `isPromotableCallOutcome` |
| `src/features/calls/api.ts` | `createCall`, contact APIs | Add `promoteCall` |
| `src/components/calls/call-log-form.tsx` | `onLogged()` no args | `onLogged(call: CallLogSummary)` |
| `src/components/calls/calls-panel-shell.tsx` | Call logged notice only | Promote affordance + state |

### File structure (new)

```
supabase/migrations/*_promote_call_to_lead.sql
src/features/calls/promote-call-to-lead.ts
src/app/api/v1/calls/[id]/promote/route.ts
```

### Previous story intelligence

**Story 5.3 (done):**
- `POST /api/v1/calls` returns `{ call: CallLogSummary }` with `id`, `outcome`, `contact_id`.
- `create_call_log` SECURITY DEFINER — do not extend for promotion.
- Promote is explicitly deferred to 5.4.

**Story 5.1 (done):**
- `idx_leads_call_log_id` partial unique index — idempotent promotion anchor.
- `leads.call_log_id` FK → `call_logs(id)`.

**Story 2.9 (done):**
- Knock promotion: same `stage = 'interested'`, `ON CONFLICT (door_knock_id)`.
- `leadSummarySchema` + `PROMOTABLE_DOOR_OUTCOMES` pattern to mirror for calls.
- No `lead_activity` on promote.

**Story 4.2+ (done):**
- Kanban reads all rep leads — call-sourced cards show `source=call` on existing cards.
- No board changes required.

**Epic 4 retro:**
- Call → lead promotion should mirror 2.9 knock pattern with `source = 'call'`.
- Use RPC when atomicity/idempotency matters (recommended here).

### Cross-story dependencies

| Story | Relationship |
|-------|--------------|
| 5.1 | **Requires** — `call_logs` + `leads.call_log_id` FK + unique index |
| 5.3 | **Requires** — logged call with `id` + outcome for promote handoff |
| 4.1–4.2 | **Requires** — `leads` table + Kanban displays new rows |
| 5.5 | **Future** — call activity stream; may add `lead_activity` type `call` |
| 5.6 | **Future** — lead/call counters in summary grid |

### Testing

- **Required:** `npm run build`, `npm run lint`
- **Required manual:** Promotable promote; non-promotable hidden; idempotent re-promote; Kanban visibility; admin 403
- **No** Playwright unless requested

### References

- [Source: `_bmad-output/planning-artifacts/epics.md` — Story 5.4, FR27, FR37]
- [Source: `docs/Solar_CRM_PRD_v1.md` — Module 4 Pipeline Promotion Step, Module 5 Lead entity]
- [Source: `_bmad-output/implementation-artifacts/2-9-promote-interested-door-to-lead.md` — promotion RPC pattern]
- [Source: `_bmad-output/implementation-artifacts/5-3-log-a-call-with-outcome.md` — call log API + scope boundary]
- [Source: `_bmad-output/implementation-artifacts/5-1-calllog-schema-and-rls.md` — `call_log_id` unique index]
- [Source: `_bmad-output/implementation-artifacts/epic-4-retro-2026-06-06.md` — mirror 2.9 for call promotion]
- [Source: `supabase/migrations/20260603180200_create_knock_with_contact_lead.sql` — lead insert + ON CONFLICT]
- [Source: `src/app/(rep)/rep/map/rep-map-shift-shell.tsx` — pipeline success notice pattern]
- [Source: `src/lib/validators/leads.ts` — `leadSummarySchema`, door promotable helpers]

## Dev Agent Record

### Agent Model Used

Composer

### Debug Log References

- Migration applied via Supabase MCP (`promote_call_to_lead`).
- `security invoker` RPC — rep owns call_log; no SECURITY DEFINER needed.
- Idempotent via `idx_leads_call_log_id` partial unique index.

### Completion Notes List

- Added `promote_call_to_lead` RPC mirroring 2.9 knock promotion (`source=call`, `stage=interested`).
- `POST /api/v1/calls/[id]/promote` rep-only; returns `{ lead, created }`.
- Calls panel: promote button after promotable call log; success notice + pipeline link.
- Explicit tap promote — no auto-promote in `create_call_log`.
- `npm run lint` and `npm run build` pass.

### File List

- `supabase/migrations/20260610130000_promote_call_to_lead.sql` (new)
- `src/lib/validators/leads.ts` (updated)
- `src/features/calls/promote-call-to-lead.ts` (new)
- `src/app/api/v1/calls/[id]/promote/route.ts` (new)
- `src/features/calls/api.ts` (updated)
- `src/components/calls/call-log-form.tsx` (updated)
- `src/components/calls/calls-panel-shell.tsx` (updated)
- `src/types/supabase.generated.ts` (updated)

## Change Log

- 2026-06-10: Story 5.4 implemented — promote call to pipeline lead (FR27, FR37).

## Story Completion Status

- **Status:** review
- **Completion note:** Call promotion complete; ready for code review before Story 5.5 activity stream.
