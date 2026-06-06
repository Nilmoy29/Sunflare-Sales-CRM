import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import {
  FORBIDDEN_PATH,
  getRoleHomePath,
  isSafeNextPath,
  LOGIN_PATH,
} from "@/lib/auth/paths";
import {
  isProtectedPath,
  isPublicPath,
  requiredRoleForPath,
} from "@/lib/auth/middleware-routes";
import type { UserRole } from "@/lib/validators/enums";

type ProfileRow = { role: UserRole; active: boolean };

function applySessionCookies(target: NextResponse, source: NextResponse) {
  source.cookies.getAll().forEach((cookie) => {
    target.cookies.set(cookie.name, cookie.value, cookie);
  });
  return target;
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return supabaseResponse;
  }

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(
        cookiesToSet: {
          name: string;
          value: string;
          options: CookieOptions;
        }[],
      ) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          supabaseResponse.cookies.set(name, value, options);
        });
      },
    },
  });

  const pathname = request.nextUrl.pathname;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const fetchProfile = async (userId: string): Promise<ProfileRow | null> => {
    const { data, error } = await supabase
      .from("profiles")
      .select("role, active")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      return null;
    }

    return (data as ProfileRow | null) ?? null;
  };

  let profile: ProfileRow | null = null;
  if (user) {
    profile = await fetchProfile(user.id);
    if (!profile) {
      profile = await fetchProfile(user.id);
    }
  }

  const redirectToLogin = (reason?: string) => {
    const loginUrl = new URL(LOGIN_PATH, request.url);
    if (isProtectedPath(pathname)) {
      loginUrl.searchParams.set("next", pathname);
    }
    if (reason) {
      loginUrl.searchParams.set("error", reason);
    }
    return applySessionCookies(
      NextResponse.redirect(loginUrl),
      supabaseResponse,
    );
  };

  if (user && profile && !profile.active) {
    await supabase.auth.signOut();
    return redirectToLogin("inactive");
  }

  if (!user && isProtectedPath(pathname)) {
    return redirectToLogin();
  }

  if (user && profile && pathname === LOGIN_PATH) {
    const next = request.nextUrl.searchParams.get("next");
    const destination = isSafeNextPath(next)
      ? next
      : getRoleHomePath(profile.role);
    return applySessionCookies(
      NextResponse.redirect(new URL(destination, request.url)),
      supabaseResponse,
    );
  }

  if (user && profile) {
    const required = requiredRoleForPath(pathname);
    if (required && profile.role !== required) {
      return applySessionCookies(
        NextResponse.redirect(new URL(FORBIDDEN_PATH, request.url)),
        supabaseResponse,
      );
    }
  }

  if (!user && !isPublicPath(pathname) && pathname.startsWith("/api/")) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Sign in required" } },
      { status: 401 },
    );
  }

  return supabaseResponse;
}
