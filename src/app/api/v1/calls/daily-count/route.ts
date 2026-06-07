import { apiError, apiSuccess } from "@/lib/api/response";
import { requireRoleForApi } from "@/lib/auth/guards";
import { getRepDailyCallCount } from "@/features/calls/get-rep-daily-call-count";
import { formatSydneyDateString } from "@/features/knocks/format-knock-date";
import { parseRepDailyCallCountSearchParams } from "@/lib/validators/call-logs";

export async function GET(request: Request) {
  const auth = await requireRoleForApi(["rep"]);
  if (auth instanceof Response) {
    return auth;
  }

  const { searchParams } = new URL(request.url);
  const parsed = parseRepDailyCallCountSearchParams(searchParams);

  if (!parsed.success) {
    return apiError(
      "VALIDATION_ERROR",
      parsed.error.issues[0]?.message ?? "Invalid query parameters",
      400,
    );
  }

  const date =
    parsed.data.date ?? formatSydneyDateString(new Date());

  try {
    const result = await getRepDailyCallCount(date);
    return apiSuccess(result);
  } catch {
    return apiError(
      "DAILY_CALL_COUNT_FAILED",
      "Could not load daily call count",
      500,
    );
  }
}
