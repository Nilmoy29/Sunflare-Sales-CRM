import { NextResponse } from "next/server";
import { SIGNUP_PATH } from "@/lib/auth/paths";
import { createRouteHandlerClient } from "@/lib/supabase/route-handler";

/** Exchange auth code for session (SSR cookie flow). */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const next = searchParams.get("next") ?? "/";
  const recoveryDestination = "/reset-password/update";
  const inviteDestination = SIGNUP_PATH;

  const withInviteCookie = async (
    response: NextResponse,
    supabase: Awaited<ReturnType<typeof createRouteHandlerClient>>["supabase"],
  ) => {
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
    const response = NextResponse.redirect(`${origin}${next}`);
    const { supabase } = await createRouteHandlerClient(response);
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return next.startsWith("/invite") || next.startsWith(SIGNUP_PATH)
        ? withInviteCookie(response, supabase)
        : response;
    }
  }

  if (tokenHash && type) {
    const destination = next.startsWith("/reset-password")
      ? next
      : next.startsWith("/invite") || next.startsWith(SIGNUP_PATH)
        ? next
        : recoveryDestination;
    const response = NextResponse.redirect(`${origin}${destination}`);
    const { supabase } = await createRouteHandlerClient(response);
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
      return destination.startsWith("/invite") ||
        destination.startsWith(SIGNUP_PATH)
        ? withInviteCookie(response, supabase)
        : response;
    }
  }

  if (next.startsWith("/reset-password")) {
    return NextResponse.redirect(
      `${origin}/reset-password/update?error=invalid_recovery`,
    );
  }

  // Invite/signup links often land here with tokens only in the URL hash.
  // The server cannot read the hash, so hand off to /signup for client bootstrap
  // instead of treating the request as an invalid invite.
  if (next.startsWith("/invite") || next.startsWith(SIGNUP_PATH)) {
    return NextResponse.redirect(`${origin}${inviteDestination}`);
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback`);
}
