import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { createClient as createSupabaseJsClient } from "@supabase/supabase-js";
import { cookies, headers } from "next/headers";
import type { Database } from "@/types/supabase.generated";

export type AppSupabaseClient = ReturnType<
  typeof createServerClient<Database>
>;

function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY",
    );
  }

  return { url, anonKey };
}

export function parseBearerToken(authorization: string | null): string | null {
  if (!authorization) {
    return null;
  }
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() ?? null;
}

async function createCookieClient(): Promise<AppSupabaseClient> {
  const { url, anonKey } = getSupabaseEnv();
  const cookieStore = await cookies();

  return createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(
        cookiesToSet: {
          name: string;
          value: string;
          options: CookieOptions;
        }[],
      ) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // setAll from Server Component — middleware will refresh session
        }
      },
    },
  });
}

function createBearerClient(accessToken: string): AppSupabaseClient {
  const { url, anonKey } = getSupabaseEnv();
  return createSupabaseJsClient<Database>(url, anonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  }) as unknown as AppSupabaseClient;
}

/** Cookie session (web) or Bearer token (mobile) from the incoming request. */
export async function createClientFromRequest(request: Request) {
  const bearerToken = parseBearerToken(request.headers.get("authorization"));
  if (bearerToken) {
    return createBearerClient(bearerToken);
  }

  return createCookieClient();
}

export async function createClient(): Promise<AppSupabaseClient> {
  const headerStore = await headers();
  const bearerToken = parseBearerToken(headerStore.get("authorization"));

  if (bearerToken) {
    return createBearerClient(bearerToken);
  }

  return createCookieClient();
}
