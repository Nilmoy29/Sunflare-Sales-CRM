import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { subscribeExpoPush } from "@/features/push/api";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export type PushPermissionState = "undetermined" | "granted" | "denied";

export async function getPushPermissionState(): Promise<PushPermissionState> {
  const settings = await Notifications.getPermissionsAsync();
  if (settings.granted) {
    return "granted";
  }
  if (settings.canAskAgain === false) {
    return "denied";
  }
  return "undetermined";
}

export async function ensureAndroidNotificationChannel(): Promise<void> {
  if (Platform.OS !== "android") {
    return;
  }

  await Notifications.setNotificationChannelAsync("follow-ups", {
    name: "Follow-up reminders",
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
  });
}

export async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) {
    return null;
  }

  await ensureAndroidNotificationChannel();

  const permission = await Notifications.requestPermissionsAsync();
  if (!permission.granted) {
    return null;
  }

  const token = await Notifications.getExpoPushTokenAsync();
  await subscribeExpoPush(token.data);
  return token.data;
}

export function parseNotificationLeadPath(
  data: Record<string, unknown> | undefined,
): string | null {
  const url = data?.url;
  if (typeof url !== "string") {
    return null;
  }

  const match = url.match(/^sunflare:\/\/pipeline\/([^/?#]+)$/);
  if (!match?.[1]) {
    return null;
  }

  return `/(tabs)/pipeline/${match[1]}`;
}
