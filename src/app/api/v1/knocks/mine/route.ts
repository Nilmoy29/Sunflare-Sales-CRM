import { apiError, apiSuccess } from "@/lib/api/response";
import { requireRoleForApi } from "@/lib/auth/guards";
import { getMyKnocks } from "@/features/knocks/get-my-knocks";
import { parseKnockHistorySearchParams } from "@/lib/validators/knocks";

export async function GET(request: Request) {
  const auth = await requireRoleForApi(["rep"]);
  if (auth instanceof Response) {
    return auth;
  }

  const { searchParams } = new URL(request.url);
  const parsed = parseKnockHistorySearchParams(searchParams);

  if (!parsed.success) {
    return apiError(
      "VALIDATION_ERROR",
      parsed.error.issues[0]?.message ?? "Invalid query parameters",
      400,
    );
  }

  try {
    const result = await getMyKnocks(auth.id, parsed.data);
    return apiSuccess(result);
  } catch {
    return apiError(
      "KNOCK_HISTORY_FAILED",
      "Could not load knock history",
      500,
    );
  }
}
