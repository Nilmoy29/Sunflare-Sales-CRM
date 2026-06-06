/** Sydney CBD — sensible AU default before geolocation resolves. */
export const DEFAULT_MAP_CENTER: [number, number] = [151.2093, -33.8688];

export const DEFAULT_MAP_ZOOM = 13;

export const DEFAULT_MAP_STYLE = "mapbox://styles/mapbox/streets-v12";

export function getMapboxAccessToken(): string | null {
  const token = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN?.trim();
  return token || null;
}

export function isMapboxConfigured(): boolean {
  return getMapboxAccessToken() !== null;
}

/** Server-only — Mapbox Geocoding API (Story 2.6). */
export function getMapboxSecretToken(): string | null {
  const token = process.env.MAPBOX_SECRET_TOKEN?.trim();
  return token || null;
}

export function isMapboxGeocodingConfigured(): boolean {
  return getMapboxSecretToken() !== null;
}
