import { apiError, apiSuccess } from "@/lib/api/response";
import { requireRoleForApi } from "@/lib/auth/guards";
import { getAdminKnocksInBbox } from "@/features/knocks/get-admin-knocks-in-bbox";
import { parseAdminKnocksSearchParams } from "@/lib/validators/knocks";

export async function GET(request: Request) {
  const auth = await requireRoleForApi(["admin"]);
  if (auth instanceof Response) {
    return auth;
  }

  const { searchParams } = new URL(request.url);
  const parsed = parseAdminKnocksSearchParams(searchParams);

  if (!parsed.success) {
    return apiError("VALIDATION_ERROR", parsed.error, 400);
  }

  try {
    const result = await getAdminKnocksInBbox(parsed.data);
    return apiSuccess(result);
  } catch {
    return apiError(
      "ADMIN_KNOCKS_FETCH_FAILED",
      "Could not load knock pins",
      500,
    );
  }
}
