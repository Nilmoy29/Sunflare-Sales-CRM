import { apiError, apiSuccess } from "@/lib/api/response";
import { requireRoleForApi } from "@/lib/auth/guards";
import { getCallScript } from "@/features/calls/get-call-script";
import {
  CallScriptUpdateError,
  updateCallScript,
} from "@/features/calls/update-call-script";
import { updateCallScriptBodySchema } from "@/lib/validators/call-script";

export async function GET() {
  const auth = await requireRoleForApi(["admin"]);
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

export async function PATCH(request: Request) {
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

  const parsed = updateCallScriptBodySchema.safeParse(json);
  if (!parsed.success) {
    return apiError(
      "VALIDATION_ERROR",
      parsed.error.issues[0]?.message ?? "Invalid call script payload",
      400,
      parsed.error.flatten(),
    );
  }

  try {
    const script = await updateCallScript(parsed.data.body, auth.id);
    return apiSuccess(script);
  } catch (e) {
    if (e instanceof CallScriptUpdateError) {
      return apiError("CALL_SCRIPT_UPDATE_FAILED", e.message, 500);
    }
    return apiError("CALL_SCRIPT_UPDATE_FAILED", "Could not update call script", 500);
  }
}
