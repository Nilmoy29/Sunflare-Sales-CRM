import type { User } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase.generated";
import type { UserRole } from "@/lib/validators/enums";

type AuthLoginProfile = {
  role: UserRole;
  active: boolean;
};

function resolveProfileName(user: User): string {
  const metaName = user.user_metadata?.name;
  if (typeof metaName === "string" && metaName.trim().length > 0) {
    return metaName.trim();
  }
  const emailLocal = user.email?.split("@")[0]?.trim();
  return emailLocal && emailLocal.length > 0 ? emailLocal : "User";
}

function resolveProfileRole(user: User): UserRole {
  const metaRole = user.user_metadata?.role;
  return metaRole === "admin" ? "admin" : "rep";
}

/**
 * Returns the user's profile for login routing. If the auth user was created
 * outside the `handle_new_user` trigger (e.g. Supabase Dashboard), backfills
 * a minimal profiles row.
 */
export async function ensureAuthProfileForLogin(
  adminClient: SupabaseClient<Database>,
  user: User,
): Promise<AuthLoginProfile | null> {
  const { data: existing, error: existingError } = await adminClient
    .from("profiles")
    .select("role, active")
    .eq("id", user.id)
    .maybeSingle();

  if (existingError) {
    return null;
  }

  if (existing) {
    return existing as AuthLoginProfile;
  }

  const { data: created, error: insertError } = await adminClient
    .from("profiles")
    .insert({
      id: user.id,
      name: resolveProfileName(user),
      role: resolveProfileRole(user),
      active: true,
    })
    .select("role, active")
    .single();

  if (insertError || !created) {
    return null;
  }

  return created as AuthLoginProfile;
}
