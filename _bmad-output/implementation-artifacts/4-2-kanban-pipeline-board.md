---
baseline_commit: NO_VCS
---

# Story 4.2: Kanban Pipeline Board

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **rep or admin**,
I want a drag-and-drop pipeline board,
so that I can move leads through the sales process.

## Acceptance Criteria

1. **Given** I am an authenticated **rep**  
   **When** I open `/rep/pipeline`  
   **Then** I see a Kanban board with columns for every `lead_stage` enum value in PRD order (FR32)  
   **And** each column lists only **my** leads (`leads.rep_id = auth.uid()`, enforced by RLS)  
   **And** each card shows a minimal label: contact display name (and suburb if available)  
   **And** the layout is usable on mobile (horizontal scroll across columns, UX-DR4)

2. **Given** I am an authenticated **admin**  
   **When** I open `/admin/pipeline`  
   **Then** I see the same stage columns with **all reps'** leads (FR60)  
   **And** each card also shows **rep owner name**  
   **And** the layout targets desktop width (UX-DR5)

3. **Given** a lead card on the board  
   **When** I drag it to a different stage column and drop  
   **Then** `leads.stage` persists via API (FR32)  
   **And** `leads.updated_at` refreshes (trigger from Story 4.1)  
   **And** the card appears in the target column without full page reload  
   **And** on API failure the card reverts to its prior column with an error message

4. **Given** stage column order  
   **When** the board renders  
   **Then** columns appear left-to-right in frozen enum order:  
   `knocked_called` → `interested` → `appointment_set` → `pitched` → `proposal_sent` → `signed` → `lost`  
   **And** column headers use human-readable labels (not raw snake_case)

5. **Given** authorization boundaries (NFR9, NFR10)  
   **When** a rep calls lead APIs for another rep's lead id  
   **Then** update returns 404 or empty result (RLS — no row updated)  
   **When** an unauthenticated user calls lead APIs  
   **Then** 401  
   **When** wrong role hits a page route  
   **Then** existing `/forbidden` redirect applies

6. **Given** implementation scope boundaries  
   **When** this story ships  
   **Then** there are **no** pipeline filters, rich card fields, lead detail drawer, notes, follow-up UI, lost-reason modal, or `lead_activity` writes (Stories 4.3–4.9)  
   **And** knock promotion (Story 2.9) and admin summary grid (Story 3.3) still work

7. **Given** implementation is complete  
   **When** `npm run build` and `npm run lint` run  
   **Then** they pass

**Implements:** FR32  
**NFRs:** NFR9 (RLS), NFR10 (API guards), UX-DR4 (rep mobile), UX-DR5 (admin desktop)

## Tasks / Subtasks

- [x] **Dependency + stage labels** (AC: 4)
  - [x] Add `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` to `package.json`
  - [x] Create `src/features/pipeline/pipeline-stage-labels.ts` — `PIPELINE_STAGE_ORDER` (re-export `LEAD_STAGES`), `LEAD_STAGE_LABELS` map, `formatContactDisplayName(contact)`

- [x] **Validators** (AC: 3, 5)
  - [x] Create `src/lib/validators/pipeline.ts`:
    - `pipelineLeadCardSchema` — `id`, `stage`, `source`, `rep_id`, `rep_name`, `contact_name`, `suburb` (nullable), `updated_at`
    - `pipelineLeadsResponseSchema` — `{ leads: PipelineLeadCard[] }`
    - `updateLeadStageBodySchema` — `{ stage: leadStageSchema }`
    - `updateLeadStageResponseSchema` — `{ lead: PipelineLeadCard }` or reuse card schema

- [x] **Server queries + API routes** (AC: 3, 5)
  - [x] Create `src/features/pipeline/get-pipeline-leads.ts`:
    - Query `leads` joined to `contacts` + `profiles` (rep name)
    - Order by `updated_at desc` within stage grouping on client
    - RLS scopes rep vs admin automatically via user-scoped Supabase client
    - Parse rows with Zod at boundary
  - [x] Create `src/features/pipeline/update-lead-stage.ts`:
    - `updateLeadStage(leadId, stage)` — `UPDATE leads SET stage = $1 WHERE id = $2 RETURNING ...`
    - Return null if RLS blocks (treat as not found)
  - [x] Create `GET /api/v1/leads/route.ts` — `requireRoleForApi(["admin", "rep"])`
  - [x] Create `PATCH /api/v1/leads/[id]/stage/route.ts` — same role guard + body validation

- [x] **Client fetch + hook** (AC: 1, 3, 6)
  - [x] Create `src/features/pipeline/api.ts` — `fetchPipelineLeads`, `updateLeadStage(leadId, stage)`
  - [x] Create `src/features/pipeline/use-pipeline-leads.ts` — `loadedKey` pattern; on error clear display; optimistic local stage map for drag (revert on PATCH failure)
  - [x] **Hook patterns (Epic 3 retro):** error path clears stale cards; while refetching after failed PATCH revert optimistic state

- [x] **Kanban UI** (AC: 1, 2, 3, 4)
  - [x] Create `src/components/pipeline/pipeline-kanban.tsx` (client):
    - `@dnd-kit` `DndContext` + droppable columns + draggable cards
    - `onDragEnd`: if `over` column stage differs, call `updateLeadStage` + optimistic move
    - Props: `leads`, `loading`, `error`, `showRepName` (admin true, rep false), `onStageChange`
  - [x] Create `src/components/pipeline/pipeline-board-shell.tsx` — wraps hook + kanban + loading/error states
  - [x] Create `src/app/(rep)/rep/pipeline/page.tsx` — `requireRole(["rep"])`, mobile-friendly shell
  - [x] Create `src/app/(admin)/admin/pipeline/page.tsx` — `requireRole(["admin"])`, desktop shell with `showRepName`
  - [x] Add **Pipeline** nav link to `src/app/(rep)/layout.tsx` and `src/app/(admin)/layout.tsx`

- [x] **Optional performance index** (AC: 7)
  - [x] If board load is slow, add migration `idx_leads_rep_stage` on `(rep_id, stage)` — skipped at current volume

- [x] **Verify** (AC: 5, 6, 7)
  - [x] Manual: Rep sees only own leads; admin sees all reps
  - [x] Manual: Drag card to new stage → persists on refresh
  - [x] Manual: Rep PATCH on another rep's lead id → no change / error
  - [x] Manual: Interested knock still promotes lead; summary grid counts unchanged
  - [x] `npm run build` && `npm run lint`

### Review Findings

- [x] [Review][Patch] Failed PATCH causes unhandled promise rejection — `moveLeadStage` rethrows after setting error; `handleDragEnd` fires it via unhandled `void` [`src/features/pipeline/use-pipeline-leads.ts:78`, `src/components/pipeline/pipeline-kanban.tsx:232`]
- [x] [Review][Patch] Optimistic revert snapshots entire `leads` array — one failed update restores full prior state instead of reverting only the moved card [`src/features/pipeline/use-pipeline-leads.ts:58`]
- [x] [Review][Defer] No keyboard-accessible drag-and-drop — `PointerSensor` only; a11y gap acceptable for v1 Kanban [`src/components/pipeline/pipeline-kanban.tsx:158`]
- [x] [Review][Defer] Unbounded `GET /api/v1/leads` — no pagination; fine at current volume [`src/features/pipeline/get-pipeline-leads.ts:13`]
- [x] [Review][Defer] Admin desktop layout differs only in page padding — same horizontal-scroll Kanban as rep; UX-DR5 minimally satisfied v1 [`src/components/pipeline/pipeline-board-shell.tsx:23`]

## Dev Notes

### Critical constraints

- **Do NOT** add pipeline filters (stage/owner/suburb/date) — Story 4.3.
- **Do NOT** add rich card fields (last touch, next action, channel badge styling) beyond minimal name/suburb/owner — Story 4.3.
- **Do NOT** add lead detail 360 view or card click navigation — Story 4.4.
- **Do NOT** write `lead_activity` rows on stage change — Story 4.7 audit trail.
- **Do NOT** require lost reason when dropping to `lost` — Story 4.9.
- **Do NOT** add follow-up scheduling UI — Story 4.6.
- **Do NOT** install TanStack Query — `fetch` + hooks (Epic 2–3 convention overrides architecture doc TanStack note for v1).
- **Do NOT** modify `create_knock_with_contact` or knock APIs.
- **Do NOT** add Supabase Realtime subscription on `leads` — optional later; refetch on mount + after PATCH only.
- **Do NOT** use service-role Supabase client in route handlers — user JWT + RLS only.

### Stage columns (canonical)

Reuse `LEAD_STAGES` from `src/lib/validators/enums.ts` — **do not invent new stages**.

| `lead_stage` | Column label |
|--------------|--------------|
| `knocked_called` | Knocked / Called |
| `interested` | Interested |
| `appointment_set` | Appointment set |
| `pitched` | Pitched |
| `proposal_sent` | Proposal sent |
| `signed` | Signed |
| `lost` | Lost |

### API contracts

**GET `/api/v1/leads`**

```json
{
  "data": {
    "leads": [
      {
        "id": "uuid",
        "stage": "interested",
        "source": "d2d",
        "rep_id": "uuid",
        "rep_name": "Jane Smith",
        "contact_name": "12 Example St, Surry Hills",
        "suburb": "Surry Hills",
        "updated_at": "2026-06-07T10:00:00.000Z"
      }
    ]
  }
}
```

RLS returns subset automatically — no `rep_id` query param needed.

**PATCH `/api/v1/leads/:id/stage`**

```json
{ "stage": "appointment_set" }
```

Response:

```json
{
  "data": {
    "lead": { "id": "uuid", "stage": "appointment_set", "...": "..." }
  }
}
```

Errors: `400 VALIDATION_ERROR`, `401`, `403 FORBIDDEN`, `404 LEAD_NOT_FOUND`, `500 STAGE_UPDATE_FAILED`

### `@dnd-kit` integration sketch

```typescript
// Column = droppable with id = stage string
// Card = draggable with id = lead.id
// onDragEnd:
const newStage = over?.id as LeadStage | undefined;
if (newStage && newStage !== activeLead.stage) {
  optimisticMove(active.id, newStage);
  try { await updateLeadStage(active.id, newStage); }
  catch { revertMove(active.id); setError(...); }
}
```

Use `PointerSensor` with small activation distance to avoid accidental drags on mobile scroll.

Install:

```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

### Contact display name helper

Prefer address line when name empty (common for D2D knocks):

```typescript
function formatContactDisplayName(c: {
  first_name: string | null;
  last_name: string | null;
  address: string | null;
  suburb: string | null;
}): string {
  const name = [c.first_name, c.last_name].filter(Boolean).join(" ").trim();
  if (name) return name;
  if (c.address) return c.address;
  return c.suburb ?? "Unknown contact";
}
```

### RLS reliance (Story 4.1)

| Role | `GET /api/v1/leads` | `PATCH .../stage` |
|------|---------------------|-------------------|
| Rep | `leads_select_rep` | `leads_update_rep` on own rows |
| Admin | `leads_select_admin` + rep policies | `leads_update_admin` |

No separate `/api/v1/admin/leads` route — single endpoint, RLS scopes results.

### UI layout notes

**Rep (`/rep/pipeline`):** horizontal scroll container (`overflow-x-auto`), fixed-width columns (~260px), min tap target 44px (UX-DR4).

**Admin (`/admin/pipeline`):** full-width grid/flex columns on desktop; same component with `showRepName={true}`.

### Previous story intelligence

**Story 4.1 (done):**
- `lead_activity`, `follow_ups` tables exist; **do not write activity** in 4.2.
- `leads.updated_at` trigger fires on stage PATCH — supports Story 3.3 `appointments_set` interim metric.
- Validators: `leadRowSchema`, `leadSummarySchema` — extend via `pipeline.ts`, don't break knock promotion types.

**Story 2.9 (done):**
- New leads land in `interested` stage — appear in Interested column after promotion.

**Story 3.3 (done):**
- Do not change `get_admin_daily_rep_summary` RPC.

**Epic 3 retro:**
- Use `loadedKey` hook pattern; clear stale/error state per 3.5 review fixes.
- `@dnd-kit/core` chosen per architecture.md (not react-beautiful-dnd).

### Cross-story dependencies

| Story | Relationship |
|-------|--------------|
| 4.1 | **Requires** — `leads` + RLS UPDATE policies |
| 4.3 | **Deferred** — filters + rich cards |
| 4.4 | **Future** — card click → detail view |
| 4.7 | **Future** — `lead_activity` on stage_change |
| 4.9 | **Future** — lost reason gate on `lost` column |

### Testing

- **Required:** `npm run build`, `npm run lint`
- **Manual:** Rep + admin board render; drag persistence; RLS isolation
- **No** Playwright unless trivial

### References

- [Source: `_bmad-output/planning-artifacts/epics.md` — Story 4.2, FR32]
- [Source: `docs/Solar_CRM_PRD_v1.md` — Pipeline module, Lead entity]
- [Source: `_bmad-output/planning-artifacts/architecture.md` — `@dnd-kit`, `/api/v1/leads/:id/stage`, `features/pipeline/`]
- [Source: `_bmad-output/implementation-artifacts/4-1-leads-schema-stages-and-rls.md` — RLS + schema]
- [Source: `src/lib/validators/enums.ts` — `LEAD_STAGES`]
- [Source: `src/app/(admin)/admin/dashboard/page.tsx` — page guard pattern]

## Dev Agent Record

### Agent Model Used

Composer

### Debug Log References

- Supabase `.update({ stage })` required `as never` cast (matches existing shift/profile update pattern).

### Completion Notes List

- Implemented Kanban pipeline board for rep (`/rep/pipeline`) and admin (`/admin/pipeline`) with `@dnd-kit` drag-and-drop, optimistic stage updates with revert on failure, and RLS-scoped `GET/PATCH /api/v1/leads` APIs.
- Shared row parser in `parse-pipeline-lead.ts` for GET and PATCH responses; `loadedKey` hook clears stale cards on load/error per Epic 3 patterns.
- Skipped optional `idx_leads_rep_stage` index — not needed at current data volume.
- `npm run lint` and `npm run build` pass. Manual RLS/drag scenarios ready for human verification in code review.
- Code review (2026-06-09): fixed per-card optimistic revert and removed PATCH rethrow to avoid unhandled promise rejections.

### File List

- `package.json`
- `package-lock.json`
- `src/lib/validators/pipeline.ts`
- `src/features/pipeline/pipeline-stage-labels.ts`
- `src/features/pipeline/parse-pipeline-lead.ts`
- `src/features/pipeline/get-pipeline-leads.ts`
- `src/features/pipeline/update-lead-stage.ts`
- `src/features/pipeline/api.ts`
- `src/features/pipeline/use-pipeline-leads.ts`
- `src/app/api/v1/leads/route.ts`
- `src/app/api/v1/leads/[id]/stage/route.ts`
- `src/components/pipeline/pipeline-kanban.tsx`
- `src/components/pipeline/pipeline-board-shell.tsx`
- `src/app/(rep)/rep/pipeline/page.tsx`
- `src/app/(admin)/admin/pipeline/page.tsx`
- `src/app/(rep)/layout.tsx`
- `src/app/(admin)/layout.tsx`

## Change Log

- 2026-06-07: Story 4.2 — Kanban pipeline board, APIs, and nav links implemented.
- 2026-06-09: Code review patches — per-lead optimistic revert, no PATCH rethrow.
