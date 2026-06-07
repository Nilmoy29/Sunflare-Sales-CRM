import { apiError, apiSuccess } from "@/lib/api/response";
import { requireRoleForApi } from "@/lib/auth/guards";
import { getGeographicYield } from "@/features/dashboard/get-geographic-yield";
import { formatSydneyDateString } from "@/features/knocks/format-knock-date";
import { parseGeographicYieldSearchParams } from "@/lib/validators/geographic-yield";

export async function GET(request: Request) {
  const auth = await requireRoleForApi(["admin"]);
  if (auth instanceof Response) {
    return auth;
  }

  const { searchParams } = new URL(request.url);
  const parsed = parseGeographicYieldSearchParams(searchParams);

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
    const yieldData = await getGeographicYield(from, to);
    return apiSuccess(yieldData);
  } catch {
    return apiError(
      "GEOGRAPHIC_YIELD_FAILED",
      "Could not load geographic yield",
      500,
    );
  }
}
