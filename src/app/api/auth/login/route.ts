import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createRouteHandlerClient } from "@/lib/supabase/route-handler";
import { ensureAuthProfileForLogin } from "@/features/auth/ensure-auth-profile";
import {
  getRoleHomePath,
  isSafeNextPath,
  LOGIN_PATH,
} from "@/lib/auth/paths";
import { loginSchema } from "@/lib/validators/auth";
import type { UserRole } from "@/lib/validators/enums";

type LoginProfileRow = {
  role: UserRole;
  active: boolean;
};

function redirectToLogin(request: Request, error?: string) {
  const loginUrl = new URL(LOGIN_PATH, request.url);
  if (error) {
    loginUrl.searchParams.set("error", error);
  }
  return NextResponse.redirect(loginUrl);
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return redirectToLogin(request, "invalid");
  }

  const next = formData.get("next");
  const nextPath = typeof next === "string" ? next : null;

  const authResponse = NextResponse.next();
  const { supabase, applySessionCookiesTo } =
    await createRouteHandlerClient(authResponse);

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (signInError) {
    return redirectToLogin(request, "invalid_credentials");
  }

  // signInWithPassword does not always emit cookies until session is read.
  await supabase.auth.getSession();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirectToLogin(request, "invalid_credentials");
  }

  const { data: sessionProfile, error: sessionProfileError } = await supabase
    .from("profiles")
    .select("role, active")
    .eq("id", user.id)
    .maybeSingle();

  let loginProfile: LoginProfileRow | null = null;
  if (sessionProfile && !sessionProfileError) {
    const row = sessionProfile as LoginProfileRow;
    loginProfile = { role: row.role, active: row.active };
  }

  if (!loginProfile) {
    try {
      const adminClient = createAdminClient();
      loginProfile = await ensureAuthProfileForLogin(adminClient, user);
    } catch (error) {
      console.error("[login] admin profile lookup failed", {
        userId: user.id,
        email: user.email,
        sessionProfileError: sessionProfileError?.message,
        error: error instanceof Error ? error.message : error,
      });
    }
  }

  if (!loginProfile) {
    await supabase.auth.signOut();
    return redirectToLogin(request, "profile_missing");
  }

  if (!loginProfile.active) {
    await supabase.auth.signOut();
    return redirectToLogin(request, "inactive");
  }

  const destination = isSafeNextPath(nextPath)
    ? nextPath
    : getRoleHomePath(loginProfile.role);

  const redirectResponse = NextResponse.redirect(
    new URL(destination, request.url),
    303,
  );
  applySessionCookiesTo(redirectResponse);

  return redirectResponse;
}
