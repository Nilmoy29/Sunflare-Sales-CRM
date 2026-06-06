import { apiError, apiSuccess } from "@/lib/api/response";
import { requireRoleForApi } from "@/lib/auth/guards";
import { getMorningOverview } from "@/features/admin/get-morning-overview";

export async function GET() {
  const auth = await requireRoleForApi(["admin"]);
  if (auth instanceof Response) {
    return auth;
  }

  try {
    const overview = await getMorningOverview();
    return apiSuccess(overview);
  } catch {
    return apiError(
      "MORNING_OVERVIEW_FAILED",
      "Could not load morning overview",
      500,
    );
  }
}
