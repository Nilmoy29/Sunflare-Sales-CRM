import { apiError, apiSuccess } from "@/lib/api/response";
import { requireRoleForApi } from "@/lib/auth/guards";
import { getRecentActivity } from "@/features/admin/get-recent-activity";
import { formatSydneyDateString } from "@/features/knocks/format-knock-date";
import { parseActivityFeedSearchParams } from "@/lib/validators/activity-feed";

export async function GET(request: Request) {
  const auth = await requireRoleForApi(["admin"], request);
  if (auth instanceof Response) {
    return auth;
  }

  const { searchParams } = new URL(request.url);
  const parsed = parseActivityFeedSearchParams(searchParams);

  if (!parsed.success) {
    return apiError(
      "VALIDATION_ERROR",
      parsed.error.issues[0]?.message ?? "Invalid query parameters",
      400,
    );
  }

  const today = formatSydneyDateString(new Date());
  const from = parsed.data.from ?? today;
  const to = parsed.data.to ?? today;

  try {
    const items = await getRecentActivity(parsed.data.limit, from, to);
    return apiSuccess({ items });
  } catch {
    return apiError(
      "ACTIVITY_FEED_FAILED",
      "Could not load activity feed",
      500,
    );
  }
}
