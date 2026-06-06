import { apiError, apiSuccess } from "@/lib/api/response";
import { requireRoleForApi } from "@/lib/auth/guards";
import { getLowActivityReps } from "@/features/admin/get-low-activity-reps";
import { parseLowActivitySearchParams } from "@/lib/validators/dashboard-coaching";

export async function GET(request: Request) {
  const auth = await requireRoleForApi(["admin"]);
  if (auth instanceof Response) {
    return auth;
  }

  const { searchParams } = new URL(request.url);
  const parsed = parseLowActivitySearchParams(searchParams);

  if (!parsed.success) {
    return apiError(
      "VALIDATION_ERROR",
      parsed.error.issues[0]?.message ?? "Invalid query parameters",
      400,
    );
  }

  try {
    const result = await getLowActivityReps(parsed.data.window_minutes);
    return apiSuccess(result);
  } catch {
    return apiError(
      "LOW_ACTIVITY_FAILED",
      "Could not load low-activity reps",
      500,
    );
  }
}
