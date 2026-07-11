"use server";

import { SIGNUP_PATH } from "@/lib/auth/paths";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/auth/session";
import {
  createRepSchema,
  inviteRepSchema,
  resetPasswordSchema,
  setActiveSchema,
} from "@/lib/validators/admin";

export type TeamActionState = {
  error?: string;
  success?: string;
};

function normalizeOptionalPhone(phone: string | undefined) {
  if (!phone) return null;
  const trimmed = phone.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeOptionalDate(date: string | undefined) {
  if (!date) return null;
  const trimmed = date.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function createRepAction(
  _prev: TeamActionState,
  formData: FormData,
): Promise<TeamActionState> {
  const adminProfile = await requireRole(["admin"]);

  const parsed = createRepSchema.safeParse({
    email: formData.get("email"),
    name: formData.get("name"),
    phone: typeof formData.get("phone") === "string" ? formData.get("phone") : undefined,
    start_date:
      typeof formData.get("start_date") === "string"
        ? formData.get("start_date")
        : undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid form input" };
  }

  const adminClient = createAdminClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const { data, error } = await adminClient.auth.admin.inviteUserByEmail(
    parsed.data.email,
    {
      redirectTo: `${appUrl}/auth/callback?next=${SIGNUP_PATH}`,
      data: {
        name: parsed.data.name,
        role: "rep",
        phone: normalizeOptionalPhone(parsed.data.phone),
        start_date: normalizeOptionalDate(parsed.data.start_date),
      },
    },
  );

  if (error || !data.user) {
    return { error: error?.message ?? "Unable to create rep user" };
  }

  const supabase = await createClient();
  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      name: parsed.data.name,
      phone: normalizeOptionalPhone(parsed.data.phone),
      start_date: normalizeOptionalDate(parsed.data.start_date),
      role: "rep",
      active: true,
    } as never)
    .eq("id", data.user.id);

  if (profileError) {
    return { error: "Auth user created but profile update failed." };
  }

  console.info("admin_create_rep", {
    actor: adminProfile.id,
    target: data.user.id,
    email: parsed.data.email,
  });

  return { success: `Invite sent to ${parsed.data.email} to complete account setup` };
}

export async function inviteRepAction(
  _prev: TeamActionState,
  formData: FormData,
): Promise<TeamActionState> {
  const adminProfile = await requireRole(["admin"]);

  const parsed = inviteRepSchema.safeParse({
    email: formData.get("email"),
    name: formData.get("name"),
    phone: typeof formData.get("phone") === "string" ? formData.get("phone") : undefined,
    start_date:
      typeof formData.get("start_date") === "string"
        ? formData.get("start_date")
        : undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid invite input" };
  }

  const adminClient = createAdminClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const { data, error } = await adminClient.auth.admin.inviteUserByEmail(
    parsed.data.email,
    {
      redirectTo: `${appUrl}/auth/callback?next=${SIGNUP_PATH}`,
      data: {
        name: parsed.data.name,
        role: "rep",
        phone: normalizeOptionalPhone(parsed.data.phone),
        start_date: normalizeOptionalDate(parsed.data.start_date),
      },
    },
  );

  if (error || !data.user) {
    return { error: error?.message ?? "Unable to send invite." };
  }

  const supabase = await createClient();
  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      name: parsed.data.name,
      phone: normalizeOptionalPhone(parsed.data.phone),
      start_date: normalizeOptionalDate(parsed.data.start_date),
      role: "rep",
      active: true,
    } as never)
    .eq("id", data.user.id);

  if (profileError) {
    return { error: "Invite sent, but failed to prepare profile details." };
  }

  console.info("admin_invite_rep", {
    actor: adminProfile.id,
    target: data.user.id,
    email: parsed.data.email,
  });

  return { success: `Invite sent to ${parsed.data.email}` };
}

export async function setRepActiveAction(
  _prev: TeamActionState,
  formData: FormData,
): Promise<TeamActionState> {
  const adminProfile = await requireRole(["admin"]);

  const parsed = setActiveSchema.safeParse({
    user_id: formData.get("user_id"),
    active: formData.get("active") === "true",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid request" };
  }

  if (parsed.data.user_id === adminProfile.id && parsed.data.active === false) {
    return { error: "You cannot deactivate your own admin account." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ active: parsed.data.active } as never)
    .eq("id", parsed.data.user_id)
    .eq("role", "rep");

  if (error) {
    return { error: "Unable to update rep status." };
  }

  console.info("admin_set_rep_active", {
    actor: adminProfile.id,
    target: parsed.data.user_id,
    active: parsed.data.active,
  });

  return { success: parsed.data.active ? "Rep reactivated." : "Rep deactivated." };
}

export async function sendResetEmailAction(
  _prev: TeamActionState,
  formData: FormData,
): Promise<TeamActionState> {
  const adminProfile = await requireRole(["admin"]);

  const parsed = resetPasswordSchema.safeParse({
    user_id: formData.get("user_id"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid request" };
  }

  const adminClient = createAdminClient();
  const { data: userData, error: userError } = await adminClient.auth.admin.getUserById(
    parsed.data.user_id,
  );

  if (userError || !userData.user?.email) {
    return { error: "Unable to locate target user email." };
  }

  const supabase = await createClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const { error } = await supabase.auth.resetPasswordForEmail(userData.user.email, {
    redirectTo: `${appUrl}/login`,
  });

  if (error) {
    return { error: "Unable to send reset email." };
  }

  console.info("admin_send_reset_email", {
    actor: adminProfile.id,
    target: parsed.data.user_id,
  });

  return { success: `Password reset email sent to ${userData.user.email}` };
}
