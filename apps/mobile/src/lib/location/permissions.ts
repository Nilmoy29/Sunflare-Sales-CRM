import * as Linking from "expo-linking";
import * as Location from "expo-location";

export type LocationPermissionResult =
  | { ok: true }
  | { ok: false; message: string };

export async function ensureShiftLocationPermissions(): Promise<LocationPermissionResult> {
  const foreground = await Location.requestForegroundPermissionsAsync();
  if (foreground.status !== "granted") {
    return {
      ok: false,
      message:
        "Location access is required to start a shift. Enable it in Settings to continue.",
    };
  }

  const background = await Location.requestBackgroundPermissionsAsync();
  if (background.status !== "granted") {
    return {
      ok: false,
      message:
        "Background location is required during active shifts. Enable “Allow all the time” in Settings.",
    };
  }

  return { ok: true };
}

export function openAppSettings(): void {
  void Linking.openSettings();
}
