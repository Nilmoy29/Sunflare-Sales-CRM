import { apiError } from "@/lib/api/response";
import { requireRole, type AuthProfile } from "@/lib/auth/session";
import type { UserRole } from "@/lib/validators/enums";

export async function requireRoleForApi(
  allowed: UserRole[],
): Promise<AuthProfile | Response> {
  try {
    return await requireRole(allowed);
  } catch (e) {
    const message = e instanceof Error ? e.message : "FORBIDDEN";
    if (message === "UNAUTHENTICATED") {
      return apiError("UNAUTHORIZED", "Sign in required", 401);
    }
    if (message === "INACTIVE") {
      return apiError("INACTIVE", "Account deactivated", 403);
    }
    return apiError("FORBIDDEN", "Insufficient permissions", 403);
  }
}
