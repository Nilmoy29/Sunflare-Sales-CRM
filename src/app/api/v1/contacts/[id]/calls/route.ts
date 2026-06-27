import { apiError, apiSuccess } from "@/lib/api/response";
import { requireRoleForApi } from "@/lib/auth/guards";
import { getContactCallHistory } from "@/features/calls/get-contact-call-history";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const auth = await requireRoleForApi(["rep"], request);
  if (auth instanceof Response) {
    return auth;
  }

  const { id } = await context.params;

  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
    return apiError("VALIDATION_ERROR", "Invalid contact id", 400);
  }

  try {
    const history = await getContactCallHistory(id);
    return apiSuccess(history);
  } catch {
    return apiError(
      "CONTACT_CALL_HISTORY_FAILED",
      "Could not load call history",
      500,
    );
  }
}
