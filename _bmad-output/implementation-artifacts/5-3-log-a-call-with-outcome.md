---
baseline_commit: NO_VCS
---

# Story 5.3: Log a Call with Outcome

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **rep**,
I want to record call details after dialing,
so that my session is tracked for metrics.

## Acceptance Criteria

1. **Given** I am an authenticated rep on `/rep/calls` with a **selected contact** (Story 5.2)  
   **When** the selected contact card is shown  
   **Then** I see a call log form with: outcome selector, duration input, notes, optional follow-up datetime (FR25)  
   **And** the Story 5.2 placeholder *"Call logging arrives in Story 5.3"* is removed  
   **And** form controls meet 44×44px tap targets (NFR6)  
   **And** there is **no** promote-to-lead button, activity stream, daily counter, or `tel:` dial link (Stories 5.4–5.7)

2. **Given** the call log form  
   **When** I choose an outcome  
   **Then** all six PRD call outcomes are available with human-readable labels (FR25):  
   - Answered – Interested (`answered_interested`)  
   - Answered – Not Interested (`answered_not_interested`)  
   - Voicemail (`voicemail`)  
   - No Answer (`no_answer`)  
   - Wrong Number (`wrong_number`)  
   - Callback Scheduled (`callback_scheduled`)

3. **Given** I fill the call form  
   **When** I submit with a valid outcome  
   **Then** `POST /api/v1/calls` persists a `call_logs` row (FR25, FR26)  
   **And** the row includes: `contact_id`, `rep_id = auth.uid()`, `outcome`, `duration_seconds` (nullable), `notes` (nullable), `called_at` (server default), `follow_up_at` (nullable)  
   **And** the API validates via Zod (`createCallBodySchema`)  
   **And** the API returns `{ data: { call: CallLogSummary } }`

4. **Given** duration entry (PRD manual duration tracking)  
   **When** I enter duration in **minutes** in the UI  
   **Then** the API stores `duration_seconds` as `minutes × 60` (integer)  
   **And** empty duration is allowed (`duration_seconds = null`)  
   **And** negative or non-numeric duration is rejected with `400 VALIDATION_ERROR`

5. **Given** optional follow-up  
   **When** I set a follow-up datetime or leave it empty  
   **Then** `follow_up_at` is stored as ISO timestamptz or `null`  
   **And** follow-up is **not** required for any outcome in this story (pipeline follow-ups are Story 4.6; call `follow_up_at` is contact-level scheduling per PRD CallLog entity)

6. **Given** Story 5.1 RLS — first call on another rep's contact fails direct INSERT  
   **When** I log a call on a contact I found via global search (`is_linked: false`)  
   **Then** `create_call_log` SECURITY DEFINER RPC inserts the row under my `rep_id` (FR60, NFR9)  
   **And** the RPC requires `auth.uid() is not null`  
   **And** the RPC verifies `p_contact_id` exists  
   **And** subsequent calls on that contact succeed via the same RPC (contact linkage now exists via RLS)  
   **And** `call_logs_insert_rep` RLS policy is **not** broadened

7. **Given** I own or am already linked to the contact (`is_linked: true`)  
   **When** I submit the call form  
   **Then** logging still succeeds via the same `create_call_log` RPC (single code path)

8. **Given** authorization (NFR9, NFR10)  
   **When** an unauthenticated user calls `POST /api/v1/calls`  
   **Then** `401`  
   **When** an admin calls the route  
   **Then** `403 FORBIDDEN` (rep-only)  
   **And** there is **no** active-shift gate on call logging (unlike knocks — PRD cold-call session)

9. **Given** successful submission  
   **When** the API returns success  
   **Then** the UI shows a brief success state (e.g. "Call logged")  
   **And** the form resets for another call on the same contact  
   **And** the selected contact remains selected

10. **Given** implementation scope boundaries  
    **When** this story ships  
    **Then** there is **no** lead promotion, `lead_activity` writes, admin activity feed wiring, `get_admin_daily_rep_summary` counter update, or offline call queue (Stories 5.4–5.7, architecture idempotency deferred)  
    **And** knock map, pipeline, and admin dashboard are unchanged  
    **And** `npm run build` and `npm run lint` pass

**Implements:** FR25, FR26, FR60  
**NFRs:** NFR5 (desktop/tablet cold-call ergonomics), NFR6 (tap targets), NFR9 (controlled cross-rep write via RPC), NFR10 (API guards)

## Tasks / Subtasks

- [x] **RPC: `create_call_log`** (AC: 3, 6, 7)
  - [x] Create `supabase/migrations/*_create_call_log.sql` (sort after `20260610110000_search_contacts_for_calls.sql`)
  - [x] `create_call_log(p_contact_id uuid, p_outcome call_outcome, p_duration_seconds int, p_notes text, p_follow_up_at timestamptz)`
  - [x] `SECURITY DEFINER`, `set search_path = public`, `auth.uid() is not null`
  - [x] Verify contact exists; `raise exception` if not found
  - [x] `INSERT` with `rep_id = auth.uid()` — bypasses first-call RLS gap on cross-rep contacts
  - [x] Return: `id`, `contact_id`, `rep_id`, `outcome`, `duration_seconds`, `notes`, `called_at`, `follow_up_at`
  - [x] `grant execute` to `authenticated`; revoke from `public`
  - [x] Apply via Supabase MCP; `npm run db:types`

- [x] **Validators** (AC: 3, 4, 5)
  - [x] Extend `src/lib/validators/call-logs.ts`:
    - `createCallBodySchema` — `contact_id` (uuid), `outcome` (`callOutcomeSchema`), `duration_minutes` (optional int 0–480 or similar), `notes` (optional, max 2000), `follow_up_at` (optional ISO datetime nullable)
    - `callLogSummarySchema` — API response shape
    - `createCallResponseSchema`
  - [x] Create `src/lib/call-outcome-labels.ts` (or `src/lib/validators/call-outcomes.ts`):
    - `CALL_OUTCOME_LABELS` map matching PRD display names (mirror `DOOR_OUTCOME_LABELS` pattern)

- [x] **Server: create call** (AC: 3, 6, 7, 8)
  - [x] Create `src/features/calls/create-call-log.ts` — call `create_call_log` RPC, parse response
  - [x] Create `POST /api/v1/calls/route.ts` — `requireRoleForApi(["rep"])`, Zod parse, map `duration_minutes` → `duration_seconds`
  - [x] Return `404 CONTACT_NOT_FOUND` when RPC signals missing contact (map SQL error)

- [x] **Client: call form + API** (AC: 1, 2, 4, 5, 9)
  - [x] Extend `src/features/calls/api.ts` — `createCall(payload)` → `POST /api/v1/calls`
  - [x] Create `src/components/calls/call-log-form.tsx` — outcome buttons, duration (minutes), notes textarea, follow-up `datetime-local`
  - [x] Update `src/components/calls/calls-panel-shell.tsx` — replace placeholder with `CallLogForm` when `selectedContact` set; pass `contactId`, `onLogged` callback
  - [x] On success: toast/message + reset form; keep selection

- [x] **Verify** (AC: 10)
  - [x] Manual: Log call on own quick-added contact → success
  - [x] Manual: Search cross-rep contact (`is_linked: false`) → log call → success (RPC path)
  - [x] Manual: Second call on same cross-rep contact → success
  - [x] Manual: Submit without outcome → validation error
  - [x] Manual: Admin POST → 403
  - [x] `npm run build` && `npm run lint`

### Review Findings

- [x] [Review][Patch] Call form state persisted when switching selected contact [`src/components/calls/calls-panel-shell.tsx:174`] — fixed: `key={selectedContact.id}` remounts `CallLogForm`.
- [x] [Review][Defer] `is_linked` badge not updated after first cross-rep call — cosmetic; contact is linked in DB; badge refreshes on re-search.
- [x] [Review][Defer] RPC does not reject negative `p_duration_seconds` at DB layer — API Zod + client validation sufficient v1.
- [x] [Review][Defer] `create_call_log` SECURITY DEFINER allows any authenticated rep to log on any existing contact UUID — intentional for cross-rep cold-call; audit via `rep_id` on row.

## Dev Notes

### Critical constraints

- **Do NOT** broaden `call_logs_insert_rep` or `contacts_select_rep` RLS — use `create_call_log` SECURITY DEFINER RPC for all inserts.
- **Do NOT** add promote-to-lead UI or RPC — Story 5.4 (`answered_interested`, `callback_scheduled`).
- **Do NOT** write `lead_activity` rows on call insert — Story 5.5.
- **Do NOT** wire `ActivityFeed` Realtime for `call_logs` — schema/publication ready (5.1); component wiring deferred.
- **Do NOT** update `get_admin_daily_rep_summary` `calls` column — Story 5.6.
- **Do NOT** add `tel:` click-to-dial or script widget — Story 5.7.
- **Do NOT** add active-shift gate on `POST /api/v1/calls` — cold calls are not shift-gated (contrast `src/app/api/v1/knocks/route.ts`).
- **Do NOT** add TanStack Query — extend `src/features/calls/api.ts` + local state (Story 5.2 pattern).
- **Do NOT** add offline call queue or `Idempotency-Key` header — architecture defers; knocks-only offline in 2.7.
- **Do NOT** add `follow_ups` table rows from call form — `call_logs.follow_up_at` is the CallLog field; pipeline `follow_ups` remain lead-scoped (Story 4.6).

### Resolving Story 5.1/5.2 deferral — cross-rep first call

Story 5.1 deferred: *"First call on another rep's contact blocked by `call_logs_insert_rep`"*.  
Story 5.2 deferred: search returns global matches but first INSERT fails.

**5.3 fix:** `create_call_log` SECURITY DEFINER RPC inserts under `auth.uid()` without requiring pre-existing contact linkage. After first insert, `contacts_select_rep` and subsequent direct reads work via call linkage.

**Use RPC for every call insert** from the API — avoids client branching on `is_linked` and keeps one server path.

### Reference RPC — `create_call_log`

```sql
create or replace function public.create_call_log(
  p_contact_id uuid,
  p_outcome public.call_outcome,
  p_duration_seconds integer,
  p_notes text,
  p_follow_up_at timestamptz
)
returns table (
  id uuid,
  contact_id uuid,
  rep_id uuid,
  outcome public.call_outcome,
  duration_seconds integer,
  notes text,
  called_at timestamptz,
  follow_up_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rep_id uuid := auth.uid();
begin
  if v_rep_id is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.contacts c where c.id = p_contact_id
  ) then
    raise exception 'Contact not found' using errcode = 'P0002';
  end if;

  return query
  insert into public.call_logs (
    contact_id,
    rep_id,
    outcome,
    duration_seconds,
    notes,
    follow_up_at
  )
  values (
    p_contact_id,
    v_rep_id,
    p_outcome,
    p_duration_seconds,
    nullif(trim(coalesce(p_notes, '')), ''),
    p_follow_up_at
  )
  returning
    call_logs.id,
    call_logs.contact_id,
    call_logs.rep_id,
    call_logs.outcome,
    call_logs.duration_seconds,
    call_logs.notes,
    call_logs.called_at,
    call_logs.follow_up_at;
end;
$$;
```

### API contract

```typescript
// POST /api/v1/calls
// Body:
{
  contact_id: string;       // uuid
  outcome: CallOutcome;
  duration_minutes?: number | null;  // UI-friendly; server → duration_seconds
  notes?: string | null;
  follow_up_at?: string | null;      // ISO datetime with offset
}

// 200
{ data: { call: CallLogSummary } }

// 404 CONTACT_NOT_FOUND
// 400 VALIDATION_ERROR
// 401 / 403 per guards
```

### UI structure (replace 5.2 placeholder)

```
Selected contact card (existing)
└── CallLogForm
    ├── Outcome buttons (6 options, min-h-11, grid or stacked)
    ├── Duration (minutes, number input, optional)
    ├── Notes (textarea, optional, max 2000)
    ├── Follow-up (datetime-local, optional)
    └── Submit "Log call" (min-h-11)
```

- Mirror `door-outcome-sheet.tsx` interaction patterns (outcome selection, follow-up `parseFollowUpLocal` helper, error display).
- Use `CALL_OUTCOME_LABELS` for display; store enum keys in API payload.
- Desktop/tablet primary per PRD cold-call journey; still usable on mobile.

### Files to UPDATE (read before editing)

| File | Current state | This story changes |
|------|---------------|-------------------|
| `src/components/calls/calls-panel-shell.tsx` | Search, selection, 5.3 placeholder text | Replace placeholder with `CallLogForm`; add success notice state |
| `src/features/calls/api.ts` | `fetchContactSearch`, `createContact` | Add `createCall` |
| `src/lib/validators/call-logs.ts` | `callLogRowSchema` only | Add create/response schemas |

### File structure (new)

```
supabase/migrations/*_create_call_log.sql
src/features/calls/create-call-log.ts
src/app/api/v1/calls/route.ts
src/components/calls/call-log-form.tsx
src/lib/call-outcome-labels.ts   (or validators/call-outcomes.ts)
```

### Previous story intelligence

**Story 5.2 (done):**
- Calls panel at `/rep/calls`; `CallsPanelShell` holds `selectedContact` state.
- Cross-rep search works; `is_linked: false` on duplicate-selected contacts.
- `POST /api/v1/contacts` rep-only; no shift gate.
- RPC pattern: `search_contacts_for_calls`, `find_contact_by_phone` — `as never` casts on `.rpc()`.
- Review patch: duplicate selection uses `is_linked: false`.

**Story 5.1 (done):**
- `call_logs` table + RLS live; `callLogRowSchema` in `call-logs.ts`.
- `call_logs` on Realtime publication; no feed wiring yet.
- `duration_seconds` nullable by design for quick-log.

**Story 2.5 / door-outcome-sheet (pattern):**
- Outcome button grid, notes max 2000, follow-up datetime-local → ISO.
- `createKnockBodySchema.follow_up_at` uses `.datetime({ offset: true })`.

**Story 4.6 (context only):**
- Pipeline `follow_ups` are lead-scoped — do not conflate with `call_logs.follow_up_at`.

### Cross-story dependencies

| Story | Relationship |
|-------|--------------|
| 5.1 | **Requires** — `call_logs` schema + RLS |
| 5.2 | **Requires** — selected contact UI + `contact_id` handoff |
| 5.4 | **Blocked by** — this story (needs logged call); adds promote for `answered_interested` / `callback_scheduled` |
| 5.5 | **Future** — activity stream reads `call_logs` |
| 5.6 | **Future** — `COUNT(call_logs)` in summary RPC |
| 5.7 | **Future** — `tel:` + scripts on calls panel |

### Testing

- **Required:** `npm run build`, `npm run lint`
- **Required manual:** Own-contact call; cross-rep first call; second call; validation errors; admin 403
- **No** Playwright unless requested

### References

- [Source: `_bmad-output/planning-artifacts/epics.md` — Story 5.3, FR25, FR26, FR60]
- [Source: `docs/Solar_CRM_PRD_v1.md` — Module 4 Call Log Entry Panel, Cold Calling journey, CallLog entity §5]
- [Source: `_bmad-output/planning-artifacts/architecture.md` — `POST /api/v1/calls`, `features/calls`]
- [Source: `_bmad-output/implementation-artifacts/5-1-calllog-schema-and-rls.md` — RLS + cross-rep deferral]
- [Source: `_bmad-output/implementation-artifacts/5-2-contact-search-and-create.md` — panel handoff + `create_call_log` requirement]
- [Source: `supabase/migrations/20260610100100_call_logs_rls.sql` — insert guard to bypass via RPC only]
- [Source: `src/components/rep/door-outcome-sheet.tsx` — form UX pattern]
- [Source: `src/app/api/v1/contacts/route.ts` — rep-only route handler pattern]
- [Source: `src/lib/validators/enums.ts` — `CALL_OUTCOMES` frozen enum]

## Dev Agent Record

### Agent Model Used

Composer

### Debug Log References

- Migration applied via Supabase MCP (`create_call_log`).
- `npm run db:types` regenerated RPC types in `supabase.generated.ts`.
- Single RPC path for all call inserts (own + cross-rep contacts).

### Completion Notes List

- Added `create_call_log` SECURITY DEFINER RPC — resolves 5.1/5.2 cross-rep first-call RLS gap.
- `POST /api/v1/calls` rep-only; maps `duration_minutes` → `duration_seconds`; 404 on missing contact.
- Call log form in Calls panel: 6 outcomes, duration, notes, follow-up; success notice + form reset.
- Scope held: no promote, activity feed, counters, tel: links, shift gate.
- `npm run lint` and `npm run build` pass.
- Code review: `key` on `CallLogForm` resets form when contact selection changes.

### Senior Developer Review (AI)

**Outcome:** Approved (1 patch applied)  
**Date:** 2026-06-09  
**Layers:** Blind Hunter, Edge Case Hunter, Acceptance Auditor

**Summary:** `create_call_log` SECURITY DEFINER RPC correctly resolves 5.1/5.2 cross-rep first-call gap without broadening RLS. Rep-only API, outcome form, duration mapping, and scope boundaries match all ACs. Patch: form remount on contact switch.

### File List

- `supabase/migrations/20260610120000_create_call_log.sql` (new)
- `src/lib/call-outcome-labels.ts` (new)
- `src/lib/validators/call-logs.ts` (updated)
- `src/features/calls/create-call-log.ts` (new)
- `src/app/api/v1/calls/route.ts` (new)
- `src/features/calls/api.ts` (updated)
- `src/components/calls/call-log-form.tsx` (new)
- `src/components/calls/calls-panel-shell.tsx` (updated)
- `src/types/supabase.generated.ts` (updated)

## Change Log

- 2026-06-08: Story 5.3 implemented — call logging with outcome form + `create_call_log` RPC (FR25, FR26, FR60).
- 2026-06-09: Code review — `CallLogForm` remount on contact switch patch applied.

## Story Completion Status

- **Status:** done
- **Completion note:** Call logging approved; ready for Story 5.4 promote-to-lead.
