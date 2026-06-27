import * as TaskManager from "expo-task-manager";
import type { LocationObject } from "expo-location";
import { recordGpsSample } from "@/features/shifts/gps-ping-worker";
import { GPS_BACKGROUND_TASK } from "@/features/shifts/types";

TaskManager.defineTask(GPS_BACKGROUND_TASK, async ({ data, error }) => {
  if (error) {
    return;
  }
  const locations = (data as { locations?: LocationObject[] } | undefined)
    ?.locations;
  const latest = locations?.[locations.length - 1];
  if (!latest) {
    return;
  }
  await recordGpsSample(latest.coords.latitude, latest.coords.longitude);
});
