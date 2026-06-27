import { redirect } from "next/navigation";
import {
  createClient,
  createClientFromRequest,
  parseBearerToken,
  type AppSupabaseClient,
} from "@/lib/supabase/server";
import { FORBIDDEN_PATH, LOGIN_PATH } from "@/lib/auth/paths";
import type { Profile } from "@/types/database";
import type { UserRole } from "@/lib/validators/enums";
import { headers } from "next/headers";

export type AuthProfile = Pick<
  Profile,
  "id" | "role" | "active" | "name" | "phone" | "territory_id" | "start_date"
>;

async function fetchProfileForUser(
  supabase: AppSupabaseClient,
  userId: string,
): Promise<AuthProfile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, role, active, name, phone, territory_id, start_date")
    .eq("id", userId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as AuthProfile;
}

async function loadAuthProfileFromSupabase(
  supabase: AppSupabaseClient,
  bearerToken: string | null,
): Promise<AuthProfile | null> {
  const { data: { user }, error } = bearerToken
    ? await supabase.auth.getUser(bearerToken)
    : await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  return fetchProfileForUser(supabase, user.id);
}

async function loadAuthProfile(request?: Request): Promise<AuthProfile | null> {
  if (request) {
    const bearerToken = parseBearerToken(request.headers.get("authorization"));
    const supabase = await createClientFromRequest(request);
    return loadAuthProfileFromSupabase(supabase, bearerToken);
  }

  const headerStore = await headers();
  const bearerToken = parseBearerToken(headerStore.get("authorization"));
  const supabase = await createClient();
  return loadAuthProfileFromSupabase(supabase, bearerToken);
}

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
  return loadAuthProfile();
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

export type ApiAuthFailure = "UNAUTHENTICATED" | "INACTIVE" | "FORBIDDEN";

export async function requireRoleForApiSession(
  allowed: UserRole[],
  request?: Request,
): Promise<AuthProfile | ApiAuthFailure> {
  const profile = await loadAuthProfile(request);
  if (!profile) {
    return "UNAUTHENTICATED";
  }
  if (!profile.active) {
    return "INACTIVE";
  }
  if (!allowed.includes(profile.role)) {
    return "FORBIDDEN";
  }
  return profile;
}
