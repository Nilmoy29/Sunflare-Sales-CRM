import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Exchange auth code for session (SSR cookie flow). */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const next = searchParams.get("next") ?? "/";
  const recoveryDestination = "/reset-password/update";
  const inviteDestination = "/invite/accept";

  const supabase = await createClient();
  const withInviteCookie = async (response: NextResponse) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return response;
    }

    response.cookies.set("invite_onboarding", user.id, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 15,
    });
    return response;
  };

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const response = NextResponse.redirect(`${origin}${next}`);
      return next.startsWith("/invite") ? withInviteCookie(response) : response;
    }
  }

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as
        | "signup"
        | "invite"
        | "magiclink"
        | "recovery"
        | "email_change"
        | "email",
    });
    if (!error) {
      const destination = next.startsWith("/reset-password")
        ? next
        : next.startsWith("/invite")
          ? next
          : recoveryDestination;
      const response = NextResponse.redirect(`${origin}${destination}`);
      return destination.startsWith("/invite")
        ? withInviteCookie(response)
        : response;
    }
  }

  if (next.startsWith("/reset-password")) {
    return NextResponse.redirect(
      `${origin}/reset-password/update?error=invalid_recovery`,
    );
  }

  if (next.startsWith("/invite")) {
    const response = NextResponse.redirect(
      `${origin}${inviteDestination}?error=invalid_invite`,
    );
    response.cookies.delete("invite_onboarding");
    return response;
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback`);
}
