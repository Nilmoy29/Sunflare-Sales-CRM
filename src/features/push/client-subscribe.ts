import { subscribePush, unsubscribePush } from "@/features/push/api";
import type { PushSubscribeBody } from "@/lib/validators/push";

export type PushSupportState = "unsupported" | "supported";

export function getPushSupportState(): PushSupportState {
  if (typeof window === "undefined") {
    return "unsupported";
  }

  if (
    !("serviceWorker" in navigator) ||
    !("PushManager" in window) ||
    !("Notification" in window)
  ) {
    return "unsupported";
  }

  return "supported";
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) {
    output[i] = raw.charCodeAt(i);
  }
  return output;
}

export async function getExistingPushSubscription(): Promise<PushSubscription | null> {
  if (getPushSupportState() === "unsupported") {
    return null;
  }

  const registration = await navigator.serviceWorker.ready;
  return registration.pushManager.getSubscription();
}

export async function enablePushReminders(): Promise<void> {
  if (getPushSupportState() === "unsupported") {
    throw new Error("Push notifications are not supported in this browser");
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error("Notification permission was not granted");
  }

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!publicKey) {
    throw new Error("Push notifications are not configured");
  }

  const registration = await navigator.serviceWorker.ready;
  let subscription = await registration.pushManager.getSubscription();

  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });
  }

  const json = subscription.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
    throw new Error("Invalid push subscription");
  }

  const body: PushSubscribeBody = {
    endpoint: json.endpoint,
    keys: {
      p256dh: json.keys.p256dh,
      auth: json.keys.auth,
    },
  };

  await subscribePush(body);
}

export async function disablePushReminders(): Promise<void> {
  const subscription = await getExistingPushSubscription();
  if (!subscription) {
    return;
  }

  const endpoint = subscription.endpoint;
  await subscription.unsubscribe();
  await unsubscribePush(endpoint);
}

export async function syncPushSubscriptionIfGranted(): Promise<void> {
  if (getPushSupportState() === "unsupported") {
    return;
  }

  if (Notification.permission !== "granted") {
    return;
  }

  const subscription = await getExistingPushSubscription();
  if (!subscription) {
    return;
  }

  const json = subscription.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
    return;
  }

  await subscribePush({
    endpoint: json.endpoint,
    keys: {
      p256dh: json.keys.p256dh,
      auth: json.keys.auth,
    },
  });
}
