import { apiError, apiSuccess } from "@/lib/api/response";
import { requireRoleForApi } from "@/lib/auth/guards";
import { getMyCalls } from "@/features/calls/get-my-calls";
import { parseCallHistorySearchParams } from "@/lib/validators/call-logs";

export async function GET(request: Request) {
  const auth = await requireRoleForApi(["rep"], request);
  if (auth instanceof Response) {
    return auth;
  }

  const { searchParams } = new URL(request.url);
  const parsed = parseCallHistorySearchParams(searchParams);

  if (!parsed.success) {
    return apiError(
      "VALIDATION_ERROR",
      parsed.error.issues[0]?.message ?? "Invalid query parameters",
      400,
    );
  }

  try {
    const result = await getMyCalls(auth.id, parsed.data);
    return apiSuccess(result);
  } catch {
    return apiError(
      "CALL_HISTORY_FAILED",
      "Could not load call history",
      500,
    );
  }
}
