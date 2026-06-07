import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { FORBIDDEN_PATH, LOGIN_PATH } from "@/lib/auth/paths";
import type { Profile } from "@/types/database";
import type { UserRole } from "@/lib/validators/enums";

export type AuthProfile = Pick<
  Profile,
  "id" | "role" | "active" | "name" | "phone" | "territory_id" | "start_date"
>;

export async function getAuthUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) {
    return null;
  }
  return user;
}

export async function getAuthProfile(): Promise<AuthProfile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return null;
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id, role, active, name, phone, territory_id, start_date")
    .eq("id", user.id)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as AuthProfile;
}

export async function requireAuthProfile(): Promise<AuthProfile> {
  const profile = await getAuthProfile();
  if (!profile) {
    redirect(LOGIN_PATH);
  }
  if (!profile.active) {
    redirect(`${LOGIN_PATH}?error=inactive`);
  }
  return profile;
}

export async function requireRole(allowed: UserRole[]): Promise<AuthProfile> {
  const profile = await requireAuthProfile();
  if (!allowed.includes(profile.role)) {
    redirect(FORBIDDEN_PATH);
  }
  return profile;
}
