---
baseline_commit: NO_VCS
---

# Story 4.4: Lead Detail 360 View

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **rep or admin**,
I want one screen for full lead history,
so that I have context before a follow-up.

## Acceptance Criteria

1. **Given** I am on `/rep/pipeline` or `/admin/pipeline`  
   **When** I open a lead’s detail (via **Details** link on the card — does not replace drag handle)  
   **Then** I navigate to `/rep/pipeline/[leadId]` or `/admin/pipeline/[leadId]`  
   **And** Kanban drag-and-drop on the board is unchanged

2. **Given** a lead I am allowed to see (RLS)  
   **When** the detail page loads  
   **Then** the header shows (FR37):
   - Contact display name, address, suburb (when available)
   - Current **stage** (human-readable label)
   - **Channel** badge (`D2D` / `Call` from `leads.source`)
   - **Creator / owner** rep name (`profiles.name` for `leads.rep_id`)
   - Lead **created** date (Sydney formatted)  
   **And** a **Back to pipeline** link returns to the board

3. **Given** the detail page  
   **When** I view the activity timeline (FR34)  
   **Then** I see a single chronological stream (newest first) containing:
   - **Knocks** — origin knock (`leads.door_knock_id`) plus any other `door_knocks` on the same `contact_id` (deduped by id)
   - **Calls** — placeholder section when `call_logs` table is absent (Epic 5); show `lead_activity` rows with `type=call` if any exist
   - **Notes** — read-only `lead_activity` rows with `type=note`
   - **Stage changes** — read-only `lead_activity` rows with `type=stage_change` (may be empty until Story 4.7 writes them)
   - **Follow-ups** — all `follow_ups` rows for the lead (read-only; completed and incomplete)  
   **And** each item shows actor/rep name and Sydney timestamp where applicable  
   **And** empty categories show a short empty-state line (not hidden)

4. **Given** authorization (NFR9, NFR10)  
   **When** a rep requests another rep’s lead id  
   **Then** `GET /api/v1/leads/:id` returns 404 (RLS — no row)  
   **When** unauthenticated  
   **Then** 401  
   **When** wrong role on page route  
   **Then** existing `/forbidden` redirect applies

5. **Given** implementation scope boundaries  
   **When** this story ships  
   **Then** there is **no** note authoring, follow-up scheduling/editing, stage-change writes, lost-reason UI, lead reassignment, or `call_logs` schema (Stories 4.5–4.9, 5.1)  
   **And** Story 4.2–4.3 pipeline board, filters, and drag still work

6. **Given** implementation is complete  
   **When** `npm run build` and `npm run lint` run  
   **Then** they pass

**Implements:** FR34, FR37  
**NFRs:** NFR9 (RLS), NFR10 (API guards), UX-DR4 (rep mobile readable layout)

## Tasks / Subtasks

- [x] **Validators** (AC: 3, 4)
  - [x] Create `src/lib/validators/lead-detail.ts`:
    - `leadDetailHeaderSchema` — lead id, stage, source, rep_id, rep_name, contact fields, created_at
    - `leadDetailKnockItemSchema`, `leadDetailCallItemSchema` (stub), `leadDetailActivityItemSchema`, `leadDetailFollowUpItemSchema`
    - `leadDetailTimelineItemSchema` — discriminated union `kind`: `knock` | `call` | `note` | `stage_change` | `follow_up`
    - `leadDetailResponseSchema` — `{ lead, timeline, calls_available: boolean }`
  - [x] Reuse `leadStageSchema`, `leadSourceSchema`, `leadActivityTypeSchema`, `doorOutcomeSchema` from enums

- [x] **Server query + API** (AC: 2, 3, 4)
  - [x] Create `src/features/pipeline/get-lead-detail.ts`:
    - Load lead by id with joins: `contacts`, `profiles` (owner/creator)
    - Load origin knock via `door_knock_id` when set
    - Load contact knocks: `door_knocks` where `contact_id = lead.contact_id`, order `knocked_at desc`
    - Load `lead_activity` for lead, order `created_at desc`
    - Load `follow_ups` for lead, order `due_at asc`
    - Merge into unified `timeline[]` sorted by `occurred_at` desc (follow-ups use `due_at` for sort key; label clearly as scheduled)
    - Return `calls_available: false` until Story 5.1 (`call_logs` table)
    - Return null when RLS blocks (treat as not found)
  - [x] Create `GET /api/v1/leads/[id]/route.ts` — `requireRoleForApi(["admin", "rep"])`, 404 `LEAD_NOT_FOUND`
  - [x] **Do not** add GET handler to `[id]/stage/route.ts` — separate `route.ts` at `[id]` level

- [x] **Client fetch + hook** (AC: 2, 3)
  - [x] Extend `src/features/pipeline/api.ts` — `fetchLeadDetail(leadId, signal?)`
  - [x] Create `src/features/pipeline/use-lead-detail.ts` — `loadedKey` / `requestKey` pattern; clear on error; abort on unmount

- [x] **Detail UI + routes** (AC: 1, 2, 3)
  - [x] Create `src/components/pipeline/lead-detail-shell.tsx` — header + timeline + loading/error
  - [x] Create `src/components/pipeline/lead-detail-timeline.tsx` — render timeline items with kind-specific labels (reuse `DOOR_OUTCOME_LABELS`, `LEAD_STAGE_LABELS`, `formatKnockHistoryDate`, `formatNextActionCountdown`)
  - [x] Create `src/app/(rep)/rep/pipeline/[leadId]/page.tsx` — `requireRole(["rep"])`
  - [x] Create `src/app/(admin)/admin/pipeline/[leadId]/page.tsx` — `requireRole(["admin"])`
  - [x] Extend `PipelineLeadCardView` in `pipeline-kanban.tsx` — add **Details** `Link` to `/{rep|admin}/pipeline/[id]` (prop: `detailBasePath`); link uses `onPointerDown={(e) => e.stopPropagation()}` so drag is unaffected

- [x] **Wire board → detail** (AC: 1)
  - [x] Extend `pipeline-board-shell.tsx` / `pipeline-kanban.tsx` props — pass `detailBasePath="/rep/pipeline"` or `"/admin/pipeline"`

- [x] **Verify** (AC: 4, 5, 6)
  - [x] Manual: D2D lead shows origin knock + contact knock history
  - [x] Manual: Calls section shows empty state (no `call_logs` table)
  - [x] Manual: Notes/stage changes list reads `lead_activity` (empty OK)
  - [x] Manual: Follow-ups listed read-only
  - [x] Manual: Rep 404 on another rep’s lead id
  - [x] Manual: Drag on board still works; Details link navigates
  - [x] `npm run build` && `npm run lint`

## Dev Notes

### Critical constraints

- **Do NOT** add note compose UI — Story 4.5 (`lead_activity` insert type `note`).
- **Do NOT** write `lead_activity` on stage PATCH — Story 4.7 (`stage_change` rows).
- **Do NOT** add follow-up create/edit/complete UI — Story 4.6.
- **Do NOT** create `call_logs` table or join — Story 5.1; use placeholder + `calls_available: false`.
- **Do NOT** add lost-reason or reassignment — Story 4.9.
- **Do NOT** install TanStack Query — `fetch` + hooks (Epic 2–4 convention).
- **Do NOT** break Story 4.2 DnD or Story 4.3 filters/cards.
- **Do NOT** use service-role Supabase client — user JWT + RLS only.
- **Do NOT** make the entire card a drag target replacement — use explicit **Details** link only.

### Brownfield: what exists today

| Data | Status | 4.4 behavior |
|------|--------|--------------|
| `leads` + RLS | ✅ Story 4.1 | Detail header + access control |
| `door_knocks` | ✅ Epic 2 | Origin + contact knock list |
| `lead_activity` | ✅ Schema only | Read notes / stage_change / call / knock rows |
| `follow_ups` | ✅ Schema only | Read-only list (likely empty) |
| `call_logs` | ❌ Epic 5.1 | Empty calls section + `calls_available: false` |
| Stage change audit | ❌ Story 4.7 | Timeline shows empty state for stage changes |

### API contract

**GET `/api/v1/leads/:id`**

```json
{
  "data": {
    "lead": {
      "id": "uuid",
      "stage": "interested",
      "source": "d2d",
      "rep_id": "uuid",
      "rep_name": "Jane Smith",
      "contact_name": "Sam Taylor",
      "address": "12 Example St",
      "suburb": "Surry Hills",
      "phone": null,
      "created_at": "2026-06-01T10:00:00.000Z"
    },
    "calls_available": false,
    "timeline": [
      {
        "kind": "knock",
        "id": "uuid",
        "occurred_at": "2026-06-01T09:00:00.000Z",
        "rep_name": "Jane Smith",
        "outcome": "interested",
        "address": "12 Example St",
        "suburb": "Surry Hills",
        "is_origin": true
      },
      {
        "kind": "follow_up",
        "id": "uuid",
        "occurred_at": "2026-06-10T09:00:00.000Z",
        "rep_name": "Jane Smith",
        "due_at": "2026-06-10T09:00:00.000Z",
        "note": "Call back",
        "completed": false
      }
    ]
  }
}
```

Errors: `400 VALIDATION_ERROR` (bad uuid), `401`, `403`, `404 LEAD_NOT_FOUND`, `500 LEAD_DETAIL_FAILED`

**PATCH `/api/v1/leads/:id/stage`** — unchanged (Story 4.2).

### Timeline merge rules

```typescript
// 1. Knocks: door_knocks for contact (include origin flag when id === lead.door_knock_id)
// 2. lead_activity → map type to kind (note | stage_change | call | knock)
// 3. follow_ups → kind follow_up, occurred_at = due_at for sorting
// Sort all by occurred_at descending
// Dedupe: if knock already in door_knocks list, skip duplicate lead_activity knock rows
```

**Stage change display (until 4.7 defines JSON):** show `content` text as-is or `"Moved stage"` if empty.

**Calls empty state copy:** `"No calls logged yet — call tracking arrives in a future release."`

### Server query sketch

```typescript
const LEAD_DETAIL_SELECT = `
  id, stage, source, rep_id, door_knock_id, call_log_id, created_at,
  profiles!leads_rep_id_fkey ( name ),
  contacts!leads_contact_id_fkey ( first_name, last_name, address, suburb, phone )
`;

// Parallel after lead row loaded:
// - door_knocks where contact_id = lead.contact_id
// - lead_activity where lead_id = id
// - follow_ups where lead_id = id
```

### Files to UPDATE (read before editing)

| File | Current state | This story changes | Must preserve |
|------|---------------|-------------------|---------------|
| `src/components/pipeline/pipeline-kanban.tsx` | Rich card, DnD only | Add Details link + `detailBasePath` prop | `@dnd-kit` drag, `moving` guard |
| `src/components/pipeline/pipeline-board-shell.tsx` | Filters + hook | Pass `detailBasePath` to kanban | Filter + `usePipelineLeads` |
| `src/features/pipeline/api.ts` | List + PATCH client | Add `fetchLeadDetail` | Existing fetch helpers |

### UI layout notes

**Rep mobile (UX-DR4):** single column, timeline cards stacked, min tap targets on Details link.

**Admin desktop:** same component; wider padding (`md:p-8`) on admin detail page shell.

**Header:** reuse `LEAD_SOURCE_LABELS` / `LEAD_SOURCE_BADGE_CLASS`, `LEAD_STAGE_LABELS` from pipeline helpers.

### DnD + Details link pattern

```tsx
<Link
  href={`${detailBasePath}/${lead.id}`}
  onPointerDown={(e) => e.stopPropagation()}
  className="mt-2 inline-block text-xs font-medium text-zinc-700 underline"
>
  Details
</Link>
```

Place below card metadata, outside `{...listeners}` if listeners are on wrapper — or stop propagation as above.

### Previous story intelligence

**Story 4.3 (done):**
- Rich cards, filters, enrichment (`last_touch_at`, `next_action_due_at`) — detail page is separate route, not drawer.
- Cards explicitly not clickable in 4.3 — **4.4 adds Details link only**.

**Story 4.2 (done):**
- `PATCH .../stage`, Kanban — must not regress.
- Per-card optimistic revert — unchanged on board.

**Story 4.1 (done):**
- `lead_activity`, `follow_ups` RLS — read paths scoped by lead ownership.

**Story 2.9 (done):**
- D2D leads have `door_knock_id` + `source=d2d` — primary knock data for FR34.

**Epic 3 retro:**
- `loadedKey` hook pattern for detail fetch.

### Cross-story dependencies

| Story | Relationship |
|-------|--------------|
| 4.2, 4.3 | **Requires** — pipeline board + card data |
| 4.5 | **Future** — note authoring on this page |
| 4.6 | **Future** — follow-up scheduling UI |
| 4.7 | **Future** — `stage_change` rows populate timeline |
| 5.1 | **Future** — `call_logs` join replaces calls placeholder |
| 4.9 | **Future** — reassignment changes owner display |

### Testing

- **Required:** `npm run build`, `npm run lint`
- **Manual:** Detail render D2D lead; empty calls/notes/stage sections; rep RLS 404
- **No** Playwright unless trivial

### References

- [Source: `_bmad-output/planning-artifacts/epics.md` — Story 4.4, FR34, FR37]
- [Source: `docs/Solar_CRM_PRD_v1.md` — Lead Detail View, Lead / LeadActivity / FollowUp entities]
- [Source: `_bmad-output/planning-artifacts/architecture.md` — `features/pipeline/`, API patterns]
- [Source: `_bmad-output/implementation-artifacts/4-3-lead-cards-and-filters.md` — card fields, scope boundary]
- [Source: `_bmad-output/implementation-artifacts/4-1-leads-schema-stages-and-rls.md` — schema + RLS]
- [Source: `src/features/knocks/format-knock-date.ts` — Sydney date formatting]
- [Source: `src/lib/geo/door-outcome-colors.ts` — outcome labels]

## Dev Agent Record

### Agent Model Used

Composer

### Debug Log References

- `lead_activity` type `knock` rows skipped in timeline merge — knocks sourced from `door_knocks` only.
- Timeline UI uses category sections with per-kind empty states; calls show Epic 5 placeholder when `calls_available: false`.

### Completion Notes List

- `GET /api/v1/leads/:id` returns lead header + merged timeline (knocks, activity, follow-ups) with RLS-scoped access.
- Rep/admin detail routes at `/rep/pipeline/[leadId]` and `/admin/pipeline/[leadId]` with header, back link, and read-only timeline.
- Pipeline cards gain **Details** link (`detailBasePath` prop) with `onPointerDown` stopPropagation — DnD unchanged.
- `npm run lint` and `npm run build` pass.
- Code review (2026-06-06): hide error while loading; disable Details link in drag overlay; add `onClick` stopPropagation on Details link.

### File List

- `src/lib/validators/lead-detail.ts`
- `src/features/pipeline/get-lead-detail.ts`
- `src/app/api/v1/leads/[id]/route.ts`
- `src/features/pipeline/api.ts`
- `src/features/pipeline/use-lead-detail.ts`
- `src/components/pipeline/lead-detail-shell.tsx`
- `src/components/pipeline/lead-detail-timeline.tsx`
- `src/components/pipeline/pipeline-kanban.tsx`
- `src/components/pipeline/pipeline-board-shell.tsx`
- `src/app/(rep)/rep/pipeline/[leadId]/page.tsx`
- `src/app/(admin)/admin/pipeline/[leadId]/page.tsx`
- `src/app/(rep)/rep/pipeline/page.tsx`
- `src/app/(admin)/admin/pipeline/page.tsx`

## Change Log

- 2026-06-06: Story 4.4 — lead detail 360 view, API, timeline UI, and pipeline Details links implemented.
- 2026-06-06: Code review — loading/error UX, drag overlay Details link, DnD click guard.
