import type { CreateKnockBody, DoorOutcome } from "@sunflare/shared";
import * as Crypto from "expo-crypto";
import type { PendingKnockPin } from "@/features/knocks/types";
import {
  decryptNullableField,
  encryptNullableField,
} from "@/lib/offline/crypto";
import { getDatabase } from "@/lib/sqlite/database";

export type PendingKnockRow = {
  client_id: string;
  idempotency_key: string;
  lat: number;
  lng: number;
  outcome: DoorOutcome;
  follow_up_at: string | null;
  notes_enc: string | null;
  address_enc: string | null;
  suburb_enc: string | null;
  postcode_enc: string | null;
  status: "pending" | "syncing";
  created_at: string;
};

export async function enqueuePendingKnock(
  body: CreateKnockBody,
): Promise<PendingKnockPin> {
  const clientId = Crypto.randomUUID();
  const idempotencyKey = Crypto.randomUUID();
  const createdAt = new Date().toISOString();
  const db = await getDatabase();

  await db.runAsync(
    `INSERT INTO pending_knocks (
      client_id, idempotency_key, lat, lng, outcome, follow_up_at,
      notes_enc, address_enc, suburb_enc, postcode_enc, status, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
    clientId,
    idempotencyKey,
    body.lat,
    body.lng,
    body.outcome,
    body.follow_up_at,
    await encryptNullableField(body.notes),
    await encryptNullableField(body.address),
    await encryptNullableField(body.suburb),
    await encryptNullableField(body.postcode),
    createdAt,
  );

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
  const db = await getDatabase();
  const placeholders = statuses.map(() => "?").join(", ");
  return db.getAllAsync<PendingKnockRow>(
    `SELECT client_id, idempotency_key, lat, lng, outcome, follow_up_at,
      notes_enc, address_enc, suburb_enc, postcode_enc, status, created_at
     FROM pending_knocks
     WHERE status IN (${placeholders})
     ORDER BY created_at ASC`,
    ...statuses,
  );
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
  const db = await getDatabase();
  await db.runAsync("DELETE FROM pending_knocks WHERE client_id = ?", clientId);
}

export async function markKnocksSyncing(clientIds: string[]): Promise<void> {
  const db = await getDatabase();
  for (const clientId of clientIds) {
    await db.runAsync(
      "UPDATE pending_knocks SET status = 'syncing' WHERE client_id = ?",
      clientId,
    );
  }
}

export async function markKnocksPending(clientIds: string[]): Promise<void> {
  const db = await getDatabase();
  for (const clientId of clientIds) {
    await db.runAsync(
      "UPDATE pending_knocks SET status = 'pending' WHERE client_id = ?",
      clientId,
    );
  }
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
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ count: number }>(
    "SELECT COUNT(*) as count FROM pending_knocks WHERE status IN ('pending', 'syncing')",
  );
  return row?.count ?? 0;
}
