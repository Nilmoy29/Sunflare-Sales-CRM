import { apiError, apiSuccess } from "@/lib/api/response";
import { requireRoleForApi } from "@/lib/auth/guards";
import { getActivityItemById } from "@/features/admin/get-recent-activity";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const auth = await requireRoleForApi(["admin"]);
  if (auth instanceof Response) {
    return auth;
  }

  const { id } = await context.params;

  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
    return apiError("VALIDATION_ERROR", "Invalid activity id", 400);
  }

  try {
    const item = await getActivityItemById(id);
    if (!item) {
      return apiError("NOT_FOUND", "Activity item not found", 404);
    }
    return apiSuccess({ item });
  } catch {
    return apiError(
      "ACTIVITY_ITEM_FAILED",
      "Could not load activity item",
      500,
    );
  }
}
