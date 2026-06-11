import { apiError, apiSuccess } from "@/lib/api/response";
import { requireRoleForApi } from "@/lib/auth/guards";
import {
  deleteTerritoryForAdmin,
  TerritoryNotFoundError as DeleteTerritoryNotFoundError,
} from "@/features/territories/delete-territory";
import {
  InvalidTerritoryGeometryError,
  TerritoryNotFoundError,
  updateTerritoryForAdmin,
} from "@/features/territories/update-territory";
import { updateTerritoryBodySchema } from "@/lib/validators/territories";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireRoleForApi(["admin"]);
  if (auth instanceof Response) {
    return auth;
  }

  const { id } = await context.params;

  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
    return apiError("VALIDATION_ERROR", "Invalid territory id", 400);
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return apiError("INVALID_JSON", "Request body must be JSON", 400);
  }

  const parsed = updateTerritoryBodySchema.safeParse(json);
  if (!parsed.success) {
    return apiError(
      "VALIDATION_ERROR",
      parsed.error.issues[0]?.message ?? "Invalid territory payload",
      400,
      parsed.error.flatten(),
    );
  }

  try {
    const territory = await updateTerritoryForAdmin(id, parsed.data);
    return apiSuccess({ territory });
  } catch (e) {
    if (e instanceof TerritoryNotFoundError) {
      return apiError("TERRITORY_NOT_FOUND", e.message, 404);
    }
    if (e instanceof InvalidTerritoryGeometryError) {
      return apiError("VALIDATION_ERROR", e.message, 400);
    }
    return apiError(
      "TERRITORY_UPDATE_FAILED",
      "Could not update territory",
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
    return apiError("VALIDATION_ERROR", "Invalid territory id", 400);
  }

  try {
    await deleteTerritoryForAdmin(id);
    return apiSuccess({ ok: true });
  } catch (e) {
    if (e instanceof DeleteTerritoryNotFoundError) {
      return apiError("TERRITORY_NOT_FOUND", e.message, 404);
    }
    return apiError(
      "TERRITORY_DELETE_FAILED",
      "Could not delete territory",
      500,
    );
  }
}
