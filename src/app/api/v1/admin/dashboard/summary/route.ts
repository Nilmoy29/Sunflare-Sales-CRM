import { apiError, apiSuccess } from "@/lib/api/response";
import { requireRoleForApi } from "@/lib/auth/guards";
import { getDailyRepSummary } from "@/features/admin/get-daily-rep-summary";
import { formatSydneyDateString } from "@/features/knocks/format-knock-date";
import {
  parseDailyRepSummarySearchParams,
  resolveDailyRepSummaryRange,
} from "@/lib/validators/daily-rep-summary";

export async function GET(request: Request) {
  const auth = await requireRoleForApi(["admin"], request);
  if (auth instanceof Response) {
    return auth;
  }

  const { searchParams } = new URL(request.url);
  const parsed = parseDailyRepSummarySearchParams(searchParams);

  if (!parsed.success) {
    return apiError(
      "VALIDATION_ERROR",
      parsed.error.issues[0]?.message ?? "Invalid query parameters",
      400,
    );
  }

  const today = formatSydneyDateString(new Date());
  const range = parsed.data.date || (parsed.data.from && parsed.data.to)
    ? resolveDailyRepSummaryRange(parsed.data)
    : { from: today, to: today };

  try {
    const summary = await getDailyRepSummary(range.from, range.to);
    return apiSuccess(summary);
  } catch {
    return apiError(
      "SUMMARY_FAILED",
      "Could not load daily rep summary",
      500,
    );
  }
}
