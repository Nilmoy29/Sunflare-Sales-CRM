import { apiError, apiSuccess } from "@/lib/api/response";
import { requireRoleForApi } from "@/lib/auth/guards";
import { getFunnelConversion } from "@/features/dashboard/get-funnel-conversion";
import { formatSydneyDateString } from "@/features/knocks/format-knock-date";
import { parseFunnelConversionSearchParams } from "@/lib/validators/funnel-conversion";

export async function GET(request: Request) {
  const auth = await requireRoleForApi(["admin"], request);
  if (auth instanceof Response) {
    return auth;
  }

  const { searchParams } = new URL(request.url);
  const parsed = parseFunnelConversionSearchParams(searchParams);

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
    const funnel = await getFunnelConversion(from, to);
    return apiSuccess(funnel);
  } catch {
    return apiError(
      "FUNNEL_FAILED",
      "Could not load funnel conversion",
      500,
    );
  }
}
