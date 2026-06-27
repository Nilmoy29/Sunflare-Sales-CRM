import { Expo, type ExpoPushMessage } from "expo-server-sdk";

const expo = new Expo();

export type ExpoPushPayload = {
  token: string;
  title: string;
  body: string;
  url: string;
};

export type ExpoPushSendResult = {
  sent: boolean;
  expired: boolean;
};

export async function sendExpoPushNotification(
  payload: ExpoPushPayload,
): Promise<ExpoPushSendResult> {
  if (!Expo.isExpoPushToken(payload.token)) {
    return { sent: false, expired: true };
  }

  const message: ExpoPushMessage = {
    to: payload.token,
    sound: "default",
    title: payload.title,
    body: payload.body,
    data: { url: payload.url },
    priority: "high",
    channelId: "follow-ups",
  };

  const tickets = await expo.sendPushNotificationsAsync([message]);
  const ticket = tickets[0];

  if (!ticket) {
    return { sent: false, expired: false };
  }

  if (ticket.status === "ok") {
    return { sent: true, expired: false };
  }

  const details = ticket.details;
  const expired =
    details &&
    typeof details === "object" &&
    "error" in details &&
    details.error === "DeviceNotRegistered";

  return { sent: false, expired: Boolean(expired) };
}
