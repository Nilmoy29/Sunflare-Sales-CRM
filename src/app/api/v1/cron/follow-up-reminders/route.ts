import { apiError, apiSuccess } from "@/lib/api/response";
import { sendFollowUpReminders } from "@/features/push/send-follow-up-reminders";

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return false;
  }

  const authHeader = request.headers.get("authorization");
  if (authHeader === `Bearer ${secret}`) {
    return true;
  }

  const cronHeader = request.headers.get("x-cron-secret");
  return cronHeader === secret;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return apiError("UNAUTHORIZED", "Invalid cron secret", 401);
  }

  try {
    const result = await sendFollowUpReminders();
    return apiSuccess(result);
  } catch {
    return apiError(
      "FOLLOW_UP_REMINDERS_FAILED",
      "Could not send follow-up reminders",
      500,
    );
  }
}
