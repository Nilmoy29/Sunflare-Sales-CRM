---
baseline_commit: NO_VCS
---

# Story 2.7: Offline Knock Queue and Sync

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **rep**,
I want knocks saved when I have no signal,
so that I never lose field data.

## Acceptance Criteria

1. **Given** the device is offline (`navigator.onLine === false`) or `POST /api/v1/knocks` fails due to network error during an active shift  
   **When** I submit a knock from the door outcome sheet  
   **Then** the knock is stored in Dexie `pending_knocks` with `client_id` (UUID) and `idempotency_key` (UUID) (FR13)  
   **And** PII fields (`notes`, `address`, `suburb`, `postcode`) are AES-GCM encrypted before IndexedDB write (NFR11)  
   **And** non-PII fields (`lat`, `lng`, `outcome`, `follow_up_at`) remain available for map display and sync payload reconstruction  
   **And** the sheet closes and the rep sees success feedback (no data-loss error)

2. **Given** one or more pending knocks exist  
   **When** I view the rep map during an active shift  
   **Then** an offline/pending indicator shows the pending count (UX-DR7, NFR4)  
   **And** pending knocks render as optimistic map pins (muted style — e.g. reduced opacity or dashed ring) at their lat/lng with correct outcome color  
   **And** synced server pins continue to use existing clustered layers

3. **Given** connectivity returns (`window` `online` event or successful health/knocks probe)  
   **When** pending knocks exist  
   **Then** a background sync posts them to `POST /api/v1/knocks/sync` within 30 seconds (FR13, NFR4, NFR14)  
   **And** each item includes its `idempotency_key`  
   **And** successfully synced rows are removed from Dexie  
   **And** the map refetches or merges server pins; pending optimistic pins disappear for synced items

4. **Given** the server already has a knock with the same `idempotency_key` for this rep (replay / duplicate sync)  
   **When** sync runs  
   **Then** the server returns the existing knock (does not create a duplicate row)  
   **And** the client removes the pending row (idempotency — data not dropped)  
   **And** no error is shown to the rep for benign duplicates

5. **Given** implementation scope for this story  
   **When** reviewing the diff  
   **Then** online `POST /api/v1/knocks` still works unchanged for connected submits  
   **And** there is **no** Serwist service-worker work (Story 2.8), lead promotion (2.9), or duplicate-address warning UI (2.10)  
   **And** `npm run build` and `npm run lint` pass

**Implements:** FR13, FR56 (partial — sync preserves data)  
**NFRs:** NFR4 (sync within 30s of reconnect), NFR11 (encrypt PII in IndexedDB), NFR14 (zero offline data loss), UX-DR7 (pending indicator)

## Tasks / Subtasks

- [x] **Schema: idempotency_key** (AC: 4)
  - [x] Migration `door_knocks_idempotency_key.sql` — `ALTER TABLE public.door_knocks ADD COLUMN idempotency_key text NULL`
  - [x] Partial unique index: `(rep_id, idempotency_key)` WHERE `idempotency_key IS NOT NULL`
  - [x] Apply via Supabase MCP; `npm run db:types`

- [x] **Client crypto + Dexie** (AC: 1, NFR11)
  - [x] Create `src/lib/offline/crypto.ts` — Web Crypto AES-GCM encrypt/decrypt helpers; session-scoped key in `sessionStorage` (generate on first use)
  - [x] Create `src/lib/offline/pending-knocks-db.ts` — Dexie database `sunflare_offline`, table `pending_knocks`
  - [x] Row shape: `client_id`, `idempotency_key`, `lat`, `lng`, `outcome`, `follow_up_at`, encrypted blobs for PII, `created_at`, `status: 'pending' | 'syncing'`
  - [x] Create `src/features/knocks/pending-knocks-store.ts` — `enqueuePendingKnock`, `listPendingKnocks`, `removePendingKnock`, `markSyncing`

- [x] **Validators** (AC: 3, 4)
  - [x] Extend `src/lib/validators/knocks.ts` — `syncKnockItemSchema` (client_id, idempotency_key + `createKnockBodySchema` fields), `syncKnocksBodySchema` (array, max batch e.g. 50)

- [x] **Sync API** (AC: 3, 4)
  - [x] Create `src/app/api/v1/knocks/sync/route.ts` — `POST`, `requireRoleForApi(["rep"])`, active shift gate
  - [x] For each item: if `idempotency_key` exists for `auth.id`, return existing knock; else `createKnockWithContact` with `idempotency_key` set
  - [x] Extend `create_knock_with_contact` RPC OR add `sync_knock_with_contact` that accepts `p_idempotency_key` — prefer extending existing RPC with optional idempotency param + upsert-by-key logic in plpgsql
  - [x] Response: `{ data: { results: [{ client_id, status: 'created' | 'duplicate', knock }] } }`

- [x] **Online vs offline submit** (AC: 1, 5)
  - [x] Create `src/features/knocks/submit-knock.ts` — `submitKnock(payload)` tries `createKnock`; on network failure or `!navigator.onLine`, enqueues to Dexie and returns optimistic `PendingKnockPin`
  - [x] Update `src/components/rep/door-outcome-sheet.tsx` — use `submitKnock` instead of direct `createKnock`
  - [x] Update `onSuccess` flow in shell to accept server `KnockPin` or pending optimistic pin

- [x] **Background sync** (AC: 3, NFR4)
  - [x] Create `src/features/knocks/use-knock-sync-loop.ts` — listen `online`, poll every 10s while pending > 0 and online; POST batch to `/api/v1/knocks/sync`; 30s max delay after reconnect
  - [x] Create `src/features/knocks/api.ts` — `syncPendingKnocks(items)`
  - [x] Wire in `rep-map-shift-shell.tsx` when `isActive`

- [x] **Offline indicator + optimistic pins** (AC: 2, UX-DR7)
  - [x] Create `src/features/knocks/use-pending-knocks.ts` — reactive Dexie count + pins via `liveQuery`
  - [x] Create `src/components/rep/offline-pending-indicator.tsx` — badge/banner with pending count
  - [x] Update `rep-map-shift-shell.tsx` — show indicator when count > 0
  - [x] Update `map-canvas.tsx` — accept `pendingKnocks` prop; merge into GeoJSON with `pending: true` property; muted pin style (`circle-opacity: 0.55`)

- [x] **Verify** (AC: 5)
  - [x] Manual: DevTools offline → save knock → pending indicator + muted pin → go online → sync within 30s → pin becomes normal
  - [x] Manual: Replay same idempotency (force sync twice) → no duplicate server row
  - [x] Manual: Online save still works
  - [x] `npm run build` && `npm run lint`

### Review Findings

- [x] [Review][Patch] Recover stuck `syncing` rows [`use-knock-sync-loop.ts:39`] — sync pickup includes `pending` and `syncing`.
- [x] [Review][Patch] Chunk sync batches at 50 [`use-knock-sync-loop.ts:49`] — process pending rows in `SYNC_KNOCKS_MAX_BATCH` slices per POST.
- [x] [Review][Defer] Pending knocks sync only during active shift — `403 NO_ACTIVE_SHIFT` if shift ended with queue; acceptable v1; syncs on next shift start.

## Dev Notes

### Critical constraints

- **Do NOT** implement Serwist SW registration or install prompt — Story 2.8.
- **Do NOT** add lead promotion on `interested` — Story 2.9.
- **Do NOT** add duplicate-address alert (FR18) — Story 2.10.
- **Do NOT** install TanStack Query — use `fetch` + hooks + Dexie live queries or polling (project convention).
- **Do NOT** break online POST path — offline is additive fallback.
- **Do NOT** store plaintext notes/address in IndexedDB — encrypt per NFR11.
- **Do NOT** drop pending rows on sync 409/duplicate — treat duplicate as success and delete pending row.

### Offline detection strategy

Treat as offline when **either**:

1. `typeof navigator !== 'undefined' && !navigator.onLine`, or
2. `createKnock` `fetch` throws `TypeError` (network) or returns non-JSON / connection reset

Do **not** queue on `403 NO_ACTIVE_SHIFT` or `400 VALIDATION_ERROR` — show error, keep sheet open.

### Dexie `pending_knocks` schema

```typescript
interface PendingKnockRow {
  client_id: string;           // PK — UUID v4
  idempotency_key: string;     // UUID v4 — stable for replay
  lat: number;
  lng: number;
  outcome: DoorOutcome;
  follow_up_at: string | null; // ISO or null
  notes_enc: string | null;    // base64 ciphertext (iv + tag bundled) or null
  address_enc: string | null;
  suburb_enc: string | null;
  postcode_enc: string | null;
  status: "pending" | "syncing";
  created_at: string;          // ISO
}
```

Dexie v4 example:

```typescript
import Dexie, { type EntityTable } from "dexie";

class SunflareOfflineDB extends Dexie {
  pending_knocks!: EntityTable<PendingKnockRow, "client_id">;
  constructor() {
    super("sunflare_offline");
    this.version(1).stores({ pending_knocks: "client_id, status, created_at" });
  }
}
```

### PII encryption (NFR11)

Architecture: **Web Crypto AES-GCM** before IndexedDB write.

```typescript
// src/lib/offline/crypto.ts
// - getOrCreateSessionCryptoKey(): CryptoKey (AES-GCM 256)
// - encryptField(plaintext: string): string  // base64(iv || ciphertext)
// - decryptField(blob: string): string
```

Store key material in `sessionStorage` under `sunflare_offline_crypto_v1` (export/import JWK). Key is per browser tab session — acceptable v1; rep re-login on new session re-encrypts on next enqueue. Document limitation in Dev Agent Record.

Encrypt: `notes`, `address`, `suburb`, `postcode`.  
Leave plaintext: `lat`, `lng`, `outcome`, `follow_up_at` (needed for map pins and sync body).

### Submit flow (replace direct createKnock in sheet)

```typescript
// src/features/knocks/submit-knock.ts
export type SubmitKnockResult =
  | { mode: "online"; knock: KnockPin }
  | { mode: "offline"; pending: PendingKnockPin };

export async function submitKnock(body: CreateKnockBody): Promise<SubmitKnockResult> {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return { mode: "offline", pending: await enqueuePendingKnock(body) };
  }
  try {
    const knock = await createKnock(body);
    return { mode: "online", knock };
  } catch (e) {
    if (isNetworkError(e)) {
      return { mode: "offline", pending: await enqueuePendingKnock(body) };
    }
    throw e;
  }
}
```

`PendingKnockPin` shape for map (extends pin display needs):

```typescript
{ id: client_id, lat, lng, outcome, knocked_at: created_at, pending: true }
```

### Sync API contract

**POST `/api/v1/knocks/sync`**

Request:

```json
{
  "knocks": [
    {
      "client_id": "550e8400-e29b-41d4-a716-446655440000",
      "idempotency_key": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
      "lat": -33.8688,
      "lng": 151.2093,
      "outcome": "interested",
      "notes": "Asked for brochure",
      "follow_up_at": null,
      "address": "1 Martin Place",
      "suburb": "Sydney",
      "postcode": "2000"
    }
  ]
}
```

Response:

```json
{
  "data": {
    "results": [
      {
        "client_id": "550e8400-e29b-41d4-a716-446655440000",
        "status": "created",
        "knock": { "id": "...", "lat": -33.8688, "lng": 151.2093, "outcome": "interested", "knocked_at": "..." }
      }
    ]
  }
}
```

Duplicate: `status: "duplicate"` with existing knock — client deletes pending row either way.

Errors: `400 VALIDATION_ERROR`, `401`, `403 NO_ACTIVE_SHIFT`, `500 SYNC_FAILED`

Active shift required (same as POST knocks).

### Database: idempotency_key

```sql
alter table public.door_knocks
  add column if not exists idempotency_key text null;

create unique index if not exists door_knocks_rep_idempotency_unique
  on public.door_knocks (rep_id, idempotency_key)
  where idempotency_key is not null;
```

Extend `create_knock_with_contact` (preferred — one code path):

```sql
-- Add p_idempotency_key text param
-- At start: if p_idempotency_key is not null, select existing knock for rep+key and return early
-- On insert: set door_knocks.idempotency_key = p_idempotency_key
```

Drop/recreate function signature again (now 9 args) following Story 2.6 migration pattern.

Online `POST /api/v1/knocks` may omit `idempotency_key` (null) — only offline/sync path sets it.

### Background sync loop

```typescript
// use-knock-sync-loop.ts — enabled when isActive
// - Subscribe window 'online'
// - When pending count > 0 && navigator.onLine:
//   - Decrypt pending rows → build sync payload
//   - POST /api/v1/knocks/sync
//   - On success per client_id: remove from Dexie
//   - Bump knockRefreshKey / pending list refresh
// - Interval: 10s while pending > 0 (meets 30s NFR4 target)
// - Mark rows 'syncing' during in-flight request to avoid double-submit
```

### Optimistic map pins

`map-canvas.tsx` today builds GeoJSON from `KnockPin[]`. Extend:

```typescript
type MapCanvasProps = {
  // existing...
  pendingKnocks?: PendingKnockPin[];
};
```

Merge `knocks` + `pendingKnocks` in `knocksToFeatureCollection`, set `properties.pending = true`.

Mapbox layer paint override for pending — use separate unclustered layer **above** synced pins or `circle-opacity` expression:

```javascript
["case", ["==", ["get", "pending"], true], 0.55, 1]
```

Optional: `circle-stroke-width` 2 with dashed effect via second layer — keep minimal (opacity is enough for 2.7).

### Offline indicator (UX-DR7)

Place near shift controls or top of map — visible when `pendingCount > 0`:

```
"3 knocks waiting to sync"
```

Use `aria-live="polite"`. Non-blocking; no modal. Amber/zinc styling consistent with `ShiftControls` warnings.

### Files to read before coding (UPDATE)

| File | Current state | This story changes |
| :--- | :--- | :--- |
| `src/components/rep/door-outcome-sheet.tsx` | `createKnock` on save | `submitKnock` + offline success path |
| `src/app/(rep)/rep/map/rep-map-shift-shell.tsx` | `knockRefreshKey`, sheet wiring | sync loop, pending count, pass pending pins |
| `src/components/rep/map-canvas.tsx` | Server knocks GeoJSON | Merge pending optimistic pins |
| `src/features/knocks/api.ts` | `createKnock`, `fetchKnocksInBbox` | `syncPendingKnocks` |
| `src/features/knocks/create-knock.ts` | RPC call | Optional `idempotency_key` param |
| `src/app/api/v1/knocks/route.ts` | GET + POST | Unchanged (sync is new route) |
| `src/lib/validators/knocks.ts` | `createKnockBodySchema` | Sync schemas |

**Preserve:** Story 2.5/2.6 form fields, geocode, shift gates, sheet `key`, review patches.

### Previous story intelligence

**Story 2.6:**
- `createKnockBodySchema` includes address fields — offline queue must store and replay full payload.
- Geocode is online-only; offline submit uses whatever address rep typed in sheet.

**Story 2.5:**
- `create_knock_with_contact` RPC — extend for idempotency, don't bypass with raw inserts.
- `knockRefreshKey` refetch — after sync success, bump refresh key.

**Story 2.3:**
- Deferred optimistic pins — **implement now** with muted style.
- `useMapKnocks` unchanged for server pins; pending pins passed separately.

**Story 2.1:**
- `synced` boolean on `door_knocks` — set `true` on server create; pending rows are client-only until sync.

### Cross-story dependencies

| Story | Relationship |
| :--- | :--- |
| 2.5–2.6 | **Requires** online knock + address payload shape |
| 2.8 | Serwist SW enhances offline shell — Dexie works without SW in 2.7 |
| 2.9 | Lead promotion runs on server after sync create |
| 2.10 | Duplicate address check is separate from idempotency key |

### Testing (this story)

- **Required:** `npm run build`, `npm run lint`
- **Manual:** Chrome DevTools → Offline → save knock → indicator + muted pin
- **Manual:** Back online → sync completes < 30s
- **Manual:** IndexedDB inspection — PII fields encrypted (not plaintext notes)
- **Manual:** Online knock regression
- **No** Playwright unless trivial (flaky with offline simulation)

### Project Structure Notes

New/ modified files:

```
supabase/migrations/*_door_knocks_idempotency_key.sql
supabase/migrations/*_create_knock_with_contact_idempotency.sql
src/lib/offline/crypto.ts                    (new)
src/lib/offline/pending-knocks-db.ts           (new)
src/lib/validators/knocks.ts                   (sync schemas)
src/features/knocks/pending-knocks-store.ts    (new)
src/features/knocks/submit-knock.ts            (new)
src/features/knocks/use-knock-sync-loop.ts     (new)
src/features/knocks/use-pending-knock-count.ts (new)
src/features/knocks/api.ts                     (syncPendingKnocks)
src/features/knocks/create-knock.ts            (idempotency_key)
src/app/api/v1/knocks/sync/route.ts            (new)
src/components/rep/offline-pending-indicator.tsx (new)
src/components/rep/door-outcome-sheet.tsx      (submitKnock)
src/components/rep/map-canvas.tsx              (pending pins)
src/app/(rep)/rep/map/rep-map-shift-shell.tsx  (wiring)
src/types/supabase.generated.ts
```

### References

- [Source: `_bmad-output/planning-artifacts/epics.md` — Story 2.7]
- [Source: `docs/Solar_CRM_PRD_v1.md` — Offline Mode Architecture]
- [Source: `_bmad-output/planning-artifacts/architecture.md` — Dexie outbox, sync flow, NFR11 encryption]
- [Source: `_bmad-output/implementation-artifacts/2-6-reverse-geocoding-on-knock.md` — POST body shape]
- [Source: `_bmad-output/implementation-artifacts/2-5-door-outcome-form-and-submission.md` — RPC create flow]
- [Source: `_bmad-output/implementation-artifacts/2-1-contacts-and-doorknocks-schema.md` — idempotency deferred]
- [Source: `src/components/rep/door-outcome-sheet.tsx`]
- [Source: `src/components/rep/map-canvas.tsx`]
- [Source: Dexie.js docs](https://dexie.org/)

## Dev Agent Record

### Agent Model Used

Composer

### Debug Log References

- Applied `door_knocks_idempotency_key` and `create_knock_with_contact_idempotency` migrations via Supabase MCP.

### Completion Notes List

- Dexie `pending_knocks` outbox with AES-GCM encrypted PII (notes, address fields).
- `submitKnock` queues on offline/network failure; `POST /api/v1/knocks/sync` batch replay with idempotency.
- Background sync on `online` + 10s poll; pending indicator + muted optimistic map pins.
- `npm run build` and `npm run lint` pass.
- Code review patches: sync pickup includes `syncing` rows; batch chunked at 50 per POST.

### File List

- `supabase/migrations/20260603170000_door_knocks_idempotency_key.sql` (new)
- `supabase/migrations/20260603170100_create_knock_with_contact_idempotency.sql` (new)
- `src/lib/offline/crypto.ts` (new)
- `src/lib/offline/pending-knocks-db.ts` (new)
- `src/lib/validators/knocks.ts` (modified)
- `src/features/knocks/pending-knocks-store.ts` (new)
- `src/features/knocks/submit-knock.ts` (new)
- `src/features/knocks/use-knock-sync-loop.ts` (new)
- `src/features/knocks/use-pending-knocks.ts` (new)
- `src/features/knocks/create-knock.ts` (modified)
- `src/features/knocks/api.ts` (modified)
- `src/app/api/v1/knocks/route.ts` (modified)
- `src/app/api/v1/knocks/sync/route.ts` (new)
- `src/components/rep/offline-pending-indicator.tsx` (new)
- `src/components/rep/door-outcome-sheet.tsx` (modified)
- `src/components/rep/map-canvas.tsx` (modified)
- `src/app/(rep)/rep/map/rep-map-shift-shell.tsx` (modified)
- `src/types/supabase.generated.ts` (modified)

## Change Log

- 2026-06-03: Story 2.7 — offline knock queue, encrypted Dexie outbox, sync API, optimistic pins.
- 2026-06-03: Code review patches — syncing row recovery, 50-item sync chunks.

### Senior Developer Review (AI)

**Outcome:** Approve (after patches)  
**Date:** 2026-06-03  
**Layers:** Blind Hunter, Edge Case Hunter, Acceptance Auditor (inline)

**Summary:** FR13 offline queue complete. Patches: retry `syncing` rows after crash, chunk sync POSTs at 50.

## Story Completion Status

- **Status:** done
- **Completion note:** All ACs satisfied; code review patches applied; build and lint pass.
