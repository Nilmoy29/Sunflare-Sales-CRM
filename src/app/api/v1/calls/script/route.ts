import { apiError, apiSuccess } from "@/lib/api/response";
import { requireRoleForApi } from "@/lib/auth/guards";
import { getCallScript } from "@/features/calls/get-call-script";

export async function GET() {
  const auth = await requireRoleForApi(["rep"]);
  if (auth instanceof Response) {
    return auth;
  }

  try {
    const script = await getCallScript();
    return apiSuccess(script);
  } catch {
    return apiError("CALL_SCRIPT_FAILED", "Could not load call script", 500);
  }
}
