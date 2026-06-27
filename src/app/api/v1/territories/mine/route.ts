import { apiError, apiSuccess } from "@/lib/api/response";
import { requireRoleForApi } from "@/lib/auth/guards";
import { getRepTerritoriesForDate } from "@/features/territories/get-rep-territories-for-date";
import { parseRepTerritoriesForDateQuery } from "@/lib/validators/territories";

export async function GET(request: Request) {
  const auth = await requireRoleForApi(["rep"], request);
  if (auth instanceof Response) {
    return auth;
  }

  const { searchParams } = new URL(request.url);
  const parsed = parseRepTerritoriesForDateQuery(searchParams);

  if (!parsed.success) {
    return apiError(
      "VALIDATION_ERROR",
      parsed.error.issues[0]?.message ?? "Invalid query parameters",
      400,
    );
  }

  try {
    const territories = await getRepTerritoriesForDate(parsed.data);
    return apiSuccess({ territories });
  } catch {
    return apiError(
      "REP_TERRITORIES_FETCH_FAILED",
      "Could not load assigned territories",
      500,
    );
  }
}
