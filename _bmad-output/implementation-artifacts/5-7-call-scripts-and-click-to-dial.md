---
baseline_commit: 161aab21581314ffeef3f93bea30ba4f531856a7
---

# Story 5.7: Call Scripts and Click-to-Dial

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **rep**,
I want scripts and one-tap dial,
so that calls are consistent and fast.

## Acceptance Criteria

1. **Given** call script text exists in configuration storage (seeded or admin-updated)  
   **When** I select a contact on `/rep/calls` (active call panel)  
   **Then** a **collapsible call script** widget is visible (FR30)  
   **And** it is **collapsed by default**  
   **When** I expand it  
   **Then** the script body renders as plain text (preserve line breaks)  
   **When** script body is empty or whitespace-only  
   **Then** the widget is **hidden** (no empty shell)

2. **Given** I am on the Calls panel  
   **When** a contact row or selected contact displays a phone number  
   **Then** the number is a tappable link with `href="tel:…"` (FR31)  
   **And** the link meets 44×44px minimum tap target (NFR6)  
   **And** tapping opens the device dialer (native `tel:` handler — no Twilio/integration)

3. **Given** script read API  
   **When** a rep calls `GET /api/v1/calls/script`  
   **Then** response is `{ data: { body: string, updated_at: string | null } }`  
   **And** RLS allows rep **SELECT** only  
   **When** an admin calls the rep script GET route  
   **Then** `403 FORBIDDEN` (rep-only read surface; admin edit in Story 7.8)  
   **When** unauthenticated  
   **Then** `401`

4. **Given** configuration storage (foundation for Story 7.8)  
   **When** migrations run  
   **Then** singleton table `public.call_script` exists with columns: `id` (always `1`), `body` (text), `updated_at`, `updated_by` (FK → profiles, nullable)  
   **And** seed row includes non-empty default script text so widget is demoable before 7.8  
   **And** RLS: rep `SELECT`; admin `SELECT` + `UPDATE` (admin UI deferred to 7.8)  
   **And** there is **no** admin settings page or PATCH API in this story

5. **Given** authorization and scope (NFR9, NFR10)  
   **When** this story ships  
   **Then** there is **no** shift gate on script read  
   **And** promote flow, call history, daily counter, and call log form behavior are unchanged except phone `tel:` links  
   **And** no Realtime subscription for script updates (refetch on panel mount / contact select is sufficient v1)  
   **And** `npm run build` and `npm run lint` pass

**Implements:** FR30 (rep read UI), FR31  
**NFRs:** NFR6 (tap targets), NFR9 (RLS), NFR10 (API guards)  
**Deferred to Story 7.8:** Admin edit UI + PATCH API for script body (FR30 admin side)

## Tasks / Subtasks

- [x] **Migration: `call_script` singleton** (AC: 1, 4)
  - [x] Create `supabase/migrations/*_call_script.sql` (sort after `20260610140000_get_admin_daily_rep_summary_calls.sql`)
  - [x] Table `call_script` with `id int primary key default 1 check (id = 1)`, `body text not null default ''`, `updated_at timestamptz`, `updated_by uuid references profiles(id)`
  - [x] Seed `insert into call_script (id, body) values (1, '…default script…') on conflict do nothing`
  - [x] RLS enabled; rep `SELECT`; admin `SELECT` + `UPDATE` via `is_admin()`; no rep write
  - [x] Apply via Supabase MCP; `npm run db:types`

- [x] **Validators + tel helper** (AC: 2, 3)
  - [x] Create `src/lib/validators/call-script.ts` — `callScriptResponseSchema`, `callScriptRowSchema`
  - [x] Create `src/lib/phone/to-tel-href.ts` — `toTelHref(phone: string | null | undefined): string | null` (strip whitespace; use digit normalization consistent with contact duplicate logic; return `null` when no dialable digits)

- [x] **Server: read call script** (AC: 3, 4)
  - [x] Create `src/features/calls/get-call-script.ts` — select singleton row `id = 1`
  - [x] Create `GET /api/v1/calls/script/route.ts` — `requireRoleForApi(["rep"])`

- [x] **Client: script widget** (AC: 1)
  - [x] Extend `src/features/calls/api.ts` — `fetchCallScript(signal?)`
  - [x] Create `src/features/calls/use-call-script.ts` — fetch on mount (calls panel)
  - [x] Create `src/components/calls/call-script-panel.tsx`:
    - `<details>` / button toggle or `<button aria-expanded>` pattern — collapsed by default
    - Title: "Call script"
    - Body: `whitespace-pre-wrap` text
    - Return `null` when `body.trim()` is empty
  - [x] Update `calls-panel-shell.tsx` — render `CallScriptPanel` inside selected-contact section (above `CallLogForm`); pass script from hook

- [x] **Client: click-to-dial** (AC: 2)
  - [x] Create `src/components/calls/phone-dial-link.tsx` — wraps children in `<a href={toTelHref(phone)}>` with `min-h-11` inline-flex padding; renders plain text when no phone
  - [x] Update `calls-panel-shell.tsx`:
    - Search result rows: wrap phone display in `PhoneDialLink`
    - Selected contact header: wrap phone in `PhoneDialLink`
  - [x] Optional: lead detail phone — **out of scope** (epic AC: active call panel only)

- [x] **Verify** (AC: 5)
  - [x] Manual: Select contact → script widget collapsed → expand shows seeded text
  - [x] Manual: Empty script body (SQL update) → widget hidden
  - [x] Manual: Tap phone on search row + selected contact → device dialer opens (mobile or simulator)
  - [x] Manual: Admin GET `/api/v1/calls/script` → 403
  - [x] `npm run build` && `npm run lint`

## Dev Notes

### Critical constraints

- **Do NOT** build admin script editor UI — Story **7.8** (`PATCH` API + admin settings page).
- **Do NOT** add Realtime on `call_script` — REST fetch on calls panel mount is sufficient until 7.8.
- **Do NOT** add rich text / markdown rendering — plain `text` with `whitespace-pre-wrap` only.
- **Do NOT** auto-expand script on contact select — AC: expand/collapse affordance; default **collapsed**.
- **Do NOT** add shift gate, Twilio, or SMS — `tel:` protocol only (FR31).
- **Do NOT** change `create_call_log`, promote, history, or counter logic beyond phone link wrapping.
- **Do NOT** install TanStack Query — extend `src/features/calls/api.ts` + hooks.

### Split: Story 5.7 vs 7.8

| Concern | 5.7 (this story) | 7.8 (future) |
|---------|-------------------|--------------|
| `call_script` table + seed | ✅ Create | Reuse |
| Rep collapsible widget | ✅ | — |
| Rep `GET /api/v1/calls/script` | ✅ | — |
| Admin edit UI | ❌ | ✅ |
| Admin `PATCH` script API | ❌ | ✅ |
| Rep sees admin updates | Refetch on mount (v1) | 7.8 may add refetch after admin save |

Epic AC says *"Given admin-configured script text exists"* — satisfied by **seed migration** until 7.8 admin editor ships.

### Brownfield: what exists today

| Piece | Status | 5.7 behavior |
|-------|--------|--------------|
| `/rep/calls` panel | ✅ Stories 5.2–5.6 | Add script widget + `tel:` links |
| Phone on contacts | ✅ Plain text | Wrap with `PhoneDialLink` |
| `call_script` table | ❌ Missing | **Create** + seed |
| Script read API | ❌ Missing | **Create** |
| Admin settings routes | ❌ None | Deferred 7.8 |

### Reference DDL — `call_script`

```sql
create table public.call_script (
  id int primary key default 1 check (id = 1),
  body text not null default '',
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id) on delete set null
);

insert into public.call_script (id, body)
values (
  1,
  'Hi, this is [Your Name] from Sunflare Solar…'
)
on conflict (id) do nothing;

alter table public.call_script enable row level security;

create policy call_script_select_authenticated on public.call_script
  for select to authenticated using (true);

create policy call_script_update_admin on public.call_script
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

grant select on public.call_script to authenticated;
grant update on public.call_script to authenticated;
```

Reps may `SELECT` (read script); only admins may `UPDATE` (used in 7.8). No `INSERT`/`DELETE` for v1.

### API contract

```typescript
// GET /api/v1/calls/script
// Auth: rep only

// 200
{ data: { body: string, updated_at: string | null } }

// 401 / 403
```

### `toTelHref` helper

```typescript
// src/lib/phone/to-tel-href.ts
export function toTelHref(phone: string | null | undefined): string | null {
  if (!phone?.trim()) return null;
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 3) return null;
  return `tel:${digits}`;
}
```

Use `PhoneDialLink` with `className="inline-flex min-h-11 items-center …"` for NFR6.

### UI structure — selected contact section

```
Selected contact
├── Name
├── PhoneDialLink (tel:)
├── Address
├── CallScriptPanel          ← NEW (collapsed by default)
├── CallLogForm (existing)
├── Promote block (existing)
└── ContactCallHistory (existing)
```

Search results: wrap phone line only (do not make entire row a link — preserve select-on-row behavior).

### Files to UPDATE (read before editing)

| File | Current state | This story changes |
|------|---------------|-------------------|
| `src/components/calls/calls-panel-shell.tsx` | Counter, form, history | Script panel + PhoneDialLink |
| `src/features/calls/api.ts` | search/create/promote/history/count | `fetchCallScript` |

### File structure (new)

```
supabase/migrations/*_call_script.sql
src/lib/validators/call-script.ts
src/lib/phone/to-tel-href.ts
src/features/calls/get-call-script.ts
src/app/api/v1/calls/script/route.ts
src/features/calls/use-call-script.ts
src/components/calls/call-script-panel.tsx
src/components/calls/phone-dial-link.tsx
```

### Previous story intelligence

**Story 5.6 (done):**
- `refreshKey` pattern on calls panel — script fetch is independent (mount-only hook).
- Header counter + subtitle layout — script widget lives in **selected contact** section, not page header.

**Story 5.2 (done):**
- Phone displayed in search rows and selected contact — exact insertion points for `PhoneDialLink`.
- Row tap selects contact — phone link must `stopPropagation` on click so row selection is not toggled accidentally.

**Story 5.3+ (done):**
- Explicit deferrals: no script widget, no `tel:` until **5.7**.

### Cross-story dependencies

| Story | Relationship |
|-------|--------------|
| 5.2 | **Requires** — calls panel + contact phone display |
| 7.8 | **Future** — admin edit script; updates same `call_script` row |
| Epic 5 retro | **Next** — last Epic 5 story before retrospective |

### Testing

- **Required:** `npm run build`, `npm run lint`
- **Required manual:** Script expand/collapse; empty script hidden; tel: links; admin 403 on script GET
- **No** Playwright unless requested

### References

- [Source: `_bmad-output/planning-artifacts/epics.md` — Story 5.7, FR30, FR31]
- [Source: `_bmad-output/planning-artifacts/epics.md` — Story 7.8 admin script config]
- [Source: `docs/Solar_CRM_PRD_v1.md` — Dynamic Script Prompt, Click-to-Call Linkages]
- [Source: `_bmad-output/implementation-artifacts/5-3-log-a-call-with-outcome.md` — defer script/tel to 5.7]
- [Source: `src/lib/validators/contacts.ts` — `normalizePhoneForMatch` pattern]
- [Source: `src/components/calls/calls-panel-shell.tsx` — integration points]

## Dev Agent Record

### Agent Model Used

Composer

### Debug Log References

- Migration applied via Supabase MCP (`call_script`).
- Supabase client partial-select typing on `call_script` required row cast in `get-call-script.ts`.
- `npm run db:types` regenerated `supabase.generated.ts` with `call_script` table.

### Completion Notes List

- Singleton `call_script` table with seeded default script and RLS (rep SELECT; admin UPDATE for 7.8).
- `GET /api/v1/calls/script` rep-only; returns `{ body, updated_at }`.
- Collapsible `CallScriptPanel` (default collapsed) in selected-contact section; hidden when body empty.
- `PhoneDialLink` + `toTelHref` on search rows and selected contact; `stopPropagation` preserves row select.
- `npm run lint` and `npm run build` pass.
- Code review: approved with 1 patch applied; 3 deferrals.

### Review Findings

- [x] [Review][Patch] `PhoneDialLink` anchor nested inside contact row `<button>` — invalid HTML / nested interactive controls [`calls-panel-shell.tsx`] — fixed: row uses `role="button"` div with keyboard support; address moved above script panel per dev-notes layout.
- [x] [Review][Defer] `get-call-script.ts` uses `limit(1)` + type cast instead of typed `.eq("id", 1)` — works for singleton v1; revisit if Supabase client typing improves.
- [x] [Review][Defer] Script fetched on panel mount even when no contact selected — acceptable v1 per AC5; no refetch on contact select until 7.8.
- [x] [Review][Defer] No `updated_at` trigger on `call_script` UPDATE — admin PATCH in Story 7.8 should set `updated_at`/`updated_by` explicitly.

### Senior Developer Review (AI)

**Outcome:** Approved (1 patch applied)  
**Date:** 2026-06-06  
**Layers:** Blind Hunter, Edge Case Hunter, Acceptance Auditor

**Summary:** Singleton `call_script` + rep-only GET; collapsible script widget and `tel:` dial links on calls panel satisfy FR30/FR31. RLS + API guards correct; no shift gate, no Realtime, no admin UI. Patch: contact row restructured to avoid anchor-in-button nesting.

### File List

- `supabase/migrations/20260610150000_call_script.sql` (new)
- `src/types/supabase.generated.ts` (updated)
- `src/lib/validators/call-script.ts` (new)
- `src/lib/phone/to-tel-href.ts` (new)
- `src/features/calls/get-call-script.ts` (new)
- `src/app/api/v1/calls/script/route.ts` (new)
- `src/features/calls/use-call-script.ts` (new)
- `src/features/calls/api.ts` (updated)
- `src/components/calls/call-script-panel.tsx` (new)
- `src/components/calls/phone-dial-link.tsx` (new)
- `src/components/calls/calls-panel-shell.tsx` (updated)

## Change Log

- 2026-06-06: Story 5.7 implemented — call script widget + click-to-dial on calls panel (FR30, FR31).
- 2026-06-06: Code review — approved; patch for nested tel link in contact row.

## Story Completion Status

- **Status:** done
- **Completion note:** Call scripts + click-to-dial approved; Epic 5 complete — run epic-5-retrospective next.
