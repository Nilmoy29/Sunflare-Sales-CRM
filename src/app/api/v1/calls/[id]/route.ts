import { apiError, apiSuccess } from "@/lib/api/response";
import { requireRoleForApi } from "@/lib/auth/guards";
import {
  CallLogDeleteConflictError,
  CallLogNotFoundError,
  deleteCallLogForRep,
} from "@/features/calls/delete-call-log";
import {
  CallLogUpdateConflictError,
  updateCallLogForRep,
} from "@/features/calls/update-call-log";
import { updateCallBodySchema } from "@/lib/validators/call-logs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function isValidUuid(value: string): boolean {
  return /^[0-9a-f-]{36}$/i.test(value);
}

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireRoleForApi(["rep"]);
  if (auth instanceof Response) {
    return auth;
  }

  const { id } = await context.params;
  if (!id || !isValidUuid(id)) {
    return apiError("VALIDATION_ERROR", "Invalid call id", 400);
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return apiError("INVALID_JSON", "Request body must be JSON", 400);
  }

  const parsed = updateCallBodySchema.safeParse(json);
  if (!parsed.success) {
    return apiError(
      "VALIDATION_ERROR",
      parsed.error.issues[0]?.message ?? "Invalid call payload",
      400,
      parsed.error.flatten(),
    );
  }

  try {
    const call = await updateCallLogForRep(id, parsed.data);
    return apiSuccess({ call });
  } catch (e) {
    if (e instanceof CallLogNotFoundError) {
      return apiError("CALL_NOT_FOUND", e.message, 404);
    }
    if (e instanceof CallLogUpdateConflictError) {
      return apiError("CALL_UPDATE_CONFLICT", e.message, 409);
    }
    return apiError("CALL_UPDATE_FAILED", "Could not update call", 500);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const auth = await requireRoleForApi(["rep"]);
  if (auth instanceof Response) {
    return auth;
  }

  const { id } = await context.params;
  if (!id || !isValidUuid(id)) {
    return apiError("VALIDATION_ERROR", "Invalid call id", 400);
  }

  try {
    await deleteCallLogForRep(id);
    return apiSuccess({ ok: true });
  } catch (e) {
    if (e instanceof CallLogNotFoundError) {
      return apiError("CALL_NOT_FOUND", e.message, 404);
    }
    if (e instanceof CallLogDeleteConflictError) {
      return apiError("CALL_DELETE_CONFLICT", e.message, 409);
    }
    return apiError("CALL_DELETE_FAILED", "Could not delete call", 500);
  }
}
