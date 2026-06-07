import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { NextResponse } from "next/server";
import type { Database } from "@/types/supabase.generated";

type CookieToSet = {
  name: string;
  value: string;
  options: CookieOptions;
};

export type RouteHandlerAuthClient = {
  supabase: ReturnType<typeof createServerClient<Database>>;
  /** Copy captured auth cookies (with options) onto another response. */
  applySessionCookiesTo: (target: NextResponse) => void;
};

/**
 * Supabase client for Route Handlers that redirect after auth.
 * Captures Set-Cookie options so they can be applied to the final redirect
 * (Next.js getAll() does not return httpOnly/path options when re-copying).
 */
export async function createRouteHandlerClient(
  response: NextResponse,
): Promise<RouteHandlerAuthClient> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY",
    );
  }

  const cookieStore = await cookies();
  const capturedCookies: CookieToSet[] = [];

  const supabase = createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: CookieToSet[]) {
        cookiesToSet.forEach(({ name, value, options }) => {
          capturedCookies.push({ name, value, options });
          try {
            cookieStore.set(name, value, options);
          } catch {
            // Request-scope store may be read-only in some contexts.
          }
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  return {
    supabase,
    applySessionCookiesTo(target: NextResponse) {
      capturedCookies.forEach(({ name, value, options }) => {
        target.cookies.set(name, value, options);
      });
    },
  };
}
