/** Hobart, Tasmania — default before geolocation resolves. */
export const DEFAULT_MAP_CENTER: [number, number] = [147.3272, -42.8821];

export const DEFAULT_MAP_ZOOM = 13;

export const DEFAULT_MAP_STYLE = "mapbox://styles/mapbox/streets-v12";

export function getMapboxAccessToken(): string | null {
  const token = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN?.trim();
  return token || null;
}

/** Returns why the client map token is unusable, if any. */
export function getMapboxClientTokenIssue():
  | "missing"
  | "secret_token"
  | null {
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
  return getMapboxClientTokenIssue() === null;
}

/** Server-only — Mapbox Geocoding API (Story 2.6). */
export function getMapboxSecretToken(): string | null {
  const token = process.env.MAPBOX_SECRET_TOKEN?.trim();
  return token || null;
}

export function isMapboxGeocodingConfigured(): boolean {
  return getMapboxSecretToken() !== null;
}
