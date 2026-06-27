import { apiError, apiSuccess } from "@/lib/api/response";
import { requireRoleForApi } from "@/lib/auth/guards";
import {
  ContactNotFoundError,
  createCallLogForRep,
} from "@/features/calls/create-call-log";
import { createCallBodySchema } from "@/lib/validators/call-logs";

export async function POST(request: Request) {
  const auth = await requireRoleForApi(["rep"], request);
  if (auth instanceof Response) {
    return auth;
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return apiError("INVALID_JSON", "Request body must be JSON", 400);
  }

  const parsed = createCallBodySchema.safeParse(json);
  if (!parsed.success) {
    return apiError(
      "VALIDATION_ERROR",
      parsed.error.issues[0]?.message ?? "Invalid call payload",
      400,
      parsed.error.flatten(),
    );
  }

  try {
    const call = await createCallLogForRep(parsed.data);
    return apiSuccess({ call });
  } catch (e) {
    if (e instanceof ContactNotFoundError) {
      return apiError("CONTACT_NOT_FOUND", "Contact not found", 404);
    }
    return apiError("CALL_CREATE_FAILED", "Could not log call", 500);
  }
}
