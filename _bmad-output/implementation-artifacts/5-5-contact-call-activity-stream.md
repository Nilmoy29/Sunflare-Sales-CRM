---
baseline_commit: NO_VCS
---

# Story 5.5: Contact Call Activity Stream

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **rep**,
I want to see all past calls on a contact,
so that I don't repeat mistakes.

## Acceptance Criteria

1. **Given** I selected a contact on `/rep/calls` (Story 5.2)  
   **When** the contact has prior `call_logs` rows  
   **Then** an inline **Call history** section lists every call on that contact in **newest-first** order (FR28)  
   **And** each row shows **outcome label**, **rep name**, **called-at timestamp**, and **notes** when present  
   **And** empty state reads **"No calls logged yet."** (not the Epic 4 placeholder copy)

2. **Given** I log a new call on the selected contact (Story 5.3)  
   **When** `POST /api/v1/calls` succeeds  
   **Then** the call history refreshes and the new row appears at the top **without** a full page reload

3. **Given** a lead detail view (`/rep/pipeline/[leadId]` or `/admin/pipeline/[leadId]`, Story 4.4)  
   **When** the lead's `contact_id` has `call_logs` rows  
   **Then** the **Calls** timeline section shows those calls (FR28, FR34)  
   **And** `calls_available` is **`true`** in `GET /api/v1/leads/[id]`  
   **And** empty state reads **"No calls logged yet."** (replaces "call tracking arrives in a future release")

4. **Given** call timeline item rendering  
   **When** a call row displays  
   **Then** the title uses `CALL_OUTCOME_LABELS[outcome]` (mirror knock outcome labels)  
   **And** notes render as card body when non-empty  
   **And** optional duration displays when `duration_seconds` is set (e.g. "12 min")  
   **And** layout matches existing `TimelineItemCard` patterns in `lead-detail-timeline.tsx`

5. **Given** authorization and RLS (NFR9, NFR10)  
   **When** a **rep** fetches call history  
   **Then** only calls where `call_logs.rep_id = auth.uid()` are returned (existing `call_logs_select_rep`)  
   **When** an **admin** fetches lead detail  
   **Then** all calls on the lead's contact are visible (`call_logs_select_admin`)  
   **When** an unauthenticated user hits either API  
   **Then** `401`  
   **When** an admin calls `GET /api/v1/contacts/[id]/calls`  
   **Then** `403 FORBIDDEN` (rep-only surface — admin reads calls via lead detail)

6. **Given** data sourcing  
   **When** this story ships  
   **Then** calls are read from **`call_logs`** (join `profiles` for rep name) — **not** `lead_activity`  
   **And** `parseActivityRow` does **not** emit duplicate `kind: "call"` items from `lead_activity` (skip `type=call` there; `call_logs` is canonical)  
   **And** there is **no** migration unless a read RPC is required (prefer direct Supabase select + RLS)

7. **Given** implementation scope boundaries  
   **When** this story ships  
   **Then** there is **no** `lead_activity` write on call log or promote  
   **And** no Realtime subscription on `call_logs` (admin feed wiring still deferred)  
   **And** no `get_admin_daily_rep_summary` counter update — Story 5.6  
   **And** no `tel:` dial, script widget, or daily call header counter — Story 5.7 / 5.6  
   **And** promote flow (5.4) is unchanged  
   **And** `npm run build` and `npm run lint` pass

**Implements:** FR28, FR34 (calls section of 360° view)  
**NFRs:** NFR9 (RLS-scoped reads), NFR10 (API guards), UX-DR4 (mobile-readable cards)

## Tasks / Subtasks

- [x] **Validators** (AC: 3, 4, 6)
  - [x] Extend `src/lib/validators/lead-detail.ts`:
    - Update `leadDetailCallTimelineItemSchema` — add `outcome` (`callOutcomeSchema`), `notes` (nullable string), `duration_seconds` (nullable int); **remove** stub-only `content` field
    - Add `contactCallHistoryItemSchema` — `callLogSummarySchema` fields + `rep_name: string`
    - Add `contactCallHistoryResponseSchema` — `{ calls: ContactCallHistoryItem[] }`
  - [x] Add `parseCallLogTimelineRow(row)` helper in `src/lib/validators/call-logs.ts` (or `lead-detail.ts`) — map DB row + profile join → timeline item

- [x] **Server: contact call history** (AC: 1, 5, 6)
  - [x] Create `src/features/calls/get-contact-call-history.ts`:
    - `select` from `call_logs` where `contact_id = :id`
    - Join `profiles!call_logs_rep_id_fkey ( name )`
    - Order `called_at desc`
    - Map via `parseCallLogSummary` + rep name
    - Return `[]` when contact has no calls (not an error)
  - [x] Create `GET /api/v1/contacts/[id]/calls/route.ts` — `requireRoleForApi(["rep"])`, validate UUID param, 404 `CONTACT_NOT_FOUND` only if contact row missing and history empty is ambiguous — **prefer** return `[]` when RLS blocks contact (rep has no linkage); mirror search RPC permissive read pattern

- [x] **Server: lead detail calls join** (AC: 3, 4, 6)
  - [x] Update `src/features/pipeline/get-lead-detail.ts`:
    - Add `CALL_DETAIL_SELECT` (mirror `KNOCK_DETAIL_SELECT` pattern)
    - `Promise.all` fourth query: `call_logs` where `contact_id = lead.contact_id`, order `called_at desc`
    - `parseCallLogTimelineRow` → `kind: "call"` items
    - Merge into `timeline` with knocks/activity/follow-ups; sort `occurred_at` desc
    - Set `calls_available: true`
  - [x] Update `parseActivityRow` — return `null` for `type === "call"` (canonical source is `call_logs`)

- [x] **Client: calls panel history** (AC: 1, 2)
  - [x] Extend `src/features/calls/api.ts` — `fetchContactCallHistory(contactId, signal?)`
  - [x] Create `src/features/calls/use-contact-call-history.ts` — `loadedKey = contactId`, abort on unmount (mirror `use-contact-search` / `use-lead-detail`)
  - [x] Create `src/components/calls/contact-call-history.tsx` — section title "Call history", list cards, empty state
  - [x] Update `src/components/calls/calls-panel-shell.tsx`:
    - Render `ContactCallHistory` when `selectedContact` set (above or below `CallLogForm` — **below form** so rep logs then sees history update)
    - Pass `refreshKey` incremented in `handleCallLogged` to refetch history

- [x] **Client: lead detail timeline** (AC: 3, 4)
  - [x] Update `src/components/pipeline/lead-detail-timeline.tsx`:
    - `renderCallItem` — title from `CALL_OUTCOME_LABELS[item.outcome]`, body from `notes`, optional duration suffix in meta
    - Remove `CALLS_EMPTY_COPY` future-release string (keep only `callsAvailable ? "No calls logged yet." : …` — after 5.5 `calls_available` is always true when table exists; can simplify to single empty copy)

- [x] **Verify** (AC: 7)
  - [x] Manual: Select contact with 2+ calls → history shows newest first with outcomes + notes
  - [x] Manual: Log new call → history updates in place
  - [x] Manual: Open call-sourced lead detail → Calls section populated; `calls_available: true` in network tab
  - [x] Manual: Rep A cannot see Rep B's calls on shared contact (RLS); Rep A sees own calls only
  - [x] Manual: Admin lead detail shows all calls on contact
  - [x] Manual: Admin `GET /api/v1/contacts/:id/calls` → 403
  - [x] `npm run build` && `npm run lint`

### Review Findings

- [x] [Review][Patch] Stale call history shown when switching contacts — previous contact's rows lingered until fetch completed [`use-contact-call-history.ts`] — fixed: clear calls only on `contactChanged`; keep list during same-contact refresh; pass `reloading` to loading state.
- [x] [Review][Defer] `contactCallHistoryResponseSchema` parsed in feature layer only, not re-validated in route — acceptable v1 (same pattern as 5.4).
- [x] [Review][Defer] `CallHistoryCard` duplicates `TimelineItemCard` markup — cosmetic; extract shared component if a third call-history surface appears.
- [x] [Review][Defer] Sub-minute durations display as "1 min" via `Math.max(1, round(seconds/60))` — acceptable v1 rounding.

## Dev Notes

### Critical constraints

- **Do NOT** write `lead_activity` rows — Stories 5.3/5.4 deferred; read **`call_logs`** only.
- **Do NOT** add Realtime subscription on `call_logs` for calls panel or lead detail — REST refetch on mount/log is sufficient v1.
- **Do NOT** update `get_admin_daily_rep_summary` `calls` column — Story 5.6.
- **Do NOT** add shift gate on contact call history API — cold-call session (same as 5.3).
- **Do NOT** change promote flow, `create_call_log` RPC, or Kanban code.
- **Do NOT** install TanStack Query — `fetch` + hooks (Epic 2–5 convention).
- **Do NOT** broaden `call_logs_select_rep` RLS — rep sees own calls only; product accepts per-rep history on shared contacts.
- **Do NOT** add admin route for contact call history — admins use lead detail 360 view.

### Brownfield: what exists today

| Surface | Status | 5.5 behavior |
|---------|--------|--------------|
| `call_logs` table + RLS | ✅ Story 5.1 | SELECT by `contact_id`; rep/admin policies |
| `leadDetailCallTimelineItemSchema` | ⏳ Stub (`content` only) | Extend with `outcome`, `notes`, `duration_seconds` |
| `get-lead-detail.ts` | ⏳ `calls_available: false` | Join `call_logs`; `calls_available: true` |
| `lead-detail-timeline.tsx` | ⏳ Calls section + future placeholder | Render structured call items |
| `calls-panel-shell.tsx` | ⏳ Log form only | Add `ContactCallHistory` |
| `GET /api/v1/contacts/[id]/calls` | ❌ Missing | **Create** |
| `lead_activity` type `call` | ⏳ Parser exists, never written | Skip in parser; avoid duplicates |

### API contract — contact call history

```typescript
// GET /api/v1/contacts/{contactId}/calls
// Auth: rep only

// 200
{
  data: {
    calls: [
      {
        id: string;
        contact_id: string;
        rep_id: string;
        rep_name: string;
        outcome: CallOutcome;
        duration_seconds: number | null;
        notes: string | null;
        called_at: string;
        follow_up_at: string | null;
      }
    ]
  }
}

// 401 / 403
```

### Reference query — lead detail call_logs

```typescript
const CALL_DETAIL_SELECT = `
  id,
  rep_id,
  outcome,
  duration_seconds,
  notes,
  called_at,
  profiles!call_logs_rep_id_fkey ( name )
`;

// In getLeadDetail Promise.all:
supabase
  .from("call_logs")
  .select(CALL_DETAIL_SELECT)
  .eq("contact_id", contact_id)
  .order("called_at", { ascending: false });
```

### Timeline item shape (updated)

```typescript
{
  kind: "call",
  id: string;
  occurred_at: string;      // called_at ISO
  rep_name: string;
  outcome: CallOutcome;
  notes: string | null;
  duration_seconds: number | null;
}
```

### UI structure — calls panel

```
Selected contact card (existing header)
├── CallLogForm (existing)
├── Promote notice / button (5.4, existing)
└── ContactCallHistory          ← NEW
    ├── "Call history" heading
    └── TimelineItemCard rows (outcome · rep · date; notes body)
```

Place history **below** the log form so post-submit flow is: log → promote (optional) → see updated history without scrolling up.

### Files to UPDATE (read before editing)

| File | Current state | This story changes |
|------|---------------|-------------------|
| `src/lib/validators/lead-detail.ts` | Call item has `content` only | Structured call fields |
| `src/lib/validators/call-logs.ts` | Create/summary schemas | Timeline parse helper |
| `src/features/pipeline/get-lead-detail.ts` | No `call_logs` query; `calls_available: false` | Fourth parallel query; `true` |
| `src/components/pipeline/lead-detail-timeline.tsx` | Generic "Call" title + `content` body | Outcome labels + notes |
| `src/features/calls/api.ts` | create/promote/search only | `fetchContactCallHistory` |
| `src/components/calls/calls-panel-shell.tsx` | Form + promote | History section + refresh |

### File structure (new)

```
src/features/calls/get-contact-call-history.ts
src/features/calls/use-contact-call-history.ts
src/app/api/v1/contacts/[id]/calls/route.ts
src/components/calls/contact-call-history.tsx
```

### Previous story intelligence

**Story 5.4 (done):**
- Promote is separate tap; no `lead_activity` on promote.
- `calls-panel-shell` promote UI lives **below** `CallLogForm` — place call history below promote block for consistent scroll flow.

**Story 5.3 (done):**
- `CallLogSummary` shape is canonical for a single call row.
- `handleCallLogged(call)` provides fresh row — use as optimistic prepend **or** refetch via `refreshKey` (refetch is simpler and matches lead detail).

**Story 5.1 (done):**
- `idx_call_logs_contact_id` supports contact-scoped history query.
- RLS: rep sees own rows only; admin sees all — **do not broaden policies**.

**Story 4.4 (done):**
- Lead detail timeline already has Calls section + `callsAvailable` prop.
- Epic 4 retro action #9: wire `calls_available` + call timeline — **this story**.

### Cross-story dependencies

| Story | Relationship |
|-------|--------------|
| 5.1 | **Requires** — `call_logs` schema + RLS |
| 5.2 | **Requires** — `/rep/calls` contact selection surface |
| 5.3 | **Requires** — logged calls to display |
| 4.4 | **Requires** — lead detail shell + timeline component |
| 5.6 | **Future** — daily call counters (not history UI) |
| 5.7 | **Future** — scripts + `tel:` dial |

### Testing

- **Required:** `npm run build`, `npm run lint`
- **Required manual:** Calls panel history; post-log refresh; lead detail calls; rep RLS scoping; admin all-calls on lead detail; admin 403 on contact calls API
- **No** Playwright unless requested
- **No** migration unless direct select proves insufficient (unlikely)

### References

- [Source: `_bmad-output/planning-artifacts/epics.md` — Story 5.5, FR28]
- [Source: `docs/Solar_CRM_PRD_v1.md` — Contact Activity Stream (Must Have v1)]
- [Source: `_bmad-output/implementation-artifacts/4-4-lead-detail-360-view.md` — `calls_available` placeholder]
- [Source: `_bmad-output/implementation-artifacts/epic-4-retro-2026-06-06.md` — wire calls in lead detail]
- [Source: `_bmad-output/implementation-artifacts/5-1-calllog-schema-and-rls.md` — RLS + indexes]
- [Source: `_bmad-output/implementation-artifacts/5-3-log-a-call-with-outcome.md` — no `lead_activity` writes]
- [Source: `src/lib/call-outcome-labels.ts` — display labels]
- [Source: `src/components/pipeline/lead-detail-timeline.tsx` — `TimelineItemCard` pattern]
- [Source: `supabase/migrations/20260610100100_call_logs_rls.sql` — select policies]

## Dev Agent Record

### Agent Model Used

Composer

### Debug Log References

- No migration required — direct `call_logs` select + existing RLS.
- Removed unused `callsAvailable` prop from `LeadDetailTimeline` (always true post-5.5).
- `use-contact-call-history` mirrors `use-contact-search` guard pattern to satisfy `react-hooks/set-state-in-effect`.

### Completion Notes List

- Extended call timeline schema with `outcome`, `notes`, `duration_seconds`; added contact history API schemas.
- `GET /api/v1/contacts/[id]/calls` (rep-only) returns RLS-scoped call history newest-first.
- `get-lead-detail.ts` joins `call_logs` by `contact_id`; `calls_available: true`; skips `lead_activity` type `call`.
- Calls panel shows `ContactCallHistory` below promote block; refetches on successful log.
- Lead detail Calls section renders outcome labels, notes, and optional duration.
- `npm run lint` and `npm run build` pass.
- Code review: contact-switch stale history patched; hook aligned with `use-lead-detail` requestKey pattern.

### Senior Developer Review (AI)

**Outcome:** Approved (1 patch applied)  
**Date:** 2026-06-06  
**Layers:** Blind Hunter, Edge Case Hunter, Acceptance Auditor

**Summary:** `call_logs` reads wire FR28 on calls panel and lead detail 360°; `calls_available: true`; RLS-scoped rep history; admin via lead detail; no `lead_activity` duplication. Scope boundaries held. Patch: contact-switch stale history.

### File List

- `src/lib/validators/lead-detail.ts` (updated)
- `src/lib/validators/call-logs.ts` (updated)
- `src/features/calls/get-contact-call-history.ts` (new)
- `src/app/api/v1/contacts/[id]/calls/route.ts` (new)
- `src/features/pipeline/get-lead-detail.ts` (updated)
- `src/features/calls/api.ts` (updated)
- `src/features/calls/use-contact-call-history.ts` (new)
- `src/components/calls/contact-call-history.tsx` (new)
- `src/components/calls/calls-panel-shell.tsx` (updated)
- `src/components/pipeline/lead-detail-timeline.tsx` (updated)
- `src/components/pipeline/lead-detail-shell.tsx` (updated)

## Change Log

- 2026-06-06: Story 5.5 implemented — contact call activity stream on calls panel and lead detail (FR28, FR34).
- 2026-06-06: Code review — contact-switch stale history fixed in `use-contact-call-history`.

## Story Completion Status

- **Status:** done
- **Completion note:** Call activity stream approved; ready for Story 5.6 daily counters.
