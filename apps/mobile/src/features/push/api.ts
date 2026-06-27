import { apiJson, getApiErrorMessage } from "@/lib/api-client";

export async function subscribeExpoPush(expoPushToken: string): Promise<void> {
  const { response, json } = await apiJson<{ subscribed: true }>(
    "/api/v1/push/subscribe",
    {
      method: "POST",
      body: JSON.stringify({
        platform: "expo",
        expo_push_token: expoPushToken,
      }),
    },
  );

  if (!response.ok) {
    throw new Error(getApiErrorMessage(json, "Could not register push token"));
  }
}

export async function unsubscribeExpoPush(expoPushToken: string): Promise<void> {
  const { response, json } = await apiJson<{ unsubscribed: true }>(
    "/api/v1/push/subscribe",
    {
      method: "DELETE",
      body: JSON.stringify({ endpoint: expoPushToken }),
    },
  );

  if (!response.ok && response.status !== 404) {
    throw new Error(getApiErrorMessage(json, "Could not remove push token"));
  }
}
