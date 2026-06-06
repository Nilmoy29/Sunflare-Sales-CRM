---
baseline_commit: NO_VCS
---

# Story 4.7: Pipeline Stage Audit Trail

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an **admin**,
I want a history of stage moves,
so that I can review process compliance.

## Acceptance Criteria

1. **Given** an authenticated **rep** or **admin** drags a lead to a different stage on `/rep/pipeline` or `/admin/pipeline` (Story 4.2 Kanban)  
   **When** `PATCH /api/v1/leads/:id/stage` succeeds with a **new** stage value  
   **Then** a `lead_activity` row is inserted with `type = stage_change` (FR40)  
   **And** `actor_id` is the authenticated user's profile id (rep or admin who moved the card)  
   **And** `from_stage` and `to_stage` are captured from the lead's prior stage and the requested stage  
   **And** `created_at` is set by the database (immutable timestamp)

2. **Given** a stage change audit row exists  
   **When** I open `/rep/pipeline/[leadId]` or `/admin/pipeline/[leadId]` (Story 4.4 detail)  
   **Then** the **Stage changes** timeline section lists the move with actor name, Sydney-formatted timestamp, and human-readable from → to labels (FR34)  
   **And** other timeline sections (Knocks, Calls, Notes, Follow-ups) are unchanged

3. **Given** `PATCH /api/v1/leads/:id/stage` is called with the **same** stage the lead already has  
   **When** the request succeeds  
   **Then** **no** new `lead_activity` row is written (idempotent no-op)  
   **And** the API still returns the enriched lead card (Story 4.2/4.3 contract unchanged)

4. **Given** authorization (NFR9, NFR10)  
   **When** a rep PATCHes another rep's lead  
   **Then** `404 LEAD_NOT_FOUND` (RLS — no stage update, no audit row)  
   **When** an admin PATCHes a visible lead  
   **Then** stage updates and audit row records admin as `actor_id`  
   **When** unauthenticated  
   **Then** `401`

5. **Given** the pipeline board refetches or PATCH response merges enriched card data  
   **When** a stage move creates a new `lead_activity` row  
   **Then** `last_touch_at` on the returned card reflects the audit `created_at` via existing `enrich-pipeline-leads` (FR33 side effect — no board UI changes)

6. **Given** implementation scope boundaries  
   **When** this story ships  
   **Then** there is **no** separate admin audit log page, CSV export, or retroactive backfill of historical moves  
   **And** there is **no** lost-reason gate on `lost` column (Story 4.9)  
   **And** there is **no** lead reassignment (Story 4.9)  
   **And** Story 4.2–4.6 Kanban DnD, filters, notes compose, follow-up compose, and detail GET still work

7. **Given** implementation is complete  
   **When** `npm run build` and `npm run lint` run  
   **Then** they pass

**Implements:** FR40, FR34 (stage changes section populated)  
**NFRs:** NFR9 (RLS), NFR10 (API guards)

## Tasks / Subtasks

- [x] **Validators + content format** (AC: 1, 2)
  - [x] Extend `src/lib/validators/lead-activity.ts`:
    - `stageChangeActivityContentSchema` — `{ from_stage: leadStageSchema, to_stage: leadStageSchema }`
    - `serializeStageChangeContent(from, to)` → JSON string for `lead_activity.content`
    - `parseStageChangeContent(content)` → parsed object or null (safe parse for brownfield rows)
  - [x] Extend `src/lib/validators/lead-detail.ts`:
    - Add `from_stage` and `to_stage` to `leadDetailStageChangeTimelineItemSchema` (both `leadStageSchema`)
    - Keep `content` as human-readable display string (e.g. `"Knocked / Called → Interested"`)

- [x] **Server audit write on stage PATCH** (AC: 1, 3, 4, 5)
  - [x] Update `src/features/pipeline/update-lead-stage.ts`:
    - Add `actorId: string` parameter
    - Pre-fetch lead: `select id, stage` — return null if RLS blocks
    - If `lead.stage === requestedStage` → skip insert, return enriched card (no-op)
    - `UPDATE leads SET stage = …` (existing path)
    - Insert `lead_activity`: `{ lead_id, actor_id: actorId, type: 'stage_change', content: serializeStageChangeContent(from, to) }`
    - RLS failure on insert → throw (route returns `500 STAGE_UPDATE_FAILED`; lead may already be moved — acceptable v1, same class of gap as 4.5 parse failure)
    - Then `enrichPipelineLeads` as today
  - [x] Update `src/app/api/v1/leads/[id]/stage/route.ts`:
    - Pass `auth.id` from `requireRoleForApi` into `updateLeadStage(id, stage, auth.id)`
    - No new routes — extend existing PATCH only

- [x] **Detail read path** (AC: 2)
  - [x] Update `src/features/pipeline/get-lead-detail.ts` `parseActivityRow`:
    - For `type = stage_change`: parse JSON `content` via `parseStageChangeContent`
    - Map to timeline item with `from_stage`, `to_stage`, and `content` = `formatStageChangeDisplay(from, to)` using `LEAD_STAGE_LABELS`
    - Malformed legacy rows: fall back to `content` text or `"Moved stage"` (4.4 empty-state pattern)
  - [x] Add `formatStageChangeDisplay` in `src/features/pipeline/pipeline-stage-labels.ts` (or colocate with validators)

- [x] **Timeline display** (AC: 2)
  - [x] Update `src/components/pipeline/lead-detail-timeline.tsx` `renderStageChangeItem`:
    - Prefer `from_stage` / `to_stage` labels when present: body = `"${LEAD_STAGE_LABELS[from]} → ${LEAD_STAGE_LABELS[to]}"`
    - Fall back to `item.content` for unparsed rows

- [x] **Verify** (AC: 3, 4, 5, 6, 7)
  - [x] Manual: Rep drags own lead to new column → detail Stage changes shows actor + from → to
  - [x] Manual: Admin drags rep's lead → audit shows admin as actor
  - [x] Manual: Rep 404 on another rep's lead PATCH (no audit row)
  - [x] Manual: PATCH same stage → no duplicate audit row
  - [x] Manual: Notes compose, follow-up compose, Kanban drag still work
  - [x] Manual: Board card `last_touch_at` updates after move (via PATCH response or refetch)
  - [x] `npm run build` && `npm run lint`

### Review Findings

- [x] [Review][Patch] Legacy malformed `stage_change` rows used dummy `knocked_called` stages — misleading data; optional `from_stage`/`to_stage` + content fallback [`src/features/pipeline/get-lead-detail.ts:138`, `src/lib/validators/lead-detail.ts:47`]
- [x] [Review][Patch] Post-insert enrichment duplicated parse/enrich path — reuse `enrichLeadCard` so `last_touch_at` always includes new audit row [`src/features/pipeline/update-lead-stage.ts:97`]
- [x] [Review][Defer] Stage update + activity insert not atomic — lead may move without audit row if insert fails after UPDATE; acceptable v1 (4.5 pattern) [`src/features/pipeline/update-lead-stage.ts:86`]
- [x] [Review][Defer] No retroactive backfill for moves before 4.7 — timeline empty for historical leads acceptable v1
- [x] [Review][Defer] Story 3.3 appointments metric still uses `leads.updated_at` proxy — consume `stage_change` events in future metric hardening

## Dev Notes

### Critical constraints

- **Do NOT** add a new API route — audit is a side effect of existing `PATCH /api/v1/leads/:id/stage`.
- **Do NOT** add client-side audit writes — server-only insert in `updateLeadStage`.
- **Do NOT** add retroactive backfill migration for leads moved before 4.7 — timeline empty state for old leads is acceptable.
- **Do NOT** add lost-reason modal or block `lost` moves — Story 4.9.
- **Do NOT** add lead reassignment — Story 4.9.
- **Do NOT** add note/follow-up compose changes — Stories 4.5/4.6 untouched unless regression fix.
- **Do NOT** install TanStack Query — `fetch` + hooks.
- **Do NOT** use service-role Supabase client — user JWT + RLS only.
- **Do NOT** add `UPDATE`/`DELETE` on `lead_activity` — append-only (Story 4.1).

### Brownfield: what exists today

| Piece | Status | 4.7 behavior |
|-------|--------|--------------|
| `PATCH /api/v1/leads/:id/stage` | ✅ Story 4.2 | Extend `updateLeadStage` to write audit |
| `update-lead-stage.ts` | ✅ Story 4.2/4.3 | Pre-read stage, insert activity, enrich |
| `lead_activity` + RLS | ✅ Story 4.1 | INSERT `type=stage_change`; rep on own leads; admin any |
| `GET /api/v1/leads/:id` | ✅ Story 4.4 | Stage changes section reads `kind=stage_change` |
| `lead-detail-timeline.tsx` | ✅ Story 4.4/4.6 | Improve stage change display labels |
| `enrich-pipeline-leads.ts` | ✅ Story 4.3 | `last_touch_at` picks up new activity automatically |
| `LEAD_STAGE_LABELS` | ✅ Story 4.2 | Reuse for display strings |

### `lead_activity.content` format (canonical)

Store **JSON** in `content` (PRD allows TEXT; no schema migration):

```json
{ "from_stage": "knocked_called", "to_stage": "interested" }
```

```typescript
// serialize on insert
JSON.stringify({ from_stage, to_stage })

// parse on read — safeParse; null → fallback display
stageChangeActivityContentSchema.safeParse(JSON.parse(content))
```

Display string for timeline `content` field:

```typescript
`${LEAD_STAGE_LABELS[from_stage]} → ${LEAD_STAGE_LABELS[to_stage]}`
```

### RLS behavior (read before implementing)

```sql
-- Rep insert: actor_id = auth.uid() AND lead.rep_id = auth.uid()
-- Admin insert: is_admin() (set actor_id = auth.uid() for attribution)
```

Rep stage PATCH on own lead: `actor_id` = rep, `from`/`to` captured — RLS satisfied.  
Admin stage PATCH: `actor_id` = admin — admin insert policy allows.

### Server flow sketch

```typescript
export async function updateLeadStage(
  leadId: string,
  stage: LeadStage,
  actorId: string,
): Promise<PipelineLeadCard | null> {
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("leads")
    .select("id, stage")
    .eq("id", leadId)
    .maybeSingle();

  if (!existing) return null;

  const fromStage = existing.stage as LeadStage;
  if (fromStage === stage) {
    // no-op: fetch full card + enrich without insert
    ...
  }

  const { data, error } = await supabase
    .from("leads")
    .update({ stage } as never)
    .eq("id", leadId)
    .select(PIPELINE_LEAD_SELECT)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const { error: activityError } = await supabase.from("lead_activity").insert({
    lead_id: leadId,
    actor_id: actorId,
    type: "stage_change",
    content: serializeStageChangeContent(fromStage, stage),
  } as never);

  if (activityError) throw activityError;

  const base = parsePipelineLeadRow(data as Record<string, unknown>);
  if (!base) return null;
  const [enriched] = await enrichPipelineLeads(supabase, [base]);
  return enriched ?? null;
}
```

**No-op path:** when `fromStage === stage`, load card via existing select + enrich without insert (avoid duplicate audit on repeated PATCH).

### Files to UPDATE (read before editing)

| File | Current state | This story changes | Must preserve |
|------|---------------|-------------------|---------------|
| `src/features/pipeline/update-lead-stage.ts` | Updates `leads.stage` only | Pre-read stage, insert `lead_activity`, `actorId` param | Enriched `PipelineLeadCard` return shape |
| `src/app/api/v1/leads/[id]/stage/route.ts` | Calls `updateLeadStage(id, stage)` | Pass `auth.id` | Error codes: `400`, `404`, `500 STAGE_UPDATE_FAILED` |
| `src/features/pipeline/get-lead-detail.ts` | `parseActivityRow` maps stage_change to plain `content` | Parse JSON; populate `from_stage`/`to_stage` | Other activity kinds; knock dedupe |
| `src/lib/validators/lead-activity.ts` | Note POST schemas only | Stage-change content serialize/parse helpers | Existing note schemas |
| `src/lib/validators/lead-detail.ts` | `stage_change` has `content` only | Add `from_stage`, `to_stage` | Other timeline item kinds |
| `src/components/pipeline/lead-detail-timeline.tsx` | Renders `item.content` for stage changes | Label-aware from → to display | Notes/follow-up compose (4.5/4.6) |
| `src/features/pipeline/pipeline-stage-labels.ts` | `LEAD_STAGE_LABELS` map | Optional `formatStageChangeDisplay` helper | Existing exports used by Kanban |

**No changes expected:** `use-pipeline-leads.ts`, `pipeline-kanban.tsx`, `api.ts` PATCH client (response shape unchanged).

### Previous story intelligence

**Story 4.6 (done):**
- Nested POST routes pattern — **not applicable**; 4.7 extends existing PATCH only.
- `reloading` / compose disable pattern — do not touch follow-up compose.

**Story 4.5 (done):**
- `create-lead-note.ts` insert + profile join pattern — mirror for activity insert (no select/join needed on PATCH path; detail GET loads actor via existing join).
- RLS failure → `404` on lead access; insert failure after mutation → `500`.

**Story 4.4 (done):**
- Stage changes section exists with empty state `"No stage changes recorded yet."` — 4.7 populates it.
- `parseActivityRow` already has `stage_change` branch — extend, don't replace.

**Story 4.3 (done):**
- `last_touch_at = max(latest lead_activity.created_at, leads.updated_at)` — stage audit rows improve accuracy vs `updated_at`-only proxy.

**Story 3.3 (done):**
- Appointments metric still uses `leads.updated_at` proxy — switching to `stage_change` events is **out of scope** for 4.7; note for Epic 7 / future metric hardening.

### Cross-story dependencies

| Story | Relationship |
|-------|--------------|
| 4.2 | **Requires** — Kanban PATCH stage path |
| 4.4 | **Requires** — detail Stage changes section display |
| 4.9 | **Future** — lost-reason gate on `lost` moves may add content fields |
| 4.8 | **Unrelated** — web push |
| 3.3 | **Side effect deferred** — dashboard metrics may later consume `stage_change` rows |

### Testing

- **Required:** `npm run build`, `npm run lint`
- **Manual:** Rep + admin drag to new stage; detail shows audit; same-stage no-op; RLS 404; board last-touch updates
- **No** Playwright unless trivial
- **No** migration — uses existing `lead_activity` table

### References

- [Source: `_bmad-output/planning-artifacts/epics.md` — Story 4.7, FR40, FR34]
- [Source: `docs/Solar_CRM_PRD_v1.md` — LeadActivity entity, stage_change type]
- [Source: `_bmad-output/planning-artifacts/architecture.md` — `PATCH /api/v1/leads/:id/stage`, `features/pipeline/`]
- [Source: `_bmad-output/implementation-artifacts/4-4-lead-detail-360-view.md` — Stage changes timeline, parse rules]
- [Source: `_bmad-output/implementation-artifacts/4-5-collaboration-notes.md` — `lead_activity` insert + RLS patterns]
- [Source: `_bmad-output/implementation-artifacts/4-2-kanban-pipeline-board.md` — PATCH contract, DnD must not regress]
- [Source: `_bmad-output/implementation-artifacts/4-1-leads-schema-stages-and-rls.md` — `lead_activity` schema + RLS]
- [Source: `src/features/pipeline/update-lead-stage.ts` — current stage update path]
- [Source: `src/features/pipeline/pipeline-stage-labels.ts` — `LEAD_STAGE_LABELS`]

## Dev Agent Record

### Agent Model Used

Composer

### Debug Log References

- Stage audit JSON stored in `lead_activity.content`; timeline parses on read.
- No-op PATCH skips insert when `from_stage === to_stage`; returns enriched card via re-fetch.

### Completion Notes List

- `PATCH /api/v1/leads/:id/stage` writes `lead_activity` `type=stage_change` with actor, from/to stages.
- Detail Stage changes section shows human-readable from → to labels.
- `last_touch_at` improves via existing enrichment after audit insert.
- `npm run lint` and `npm run build` pass.
- Code review: optional legacy stage fields; unified `enrichLeadCard` after audit insert.

### File List

- `src/lib/validators/lead-activity.ts`
- `src/lib/validators/lead-detail.ts`
- `src/features/pipeline/pipeline-stage-labels.ts`
- `src/features/pipeline/update-lead-stage.ts`
- `src/app/api/v1/leads/[id]/stage/route.ts`
- `src/features/pipeline/get-lead-detail.ts`
- `src/components/pipeline/lead-detail-timeline.tsx`

## Change Log

- 2026-06-06: Story 4.7 context created — stage audit on PATCH, JSON content format, detail timeline display.
- 2026-06-06: Story 4.7 — stage audit on PATCH, detail timeline labels, idempotent no-op implemented.
- 2026-06-06: Code review — legacy stage fallback + enrich reuse; story marked done.
