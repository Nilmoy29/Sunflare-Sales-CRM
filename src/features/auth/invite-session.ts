import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export type InviteSessionStatus =
  | { state: "valid"; userId: string }
  | { state: "missing" }
  | { state: "expired" };

/** Validates the short-lived invite onboarding cookie against the current auth session. */
export async function getInviteSessionStatus(): Promise<InviteSessionStatus> {
  const cookieStore = await cookies();
  const inviteCookie = cookieStore.get("invite_onboarding")?.value;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { state: "missing" };
  }

  if (!inviteCookie || inviteCookie !== user.id) {
    return { state: "expired" };
  }

  return { state: "valid", userId: user.id };
}
