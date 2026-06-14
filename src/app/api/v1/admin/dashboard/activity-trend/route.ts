import { apiError, apiSuccess } from "@/lib/api/response";
import { requireRoleForApi } from "@/lib/auth/guards";
import { getTeamActivityTrend } from "@/features/dashboard/get-team-activity-trend";
import { resolveDashboardDateRange } from "@/features/dashboard/resolve-dashboard-date-range";
import { parseTeamActivityTrendSearchParams } from "@/lib/validators/team-activity-trend";

export async function GET(request: Request) {
  const auth = await requireRoleForApi(["admin"]);
  if (auth instanceof Response) {
    return auth;
  }

  const { searchParams } = new URL(request.url);
  const parsed = parseTeamActivityTrendSearchParams(searchParams);

  if (!parsed.success) {
    return apiError(
      "VALIDATION_ERROR",
      parsed.error.issues[0]?.message ?? "Invalid query parameters",
      400,
    );
  }

  const weekRange = resolveDashboardDateRange("week");
  const from = parsed.data.from ?? weekRange.from;
  const to = parsed.data.to ?? weekRange.to;

  try {
    const trend = await getTeamActivityTrend(from, to);
    return apiSuccess(trend);
  } catch {
    return apiError(
      "TEAM_ACTIVITY_TREND_FAILED",
      "Could not load team activity trend",
      500,
    );
  }
}
