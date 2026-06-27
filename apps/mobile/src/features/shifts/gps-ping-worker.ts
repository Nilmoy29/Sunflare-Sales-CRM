import { postGpsPing } from "@/features/shifts/api";
import {
  enqueuePendingGpsPing,
  getActiveShiftId,
  listPendingGpsPings,
  removePendingGpsPing,
} from "@/lib/sqlite/pending-gps-pings";

export async function recordGpsSample(lat: number, lng: number): Promise<void> {
  const shiftId = await getActiveShiftId();
  if (!shiftId) {
    return;
  }

  try {
    await postGpsPing({ shift_id: shiftId, lat, lng });
  } catch {
    await enqueuePendingGpsPing({ shift_id: shiftId, lat, lng });
  }
}

export async function flushPendingGpsPings(shiftId: string): Promise<void> {
  const rows = await listPendingGpsPings(shiftId);
  for (const row of rows) {
    try {
      await postGpsPing({
        shift_id: row.shift_id,
        lat: row.lat,
        lng: row.lng,
      });
      await removePendingGpsPing(row.id);
    } catch {
      break;
    }
  }
}
