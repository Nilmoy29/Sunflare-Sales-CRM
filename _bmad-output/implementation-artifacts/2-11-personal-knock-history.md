---
baseline_commit: NO_VCS
---

# Story 2.11: Personal Knock History

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **rep**,
I want a list of my past knocks,
so that I can review my shift activity.

## Acceptance Criteria

1. **Given** I am an authenticated rep  
   **When** I open `/rep/history`  
   **Then** I see a paginated list of **my** door knocks ordered by most recent first (FR16)  
   **And** each row shows outcome badge (UX-DR8), knocked date/time, and address summary (or coordinates if address empty)  
   **And** I can open the page without an active shift (unlike map bbox fetch)

2. **Given** I am on the knock history page  
   **When** I change filters  
   **Then** I can filter by **date range** (`from` / `to` calendar dates, Australia/Sydney) (FR16)  
   **And** I can filter by **outcome** (single or multiple of the six door outcomes, plus “All”)  
   **And** applying filters refetches the list (non-blocking; list may show loading state)  
   **And** default range is the **last 7 days** (Sydney calendar)

3. **Given** RLS and API scoping  
   **When** any rep loads knock history  
   **Then** only knocks where `door_knocks.rep_id = auth.uid()` are returned (FR60)  
   **And** no other rep’s knocks, notes, or contact PII appear  
   **And** the implementation does **not** reuse `get_knocks_near_point` (Story 2.10 cross-rep proximity)

4. **Given** filter or fetch edge cases  
   **When** no knocks match the filters  
   **Then** an empty state explains “No knocks in this range” (not an error)  
   **When** the fetch fails  
   **Then** a non-blocking error hint is shown and filters remain usable

5. **Given** implementation scope for this story  
   **When** reviewing the diff  
   **Then** rep layout includes navigation to `/rep/history`  
   **And** Stories 2.5–2.10 knock submit, sync, map, proximity warning, and lead promotion still work unchanged  
   **And** there is no admin map, export, lead detail link, or offline Dexie merge in the history list  
   **And** `npm run build` and `npm run lint` pass

**Implements:** FR16, FR60  
**NFRs:** NFR6 (filter controls ≥44×44px touch targets)

## Tasks / Subtasks

- [x] **Validators + types** (AC: 1, 2, 3)
  - [x] Add to `src/lib/validators/knocks.ts`:
    - `knockHistoryQuerySchema` — `from`, `to` (YYYY-MM-DD), optional `outcome[]`, `limit` (default 50, max 100), `offset` (default 0)
    - `knockHistoryItemSchema` — `id`, `outcome`, `knocked_at`, `lat`, `lng`, `notes` (nullable), `address`, `suburb`, `postcode` (nullable strings from contact)
    - `knockHistoryResponseSchema` — `{ knocks, total, truncated }`
  - [x] Sydney date helpers: reuse or extend `src/features/knocks/format-knock-date.ts` for `startOfDaySydney` / `endOfDaySydney` bounds passed to query

- [x] **Server query** (AC: 1, 2, 3)
  - [x] Create `src/features/knocks/get-my-knocks.ts`
  - [x] Use `createClient()` (session auth — **RLS enforces own rows**; no `SECURITY DEFINER` RPC)
  - [x] Query `door_knocks` joined to `contacts` for address fields; filter `rep_id = auth user id` explicitly in query for clarity
  - [x] Filter `knocked_at` between Sydney `from` start-of-day and `to` end-of-day (inclusive)
  - [x] Optional `outcome IN (...)` when outcomes provided
  - [x] `ORDER BY knocked_at DESC`; `LIMIT` + `OFFSET`; set `truncated: true` when result count equals limit (fetch limit+1 pattern or count query — prefer limit+1 for v1)
  - [x] Return own `notes` on each row (rep owns the knock)

- [x] **API route** (AC: 1, 2, 3, 4)
  - [x] Create `GET /api/v1/knocks/mine` in `src/app/api/v1/knocks/mine/route.ts`
  - [x] `requireRoleForApi(["rep"])` — **no** active shift gate (contrast with `GET /api/v1/knocks` bbox)
  - [x] Parse query params with `knockHistoryQuerySchema`
  - [x] Return `{ data: KnockHistoryResponse }` / standard error envelope

- [x] **Client fetch + hook** (AC: 1, 2, 4)
  - [x] Add `fetchMyKnocks(params, signal?)` in `src/features/knocks/api.ts`
  - [x] Create `src/features/knocks/use-knock-history.ts` — holds filter state defaults (last 7 days Sydney), fetches on filter change; expose `knocks`, `loading`, `error`, `filters`, `setFilters`, `truncated`
  - [x] Follow `use-map-knocks` / `use-prior-knocks` pattern (`loadedKey` for loading, no sync setState-in-effect lint violations)

- [x] **History page UI** (AC: 1, 2, 4, 5)
  - [x] Create `src/app/(rep)/rep/history/page.tsx` — `requireRole(["rep"])` server guard
  - [x] Create `src/components/rep/knock-history-shell.tsx` (client) with:
    - Date inputs (`type="date"`) for from/to
    - Outcome filter chips (All + six outcomes); multi-select toggles
    - List rows: outcome badge + `formatKnockHistoryDate` + address line (`formatKnockAddress` helper)
    - Optional notes preview (truncated ~80 chars) for own knocks
    - Empty, loading, error states
    - “Load more” or pagination if `truncated` (offset += limit)
  - [x] Update `src/app/(rep)/layout.tsx` — add nav link “Knock history” → `/rep/history` (beside “My profile”)

- [x] **Verify** (AC: 5)
  - [ ] Manual: Rep A cannot see Rep B knocks (two accounts or RLS smoke)
  - [ ] Manual: Date + outcome filters narrow results
  - [ ] Manual: Page loads without active shift
  - [ ] Manual: Map knock flow still works
  - [x] `npm run build` && `npm run lint`

### Review Findings

- [x] [Review][Patch] Load-more fetch error clears `truncated`, hiding retry button [`src/features/knocks/use-knock-history.ts:84`]
- [x] [Review][Patch] Default 7-day range uses UTC calendar math on Sydney date parts (AC2) [`src/features/knocks/format-knock-date.ts:75`]
- [x] [Review][Defer] Stale knock rows visible while filters refetch — acceptable v1; optional “Updating…” hint later [`src/components/rep/knock-history-shell.tsx`]

## Dev Notes

### Critical constraints

- **Do NOT** use `get_knocks_near_point` or `GET /api/v1/knocks/near` — those are proximity/cross-rep (Story 2.10).
- **Do NOT** require active shift for history — profile-style rep page; only auth + rep role.
- **Do NOT** widen RLS or add `SECURITY DEFINER` for this story — own-knock list is satisfied by existing `door_knocks_select_rep` policy.
- **Do NOT** show other reps’ knocks, names, or notes.
- **Do NOT** merge offline Dexie `pending_knocks` into the server list in this story — synced knocks only.
- **Do NOT** install TanStack Query — `fetch` + `useEffect` + state (project convention).
- **Do NOT** add React Hook Form for filters — simple controlled inputs/chips.
- **Do NOT** build admin filters, CSV export, map view, or lead-detail navigation — later epics.

### Distinction from Story 2.10

| | Story 2.10 (proximity) | Story 2.11 (this) |
| :--- | :--- | :--- |
| Purpose | Warn at knock time | Audit my past knocks |
| Scope | Cross-rep within 40m | Own knocks only |
| API | `GET /api/v1/knocks/near` | `GET /api/v1/knocks/mine` |
| DB | `get_knocks_near_point` RPC | RLS-scoped `door_knocks` + `contacts` join |
| Shift | Active shift required | Not required |
| UI | Door outcome sheet block | `/rep/history` page |

### Date range (FR16)

- Filter inputs: `YYYY-MM-DD` (HTML date inputs; rep’s browser locale OK for picker UX).
- Server interprets `from` / `to` as **Australia/Sydney** calendar boundaries:
  - `from` → start of day Sydney as timestamptz
  - `to` → end of day Sydney as timestamptz (inclusive)
- Default when page opens: `to = today (Sydney)`, `from = today - 6 days` (7-day window).

### API contract

**GET `/api/v1/knocks/mine?from=2026-05-28&to=2026-06-03&outcome=not_home&outcome=interested&limit=50&offset=0`**

```json
{
  "data": {
    "knocks": [
      {
        "id": "uuid",
        "outcome": "not_home",
        "knocked_at": "2026-06-03T09:00:00.000Z",
        "lat": -33.87,
        "lng": 151.21,
        "notes": "Dog in yard",
        "address": "12 Example St",
        "suburb": "Surry Hills",
        "postcode": "2010"
      }
    ],
    "total": null,
    "truncated": false
  }
}
```

- `total` may be `null` in v1 if count query omitted; `truncated: true` when more rows exist beyond `limit`.
- Errors: `{ error: { code, message } }` — match existing knock routes.

### UI sketch

```
Knock history
[From date] [To date]
Outcome: [All] [Interested] [Not home] … (toggle chips)

┌─────────────────────────────────────┐
│ Not home   3 Jun, 9:00 AM           │
│ 12 Example St, Surry Hills 2010    │
│ Dog in yard                         │
└─────────────────────────────────────┘
…
[Load more]  (if truncated)
```

Reuse `DOOR_OUTCOME_COLORS`, `DOOR_OUTCOME_LABELS`, `formatKnockHistoryDate` from existing knock UI.

Address helper example:

```typescript
function formatKnockAddress(item: KnockHistoryItem): string {
  const parts = [item.address, item.suburb, item.postcode].filter(Boolean);
  if (parts.length > 0) return parts.join(", ");
  return `${item.lat.toFixed(5)}, ${item.lng.toFixed(5)}`;
}
```

### Files to touch (expected)

| File | Action |
| :--- | :--- |
| `src/app/(rep)/rep/history/page.tsx` | **New** |
| `src/components/rep/knock-history-shell.tsx` | **New** |
| `src/app/api/v1/knocks/mine/route.ts` | **New** |
| `src/features/knocks/get-my-knocks.ts` | **New** |
| `src/features/knocks/use-knock-history.ts` | **New** |
| `src/features/knocks/api.ts` | Add `fetchMyKnocks` |
| `src/lib/validators/knocks.ts` | History schemas |
| `src/features/knocks/format-knock-date.ts` | Optional Sydney day bounds |
| `src/app/(rep)/layout.tsx` | Nav link |

**Unchanged:** `GET /api/v1/knocks` bbox, `near` route, door outcome sheet, map shell, offline sync.

### Current code state (read before editing)

**`src/app/(rep)/layout.tsx`** — Rep header with “My profile” link only; add history link here.

**`src/app/api/v1/knocks/route.ts`** — GET bbox requires active shift + `rep_id` via `getKnocksInBbox`; do not overload this route with history filters.

**`door_knocks` RLS** (`20260603120200_harden_contacts_door_knocks_rls.sql`):

```sql
create policy door_knocks_select_rep on public.door_knocks
  for select to authenticated
  using (rep_id = (select auth.uid()));
```

**`contacts` join** — Rep can read contacts they created or knocked (`contacts_select_rep` policy). Join is safe for address display on own knocks.

### Previous story intelligence

**Story 2.10 (done):**
- `formatKnockHistoryDate`, outcome badges, `use-prior-knocks` loading pattern — reuse for list rows.
- Explicitly deferred `/rep/history` page — **implement now**.
- eslint `set-state-in-effect` — use `loadedKey` / async callback pattern from `use-map-knocks`.

**Story 2.6:**
- Address fields live on `contacts` (populated via reverse geocode on knock save).

**Story 2.7:**
- Offline pending knocks in Dexie — **out of scope** for history list v1.

### Cross-story dependencies

| Story | Relationship |
| :--- | :--- |
| 2.1 | **Requires** — `door_knocks` + `contacts` schema + RLS |
| 2.5–2.10 | **Preserve** — knock create/sync/map/warning unchanged |
| 3.1 | Admin global map filters — not this story |
| Epic 4 | Lead detail from history row — future |

### Testing

- **Required:** `npm run build`, `npm run lint`
- **Manual:** Filter by outcome + date; empty range; two rep isolation
- **Manual:** `/rep/history` without active shift
- **No** Playwright unless trivial

### References

- [Source: `_bmad-output/planning-artifacts/epics.md` — Story 2.11, FR16, FR60]
- [Source: `docs/Solar_CRM_PRD_v1.md` — Personal Logs History]
- [Source: `_bmad-output/planning-artifacts/architecture.md` — `(rep)/rep/history` route]
- [Source: `_bmad-output/implementation-artifacts/2-10-re-knock-warning-with-history.md` — scope boundary]
- [Source: `supabase/migrations/20260603120200_harden_contacts_door_knocks_rls.sql`]
- [Source: `src/features/knocks/use-map-knocks.ts` — fetch hook pattern]
- [Source: `src/app/(rep)/layout.tsx`]

## Dev Agent Record

### Agent Model Used

Claude (Cursor Agent)

### Debug Log References

### Completion Notes List

- Added `GET /api/v1/knocks/mine` with RLS-scoped `door_knocks` + `contacts` join; no active shift required.
- Sydney date range filtering with default last 7 days; outcome multi-select chips; load-more pagination.
- `/rep/history` page with nav link in rep layout; reuses outcome badges and date formatting from 2.10.
- `npm run lint` and `npm run build` pass.

### File List

- `src/lib/validators/knocks.ts`
- `src/features/knocks/format-knock-date.ts`
- `src/features/knocks/get-my-knocks.ts`
- `src/features/knocks/use-knock-history.ts`
- `src/features/knocks/api.ts`
- `src/app/api/v1/knocks/mine/route.ts`
- `src/app/(rep)/rep/history/page.tsx`
- `src/components/rep/knock-history-shell.tsx`
- `src/app/(rep)/layout.tsx`

### Senior Developer Review (AI)

**Outcome:** Approve (2 patches applied)  
**Date:** 2026-06-03  
**Layers:** Blind Hunter, Edge Case Hunter, Acceptance Auditor (inline)

**Summary:** All ACs met after patches — load-more errors preserve pagination state; default 7-day range derived from Sydney start-of-day.

## Story Completion Status

- **Status:** done
- **Completion note:** All ACs satisfied; code review patches applied; last story in Epic 2.
