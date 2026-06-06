import { apiError, apiSuccess } from "@/lib/api/response";
import { requireRoleForApi } from "@/lib/auth/guards";
import {
  deletePushSubscription,
  upsertPushSubscription,
} from "@/features/push/upsert-push-subscription";
import {
  pushSubscribeBodySchema,
  pushUnsubscribeBodySchema,
} from "@/lib/validators/push";

export async function POST(request: Request) {
  const auth = await requireRoleForApi(["rep"]);
  if (auth instanceof Response) {
    return auth;
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("VALIDATION_ERROR", "Invalid JSON body", 400);
  }

  const parsed = pushSubscribeBodySchema.safeParse(body);
  if (!parsed.success) {
    return apiError(
      "VALIDATION_ERROR",
      parsed.error.issues[0]?.message ?? "Invalid request body",
      400,
    );
  }

  try {
    const ok = await upsertPushSubscription(auth.id, parsed.data);
    if (!ok) {
      return apiError("FORBIDDEN", "Could not save subscription", 403);
    }
    return apiSuccess({ subscribed: true as const });
  } catch {
    return apiError(
      "PUSH_SUBSCRIBE_FAILED",
      "Could not save push subscription",
      500,
    );
  }
}

export async function DELETE(request: Request) {
  const auth = await requireRoleForApi(["rep"]);
  if (auth instanceof Response) {
    return auth;
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("VALIDATION_ERROR", "Invalid JSON body", 400);
  }

  const parsed = pushUnsubscribeBodySchema.safeParse(body);
  if (!parsed.success) {
    return apiError(
      "VALIDATION_ERROR",
      parsed.error.issues[0]?.message ?? "Invalid request body",
      400,
    );
  }

  try {
    const ok = await deletePushSubscription(auth.id, parsed.data.endpoint);
    if (!ok) {
      return apiError("SUBSCRIPTION_NOT_FOUND", "Subscription not found", 404);
    }
    return apiSuccess({ unsubscribed: true });
  } catch {
    return apiError(
      "PUSH_UNSUBSCRIBE_FAILED",
      "Could not remove push subscription",
      500,
    );
  }
}
