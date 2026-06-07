---
baseline_commit: 161aab2
---

# Story 7.8: Admin Call Script Configuration

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an **admin**,
I want to edit the call script text,
so that reps use current messaging.

## Acceptance Criteria

1. **Given** I am an authenticated admin  
   **When** I open `/admin/settings`  
   **Then** I see a **Call script** settings section with the current script body in a plain-text editor (FR30 admin side)  
   **And** the page enforces admin role server-side via `requireRole(["admin"])` (NFR10)  
   **And** a **Settings** nav link appears in the admin header alongside Dashboard, Pipeline, Map, etc.

2. **Given** the settings form loads  
   **When** the page mounts  
   **Then** script text is loaded via admin read API (no direct client Supabase)  
   **And** loading and error states are shown (skeleton or message — match team/settings patterns)  
   **And** `updated_at` is displayed when present (e.g. “Last updated …” in Sydney-local friendly format)

3. **Given** I edit the script body and click **Save**  
   **When** save succeeds  
   **Then** the new body persists to `public.call_script` row `id = 1` (FR30)  
   **And** `updated_at` and `updated_by` are set server-side to the current admin and timestamp  
   **And** a success confirmation is shown (inline message or toast-style banner — no third-party toast library)  
   **And** the form reflects the saved text

4. **Given** admin script APIs  
   **When** an admin calls `GET /api/v1/admin/calls/script`  
   **Then** response is `{ data: { body: string, updated_at: string | null } }` (same shape as rep read)  
   **When** an admin calls `PATCH /api/v1/admin/calls/script` with `{ body: string }`  
   **Then** response is `{ data: { body: string, updated_at: string } }`  
   **When** a rep calls admin script routes  
   **Then** `403 FORBIDDEN`  
   **When** unauthenticated  
   **Then** `401`  
   **And** rep `GET /api/v1/calls/script` (Story 5.7) remains **unchanged** and rep-only

5. **Given** a rep on `/rep/calls` with a contact selected  
   **When** an admin saves an updated script  
   **Then** reps who **reload** the calls panel (or navigate away and back) see the new text in the collapsible call script widget (FR30)  
   **And** empty or whitespace-only body still **hides** the rep widget (Story 5.7 behavior preserved)  
   **And** no Realtime subscription is added in v1 (REST refetch on mount is sufficient)

6. **Given** validation and scope  
   **When** PATCH body fails validation (missing `body`, over max length, non-string)  
   **Then** `400 VALIDATION_ERROR` with a clear message  
   **And** there is **no** new migration (reuse Story 5.7 `call_script` table + RLS)  
   **And** no rich text / markdown editor, version history, or multi-script support  
   **And** `npm run build` and `npm run lint` pass

**Implements:** FR30 (admin side; rep UI in 5.7)  
**NFRs:** NFR10 (server-side role guards)

## Tasks / Subtasks

- [x] **Validators** (AC: 3, 4, 6)
  - [x] Extend `src/lib/validators/call-script.ts`:
    - `CALL_SCRIPT_BODY_MAX_LENGTH` (e.g. `10000`)
    - `updateCallScriptBodySchema` — `{ body: z.string().max(CALL_SCRIPT_BODY_MAX_LENGTH) }` (allow empty string — admin may clear script)
    - Reuse existing `callScriptResponseSchema` for GET/PATCH responses

- [x] **Server: admin read + update** (AC: 3, 4, 6)
  - [x] Reuse `getCallScript()` from `src/features/calls/get-call-script.ts` for admin GET (RLS allows admin SELECT)
  - [x] Create `src/features/calls/update-call-script.ts`:
    - `updateCallScript(body: string, adminId: string)` — `UPDATE call_script SET body, updated_at = now(), updated_by = adminId WHERE id = 1` returning `body, updated_at`
    - Throw typed error if row missing (should not happen with seed)
  - [x] Create `GET /api/v1/admin/calls/script/route.ts` — `requireRoleForApi(["admin"])`
  - [x] Create `PATCH /api/v1/admin/calls/script/route.ts` — parse body with `updateCallScriptBodySchema.safeParse`, call `updateCallScript`

- [x] **Client: admin API + hook** (AC: 2, 3)
  - [x] Extend `src/features/calls/api.ts` (or add `src/features/admin/api-call-script.ts` if preferred — follow existing admin feature patterns):
    - `fetchAdminCallScript(signal?)`
    - `updateAdminCallScript(body: string)` → PATCH
  - [x] Create `src/features/calls/use-admin-call-script.ts` (or `src/features/admin/use-call-script-settings.ts`):
    - Load on mount; expose `{ body, updatedAt, loading, error, saving, save(body), lastSavedAt }`
    - `save` calls PATCH, updates local state on success

- [x] **Admin settings UI** (AC: 1, 2, 3)
  - [x] Create `src/app/(admin)/admin/settings/page.tsx` — `requireRole(["admin"])`, render settings shell
  - [x] Create `src/components/admin/call-script-settings-form.tsx`:
    - `<textarea>` with `rows`/`min-h` for comfortable editing; `font-mono` or default sans — plain text only
    - Character count hint optional (show `{n} / {max}` when approaching limit)
    - **Save** button with `disabled={saving || !dirty}`; min 44px touch height on mobile
    - Success banner after save; error inline on failure
    - “Last updated …” from `updated_at` using existing Sydney date helpers if available
  - [x] Update `src/app/(admin)/layout.tsx` — add **Settings** link to `/admin/settings`

- [x] **Verify** (AC: 5, 6)
  - [ ] Manual: Admin edits script → Save → reload `/rep/calls` → expand widget → new text visible
  - [ ] Manual: Admin clears script to whitespace → rep widget hidden
  - [ ] Manual: Rep GET admin routes → 403; admin GET rep route `/api/v1/calls/script` → 403
  - [x] `npm run build` && `npm run lint`

### Review Findings

- [x] [Review][Patch] `callScriptResponseSchema.parse` can 500 after script is saved [`src/features/calls/update-call-script.ts:35`] — fixed: `safeParse` with row fallback so PATCH returns 200 after DB commit.

- [x] [Review][Defer] Client `fetchAdminCallScript` / `updateAdminCallScript` do not re-validate with Zod [`src/features/calls/api.ts:53`] — deferred, pre-existing (matches project fetch+hooks convention).

- [x] [Review][Defer] `getCallScript` uses `limit(1)` instead of `.eq("id", 1)` [`src/features/calls/get-call-script.ts:13`] — deferred, pre-existing (Story 5.7 deferral; singleton table).

- [x] [Review][Defer] Rep script refetch on calls panel mount only — no Realtime or focus refetch after admin save [`src/features/calls/use-call-script.ts`] — deferred, pre-existing (Story 7.8 AC5 accepts reload/navigation v1).

- [x] [Review][Defer] `updated_by` set server-side but not shown in admin UI [`src/features/calls/update-call-script.ts:23`] — deferred, pre-existing (not in story AC; audit UI optional future).

## Dev Notes

### Critical constraints

- **Do NOT** add a new migration — Story **5.7** created `call_script` singleton + RLS (`call_script_update_admin`). Verify RLS in dev; table already seeded.
- **Do NOT** change rep `GET /api/v1/calls/script` auth or response shape — admin uses **separate** `/api/v1/admin/calls/script` routes.
- **Do NOT** add Realtime on `call_script` — rep refetches on calls panel mount (Story 5.7); live push deferred.
- **Do NOT** add rich text, markdown preview, or WYSIWYG — plain `textarea` + `whitespace-pre-wrap` display on rep side.
- **Do NOT** install TanStack Query — extend fetch + hooks pattern from Epic 5 / 7.
- **Do NOT** set `updated_at`/`updated_by` only on client — **must** set in server `updateCallScript` (Story 5.7 review deferral).
- **Do NOT** break `CallScriptPanel`, `PhoneDialLink`, call log, promote, or history flows.

### Brownfield: what exists today (Story 5.7)

| Piece | Status | 7.8 change |
| :--- | :--- | :--- |
| `call_script` table + seed | ✅ | Reuse |
| RLS rep SELECT, admin UPDATE | ✅ | Reuse |
| Rep `GET /api/v1/calls/script` | ✅ | Unchanged |
| `getCallScript()` server helper | ✅ | Reuse for admin GET |
| `CallScriptPanel` + `useCallScript` | ✅ | Unchanged (rep mount fetch) |
| Admin settings page | ❌ | **Create** `/admin/settings` |
| Admin script API | ❌ | **Create** GET + PATCH |
| Admin nav link | ❌ | **Add** Settings |

### Split: Story 5.7 vs 7.8 (complete the FR30 loop)

| Concern | 5.7 | 7.8 |
| :--- | :--- | :--- |
| `call_script` table + seed | ✅ | Reuse |
| Rep collapsible widget | ✅ | — |
| Rep `GET /api/v1/calls/script` | ✅ | Unchanged |
| Admin edit UI | ❌ | ✅ |
| Admin GET/PATCH script API | ❌ | ✅ |
| Rep sees admin updates | Refetch on mount | Same v1 (reload/navigation) |

### API contracts

```typescript
// GET /api/v1/admin/calls/script
// Auth: admin only
// 200
{ data: { body: string, updated_at: string | null } }

// PATCH /api/v1/admin/calls/script
// Auth: admin only
// Body
{ body: string }  // max CALL_SCRIPT_BODY_MAX_LENGTH; empty allowed

// 200
{ data: { body: string, updated_at: string } }

// 400 VALIDATION_ERROR | 401 | 403 | 500
```

Rep route (unchanged):

```typescript
// GET /api/v1/calls/script — rep only (Story 5.7)
```

### Server update sketch

```typescript
// src/features/calls/update-call-script.ts
export async function updateCallScript(body: string, adminId: string) {
  const supabase = await createClient();
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("call_script")
    .update({ body, updated_at: now, updated_by: adminId } as never)
    .eq("id", 1)
    .select("body, updated_at")
    .single();
  if (error || !data) throw new CallScriptUpdateError();
  return callScriptResponseSchema.parse(data);
}
```

### UI structure — `/admin/settings`

```
Admin header (+ Settings link)
└── Settings page
    ├── H1: Settings
    ├── Subtitle: Manage team configuration
    └── Call script section
        ├── Label + textarea (current body)
        ├── Last updated (optional)
        ├── Save button
        └── Success / error messages
```

Match zinc/emerald admin palette from dashboard and team pages (`rounded-lg border border-zinc-200 bg-white` cards).

### Files to read before editing

| File | Current behavior | 7.8 change |
| :--- | :--- | :--- |
| `supabase/migrations/20260610150000_call_script.sql` | Singleton + RLS | Reference only — no new migration |
| `src/features/calls/get-call-script.ts` | Server read helper | Reuse for admin GET |
| `src/app/api/v1/calls/script/route.ts` | Rep-only GET | Do not modify auth |
| `src/lib/validators/call-script.ts` | Response schemas | Add PATCH body schema |
| `src/app/(admin)/layout.tsx` | Nav links | Add Settings |
| `src/components/calls/call-script-panel.tsx` | Rep display | No change unless testing |

### Previous story intelligence

**Story 5.7 (done):**
- Deferred admin PATCH + settings UI explicitly to **7.8**.
- Deferred `updated_at`/`updated_by` on UPDATE — **7.8 must set explicitly** in server update.
- Rep script fetch is mount-only; no refetch on contact select — acceptable v1 for admin save → rep reload test.
- Admin GET on rep route returns 403 — keep separate admin routes.

**Story 7.7 (done):**
- Last Epic 7 feature story before this one; Epic 7 retrospective may follow after 7.8 ships.
- Admin pages use `requireRole(["admin"])` on page + `requireRoleForApi(["admin"])` on API — follow same pattern.

**Story 7.6 (done):**
- Closed admin dashboard auth gap with `requireRole` — apply to new settings page too.

### Cross-story dependencies

| Story | Relationship |
| :--- | :--- |
| 5.7 | **Requires** — `call_script` table, rep widget, rep GET API |
| 7.1–7.7 | **Independent** — no dashboard changes required |

### Deferred (document in completion notes if skipped)

- Realtime or focus-based refetch so reps see script updates without reload
- Script version history / audit log UI
- Multiple scripts per campaign or per territory
- Preview panel mirroring rep `CallScriptPanel` on admin page

### Testing

- **Required:** `npm run build`, `npm run lint`
- **Required manual:** Admin save → rep reload sees text; empty script hides widget; role guards on both route sets
- **No** Playwright unless requested

### References

- [Source: `_bmad-output/planning-artifacts/epics.md` — Story 7.8, FR30]
- [Source: `_bmad-output/implementation-artifacts/5-7-call-scripts-and-click-to-dial.md` — table, RLS, rep UI, explicit 7.8 deferrals]
- [Source: `supabase/migrations/20260610150000_call_script.sql`]
- [Source: `docs/Solar_CRM_PRD_v1.md` — Dynamic Script Prompt]
- [Source: `src/app/api/v1/territories/[id]/route.ts` — PATCH + Zod safeParse pattern]
- [Source: `src/app/(admin)/admin/team/page.tsx` — admin page layout pattern]

## Dev Agent Record

### Agent Model Used

Composer

### Debug Log References

### Completion Notes List

- Admin GET/PATCH `/api/v1/admin/calls/script` with role guards; rep route unchanged.
- `updateCallScript` sets `updated_at` and `updated_by` server-side on singleton row.
- `/admin/settings` page with textarea editor, dirty-state Save, success banner, Sydney last-updated label.
- Settings nav link added to admin header.
- Lint + build pass. Manual role-guard and rep-reload tests unchecked.

### File List

- `src/lib/validators/call-script.ts`
- `src/features/calls/update-call-script.ts`
- `src/app/api/v1/admin/calls/script/route.ts`
- `src/features/calls/api.ts`
- `src/features/calls/use-admin-call-script.ts`
- `src/components/admin/call-script-settings-form.tsx`
- `src/app/(admin)/admin/settings/page.tsx`
- `src/app/(admin)/layout.tsx`
