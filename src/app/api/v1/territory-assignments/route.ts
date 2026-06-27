import { apiError, apiSuccess } from "@/lib/api/response";
import { requireRoleForApi } from "@/lib/auth/guards";
import {
  createTerritoryAssignmentForAdmin,
  DuplicateTerritoryAssignmentError,
  InvalidTerritoryAssignmentError,
} from "@/features/territories/create-territory-assignment";
import { getTerritoryAssignmentsForAdmin } from "@/features/territories/get-territory-assignments";
import {
  createTerritoryAssignmentBodySchema,
  parseTerritoryAssignmentsListQuery,
} from "@/lib/validators/territory-assignments";

export async function GET(request: Request) {
  const auth = await requireRoleForApi(["admin"], request);
  if (auth instanceof Response) {
    return auth;
  }

  const { searchParams } = new URL(request.url);
  const parsed = parseTerritoryAssignmentsListQuery(searchParams);

  if (!parsed.success) {
    return apiError(
      "VALIDATION_ERROR",
      parsed.error.issues[0]?.message ?? "Invalid query parameters",
      400,
    );
  }

  try {
    const assignments = await getTerritoryAssignmentsForAdmin(parsed.data);
    return apiSuccess({ assignments });
  } catch {
    return apiError(
      "TERRITORY_ASSIGNMENTS_FETCH_FAILED",
      "Could not load territory assignments",
      500,
    );
  }
}

export async function POST(request: Request) {
  const auth = await requireRoleForApi(["admin"], request);
  if (auth instanceof Response) {
    return auth;
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return apiError("INVALID_JSON", "Request body must be JSON", 400);
  }

  const parsed = createTerritoryAssignmentBodySchema.safeParse(json);
  if (!parsed.success) {
    return apiError(
      "VALIDATION_ERROR",
      parsed.error.issues[0]?.message ?? "Invalid assignment payload",
      400,
      parsed.error.flatten(),
    );
  }

  try {
    const assignment = await createTerritoryAssignmentForAdmin(parsed.data);
    return apiSuccess({ assignment });
  } catch (e) {
    if (e instanceof DuplicateTerritoryAssignmentError) {
      return apiError("DUPLICATE_ASSIGNMENT", e.message, 409);
    }
    if (e instanceof InvalidTerritoryAssignmentError) {
      return apiError("VALIDATION_ERROR", e.message, 400);
    }
    return apiError(
      "TERRITORY_ASSIGNMENT_CREATE_FAILED",
      "Could not create territory assignment",
      500,
    );
  }
}
