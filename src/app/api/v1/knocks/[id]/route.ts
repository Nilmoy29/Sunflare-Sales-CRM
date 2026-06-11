import { apiError, apiSuccess } from "@/lib/api/response";
import { requireRoleForApi } from "@/lib/auth/guards";
import {
  KnockDeleteConflictError,
  KnockNotFoundError,
  deleteKnockForRep,
} from "@/features/knocks/delete-knock";
import {
  KnockUpdateConflictError,
  updateKnockForRep,
} from "@/features/knocks/update-knock";
import { updateKnockBodySchema } from "@/lib/validators/knocks";

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
    return apiError("VALIDATION_ERROR", "Invalid knock id", 400);
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return apiError("INVALID_JSON", "Request body must be JSON", 400);
  }

  const parsed = updateKnockBodySchema.safeParse(json);
  if (!parsed.success) {
    return apiError(
      "VALIDATION_ERROR",
      parsed.error.issues[0]?.message ?? "Invalid knock payload",
      400,
      parsed.error.flatten(),
    );
  }

  try {
    const knock = await updateKnockForRep(id, parsed.data);
    return apiSuccess({ knock });
  } catch (e) {
    if (e instanceof KnockNotFoundError) {
      return apiError("KNOCK_NOT_FOUND", e.message, 404);
    }
    if (e instanceof KnockUpdateConflictError) {
      return apiError("KNOCK_UPDATE_CONFLICT", e.message, 409);
    }
    return apiError("KNOCK_UPDATE_FAILED", "Could not update knock", 500);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const auth = await requireRoleForApi(["rep"]);
  if (auth instanceof Response) {
    return auth;
  }

  const { id } = await context.params;
  if (!id || !isValidUuid(id)) {
    return apiError("VALIDATION_ERROR", "Invalid knock id", 400);
  }

  try {
    await deleteKnockForRep(id);
    return apiSuccess({ ok: true });
  } catch (e) {
    if (e instanceof KnockNotFoundError) {
      return apiError("KNOCK_NOT_FOUND", e.message, 404);
    }
    if (e instanceof KnockDeleteConflictError) {
      return apiError("KNOCK_DELETE_CONFLICT", e.message, 409);
    }
    return apiError("KNOCK_DELETE_FAILED", "Could not delete knock", 500);
  }
}
