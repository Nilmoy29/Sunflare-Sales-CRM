---
baseline_commit: NO_VCS
---

# Story 4.3: Lead Cards and Filters

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **rep or admin**,
I want compact cards and filters on the pipeline board,
so that I can find the right leads quickly.

## Acceptance Criteria

1. **Given** I am on `/rep/pipeline` or `/admin/pipeline` (Story 4.2 board)  
   **When** I view lead cards  
   **Then** each card shows (FR33):
   - **Name** — contact display name (first + last, or address/suburb fallback per `formatContactDisplayName`)
   - **Address** — primary address line when available (nullable)
   - **Channel** — acquisition source badge (`D2D` or `Call` from `leads.source`)
   - **Owner** — rep name (always on admin board; omitted on rep board — rep sees only own leads)
   - **Last touch** — human-readable date in Australia/Sydney (derived; see Dev Notes)
   - **Next action** — countdown to nearest incomplete follow-up due date, or `None scheduled` when none exists  
   **And** Kanban drag-and-drop from Story 4.2 still works on the visible (filtered) cards

2. **Given** the pipeline board  
   **When** I apply filters (FR38)  
   **Then** I can filter by:
   - **Stage** — one or more `lead_stage` values (`null` selection = all stages)
   - **Owner** — one or more reps (**admin only**; reps do not see owner filter — RLS scopes to self)
   - **Channel** — `d2d` and/or `call` (`null` = all channels)
   - **Suburb** — text match on `contacts.suburb` (case-insensitive contains)
   - **Date range** — `from` / `to` calendar dates (Australia/Sydney) applied to `leads.updated_at`  
   **And** changing any filter refetches leads from the API (no full page reload)  
   **And** while refetching, stale cards are cleared (`loadedKey` pattern from Epic 3 / Story 4.2 review)

3. **Given** filter defaults  
   **When** the board first loads  
   **Then** all stages, all channels, no suburb text, and a sensible default date range are applied  
   **And** admin sees all reps selected; rep sees no owner control

4. **Given** authorization (NFR9, NFR10)  
   **When** a rep passes `rep_ids` query params on `GET /api/v1/leads`  
   **Then** params are ignored — RLS still returns only own leads  
   **When** unauthenticated  
   **Then** 401  
   **When** wrong role on page route  
   **Then** existing `/forbidden` redirect applies

5. **Given** implementation scope boundaries  
   **When** this story ships  
   **Then** there is **no** lead detail drawer, card click navigation, note authoring, follow-up scheduling UI, `lead_activity` writes on stage change, lost-reason modal, or lead reassignment (Stories 4.4–4.9)  
   **And** Story 4.2 drag persistence and Story 2.9 knock promotion still work

6. **Given** implementation is complete  
   **When** `npm run build` and `npm run lint` run  
   **Then** they pass

**Implements:** FR33, FR38  
**NFRs:** NFR9 (RLS), NFR10 (API guards), UX-DR4 (rep mobile filters wrap/stack)

## Tasks / Subtasks

- [x] **Validators + labels** (AC: 1, 2)
  - [x] Extend `src/lib/validators/pipeline.ts`:
    - Extend `pipelineLeadCardSchema` — add `address` (nullable), `last_touch_at`, `next_action_due_at` (nullable)
    - Add `pipelineLeadsQuerySchema` — optional `stages[]`, `rep_ids[]`, `sources[]`, `suburb`, `from`, `to` (YYYY-MM-DD)
    - Add `pipelineFiltersSchema` / `PipelineFilters` type for client state
  - [x] Create `src/features/pipeline/pipeline-source-labels.ts` — `LEAD_SOURCE_LABELS`, `LEAD_SOURCE_BADGE_CLASS` map (`d2d` / `call`)
  - [x] Create `src/features/pipeline/format-pipeline-dates.ts` — `formatLastTouchDate(iso)`, `formatNextActionCountdown(dueAt | null)` (Sydney TZ)

- [x] **Server enrichment + filtered query** (AC: 1, 2, 4)
  - [x] Extend `PIPELINE_LEAD_SELECT` / `parse-pipeline-lead.ts` — include `contacts.address`; map `address` field on card
  - [x] Create `src/features/pipeline/enrich-pipeline-leads.ts`:
    - `enrichPipelineLeads(cards)` — batch-fetch `lead_activity` (latest `created_at` per lead) + incomplete `follow_ups` (earliest `due_at` per lead)
    - Compute `last_touch_at = max(latest_activity, leads.updated_at)` per lead
    - Compute `next_action_due_at` = min incomplete `follow_ups.due_at` or null
    - RLS on `lead_activity` / `follow_ups` scopes automatically
  - [x] Extend `src/features/pipeline/get-pipeline-leads.ts`:
    - Accept `PipelineLeadsQuery` filters
    - Apply Supabase filters: `.in('stage', …)`, `.in('rep_id', …)` (admin only path), `.in('source', …)`, `contacts.suburb ilike`, `updated_at` gte/lte via `startOfDaySydney` / `endOfDaySydney`
    - Call enrich step before returning parsed response
  - [x] Extend `GET /api/v1/leads/route.ts` — parse query string with `pipelineLeadsQuerySchema`; ignore `rep_ids` when caller is rep

- [x] **Client fetch + hook** (AC: 2, 3)
  - [x] Extend `src/features/pipeline/api.ts` — `fetchPipelineLeads(filters, signal?)` serializes query params
  - [x] Extend `src/features/pipeline/use-pipeline-leads.ts`:
    - Accept `filters` + `role: 'rep' | 'admin'`
    - `requestKey = JSON.stringify(filters)` for `loadedKey` loading semantics
    - On filter change: clear display leads while loading; on error clear leads + show message
    - Preserve Story 4.2 per-card optimistic revert (do not reintroduce full-array snapshot or PATCH rethrow)

- [x] **Filter UI** (AC: 2, 3, 5)
  - [x] Create `src/components/pipeline/pipeline-filters.tsx`:
    - Stage multi-select (checkboxes, `null` = all — mirror admin map outcome filter pattern)
    - Channel multi-select (`d2d`, `call`)
    - Suburb text input (debounce optional; refetch on Apply or blur acceptable v1)
    - Date range `from` / `to` inputs (`type="date"`)
    - Owner multi-select — **admin only**; pass `reps: { id, name }[]` prop
    - Mobile-friendly stacked layout (`flex-wrap`, min tap targets)
  - [x] Extend `src/components/pipeline/pipeline-board-shell.tsx` — wire filters + hook; default filter state helper
  - [x] Extend `src/app/(admin)/admin/pipeline/page.tsx` — server-fetch rep list (same pattern as `admin/map/page.tsx`) and pass to shell

- [x] **Rich card UI** (AC: 1)
  - [x] Extend `PipelineLeadCardView` in `src/components/pipeline/pipeline-kanban.tsx`:
    - Name, address line, channel badge, owner (when `showRepName`), last touch, next action countdown
    - Keep `min-h-11` tap target and drag behavior unchanged
    - Cards are **not** clickable (Story 4.4)

- [x] **Verify** (AC: 4, 5, 6)
  - [x] Manual: Card shows all six fields when data exists; `None scheduled` when no follow-up
  - [x] Manual: Admin filters by rep + stage → only matching cards appear
  - [x] Manual: Rep cannot see other reps' leads via filter tampering
  - [x] Manual: Drag card after filtering → stage persists
  - [x] `npm run build` && `npm run lint`

### Review Findings

- [x] [Review][Patch] Stage filter ignored after drag — optimistic move shows card in a column outside active `stages` filter until manual refetch [`src/features/pipeline/use-pipeline-leads.ts:61`]
- [x] [Review][Defer] Default 30-day `updated_at` window hides older leads on first load — intentional per story spec [`src/features/pipeline/default-pipeline-filters.ts`]
- [x] [Review][Defer] No `from <= to` validation on date filters — empty results acceptable v1 [`src/lib/validators/pipeline.ts`]
- [x] [Review][Defer] Batch enrichment `.in('lead_id', …)` unbounded — fine at current volume [`src/features/pipeline/enrich-pipeline-leads.ts:54`]

## Dev Notes

### Critical constraints

- **Do NOT** add lead detail route, drawer, or card `onClick` navigation — Story 4.4.
- **Do NOT** add follow-up create/edit/complete UI — Story 4.6 (display countdown from existing rows only).
- **Do NOT** write `lead_activity` on stage PATCH — Story 4.7.
- **Do NOT** add lost-reason gate on `lost` column — Story 4.9.
- **Do NOT** add lead reassignment — Story 4.9.
- **Do NOT** install TanStack Query — `fetch` + hooks (Epic 2–4 convention).
- **Do NOT** break Story 4.2 `PATCH /api/v1/leads/:id/stage` or Kanban DnD.
- **Do NOT** use service-role Supabase client — user JWT + RLS only.
- **Do NOT** add Supabase Realtime on `leads`.

### Last touch semantics (FR33)

Until Story 4.7 writes `stage_change` activity rows, most leads will only have `leads.updated_at` as last touch. Still implement the canonical rule now:

```typescript
last_touch_at = max(
  latest lead_activity.created_at for lead_id (if any),
  leads.updated_at
)
```

Batch enrichment after the main leads query — **do not** N+1 per card.

### Next action semantics (FR33)

Read-only display from `follow_ups`:

```sql
-- per lead: MIN(due_at) WHERE completed = false
```

UI labels (Sydney):

| Condition | Label |
|-----------|--------|
| `due_at` in future | `Due in Nd` / `Due tomorrow` / `Due today` |
| `due_at` in past | `Overdue Nd` |
| no row | `None scheduled` |

### Default filters

```typescript
function defaultPipelineFilters(role: 'rep' | 'admin'): PipelineFilters {
  const today = formatSydneyDateString(new Date());
  const monthAgo = /* 30 days before today in Sydney, reuse knock date helpers */;
  return {
    stages: null,       // all
    repIds: null,       // admin: all reps; rep: ignored
    sources: null,      // all channels
    suburb: '',
    from: monthAgo,
    to: today,
  };
}
```

Wide default date range avoids hiding older leads on first load; user can narrow.

### API contract (extend Story 4.2)

**GET `/api/v1/leads?stages=interested,pitched&rep_ids=uuid&sources=d2d&suburb=surry&from=2026-05-01&to=2026-06-09`**

All query params optional. Empty/absent = no filter on that dimension.

Response card shape (extended):

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
        "contact_name": "Sam Taylor",
        "address": "12 Example St",
        "suburb": "Surry Hills",
        "updated_at": "2026-06-07T10:00:00.000Z",
        "last_touch_at": "2026-06-07T10:00:00.000Z",
        "next_action_due_at": "2026-06-10T09:00:00.000Z"
      }
    ]
  }
}
```

Errors: `400 VALIDATION_ERROR` (bad dates/uuids), `401`, `403`, `500 PIPELINE_LEADS_FAILED`

**PATCH `/api/v1/leads/:id/stage`** — unchanged from Story 4.2.

### Server filter implementation sketch

```typescript
// get-pipeline-leads.ts
let query = supabase.from('leads').select(PIPELINE_LEAD_SELECT);

if (filters.stages?.length) query = query.in('stage', filters.stages);
if (filters.sources?.length) query = query.in('source', filters.sources);
if (filters.rep_ids?.length && isAdmin) query = query.in('rep_id', filters.rep_ids);
if (filters.suburb?.trim()) query = query.ilike('contacts.suburb', `%${trim}%`);
if (filters.from) query = query.gte('updated_at', startOfDaySydney(filters.from));
if (filters.to) query = query.lte('updated_at', endOfDaySydney(filters.to));

query = query.order('updated_at', { ascending: false });
```

Suburb filter requires join filter — use Supabase embedded filter syntax on `contacts.suburb` or filter post-parse if needed; verify against existing join patterns.

### Enrichment sketch

```typescript
async function enrichPipelineLeads(
  supabase: SupabaseClient,
  cards: PipelineLeadCard[],
): Promise<PipelineLeadCard[]> {
  const ids = cards.map((c) => c.id);
  if (ids.length === 0) return cards;

  const [activityRes, followUpRes] = await Promise.all([
    supabase.from('lead_activity').select('lead_id, created_at').in('lead_id', ids),
    supabase.from('follow_ups').select('lead_id, due_at').in('lead_id', ids).eq('completed', false),
  ]);

  // Build maps: latestActivityByLead, earliestDueByLead
  // Merge into cards with last_touch_at / next_action_due_at
}
```

### Files to UPDATE (read before editing)

| File | Current state | This story changes | Must preserve |
|------|---------------|-------------------|---------------|
| `src/lib/validators/pipeline.ts` | Minimal card schema | Extend card + query schemas | PATCH body/response schemas |
| `src/features/pipeline/parse-pipeline-lead.ts` | Join contacts/profiles | Add `address` mapping | Existing parse guards |
| `src/features/pipeline/get-pipeline-leads.ts` | Unfiltered list | Filter params + enrichment | RLS-scoped client |
| `src/app/api/v1/leads/route.ts` | GET no query | Query validation | Role guard |
| `src/features/pipeline/api.ts` | Bare fetch | Query string builder | Credentials/signal |
| `src/features/pipeline/use-pipeline-leads.ts` | No filters; per-card revert | Filters + requestKey | Optimistic PATCH revert pattern |
| `src/components/pipeline/pipeline-kanban.tsx` | Minimal card | Rich card fields | DnD + `moving` guard |
| `src/components/pipeline/pipeline-board-shell.tsx` | Title + kanban | Filter bar | Page titles |
| `src/app/(admin)/admin/pipeline/page.tsx` | Shell only | Load reps list | `requireRole(['admin'])` |

### Filter UI patterns (reuse Epic 3)

Mirror `src/components/admin/admin-map-shell.tsx`:

- `null` array = "All" selected for stages/reps/channels
- Toggling checkboxes updates filter state → refetch
- `loadedKey !== requestKey` → `loading`, clear displayed leads

Rep pipeline: hide owner filter section entirely (`showOwnerFilter={false}`).

### Channel badge styling

| `lead_source` | Label | Suggested class |
|---------------|-------|-----------------|
| `d2d` | D2D | `bg-emerald-50 text-emerald-800` |
| `call` | Call | `bg-sky-50 text-sky-800` |

Keep subtle — no new CSS framework.

### Previous story intelligence

**Story 4.2 (done):**
- Kanban, APIs, `parse-pipeline-lead.ts`, `use-pipeline-leads` hook exist.
- Code review fixed: per-card optimistic revert; no PATCH rethrow — **preserve both**.
- Deferred: unbounded GET — **this story adds server-side filters** (addresses deferred item).
- Card fields intentionally minimal — **this story extends** `PipelineLeadCardView` only.

**Story 4.1 (done):**
- `lead_activity`, `follow_ups` tables + RLS exist — read-only for enrichment.
- No activity rows on stage change until 4.7.

**Story 3.1 (done):**
- Admin multi-select filter semantics (`repIds: null` = all) — copy for owner filter.

**Epic 3 retro:**
- `loadedKey` / clear stale data on error — mandatory for filter refetch.

### Cross-story dependencies

| Story | Relationship |
|-------|--------------|
| 4.2 | **Requires** — board, APIs, hook, Kanban |
| 4.4 | **Future** — card click → detail view |
| 4.6 | **Future** — follow-up scheduling UI |
| 4.7 | **Future** — `lead_activity` on `stage_change` improves last touch |
| 4.9 | **Future** — lost reason + reassignment |

### Testing

- **Required:** `npm run build`, `npm run lint`
- **Manual:** Rich card fields; each filter dimension; drag after filter; rep RLS isolation
- **No** Playwright unless trivial

### References

- [Source: `_bmad-output/planning-artifacts/epics.md` — Story 4.3, FR33, FR38]
- [Source: `docs/Solar_CRM_PRD_v1.md` — Module 5 Lead Card Miniatures, Global Grid Filters]
- [Source: `_bmad-output/planning-artifacts/architecture.md` — `features/pipeline/`, API format, Sydney dates]
- [Source: `_bmad-output/implementation-artifacts/4-2-kanban-pipeline-board.md` — scope boundary, API contracts]
- [Source: `_bmad-output/implementation-artifacts/4-1-leads-schema-stages-and-rls.md` — `lead_activity`, `follow_ups`]
- [Source: `src/components/admin/admin-map-shell.tsx` — filter UX pattern]
- [Source: `src/features/knocks/format-knock-date.ts` — Sydney date helpers]

## Dev Agent Record

### Agent Model Used

Composer

### Debug Log References

- `enrichPipelineLeads` uses `Awaited<ReturnType<typeof createClient>>` to match SSR Supabase client typing.
- Suburb filter applies on input blur to avoid refetch-per-keystroke.

### Completion Notes List

- Extended pipeline cards with address, channel badge, last touch, and next-action countdown; batch enrichment from `lead_activity` + `follow_ups`.
- Server-side filters on `GET /api/v1/leads` (stage, owner, channel, suburb, Sydney date range on `updated_at`); rep `rep_ids` ignored at API.
- Filter bar on rep and admin boards; admin owner multi-select with server-loaded rep list.
- Preserved Story 4.2 Kanban DnD and per-card optimistic PATCH revert.
- `npm run lint` and `npm run build` pass.
- Code review (2026-06-11): after drag, remove lead from board when new stage is outside active stage filter.

### File List

- `src/lib/validators/pipeline.ts`
- `src/features/pipeline/pipeline-source-labels.ts`
- `src/features/pipeline/format-pipeline-dates.ts`
- `src/features/pipeline/default-pipeline-filters.ts`
- `src/features/pipeline/enrich-pipeline-leads.ts`
- `src/features/pipeline/parse-pipeline-lead.ts`
- `src/features/pipeline/get-pipeline-leads.ts`
- `src/features/pipeline/update-lead-stage.ts`
- `src/app/api/v1/leads/route.ts`
- `src/features/pipeline/api.ts`
- `src/features/pipeline/use-pipeline-leads.ts`
- `src/components/pipeline/pipeline-filters.tsx`
- `src/components/pipeline/pipeline-board-shell.tsx`
- `src/components/pipeline/pipeline-kanban.tsx`
- `src/app/(admin)/admin/pipeline/page.tsx`
- `src/app/(rep)/rep/pipeline/page.tsx`

## Change Log

- 2026-06-10: Story 4.3 — rich pipeline cards, server filters, and filter UI implemented.
- 2026-06-11: Code review patch — drop card after drag when stage filter excludes target column.
