---
baseline_commit: NO_VCS
---

# Story 4.5: Collaboration Notes

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **rep or admin**,
I want to add notes on a lead,
so that the team coordinates in one place.

## Acceptance Criteria

1. **Given** I am on `/rep/pipeline/[leadId]` or `/admin/pipeline/[leadId]` (Story 4.4 detail)  
   **When** I view the Notes section  
   **Then** I see a compose area: multiline text field + **Add note** submit control  
   **And** the control meets mobile tap targets (min-height ~44px on submit)  
   **And** existing read-only timeline sections (Knocks, Calls, Stage changes, Follow-ups) are unchanged

2. **Given** a lead I am allowed to see  
   **When** I submit a non-empty note (after trim)  
   **Then** `POST /api/v1/leads/:id/notes` creates a `lead_activity` row with `type = note`  
   **And** `actor_id` is the signed-in user's profile id  
   **And** the API returns the created note (id, content, created_at, rep_name)  
   **And** the note appears in the Notes timeline with author name and Sydney-formatted timestamp (FR36)  
   **And** the compose field clears on success

3. **Given** validation  
   **When** I submit whitespace-only or empty content  
   **Then** the client blocks submit or the API returns `400 VALIDATION_ERROR`  
   **When** content exceeds max length  
   **Then** `400 VALIDATION_ERROR` (reuse knock notes limit: 2000 chars)

4. **Given** authorization (NFR9, NFR10)  
   **When** a rep posts a note on another rep's lead  
   **Then** `POST` returns `404 LEAD_NOT_FOUND` (RLS — insert blocked / lead invisible)  
   **When** an admin posts on any visible lead  
   **Then** the note is created with admin as `actor_id`  
   **When** unauthenticated  
   **Then** `401`  
   **When** wrong role on page route  
   **Then** existing `/forbidden` redirect applies

5. **Given** implementation scope boundaries  
   **When** this story ships  
   **Then** notes are **plain text** only (no rich text editor, markdown, or attachments)  
   **And** there is **no** threading/replies, edit, or delete (schema is append-only per Story 4.1)  
   **And** there is **no** follow-up scheduling, stage-change writes, or pipeline board changes (Stories 4.6–4.7)  
   **And** Story 4.2–4.4 pipeline board, filters, drag, and detail read paths still work

6. **Given** implementation is complete  
   **When** `npm run build` and `npm run lint` run  
   **Then** they pass

**Implements:** FR36  
**NFRs:** NFR9 (RLS), NFR10 (API guards), UX-DR4 (rep mobile readable compose)

## Tasks / Subtasks

- [x] **Validators** (AC: 2, 3)
  - [x] Extend `src/lib/validators/lead-activity.ts` (or `lead-detail.ts`):
    - `createLeadNoteBodySchema` — `content`: trim, `.min(1)`, `.max(NOTES_MAX_LENGTH)` (import from `@/lib/validators/knocks`)
    - `createLeadNoteResponseSchema` — `{ note: leadDetailNoteTimelineItemSchema }` (reuse from `lead-detail.ts`)
  - [x] Export `NOTES_MAX_LENGTH` reuse — do not duplicate constant

- [x] **Server insert + API** (AC: 2, 3, 4)
  - [x] Create `src/features/pipeline/create-lead-note.ts`:
    - `createLeadNote(leadId, content)` using user-scoped `createClient()`
    - Verify lead visible (optional pre-check `leads` maybeSingle; RLS returns null → treat as not found)
    - Insert `lead_activity`: `{ lead_id, actor_id: auth.uid(), type: 'note', content }`
    - Select insert row with `profiles!lead_activity_actor_id_fkey ( name )` join
    - Map to `leadDetailNoteTimelineItemSchema` shape (`kind: 'note'`, `occurred_at: created_at`, `rep_name`)
    - Return null when RLS blocks lead access
  - [x] Create `POST /api/v1/leads/[id]/notes/route.ts`:
    - `requireRoleForApi(['admin', 'rep'])`
    - UUID validation on `id` (same regex as GET detail)
    - Parse body with `createLeadNoteBodySchema`
    - `404 LEAD_NOT_FOUND`, `400 VALIDATION_ERROR`, `500 NOTE_CREATE_FAILED`
  - [x] **Do not** add POST to `[id]/route.ts` or `[id]/stage/route.ts` — nested `notes/route.ts` only

- [x] **Client fetch + hook refresh** (AC: 2)
  - [x] Extend `src/features/pipeline/api.ts` — `createLeadNote(leadId, content, signal?)`
  - [x] Extend `src/features/pipeline/use-lead-detail.ts`:
    - Add `refreshKey` to `requestKey` (`${leadId}:${refreshKey}`) so `reload()` re-fetches without remount
    - Expose `reload()` callback
    - Preserve `loadedKey` / abort-on-unmount pattern from 4.4
    - On successful note POST, call `reload()` (prefer refetch over hand-merge for timeline consistency)

- [x] **Compose UI** (AC: 1, 2, 5)
  - [x] Create `src/components/pipeline/lead-note-compose.tsx`:
    - Controlled textarea (`rows={3}`, `maxLength={NOTES_MAX_LENGTH}`, placeholder e.g. "Add a note for the team…")
    - **Add note** button; `submitting` guard; inline validation error for empty trim
    - `onSubmit(content)` prop — parent handles API + reload
    - Match door-outcome textarea styling (`door-outcome-sheet.tsx` pattern)
  - [x] Extend `src/components/pipeline/lead-detail-timeline.tsx` — render `LeadNoteCompose` at top of **Notes** section (above note list / empty state)
  - [x] Extend `src/components/pipeline/lead-detail-shell.tsx` — wire compose `onSubmit` → `createLeadNote` → `reload()`; show POST error inline near compose; preserve `!loading && error` for GET errors (4.4 review patch)

- [x] **Verify** (AC: 4, 5, 6)
  - [x] Manual: Rep adds note on own lead → appears in Notes with name + Sydney time
  - [x] Manual: Admin adds note on rep's lead → appears with admin as author
  - [x] Manual: Rep 404 on another rep's lead id (GET + POST)
  - [x] Manual: Empty/whitespace note rejected
  - [x] Manual: Pipeline board drag/filters/detail back link still work
  - [x] `npm run build` && `npm run lint`

## Dev Notes

### Critical constraints

- **Do NOT** add rich text, markdown, `@mentions`, or file uploads — plain `text` in `lead_activity.content` only.
- **Do NOT** add threading/replies — no `parent_id` column; epic "threaded" means chronological flat list in v1.
- **Do NOT** add note edit or delete — Story 4.1 append-only (`SELECT`/`INSERT` grants only).
- **Do NOT** write `lead_activity` on stage PATCH — Story 4.7 (`stage_change` rows).
- **Do NOT** add follow-up scheduling UI — Story 4.6.
- **Do NOT** install TanStack Query — `fetch` + hooks (Epic 2–4 convention).
- **Do NOT** use service-role Supabase client — user JWT + RLS only.
- **Do NOT** break Story 4.4 detail GET, timeline sections, or pipeline Kanban DnD.

### Brownfield: what exists today

| Piece | Status | 4.5 behavior |
|-------|--------|--------------|
| `lead_activity` table + RLS | ✅ Story 4.1 | INSERT `type=note`; rep scoped to own leads; admin any lead |
| `GET /api/v1/leads/:id` | ✅ Story 4.4 | Notes section reads `kind=note` timeline items |
| `lead-detail-timeline.tsx` | ✅ Story 4.4 | Add compose above Notes list |
| `lead-activity.ts` row schema | ✅ Story 4.1 | Extend with request/response schemas |
| `NOTES_MAX_LENGTH` (2000) | ✅ Epic 2 knocks | Reuse for lead notes |

### API contract

**POST `/api/v1/leads/:id/notes`**

Request:

```json
{ "content": "Customer asked for quote on 8kW system." }
```

Response:

```json
{
  "data": {
    "note": {
      "kind": "note",
      "id": "uuid",
      "occurred_at": "2026-06-06T10:00:00.000Z",
      "rep_name": "Jane Smith",
      "content": "Customer asked for quote on 8kW system."
    }
  }
}
```

Errors: `400 VALIDATION_ERROR`, `401`, `403`, `404 LEAD_NOT_FOUND`, `500 NOTE_CREATE_FAILED`

**GET `/api/v1/leads/:id`** — unchanged; reload after POST picks up new note.

### RLS behavior (read before implementing)

```sql
-- Rep insert: actor_id = auth.uid() AND lead.rep_id = auth.uid()
-- Admin insert: is_admin() only (server MUST set actor_id = auth.uid() for attribution)
```

Rep cannot insert on another rep's lead even with correct `lead_id` UUID — treat Supabase RLS failure as `404 LEAD_NOT_FOUND` (same as GET detail), not 403.

### Server insert sketch

```typescript
const { data, error } = await supabase
  .from("lead_activity")
  .insert({
    lead_id: leadId,
    actor_id: userId,
    type: "note",
    content: trimmed,
  } as never)
  .select(`
    id, content, created_at,
    profiles!lead_activity_actor_id_fkey ( name )
  `)
  .single();
```

Map to `leadDetailNoteTimelineItemSchema`. Use `as never` on insert if Supabase typings require (Story 4.2 pattern).

### Hook refresh pattern

```typescript
const [refreshKey, setRefreshKey] = useState(0);
const requestKey = useMemo(() => `${leadId}:${refreshKey}`, [leadId, refreshKey]);
const reload = useCallback(() => setRefreshKey((k) => k + 1), []);
```

After `createLeadNote` succeeds: `reload()` — do not hand-patch `timeline[]` unless refetch latency is unacceptable (refetch is preferred).

### Files to UPDATE (read before editing)

| File | Current state | This story changes | Must preserve |
|------|---------------|-------------------|---------------|
| `src/components/pipeline/lead-detail-shell.tsx` | Header + timeline + GET hook | Wire note compose submit + POST error | `!loading && error` GET guard; back link; layout props |
| `src/components/pipeline/lead-detail-timeline.tsx` | Read-only category sections | Notes section compose slot via prop or child | Other sections unchanged; empty states |
| `src/features/pipeline/use-lead-detail.ts` | `loadedKey` / `leadId` fetch | `refreshKey` + `reload()` | Abort on unmount; clear data while loading |
| `src/features/pipeline/api.ts` | GET detail + pipeline list/PATCH | Add `createLeadNote` | Existing helpers |
| `src/lib/validators/lead-activity.ts` | Row schema only | POST body + response schemas | Existing `leadActivityRowSchema` |

### UI layout notes

**Rep mobile (UX-DR4):** compose textarea full width; submit button min-h-11; error text below compose.

**Admin desktop:** same component inside detail shell (`layout="desktop"` padding unchanged).

**Compose placement:** inside **Notes** section header area — not a floating FAB; keeps context with the note stream.

### Previous story intelligence

**Story 4.4 (done):**
- Detail routes, `GET /api/v1/leads/:id`, timeline with Notes section (read-only).
- `useLeadDetail` hook; hide GET error while `loading` (code review patch).
- Pipeline **Details** link + DnD — do not touch unless regression.

**Story 4.3 (done):**
- `last_touch_at` enrichment uses latest `lead_activity.created_at` — new notes update card last-touch on next pipeline refetch (no realtime; acceptable v1).

**Story 4.1 (done):**
- `lead_activity` append-only; rep insert requires `actor_id = auth.uid()` and lead ownership.

**Epic 2 knock notes:**
- `NOTES_MAX_LENGTH = 2000`, textarea styling in `door-outcome-sheet.tsx` — reuse both.

### Cross-story dependencies

| Story | Relationship |
|-------|--------------|
| 4.4 | **Requires** — detail page + Notes timeline display |
| 4.6 | **Future** — follow-up scheduling on same page |
| 4.7 | **Future** — `stage_change` rows in timeline |
| 4.3 | **Side effect** — new notes improve `last_touch_at` on board refresh |

### Testing

- **Required:** `npm run build`, `npm run lint`
- **Manual:** Rep + admin note create; RLS 404; empty note rejected; detail reload shows note
- **No** Playwright unless trivial

### References

- [Source: `_bmad-output/planning-artifacts/epics.md` — Story 4.5, FR36]
- [Source: `docs/Solar_CRM_PRD_v1.md` — LeadActivity entity, collaboration notes]
- [Source: `_bmad-output/planning-artifacts/architecture.md` — `features/pipeline/`, API patterns]
- [Source: `_bmad-output/implementation-artifacts/4-4-lead-detail-360-view.md` — detail shell, timeline, scope boundary]
- [Source: `_bmad-output/implementation-artifacts/4-1-leads-schema-stages-and-rls.md` — `lead_activity` schema + RLS]
- [Source: `src/lib/validators/knocks.ts` — `NOTES_MAX_LENGTH`]
- [Source: `src/components/rep/door-outcome-sheet.tsx` — textarea UX pattern]

## Dev Agent Record

### Agent Model Used

Composer

### Debug Log References

- Pre-check lead visibility before insert; RLS insert failures mapped to `404 LEAD_NOT_FOUND`.
- `useLeadDetail` `refreshKey` bumps `requestKey` for post-note refetch without remount.

### Completion Notes List

- `POST /api/v1/leads/:id/notes` inserts `lead_activity` type `note` with `actor_id` from auth profile.
- Notes compose UI on lead detail Notes section; empty trim blocked client-side; 2000 char max reused from knocks.
- After successful POST, detail reloads via `reload()` — note appears in timeline with author + Sydney timestamp.
- `npm run lint` and `npm run build` pass.
- Code review (2026-06-06): stale-while-revalidate on note reload (`reloading` state); parse failure after insert → 500.

### File List

- `src/lib/validators/lead-activity.ts`
- `src/features/pipeline/create-lead-note.ts`
- `src/app/api/v1/leads/[id]/notes/route.ts`
- `src/features/pipeline/api.ts`
- `src/features/pipeline/use-lead-detail.ts`
- `src/components/pipeline/lead-note-compose.tsx`
- `src/components/pipeline/lead-detail-timeline.tsx`
- `src/components/pipeline/lead-detail-shell.tsx`

## Change Log

- 2026-06-06: Story 4.5 — collaboration notes compose UI, POST API, and detail reload implemented.
- 2026-06-06: Code review — keep detail visible during reload; fix post-insert parse error mapping.
