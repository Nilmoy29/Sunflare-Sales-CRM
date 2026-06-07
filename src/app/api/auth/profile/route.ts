import { NextResponse } from "next/server";
import { ensureAuthProfileForLogin } from "@/features/auth/ensure-auth-profile";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/lib/validators/enums";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Sign in required" } },
      { status: 401 },
    );
  }

  const { data: sessionProfile, error: sessionProfileError } = await supabase
    .from("profiles")
    .select("role, active")
    .eq("id", user.id)
    .maybeSingle();

  let profile: { role: UserRole; active: boolean } | null = null;
  if (sessionProfile && !sessionProfileError) {
    const row = sessionProfile as { role: UserRole; active: boolean };
    profile = { role: row.role, active: row.active };
  }

  if (!profile) {
    try {
      profile = await ensureAuthProfileForLogin(createAdminClient(), user);
    } catch (error) {
      console.error("[auth/profile] admin profile lookup failed", {
        userId: user.id,
        email: user.email,
        sessionProfileError: sessionProfileError?.message,
        error: error instanceof Error ? error.message : error,
      });
    }
  }

  if (!profile) {
    return NextResponse.json(
      {
        error: {
          code: "PROFILE_MISSING",
          message: "Account profile is missing",
        },
      },
      { status: 404 },
    );
  }

  return NextResponse.json(profile);
}
