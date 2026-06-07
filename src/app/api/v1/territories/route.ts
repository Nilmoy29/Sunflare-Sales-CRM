import { apiError, apiSuccess } from "@/lib/api/response";
import { requireRoleForApi } from "@/lib/auth/guards";
import {
  createTerritoryForAdmin,
  InvalidTerritoryGeometryError,
} from "@/features/territories/create-territory";
import { getTerritoriesForAdmin } from "@/features/territories/get-territories";
import { createTerritoryBodySchema } from "@/lib/validators/territories";

export async function GET() {
  const auth = await requireRoleForApi(["admin"]);
  if (auth instanceof Response) {
    return auth;
  }

  try {
    const territories = await getTerritoriesForAdmin();
    return apiSuccess({ territories });
  } catch {
    return apiError(
      "TERRITORIES_FETCH_FAILED",
      "Could not load territories",
      500,
    );
  }
}

export async function POST(request: Request) {
  const auth = await requireRoleForApi(["admin"]);
  if (auth instanceof Response) {
    return auth;
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return apiError("INVALID_JSON", "Request body must be JSON", 400);
  }

  const parsed = createTerritoryBodySchema.safeParse(json);
  if (!parsed.success) {
    return apiError(
      "VALIDATION_ERROR",
      parsed.error.issues[0]?.message ?? "Invalid territory payload",
      400,
      parsed.error.flatten(),
    );
  }

  try {
    const territory = await createTerritoryForAdmin(parsed.data);
    return apiSuccess({ territory });
  } catch (e) {
    if (e instanceof InvalidTerritoryGeometryError) {
      return apiError("VALIDATION_ERROR", e.message, 400);
    }
    return apiError(
      "TERRITORY_CREATE_FAILED",
      "Could not create territory",
      500,
    );
  }
}
