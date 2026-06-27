---
story: M5.5
epic: 5
title: SQLite Knock Outbox
status: done
date: 2026-06-26
---

# Story M5.5: SQLite Knock Outbox

Status: **done**

## File List

- `src/lib/sqlite/database.ts` — `pending_knocks` table
- `src/lib/sqlite/pending-knocks.ts` — enqueue, list, status transitions
- `src/lib/offline/crypto.ts` — AES-GCM PII encryption (`@noble/ciphers` + SecureStore key)
- `src/components/pending-sync-banner.tsx` — pending count UI

## Notes

- `client_id` and `idempotency_key` are UUIDs via `expo-crypto`.
- Address/notes/suburb/postcode stored encrypted at rest (NFR-M3).
