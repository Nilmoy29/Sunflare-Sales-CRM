import { getDatabase } from "@/lib/sqlite/database";

const ACTIVE_SHIFT_KEY = "active_shift_id";

export async function getActiveShiftId(): Promise<string | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ value: string }>(
    "SELECT value FROM app_meta WHERE key = ?",
    ACTIVE_SHIFT_KEY,
  );
  return row?.value ?? null;
}

export async function setActiveShiftId(shiftId: string | null): Promise<void> {
  const db = await getDatabase();
  if (!shiftId) {
    await db.runAsync("DELETE FROM app_meta WHERE key = ?", ACTIVE_SHIFT_KEY);
    return;
  }
  await db.runAsync(
    "INSERT INTO app_meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
    ACTIVE_SHIFT_KEY,
    shiftId,
  );
}

export type PendingGpsPingRow = {
  id: string;
  shift_id: string;
  lat: number;
  lng: number;
  created_at: string;
};

function createId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export async function enqueuePendingGpsPing(row: {
  shift_id: string;
  lat: number;
  lng: number;
}): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    "INSERT INTO pending_gps_pings (id, shift_id, lat, lng, created_at) VALUES (?, ?, ?, ?, ?)",
    createId(),
    row.shift_id,
    row.lat,
    row.lng,
    new Date().toISOString(),
  );
}

export async function listPendingGpsPings(
  shiftId: string,
): Promise<PendingGpsPingRow[]> {
  const db = await getDatabase();
  return db.getAllAsync<PendingGpsPingRow>(
    "SELECT id, shift_id, lat, lng, created_at FROM pending_gps_pings WHERE shift_id = ? ORDER BY created_at ASC",
    shiftId,
  );
}

export async function removePendingGpsPing(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync("DELETE FROM pending_gps_pings WHERE id = ?", id);
}

export async function clearPendingGpsPingsForShift(shiftId: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync("DELETE FROM pending_gps_pings WHERE shift_id = ?", shiftId);
}
