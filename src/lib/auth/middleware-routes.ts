import {
  AUTH_CALLBACK_PATH,
  FORBIDDEN_PATH,
  LOGIN_PATH,
} from "@/lib/auth/paths";

const PUBLIC_EXACT = new Set([
  "/",
  "/api/v1/health",
  "/api/auth/login",
  "/api/auth/profile",
  FORBIDDEN_PATH,
]);

const PUBLIC_PREFIXES = [
  LOGIN_PATH,
  AUTH_CALLBACK_PATH,
  "/reset-password",
  "/invite",
];

export function isPublicPath(pathname: string): boolean {
  if (PUBLIC_EXACT.has(pathname)) {
    return true;
  }
  return PUBLIC_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

function matchesSegment(pathname: string, segment: "rep" | "admin"): boolean {
  return pathname === `/${segment}` || pathname.startsWith(`/${segment}/`);
}

export function isProtectedPath(pathname: string): boolean {
  return matchesSegment(pathname, "rep") || matchesSegment(pathname, "admin");
}

export function requiredRoleForPath(
  pathname: string,
): "admin" | "rep" | null {
  if (matchesSegment(pathname, "admin")) {
    return "admin";
  }
  if (matchesSegment(pathname, "rep")) {
    return "rep";
  }
  return null;
}
