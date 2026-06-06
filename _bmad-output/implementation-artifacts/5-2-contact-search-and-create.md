---
baseline_commit: NO_VCS
---

# Story 5.2: Contact Search and Create

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **rep**,
I want to find or add contacts before a call,
so that I avoid duplicate records.

## Acceptance Criteria

1. **Given** I am an authenticated rep on `/rep/calls` (Calls panel)  
   **When** the page loads  
   **Then** I see a search field and a quick-add affordance (FR24)  
   **And** a `Calls` nav link exists in the rep shell header (architecture route `rep/calls`)  
   **And** primary controls meet 44×44px tap targets (NFR6, UX-DR2)

2. **Given** the Calls panel search field  
   **When** I type at least 2 characters matching name, phone, or address/suburb/postcode  
   **Then** matching contacts appear in a result list (FR24)  
   **And** search uses `GET /api/v1/contacts/search?q=` (architecture)  
   **And** results include: `id`, display name, `phone`, address line, `is_linked` (whether I already have knock/call access via RLS)  
   **And** search is debounced (~300ms) and aborts in-flight requests on new input

3. **Given** rep-scoped RLS limits direct `SELECT` on `contacts` (Story 5.1)  
   **When** search runs  
   **Then** a `SECURITY DEFINER` RPC `search_contacts_for_calls` performs global matching for duplicate prevention (FR24, FR54)  
   **And** the RPC requires `auth.uid()` is not null  
   **And** results are capped (default 20, max 50)  
   **And** the RPC does **not** return `email` or other unused PII

4. **Given** search results are shown  
   **When** I tap a contact row  
   **Then** it becomes the **selected contact** (highlighted state)  
   **And** selected contact summary persists in panel UI for Story 5.3 handoff  
   **And** there is **no** call outcome form, duration field, or submit in this story (5.3)

5. **Given** no matching contact exists  
   **When** I open quick-add and submit name + phone (address optional)  
   **Then** a new `contacts` row is created with `created_by = auth.uid()` (FR54)  
   **And** `POST /api/v1/contacts` validates via Zod  
   **And** the new contact is auto-selected in the panel

6. **Given** quick-add includes a phone number  
   **When** a contact with the same normalized phone already exists  
   **Then** the API returns `409 DUPLICATE_CONTACT` with the existing contact summary (FR24 duplicate prevention)  
   **And** the UI offers to select the existing contact instead of creating a duplicate  
   **And** normalization strips non-digit characters for comparison (except leading `+` preserved in storage)

7. **Given** authorization (NFR9, NFR10)  
   **When** an unauthenticated user calls contact APIs  
   **Then** `401`  
   **When** an admin calls rep contact APIs  
   **Then** `403 FORBIDDEN` (rep-only routes)  
   **And** inactive reps are blocked at middleware before API (Story 1.3)

8. **Given** implementation scope boundaries  
   **When** this story ships  
   **Then** there is **no** `POST /api/v1/calls`, call outcome form, promote-to-lead, activity stream, daily counters, or script widget (Stories 5.3–5.7)  
   **And** knock map, pipeline, and admin dashboard are unchanged  
   **And** `npm run build` and `npm run lint` pass

**Implements:** FR24, FR54  
**NFRs:** NFR5 (mobile ergonomics), NFR6 (tap targets), NFR9 (controlled global search via RPC), NFR10 (API guards)

## Tasks / Subtasks

- [x] **RPC: global contact search** (AC: 2, 3, 7)
  - [x] Create `supabase/migrations/*_search_contacts_for_calls.sql`
  - [x] `search_contacts_for_calls(p_query text, p_limit int default 20)`
  - [x] `SECURITY DEFINER`, `set search_path = public`, require `auth.uid() is not null`
  - [x] Match: phone digits (`regexp_replace`), `ilike` on `first_name`/`last_name`/`address`/`suburb`/`postcode`
  - [x] Return: `id`, `first_name`, `last_name`, `phone`, `address`, `suburb`, `postcode`, `is_linked boolean`
  - [x] `is_linked` = `created_by = auth.uid()` OR rep knock OR rep call on contact
  - [x] `grant execute` to `authenticated`; revoke from `public`
  - [x] Apply via Supabase MCP; `npm run db:types`

- [x] **RPC: phone duplicate lookup** (AC: 6)
  - [x] In same migration or `*_find_contact_by_phone.sql`:
  - [x] `find_contact_by_phone(p_phone text)` → returns matching contact row summary or empty
  - [x] Same normalization as create duplicate check
  - [x] `SECURITY DEFINER`, auth required

- [x] **API: search + create** (AC: 2, 5, 6, 7)
  - [x] `GET /api/v1/contacts/search?q=` — `requireRoleForApi(["rep"])`, min query length 2
  - [x] `POST /api/v1/contacts` — quick-create body schema
  - [x] Create `src/features/contacts/search-contacts.ts` — call search RPC
  - [x] Create `src/features/contacts/create-contact.ts` — duplicate check RPC then INSERT via user JWT (RLS `contacts_insert_rep`)
  - [x] On duplicate: `apiError("DUPLICATE_CONTACT", ..., 409, { contact })`

- [x] **Validators** (AC: 2, 5, 6)
  - [x] Create `src/lib/validators/contacts.ts`:
    - `contactSearchQuerySchema`, `contactSearchResultSchema`, `contactSearchResponseSchema`
    - `createContactBodySchema` (first_name, last_name, phone required; address, suburb, postcode optional)
    - `contactSummarySchema` for list/selection display
  - [x] Reuse `phoneSchema` from `auth.ts` or extract shared phone normalizer helper

- [x] **Client: calls feature module** (AC: 1, 2, 4, 5, 6)
  - [x] Create `src/features/calls/api.ts` — `fetchContactSearch`, `createContact`
  - [x] Create `src/features/calls/use-contact-search.ts` — debounced search, abort, loading/error
  - [x] Create `src/components/calls/calls-panel-shell.tsx` — search input, results, selection state, quick-add sheet
  - [x] Create `src/app/(rep)/rep/calls/page.tsx` — `requireRole(["rep"])`, render shell
  - [x] Update `src/app/(rep)/layout.tsx` — add `Calls` nav link
  - [x] Placeholder below selection: "Call logging — Story 5.3" (or empty state) — no functional call form

- [x] **Verify** (AC: 8)
  - [x] Manual: Search by phone finds existing contact created by another rep
  - [x] Manual: Quick-add duplicate phone shows 409 UI path → select existing
  - [x] Manual: Quick-add new contact → appears selected
  - [x] Manual: Rep layout shows Calls link; page loads on mobile viewport
  - [x] `npm run build` && `npm run lint`

### Review Findings

- [x] [Review][Patch] Duplicate-contact selection hardcoded `is_linked: true` [`src/components/calls/calls-panel-shell.tsx:18-19`] — fixed: `toSelectedFromDuplicate` uses `is_linked: false`.
- [x] [Review][Defer] `normalize_phone_digits` granted to `authenticated` — low risk; internal helper exposed via RPC; revoke in future hardening if unused client-side.
- [x] [Review][Defer] Duplicate detection skipped when normalized phone has fewer than 3 digits [`find_contact_by_phone`] — acceptable v1; `phoneSchema` allows short values.
- [x] [Review][Defer] Global `%ilike%` search without pagination beyond 50 cap — performance optimization when contact volume grows.

## Dev Notes

### Critical constraints

- **Do NOT** add `POST /api/v1/calls` or call outcome UI — Story 5.3.
- **Do NOT** add promote-to-lead, `call_logs` INSERT from UI, or lead creation — Stories 5.4+.
- **Do NOT** add shift gate on contact search — PRD cold-call session does not require active shift (unlike knocks).
- **Do NOT** broaden `contacts_select_rep` RLS for global read — use RPC only (NFR9).
- **Do NOT** add TanStack Query — use `fetch` + hooks pattern from `usePipelineLeads` / `fetchKnocksInBbox`.
- **Do NOT** add bulk CSV import — PRD v2.
- **Do NOT** modify `call_logs` RLS — Story 5.3 handles first-call on searched contact via SECURITY DEFINER RPC (see handoff below).

### Resolving Story 5.1 deferral — global search vs RLS

Story 5.1 review deferred: *"First call on another rep's contact blocked by `call_logs_insert_rep`"*.

**5.2 solves search/read:** `search_contacts_for_calls` RPC returns global matches for duplicate prevention (FR24 "global indexing engine").

**5.3 solves first-call write:** When rep selects another rep's contact from search, direct `INSERT` into `call_logs` still fails RLS until a link exists. Story **5.3** must implement `create_call_log` (or equivalent) as `SECURITY DEFINER` RPC — mirror `create_knock_with_contact` — to atomically insert the call and establish rep-contact linkage. **Do not patch `call_logs_insert_rep` in 5.2.**

### Phone normalization (duplicate detection)

```typescript
// src/lib/validators/contacts.ts (or lib/phone.ts)
export function normalizePhoneForMatch(phone: string): string {
  const trimmed = phone.trim();
  const digits = trimmed.replace(/\D/g, "");
  return digits.length > 0 ? digits : trimmed;
}
```

SQL mirror for RPC:

```sql
regexp_replace(regexp_replace(coalesce(phone, ''), '[^0-9+]', '', 'g'), '^\+', '')
-- compare digit-only forms; store original trimmed phone on create
```

On `409 DUPLICATE_CONTACT`, return existing `contactSummary` so UI can call `onSelectContact(existing)`.

### Reference RPC — search (adapt)

```sql
create or replace function public.search_contacts_for_calls(
  p_query text,
  p_limit int default 20
)
returns table (
  id uuid,
  first_name text,
  last_name text,
  phone text,
  address text,
  suburb text,
  postcode text,
  is_linked boolean
)
language sql
stable
security definer
set search_path = public
as $$
  with q as (
    select trim(coalesce(p_query, '')) as raw,
           regexp_replace(regexp_replace(trim(coalesce(p_query, '')), '[^0-9+]', '', 'g'), '^\+', '') as digits
  )
  select
    c.id,
    c.first_name,
    c.last_name,
    c.phone,
    c.address,
    c.suburb,
    c.postcode,
    (
      c.created_by = auth.uid()
      or exists (select 1 from public.door_knocks dk where dk.contact_id = c.id and dk.rep_id = auth.uid())
      or exists (select 1 from public.call_logs cl where cl.contact_id = c.id and cl.rep_id = auth.uid())
    ) as is_linked
  from public.contacts c, q
  where auth.uid() is not null
    and length(q.raw) >= 2
    and (
      (length(q.digits) >= 3 and regexp_replace(regexp_replace(coalesce(c.phone, ''), '[^0-9+]', '', 'g'), '^\+', '') like '%' || q.digits || '%')
      or c.first_name ilike '%' || q.raw || '%'
      or c.last_name ilike '%' || q.raw || '%'
      or c.address ilike '%' || q.raw || '%'
      or c.suburb ilike '%' || q.raw || '%'
      or c.postcode ilike '%' || q.raw || '%'
    )
  order by is_linked desc, c.created_at desc
  limit least(greatest(p_limit, 1), 50);
$$;
```

### API contracts

```typescript
// GET /api/v1/contacts/search?q=smith
{ data: { contacts: ContactSearchResult[] } }

// POST /api/v1/contacts
// Body: { first_name, last_name, phone, address?, suburb?, postcode? }
{ data: { contact: ContactSummary } }

// 409 DUPLICATE_CONTACT
{ error: { code: "DUPLICATE_CONTACT", message: "...", details: { contact: ContactSummary } } }
```

### UI structure (Calls panel — v1)

```
/rep/calls
├── Search input (sticky top)
├── Results list (scrollable)
│   └── Row: name, phone, address snippet, "Linked" badge if is_linked
├── Selected contact card (when selected)
└── Quick-add sheet (modal/bottom sheet)
    └── first_name, last_name, phone (required), address, suburb (optional)
```

- Desktop/tablet friendly per PRD cold-call journey; still usable on mobile (NFR5).
- Use existing Tailwind patterns from `door-outcome-sheet.tsx` / pipeline shells.
- No bottom nav overhaul — header link only (match current rep layout).

### File structure (new)

```
src/features/contacts/
  search-contacts.ts
  create-contact.ts
src/features/calls/
  api.ts
  use-contact-search.ts
src/components/calls/
  calls-panel-shell.tsx
  contact-quick-add-sheet.tsx   (optional split)
src/app/(rep)/rep/calls/page.tsx
src/app/api/v1/contacts/search/route.ts
src/app/api/v1/contacts/route.ts
src/lib/validators/contacts.ts
supabase/migrations/*_search_contacts_for_calls.sql
```

### Previous story intelligence (5.1)

- `call_logs` table + RLS live; `CallLog` types in `database.ts`; `callLogRowSchema` in `call-logs.ts`.
- Contacts RLS extended for call linkage on **existing** rep-owned/linked contacts.
- Realtime publication on `call_logs` ready — wiring deferred to 5.3+ activity feed.
- Code review: search must use RPC for global scope; knock-after-call symmetry deferred.

### Cross-story dependencies

| Story | Relationship |
|-------|--------------|
| 5.1 | **Requires** — `call_logs` + contact RLS foundation |
| 5.3 | **Blocked by** — this story (needs search, select, quick-create); must add `create_call_log` RPC for cross-rep first call |
| 5.4 | **Future** — promote selected contact's call to lead |
| 5.5 | **Future** — activity stream on contact detail |
| 2.1 | **Requires** — `contacts` schema + `idx_contacts_phone` |
| 2.10 | **Pattern** — `get_knocks_near_point` SECURITY DEFINER RPC for cross-rep read |

### Testing

- **Required:** `npm run build`, `npm run lint`
- **Manual:** Search finds cross-rep contact by phone; duplicate quick-add blocked; new contact created and selected
- **No** Playwright in this story unless requested

### References

- [Source: `_bmad-output/planning-artifacts/epics.md` — Story 5.2, FR24, FR54]
- [Source: `docs/Solar_CRM_PRD_v1.md` — Module 4 Contact Search/Create, Cold Calling journey]
- [Source: `_bmad-output/planning-artifacts/architecture.md` — `GET /api/v1/contacts/search`, `features/calls`, `rep/calls`]
- [Source: `_bmad-output/implementation-artifacts/5-1-calllog-schema-and-rls.md` — RLS boundaries + review deferrals]
- [Source: `_bmad-output/implementation-artifacts/2-10-re-knock-warning-with-history.md` — SECURITY DEFINER RPC pattern]
- [Source: `_bmad-output/implementation-artifacts/2-1-contacts-and-doorknocks-schema.md` — contacts schema]
- [Source: `src/app/api/v1/knocks/route.ts` — Route Handler + guard pattern]
- [Source: `src/features/pipeline/use-pipeline-leads.ts` — fetch + hook pattern]
- [Source: `supabase/migrations/20260610100100_call_logs_rls.sql` — call_logs insert guard]

## Dev Agent Record

### Agent Model Used

Composer

### Debug Log References

- Migrations applied via Supabase MCP (`search_contacts_for_calls`).
- RPC types patched into `supabase.generated.ts` (MCP typegen lag); `as never` casts on RPC/insert per project pattern.
- ESLint: `use-contact-search` refactored to avoid synchronous setState in effect.

### Completion Notes List

- Added `search_contacts_for_calls`, `find_contact_by_phone`, `normalize_phone_digits` RPCs for global search + duplicate detection.
- APIs: `GET /api/v1/contacts/search`, `POST /api/v1/contacts` (rep-only, 409 on duplicate phone).
- Calls panel at `/rep/calls` with debounced search, selection state, quick-add sheet, duplicate notice UI.
- Rep layout: `Calls` nav link added.
- Story 5.3 placeholder shown on selected contact; no call logging UI.
- `npm run build` and `npm run lint` pass.

### Senior Developer Review (AI)

**Outcome:** Approved (1 patch applied)  
**Date:** 2026-06-07  
**Layers:** Blind Hunter, Edge Case Hunter, Acceptance Auditor

**Summary:** Calls panel, global search RPC, duplicate detection, and rep-only APIs match ACs. SECURITY DEFINER search correctly resolves 5.1 deferral for cross-rep discovery. Scope boundaries held (no call logging). Patch: duplicate-contact selection no longer mislabels `is_linked`.

### File List

- `supabase/migrations/20260610110000_search_contacts_for_calls.sql` (new)
- `src/lib/validators/contacts.ts` (new)
- `src/features/contacts/search-contacts.ts` (new)
- `src/features/contacts/create-contact.ts` (new)
- `src/features/calls/api.ts` (new)
- `src/features/calls/use-contact-search.ts` (new)
- `src/components/calls/calls-panel-shell.tsx` (new)
- `src/components/calls/contact-quick-add-sheet.tsx` (new)
- `src/app/(rep)/rep/calls/page.tsx` (new)
- `src/app/api/v1/contacts/search/route.ts` (new)
- `src/app/api/v1/contacts/route.ts` (new)
- `src/app/(rep)/layout.tsx` (updated)
- `src/types/supabase.generated.ts` (updated)

## Change Log

- 2026-06-07: Story 5.2 implemented — Calls panel contact search/create (FR24, FR54).
- 2026-06-07: Code review — duplicate selection `is_linked` patch applied.

## Story Completion Status

- **Status:** done
- **Completion note:** Contact search and quick-create complete; ready for Story 5.3 call logging.
