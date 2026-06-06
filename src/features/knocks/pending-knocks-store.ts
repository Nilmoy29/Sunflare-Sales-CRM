import {
  decryptNullableField,
  encryptNullableField,
} from "@/lib/offline/crypto";
import {
  pendingKnocksDb,
  type PendingKnockRow,
} from "@/lib/offline/pending-knocks-db";
import type { CreateKnockBody, PendingKnockPin } from "@/lib/validators/knocks";

function createUuid(): string {
  return crypto.randomUUID();
}

export async function enqueuePendingKnock(
  body: CreateKnockBody,
): Promise<PendingKnockPin> {
  const clientId = createUuid();
  const idempotencyKey = createUuid();
  const createdAt = new Date().toISOString();

  const row: PendingKnockRow = {
    client_id: clientId,
    idempotency_key: idempotencyKey,
    lat: body.lat,
    lng: body.lng,
    outcome: body.outcome,
    follow_up_at: body.follow_up_at,
    notes_enc: await encryptNullableField(body.notes),
    address_enc: await encryptNullableField(body.address),
    suburb_enc: await encryptNullableField(body.suburb),
    postcode_enc: await encryptNullableField(body.postcode),
    status: "pending",
    created_at: createdAt,
  };

  await pendingKnocksDb.pending_knocks.put(row);

  return {
    id: clientId,
    lat: body.lat,
    lng: body.lng,
    outcome: body.outcome,
    knocked_at: createdAt,
    pending: true,
  };
}

export async function listPendingKnockRows(
  statuses: PendingKnockRow["status"][] = ["pending", "syncing"],
): Promise<PendingKnockRow[]> {
  return pendingKnocksDb.pending_knocks
    .where("status")
    .anyOf(statuses)
    .sortBy("created_at");
}

export async function pendingKnocksToMapPins(): Promise<PendingKnockPin[]> {
  const rows = await listPendingKnockRows(["pending", "syncing"]);
  return rows.map((row) => ({
    id: row.client_id,
    lat: row.lat,
    lng: row.lng,
    outcome: row.outcome,
    knocked_at: row.created_at,
    pending: true as const,
  }));
}

export async function removePendingKnock(clientId: string): Promise<void> {
  await pendingKnocksDb.pending_knocks.delete(clientId);
}

export async function markKnocksSyncing(clientIds: string[]): Promise<void> {
  await pendingKnocksDb.transaction("rw", pendingKnocksDb.pending_knocks, async () => {
    for (const clientId of clientIds) {
      await pendingKnocksDb.pending_knocks.update(clientId, {
        status: "syncing",
      });
    }
  });
}

export async function markKnocksPending(clientIds: string[]): Promise<void> {
  await pendingKnocksDb.transaction("rw", pendingKnocksDb.pending_knocks, async () => {
    for (const clientId of clientIds) {
      await pendingKnocksDb.pending_knocks.update(clientId, {
        status: "pending",
      });
    }
  });
}

export async function pendingRowToSyncItem(row: PendingKnockRow) {
  return {
    client_id: row.client_id,
    idempotency_key: row.idempotency_key,
    lat: row.lat,
    lng: row.lng,
    outcome: row.outcome,
    follow_up_at: row.follow_up_at,
    notes: await decryptNullableField(row.notes_enc),
    address: await decryptNullableField(row.address_enc),
    suburb: await decryptNullableField(row.suburb_enc),
    postcode: await decryptNullableField(row.postcode_enc),
  };
}

export async function countPendingKnocks(): Promise<number> {
  return pendingKnocksDb.pending_knocks
    .where("status")
    .anyOf(["pending", "syncing"])
    .count();
}
