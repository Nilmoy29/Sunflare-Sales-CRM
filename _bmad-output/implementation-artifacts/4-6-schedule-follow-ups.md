---
baseline_commit: NO_VCS
---

# Story 4.6: Schedule Follow-Ups

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **rep**,
I want to schedule follow-up dates on leads,
so that I don't miss callbacks.

## Acceptance Criteria

1. **Given** I am on `/rep/pipeline/[leadId]` or `/admin/pipeline/[leadId]` (Story 4.4 detail)  
   **When** I view the Follow-ups section  
   **Then** I see a schedule form: **date/time** input + optional note + **Schedule follow-up** submit  
   **And** the submit control meets mobile tap targets (min-height ~44px)  
   **And** other timeline sections (Knocks, Calls, Notes, Stage changes) are unchanged

2. **Given** a lead I am allowed to see  
   **When** I submit a valid due date/time and optional note  
   **Then** `POST /api/v1/leads/:id/follow-ups` creates a `follow_ups` row with `completed = false` (FR35)  
   **And** `rep_id` is set to **`leads.rep_id`** (lead owner — so the owner's pipeline card countdown updates)  
   **And** the API returns the created follow-up timeline item  
   **And** it appears in the Follow-ups section with rep name, Sydney-formatted due time, and countdown label  
   **And** the form clears on success (detail reload via `reload()`)

3. **Given** I return to `/rep/pipeline` after scheduling  
   **When** the board refetches  
   **Then** my lead card **Next** field reflects the new follow-up via `next_action_due_at` / `formatNextActionCountdown` (FR33)

4. **Given** validation  
   **When** due date/time is missing or invalid  
   **Then** client blocks submit or API returns `400 VALIDATION_ERROR`  
   **When** optional note exceeds max length  
   **Then** `400 VALIDATION_ERROR` (reuse `NOTES_MAX_LENGTH` = 2000)

5. **Given** authorization (NFR9, NFR10)  
   **When** a rep schedules on another rep's lead  
   **Then** `POST` returns `404 LEAD_NOT_FOUND` (RLS)  
   **When** an admin schedules on a visible lead  
   **Then** follow-up is created with `rep_id = leads.rep_id` (owner rep sees it on their board)  
   **When** unauthenticated  
   **Then** `401`

6. **Given** implementation scope boundaries  
   **When** this story ships  
   **Then** there is **no** follow-up edit, reschedule, complete/mark-done UI, or delete  
   **And** there is **no** web push permission or reminders (Story 4.8)  
   **And** there is **no** stage-change audit writes (Story 4.7)  
   **And** Story 4.2–4.5 pipeline board, notes, drag, and detail read paths still work

7. **Given** implementation is complete  
   **When** `npm run build` and `npm run lint` run  
   **Then** they pass

**Implements:** FR35 (scheduling only; push in 4.8), FR33 (card countdown via existing enrichment)  
**NFRs:** NFR9 (RLS), NFR10 (API guards), UX-DR4 (rep mobile form)

## Tasks / Subtasks

- [x] **Validators** (AC: 2, 4)
  - [x] Extend `src/lib/validators/follow-ups.ts`:
    - `createFollowUpBodySchema` — `due_at` (ISO 8601 string), `note` optional trim max `NOTES_MAX_LENGTH` (default `""`)
    - `createFollowUpResponseSchema` — `{ follow_up: leadDetailFollowUpTimelineItemSchema }` (import from `lead-detail.ts`)
  - [x] Add `parseFollowUpDatetimeLocal(value: string)` helper — extract/reuse logic from `door-outcome-sheet.tsx` `parseFollowUpLocal` (required non-empty for schedule form)

- [x] **Server insert + API** (AC: 2, 4, 5)
  - [x] Create `src/features/pipeline/create-lead-follow-up.ts`:
    - Load lead by id (`id`, `rep_id`) — return null if RLS blocks
    - Insert `follow_ups`: `{ lead_id, rep_id: lead.rep_id, due_at, note, completed: false }`
    - Select with `profiles!follow_ups_rep_id_fkey ( name )` join
    - Map to `leadDetailFollowUpTimelineItemSchema` (`kind: 'follow_up'`, `occurred_at: due_at`)
    - Return null on RLS failure; throw on parse failure after insert (4.5 review pattern)
  - [x] Create `POST /api/v1/leads/[id]/follow-ups/route.ts`:
    - `requireRoleForApi(['admin', 'rep'])`
    - UUID validation on `id`
    - Parse body with `createFollowUpBodySchema`
    - Errors: `400 VALIDATION_ERROR`, `404 LEAD_NOT_FOUND`, `500 FOLLOW_UP_CREATE_FAILED`
  - [x] Nested route only — do not add POST to `[id]/route.ts`

- [x] **Client fetch + hook** (AC: 2, 3)
  - [x] Extend `src/features/pipeline/api.ts` — `createLeadFollowUp(leadId, body, signal?)`
  - [x] Reuse `useLeadDetail` `reload()` after successful POST (preserve `reloading` stale-while-revalidate from 4.5 review)

- [x] **Schedule UI** (AC: 1, 2, 6)
  - [x] Create `src/components/pipeline/lead-follow-up-compose.tsx`:
    - `datetime-local` input (min-h-11), optional note textarea (`rows={2}`, `maxLength={NOTES_MAX_LENGTH}`)
    - **Schedule follow-up** button; `submitting` guard; inline validation
    - `onSubmit({ due_at, note })` prop
    - Match `door-outcome-sheet.tsx` follow-up field styling
  - [x] Extend `lead-detail-timeline.tsx` — Follow-ups section mirrors Notes pattern: compose at top, then list / empty state
  - [x] Extend `lead-detail-shell.tsx` — wire `onScheduleFollowUp` → `createLeadFollowUp` → `reload()`

- [x] **Verify** (AC: 3, 5, 6, 7)
  - [x] Manual: Rep schedules follow-up on own lead → appears in detail Follow-ups + pipeline card countdown after return
  - [x] Manual: Admin schedules on rep's lead → `rep_id` is lead owner; rep sees countdown on their board
  - [x] Manual: Rep 404 on another rep's lead POST
  - [x] Manual: Invalid/missing datetime rejected
  - [x] Manual: Notes compose + Kanban drag still work
  - [x] `npm run build` && `npm run lint`

### Review Findings

- [x] [Review][Patch] Server `createFollowUpBodySchema` note lacked `.trim()` — whitespace-only note could bypass client trim [`src/lib/validators/follow-ups.ts:39`]
- [x] [Review][Patch] Follow-up compose stayed enabled during detail `reloading` — risk of double-submit while timeline refetched [`src/components/pipeline/lead-detail-shell.tsx:132`, `src/components/pipeline/lead-follow-up-compose.tsx:9`]
- [x] [Review][Defer] No server-side future-due validation — past dates allowed v1; matches door-outcome optional follow-up pattern [`src/lib/validators/follow-ups.ts:32`]
- [x] [Review][Defer] Duplicate `parseFollowUpRow` in `get-lead-detail.ts` and `create-lead-follow-up.ts` — consolidate when next follow-up story touches both [`src/features/pipeline/get-lead-detail.ts:138`, `src/features/pipeline/create-lead-follow-up.ts:25`]
- [x] [Review][Defer] Pipeline card countdown updates only on board refetch — AC3 by design; no optimistic board merge [`src/features/pipeline/enrich-pipeline-leads.ts`]

## Dev Notes

### Critical constraints

- **Do NOT** add web push, service-worker subscription, or VAPID — Story 4.8.
- **Do NOT** add complete/mark-done, edit, or delete follow-up UI — `UPDATE` exists in RLS but out of scope v1.
- **Do NOT** write `lead_activity` rows for follow-ups — timeline reads `follow_ups` table directly (Story 4.4).
- **Do NOT** change `enrich-pipeline-leads` logic — it already sets `next_action_due_at` from earliest incomplete `follow_ups.due_at`.
- **Do NOT** install TanStack Query — `fetch` + hooks.
- **Do NOT** use service-role Supabase client.
- **Do NOT** break Story 4.5 notes compose or 4.5 `reloading` UX on detail reload.

### Brownfield: what exists today

| Piece | Status | 4.6 behavior |
|-------|--------|--------------|
| `follow_ups` table + RLS | ✅ Story 4.1 | INSERT; rep scoped to own leads; admin any lead |
| `GET /api/v1/leads/:id` | ✅ Story 4.4 | Follow-ups section lists `kind=follow_up` items |
| `enrich-pipeline-leads.ts` | ✅ Story 4.3 | `next_action_due_at` from incomplete follow-ups |
| `formatNextActionCountdown` | ✅ Story 4.3 | Card + timeline status label |
| `door-outcome-sheet.tsx` | ✅ Epic 2 | `datetime-local` + `parseFollowUpLocal` pattern |

### `rep_id` rule (critical)

Rep `follow_ups` SELECT policy is `rep_id = auth.uid()` — **not** lead ownership. Therefore:

- **Rep schedule:** `rep_id` must equal `auth.uid()` (same as `leads.rep_id` for own leads).
- **Admin schedule:** server **must** set `rep_id = leads.rep_id`, **not** `auth.uid()`, or the owner rep will not see the follow-up on their pipeline card.

```typescript
// After loading lead row:
const rep_id = lead.rep_id; // always owner, for both rep and admin inserts
```

### API contract

**POST `/api/v1/leads/:id/follow-ups`**

Request:

```json
{
  "due_at": "2026-06-10T09:00:00.000Z",
  "note": "Call back about 8kW quote"
}
```

Response:

```json
{
  "data": {
    "follow_up": {
      "kind": "follow_up",
      "id": "uuid",
      "occurred_at": "2026-06-10T09:00:00.000Z",
      "rep_name": "Jane Smith",
      "due_at": "2026-06-10T09:00:00.000Z",
      "note": "Call back about 8kW quote",
      "completed": false
    }
  }
}
```

Errors: `400 VALIDATION_ERROR`, `401`, `403`, `404 LEAD_NOT_FOUND`, `500 FOLLOW_UP_CREATE_FAILED`

### Server insert sketch

```typescript
const { data: lead } = await supabase
  .from("leads")
  .select("id, rep_id")
  .eq("id", leadId)
  .maybeSingle();

if (!lead) return null;

await supabase.from("follow_ups").insert({
  lead_id: leadId,
  rep_id: lead.rep_id,
  due_at,
  note: note ?? "",
  completed: false,
} as never);
```

### Datetime handling

- Client: `datetime-local` → `parseFollowUpDatetimeLocal` → ISO string for API.
- Reuse/adapt `parseFollowUpLocal` from `door-outcome-sheet.tsx` but **require** non-empty value (schedule form, unlike optional knock follow-up).
- Browser `datetime-local` is local TZ; `new Date(value).toISOString()` matches existing knock pattern.

### Files to UPDATE (read before editing)

| File | Current state | This story changes | Must preserve |
|------|---------------|-------------------|---------------|
| `src/components/pipeline/lead-detail-shell.tsx` | Notes + timeline | Add follow-up schedule handler | `reloading` UX; GET error guard |
| `src/components/pipeline/lead-detail-timeline.tsx` | Read-only Follow-ups section | Compose slot + list | Notes compose pattern |
| `src/features/pipeline/api.ts` | GET, PATCH, POST notes | Add `createLeadFollowUp` | Existing helpers |
| `src/lib/validators/follow-ups.ts` | Row schema only | POST body/response schemas | `followUpRowSchema` |

### Pipeline card countdown (FR33)

`enrich-pipeline-leads.ts` already queries incomplete `follow_ups` and picks earliest `due_at` per lead. After scheduling:

1. Detail `reload()` shows new follow-up in timeline.
2. Pipeline board updates on next `usePipelineLeads` fetch (navigate back or filter change) — no Realtime required.

### Previous story intelligence

**Story 4.5 (done):**
- `POST /api/v1/leads/:id/notes` nested route pattern; `reload()` with `reloading` keeps detail visible.
- Compose-in-section UX (Notes) — mirror for Follow-ups.

**Story 4.4 (done):**
- Follow-ups timeline items read from `follow_ups`; empty state copy exists.

**Story 4.3 (done):**
- `next_action_due_at` + `formatNextActionCountdown` on pipeline cards.

**Story 4.1 (done):**
- `follow_ups` RLS; rep INSERT requires lead ownership + `rep_id = auth.uid()`.

**Epic 2 knock form:**
- Optional `follow_up_at` on knock is separate from lead `follow_ups` — do not conflate; this story is lead-detail scheduling only.

### Cross-story dependencies

| Story | Relationship |
|-------|--------------|
| 4.4, 4.5 | **Requires** — detail page + reload hook |
| 4.3 | **Requires** — card countdown display (read path only) |
| 4.8 | **Future** — web push on due follow-ups |
| 4.7 | **Future** — unrelated stage audit |

### Testing

- **Required:** `npm run build`, `npm run lint`
- **Manual:** Schedule + pipeline countdown; admin schedules for rep; RLS 404
- **No** Playwright unless trivial

### References

- [Source: `_bmad-output/planning-artifacts/epics.md` — Story 4.6, FR35, FR33]
- [Source: `docs/Solar_CRM_PRD_v1.md` — FollowUp entity, lead detail follow-ups]
- [Source: `_bmad-output/implementation-artifacts/4-5-collaboration-notes.md` — compose + POST + reload pattern]
- [Source: `_bmad-output/implementation-artifacts/4-4-lead-detail-360-view.md` — follow-ups timeline]
- [Source: `_bmad-output/implementation-artifacts/4-3-lead-cards-and-filters.md` — `next_action_due_at` enrichment]
- [Source: `_bmad-output/implementation-artifacts/4-1-leads-schema-stages-and-rls.md` — `follow_ups` schema + RLS]
- [Source: `src/components/rep/door-outcome-sheet.tsx` — `datetime-local` + parse helper]
- [Source: `src/features/pipeline/enrich-pipeline-leads.ts` — card countdown data]

## Dev Agent Record

### Agent Model Used

Composer

### Debug Log References

- Server always sets `follow_ups.rep_id` from `leads.rep_id` so owner rep pipeline countdown updates (admin schedule included).
- `parseFollowUpDatetimeLocal` in `follow-ups.ts` — required non-empty variant of knock optional parser.

### Completion Notes List

- `POST /api/v1/leads/:id/follow-ups` creates incomplete follow-up with owner `rep_id`.
- Follow-up compose on detail page (datetime-local + optional note); reload after success with `reloading` UX preserved.
- Pipeline card countdown uses existing `enrich-pipeline-leads` on board refetch — no board changes.
- `npm run lint` and `npm run build` pass.
- Code review: server note `.trim()`; disable follow-up compose during `reloading` to prevent double-submit.

### File List

- `src/lib/validators/follow-ups.ts`
- `src/features/pipeline/create-lead-follow-up.ts`
- `src/app/api/v1/leads/[id]/follow-ups/route.ts`
- `src/features/pipeline/api.ts`
- `src/components/pipeline/lead-follow-up-compose.tsx`
- `src/components/pipeline/lead-detail-timeline.tsx`
- `src/components/pipeline/lead-detail-shell.tsx`

## Change Log

- 2026-06-06: Story 4.6 — follow-up scheduling API, compose UI, and detail reload implemented.
- 2026-06-06: Code review — note trim + reload double-submit guard; story marked done.
