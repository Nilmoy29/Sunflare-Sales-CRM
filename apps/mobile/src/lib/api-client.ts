import { getAccessToken, getSupabase, signOut } from "@/lib/supabase";
import { getApiUrl } from "@/lib/env";

export type ApiErrorBody = {
  error?: {
    code?: string;
    message?: string;
  };
};

export type ApiEnvelope<T> = {
  data?: T;
  error?: ApiErrorBody["error"];
};

async function parseJson<T>(response: Response): Promise<T> {
  return response.json() as Promise<T>;
}

export async function apiFetch(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const base = getApiUrl().replace(/\/$/, "");
  const url = path.startsWith("http") ? path : `${base}${path.startsWith("/") ? path : `/${path}`}`;

  const headers = new Headers(init.headers);
  if (!headers.has("Content-Type") && init.body) {
    headers.set("Content-Type", "application/json");
  }

  const token = await getAccessToken();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  let response = await fetch(url, { ...init, headers });

  if (response.status === 401 && token) {
    const { error } = await getSupabase().auth.refreshSession();
    if (!error) {
      const refreshed = await getAccessToken();
      if (refreshed) {
        headers.set("Authorization", `Bearer ${refreshed}`);
        response = await fetch(url, { ...init, headers });
      }
    } else {
      await signOut();
    }
  }

  return response;
}

export async function apiJson<T>(
  path: string,
  init?: RequestInit,
): Promise<{ response: Response; json: ApiEnvelope<T> }> {
  const response = await apiFetch(path, init);
  const json = await parseJson<ApiEnvelope<T>>(response);
  return { response, json };
}

export function getApiErrorMessage(
  json: ApiEnvelope<unknown>,
  fallback = "Request failed",
): string {
  return json.error?.message ?? fallback;
}
