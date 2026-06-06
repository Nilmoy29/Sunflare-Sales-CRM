import type { PushSubscribeBody } from "@/lib/validators/push";

export async function subscribePush(body: PushSubscribeBody): Promise<void> {
  const res = await fetch("/api/v1/push/subscribe", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const responseBody = (await res.json()) as {
    error?: { message: string };
  };

  if (!res.ok) {
    throw new Error(
      responseBody.error?.message ?? "Could not save push subscription",
    );
  }
}

export async function unsubscribePush(endpoint: string): Promise<void> {
  const res = await fetch("/api/v1/push/subscribe", {
    method: "DELETE",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ endpoint }),
  });

  const responseBody = (await res.json()) as {
    error?: { message: string };
  };

  if (!res.ok) {
    throw new Error(
      responseBody.error?.message ?? "Could not remove push subscription",
    );
  }
}
