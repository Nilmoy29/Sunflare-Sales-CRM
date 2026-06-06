import { apiError, apiSuccess } from "@/lib/api/response";
import { requireRoleForApi } from "@/lib/auth/guards";
import { updateLeadStage } from "@/features/pipeline/update-lead-stage";
import { updateLeadStageBodySchema } from "@/lib/validators/pipeline";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireRoleForApi(["admin", "rep"]);
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

  const parsed = updateLeadStageBodySchema.safeParse(body);
  if (!parsed.success) {
    return apiError(
      "VALIDATION_ERROR",
      parsed.error.issues[0]?.message ?? "Invalid request body",
      400,
    );
  }

  try {
    const lead = await updateLeadStage(
      id,
      parsed.data.stage,
      auth.id,
      parsed.data.lost_reason,
    );
    if (!lead) {
      return apiError("LEAD_NOT_FOUND", "Lead not found", 404);
    }
    return apiSuccess({ lead });
  } catch (e: unknown) {
    if (e instanceof Error && e.message === "LOST_REASON_REQUIRED") {
      return apiError(
        "VALIDATION_ERROR",
        "lost_reason is required when stage is lost",
        400,
      );
    }
    return apiError(
      "STAGE_UPDATE_FAILED",
      "Could not update lead stage",
      500,
    );
  }
}
