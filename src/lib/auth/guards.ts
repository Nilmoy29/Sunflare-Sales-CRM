import { apiError } from "@/lib/api/response";
import {
  requireRoleForApiSession,
  type AuthProfile,
} from "@/lib/auth/session";
import type { UserRole } from "@/lib/validators/enums";

export async function requireRoleForApi(
  allowed: UserRole[],
  request?: Request,
): Promise<AuthProfile | Response> {
  const result = await requireRoleForApiSession(allowed, request);

  if (result === "UNAUTHENTICATED") {
    return apiError("UNAUTHORIZED", "Sign in required", 401);
  }
  if (result === "INACTIVE") {
    return apiError("INACTIVE", "Account deactivated", 403);
  }
  if (result === "FORBIDDEN") {
    return apiError("FORBIDDEN", "Insufficient permissions", 403);
  }

  return result;
}
