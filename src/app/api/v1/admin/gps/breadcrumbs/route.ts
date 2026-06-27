import { apiError, apiSuccess } from "@/lib/api/response";
import { requireRoleForApi } from "@/lib/auth/guards";
import { getShiftBreadcrumbs } from "@/features/admin/get-shift-breadcrumbs";
import { parseShiftBreadcrumbsSearchParams } from "@/lib/validators/shift-breadcrumbs";

export async function GET(request: Request) {
  const auth = await requireRoleForApi(["admin"], request);
  if (auth instanceof Response) {
    return auth;
  }

  const { searchParams } = new URL(request.url);
  const parsed = parseShiftBreadcrumbsSearchParams(searchParams);

  if (!parsed.success) {
    return apiError(
      "VALIDATION_ERROR",
      parsed.error.issues[0]?.message ?? "Invalid query parameters",
      400,
    );
  }

  try {
    const breadcrumbs = await getShiftBreadcrumbs(
      parsed.data.rep_id,
      parsed.data.date,
    );
    return apiSuccess(breadcrumbs);
  } catch {
    return apiError(
      "BREADCRUMBS_FAILED",
      "Could not load shift breadcrumbs",
      500,
    );
  }
}
