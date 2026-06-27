import * as Location from "expo-location";
import {
  flushPendingGpsPings,
} from "@/features/shifts/gps-ping-worker";
import { GPS_BACKGROUND_TASK, GPS_PING_INTERVAL_MS } from "@/features/shifts/types";
import {
  clearPendingGpsPingsForShift,
  setActiveShiftId,
} from "@/lib/sqlite/pending-gps-pings";

export async function startShiftGpsTracking(shiftId: string): Promise<void> {
  await setActiveShiftId(shiftId);

  const hasStarted = await Location.hasStartedLocationUpdatesAsync(
    GPS_BACKGROUND_TASK,
  );
  if (!hasStarted) {
    await Location.startLocationUpdatesAsync(GPS_BACKGROUND_TASK, {
      accuracy: Location.Accuracy.Balanced,
      timeInterval: GPS_PING_INTERVAL_MS,
      distanceInterval: 0,
      foregroundService: {
        notificationTitle: "Sunflare shift active",
        notificationBody: "Recording your route for today's shift",
      },
      pausesUpdatesAutomatically: false,
      showsBackgroundLocationIndicator: true,
    });
  }

  await flushPendingGpsPings(shiftId);
}

export async function stopShiftGpsTracking(shiftId: string): Promise<void> {
  await setActiveShiftId(null);

  const hasStarted = await Location.hasStartedLocationUpdatesAsync(
    GPS_BACKGROUND_TASK,
  );
  if (hasStarted) {
    await Location.stopLocationUpdatesAsync(GPS_BACKGROUND_TASK);
  }

  await clearPendingGpsPingsForShift(shiftId);
}
