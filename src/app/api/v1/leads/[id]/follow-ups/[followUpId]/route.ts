import { apiError, apiSuccess } from "@/lib/api/response";
import { requireRoleForApi } from "@/lib/auth/guards";
import { updateLeadFollowUp } from "@/features/pipeline/update-lead-follow-up";
import { updateFollowUpBodySchema } from "@/lib/validators/follow-ups";

type RouteContext = {
  params: Promise<{ id: string; followUpId: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireRoleForApi(["admin", "rep"], request);
  if (auth instanceof Response) {
    return auth;
  }

  const { id, followUpId } = await context.params;

  if (
    !id ||
    !/^[0-9a-f-]{36}$/i.test(id) ||
    !followUpId ||
    !/^[0-9a-f-]{36}$/i.test(followUpId)
  ) {
    return apiError("VALIDATION_ERROR", "Invalid lead or follow-up id", 400);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("VALIDATION_ERROR", "Invalid JSON body", 400);
  }

  const parsed = updateFollowUpBodySchema.safeParse(body);
  if (!parsed.success) {
    return apiError(
      "VALIDATION_ERROR",
      parsed.error.issues[0]?.message ?? "Invalid request body",
      400,
    );
  }

  try {
    const followUp = await updateLeadFollowUp(id, followUpId, parsed.data);
    if (!followUp) {
      return apiError("FOLLOW_UP_NOT_FOUND", "Follow-up not found", 404);
    }
    return apiSuccess({ follow_up: followUp });
  } catch {
    return apiError(
      "FOLLOW_UP_UPDATE_FAILED",
      "Could not update follow-up",
      500,
    );
  }
}
