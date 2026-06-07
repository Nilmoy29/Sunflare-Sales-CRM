"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { LOGIN_PATH } from "@/lib/auth/paths";
import { createClient } from "@/lib/supabase/server";
import {
  inviteAcceptSchema,
  passwordResetRequestSchema,
  passwordResetUpdateSchema,
  profileUpdateSchema,
} from "@/lib/validators/auth";

export type LoginFormState = {
  error?: string;
};

export type ProfileFormState = {
  error?: string;
  success?: string;
};

export type ResetRequestState = {
  error?: string;
  success?: string;
};

export type ResetUpdateState = {
  error?: string;
  success?: string;
};

export type InviteAcceptState = {
  error?: string;
  success?: string;
};

export async function requestPasswordResetAction(
  _prev: ResetRequestState,
  formData: FormData,
): Promise<ResetRequestState> {
  const parsed = passwordResetRequestSchema.safeParse({
    email: formData.get("email"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid email" };
  }

  const supabase = await createClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const redirectTo = `${appUrl}/auth/callback?next=/reset-password/update`;

  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo,
  });

  if (error) {
    return { error: "Unable to send reset email right now." };
  }

  return { success: "Reset link sent. Check your inbox." };
}

export async function updatePasswordAction(
  _prev: ResetUpdateState,
  formData: FormData,
): Promise<ResetUpdateState> {
  const parsed = passwordResetUpdateSchema.safeParse({
    password: formData.get("password"),
    confirm_password: formData.get("confirm_password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid password input" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Reset link is invalid or expired. Please request a new one." };
  }

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (error) {
    return { error: "Unable to update password. Please request a new reset link." };
  }

  await supabase.auth.signOut();
  return { success: "Password updated. Redirecting to login..." };
}

export async function acceptInviteAction(
  _prev: InviteAcceptState,
  formData: FormData,
): Promise<InviteAcceptState> {
  const cookieStore = await cookies();
  const inviteCookie = cookieStore.get("invite_onboarding")?.value;
  const phoneValue = formData.get("phone");
  const parsed = inviteAcceptSchema.safeParse({
    name: formData.get("name"),
    phone: typeof phoneValue === "string" ? phoneValue : undefined,
    password: formData.get("password"),
    confirm_password: formData.get("confirm_password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid invite details" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Invite link is invalid or expired. Ask admin for a new invite." };
  }
  if (!inviteCookie || inviteCookie !== user.id) {
    return { error: "Invite session missing or expired. Ask admin for a new invite." };
  }

  const { error: passwordError } = await supabase.auth.updateUser({
    password: parsed.data.password,
    data: { name: parsed.data.name, role: "rep" },
  });

  if (passwordError) {
    return { error: "Unable to complete onboarding. Please request a new invite." };
  }

  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      name: parsed.data.name,
      phone:
        parsed.data.phone && parsed.data.phone.length > 0
          ? parsed.data.phone
          : null,
    } as never)
    .eq("id", user.id);

  if (profileError) {
    return { error: "Password set, but profile setup failed. Contact your admin." };
  }

  cookieStore.delete("invite_onboarding");
  await supabase.auth.signOut();
  return { success: "Onboarding complete. Redirecting to login..." };
}

export async function updateProfileAction(
  _prev: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  const phoneValue = formData.get("phone");
  const parsed = profileUpdateSchema.safeParse({
    name: formData.get("name"),
    phone: typeof phoneValue === "string" ? phoneValue : undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid profile input" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Please sign in again." };
  }

  const updates = {
    name: parsed.data.name,
    phone:
      parsed.data.phone && parsed.data.phone.length > 0
        ? parsed.data.phone
        : null,
  };

  const { error } = await supabase
    .from("profiles")
    .update(updates as never)
    .eq("id", user.id);

  if (error) {
    return { error: "Unable to save profile right now." };
  }

  return { success: "Profile updated." };
}

export async function logoutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect(LOGIN_PATH);
}
