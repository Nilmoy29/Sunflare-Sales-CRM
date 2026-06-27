import { apiError, apiSuccess } from "@/lib/api/response";
import { requireRoleForApi } from "@/lib/auth/guards";
import { getRepProfile } from "@/features/admin/get-rep-profile";
import { getRepActivityTrend } from "@/features/dashboard/get-rep-activity-trend";
import { resolveDashboardDateRange } from "@/features/dashboard/resolve-dashboard-date-range";
import {
  parseRepActivityTrendSearchParams,
  repIdParamSchema,
} from "@/lib/validators/rep-deep-dive";

type RouteContext = {
  params: Promise<{ repId: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const auth = await requireRoleForApi(["admin"], request);
  if (auth instanceof Response) {
    return auth;
  }

  const { repId } = await context.params;
  const parsedRepId = repIdParamSchema.safeParse(repId);
  if (!parsedRepId.success) {
    return apiError("NOT_FOUND", "Rep not found", 404);
  }

  const rep = await getRepProfile(parsedRepId.data);
  if (!rep) {
    return apiError("NOT_FOUND", "Rep not found", 404);
  }

  const { searchParams } = new URL(request.url);
  const parsed = parseRepActivityTrendSearchParams(searchParams);

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
    const trend = await getRepActivityTrend(parsedRepId.data, from, to);
    return apiSuccess(trend);
  } catch {
    return apiError(
      "REP_ACTIVITY_TREND_FAILED",
      "Could not load rep activity trend",
      500,
    );
  }
}
