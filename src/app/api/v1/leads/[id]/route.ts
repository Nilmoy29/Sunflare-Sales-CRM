import { apiError, apiSuccess } from "@/lib/api/response";
import { requireRoleForApi } from "@/lib/auth/guards";
import { deleteLead } from "@/features/pipeline/delete-lead";
import { getLeadDetail } from "@/features/pipeline/get-lead-detail";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const auth = await requireRoleForApi(["admin", "rep"]);
  if (auth instanceof Response) {
    return auth;
  }

  const { id } = await context.params;

  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
    return apiError("VALIDATION_ERROR", "Invalid lead id", 400);
  }

  try {
    const detail = await getLeadDetail(id);
    if (!detail) {
      return apiError("LEAD_NOT_FOUND", "Lead not found", 404);
    }
    return apiSuccess(detail);
  } catch {
    return apiError(
      "LEAD_DETAIL_FAILED",
      "Could not load lead detail",
      500,
    );
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const auth = await requireRoleForApi(["admin"]);
  if (auth instanceof Response) {
    return auth;
  }

  const { id } = await context.params;

  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
    return apiError("VALIDATION_ERROR", "Invalid lead id", 400);
  }

  try {
    const deleted = await deleteLead(id);
    if (!deleted) {
      return apiError("LEAD_NOT_FOUND", "Lead not found", 404);
    }
    return apiSuccess({ deleted: true });
  } catch {
    return apiError("LEAD_DELETE_FAILED", "Could not delete lead", 500);
  }
}
