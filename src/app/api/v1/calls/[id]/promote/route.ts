import { apiError, apiSuccess } from "@/lib/api/response";
import { requireRoleForApi } from "@/lib/auth/guards";
import {
  CallNotFoundError,
  CallNotPromotableError,
  promoteCallToLead,
} from "@/features/calls/promote-call-to-lead";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_request: Request, context: RouteContext) {
  const auth = await requireRoleForApi(["rep"]);
  if (auth instanceof Response) {
    return auth;
  }

  const { id } = await context.params;

  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
    return apiError("VALIDATION_ERROR", "Invalid call log id", 400);
  }

  try {
    const result = await promoteCallToLead(id);
    return apiSuccess(result);
  } catch (e) {
    if (e instanceof CallNotFoundError) {
      return apiError("CALL_NOT_FOUND", "Call log not found", 404);
    }
    if (e instanceof CallNotPromotableError) {
      return apiError(
        "CALL_NOT_PROMOTABLE",
        "Call outcome is not promotable",
        400,
      );
    }
    return apiError("CALL_PROMOTE_FAILED", "Could not promote call", 500);
  }
}
