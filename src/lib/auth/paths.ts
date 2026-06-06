import type { UserRole } from "@/lib/validators/enums";

export const LOGIN_PATH = "/login";
export const FORBIDDEN_PATH = "/forbidden";
export const AUTH_CALLBACK_PATH = "/auth/callback";

export const ROLE_HOME: Record<UserRole, string> = {
  rep: "/rep/map",
  admin: "/admin/dashboard",
};

export function getRoleHomePath(role: UserRole): string {
  return ROLE_HOME[role];
}

/** Allow only internal app redirects after login */
export function isSafeNextPath(path: string | null | undefined): path is string {
  if (!path || !path.startsWith("/") || path.startsWith("//")) {
    return false;
  }
  return path.startsWith("/rep/") || path.startsWith("/admin/");
}
