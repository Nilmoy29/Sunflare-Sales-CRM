import { apiError, apiSuccess } from "@/lib/api/response";
import { requireRoleForApi } from "@/lib/auth/guards";
import { getDailyRepSummary } from "@/features/admin/get-daily-rep-summary";
import { formatSydneyDateString } from "@/features/knocks/format-knock-date";
import { parseDailyRepSummarySearchParams } from "@/lib/validators/daily-rep-summary";

export async function GET(request: Request) {
  const auth = await requireRoleForApi(["admin"]);
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

  const date =
    parsed.data.date ?? formatSydneyDateString(new Date());

  try {
    const summary = await getDailyRepSummary(date);
    return apiSuccess(summary);
  } catch {
    return apiError(
      "SUMMARY_FAILED",
      "Could not load daily rep summary",
      500,
    );
  }
}
