import Constants from "expo-constants";

type Extra = {
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  mapboxAccessToken?: string;
  apiUrl?: string;
};

function readExtra(): Extra {
  return (Constants.expoConfig?.extra ?? {}) as Extra;
}

function readEnv(name: string): string | null {
  const fromProcess = process.env[name]?.trim();
  if (fromProcess) {
    return fromProcess;
  }
  const extra = readExtra();
  switch (name) {
    case "EXPO_PUBLIC_SUPABASE_URL":
      return extra.supabaseUrl?.trim() || null;
    case "EXPO_PUBLIC_SUPABASE_ANON_KEY":
      return extra.supabaseAnonKey?.trim() || null;
    case "EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN":
      return extra.mapboxAccessToken?.trim() || null;
    case "EXPO_PUBLIC_API_URL":
      return extra.apiUrl?.trim() || null;
    default:
      return null;
  }
}

export function getSupabaseUrl(): string | null {
  return readEnv("EXPO_PUBLIC_SUPABASE_URL");
}

export function getSupabaseAnonKey(): string | null {
  return readEnv("EXPO_PUBLIC_SUPABASE_ANON_KEY");
}

export function getMapboxAccessToken(): string | null {
  return readEnv("EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN");
}

export function getApiUrl(): string {
  return readEnv("EXPO_PUBLIC_API_URL") ?? "http://localhost:3000";
}

export type MapboxTokenIssue = "missing" | "secret_token" | null;

export function getMapboxTokenIssue(): MapboxTokenIssue {
  const token = getMapboxAccessToken();
  if (!token) {
    return "missing";
  }
  if (token.startsWith("sk.")) {
    return "secret_token";
  }
  return null;
}

export function isMapboxConfigured(): boolean {
  return getMapboxTokenIssue() === null;
}

export function assertPublicEnvConfigured(): void {
  if (!getSupabaseUrl() || !getSupabaseAnonKey()) {
    throw new Error(
      "Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY",
    );
  }
}
