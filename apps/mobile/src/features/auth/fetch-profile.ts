import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabase } from "@/lib/supabase";
import type { MobileAuthProfile } from "@/features/auth/types";

export async function fetchAuthProfile(
  client: SupabaseClient = getSupabase(),
): Promise<MobileAuthProfile | null> {
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) {
    return null;
  }

  const { data, error } = await client
    .from("profiles")
    .select("id, name, role, active, phone")
    .eq("id", user.id)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as MobileAuthProfile;
}
