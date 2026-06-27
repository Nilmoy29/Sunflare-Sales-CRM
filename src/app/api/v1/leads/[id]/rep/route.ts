import { apiError, apiSuccess } from "@/lib/api/response";
import { requireRoleForApi } from "@/lib/auth/guards";
import { reassignLead } from "@/features/pipeline/reassign-lead";
import { reassignLeadBodySchema } from "@/lib/validators/pipeline";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireRoleForApi(["admin"], request);
  if (auth instanceof Response) {
    return auth;
  }

  const { id } = await context.params;

  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
    return apiError("VALIDATION_ERROR", "Invalid lead id", 400);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("VALIDATION_ERROR", "Invalid JSON body", 400);
  }

  const parsed = reassignLeadBodySchema.safeParse(body);
  if (!parsed.success) {
    return apiError(
      "VALIDATION_ERROR",
      parsed.error.issues[0]?.message ?? "Invalid request body",
      400,
    );
  }

  try {
    const lead = await reassignLead(id, parsed.data.rep_id);
    if (!lead) {
      return apiError("LEAD_NOT_FOUND", "Lead not found", 404);
    }
    return apiSuccess({ lead });
  } catch (e: unknown) {
    if (e instanceof Error && e.message === "INVALID_REP") {
      return apiError("VALIDATION_ERROR", "Target must be an active rep", 400);
    }
    return apiError(
      "REASSIGN_FAILED",
      "Could not reassign lead",
      500,
    );
  }
}
