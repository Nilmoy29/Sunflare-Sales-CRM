import { parseMapboxReverseResponse } from "@/lib/geo/parse-mapbox-reverse";
import { getMapboxSecretToken } from "@/lib/geo/mapbox";
import type { ReverseGeocodeResult } from "@/lib/validators/geocode";

export class GeocodeNotConfiguredError extends Error {
  constructor() {
    super("Mapbox geocoding is not configured");
    this.name = "GeocodeNotConfiguredError";
  }
}

export class GeocodeFailedError extends Error {
  constructor() {
    super("Reverse geocoding failed");
    this.name = "GeocodeFailedError";
  }
}

export async function reverseGeocode(
  lat: number,
  lng: number,
): Promise<ReverseGeocodeResult> {
  const token = getMapboxSecretToken();
  if (!token) {
    throw new GeocodeNotConfiguredError();
  }

  const url = new URL("https://api.mapbox.com/search/geocode/v6/reverse");
  url.searchParams.set("longitude", String(lng));
  url.searchParams.set("latitude", String(lat));
  url.searchParams.set("country", "au");
  url.searchParams.set("language", "en");
  url.searchParams.set("access_token", token);

  const response = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new GeocodeFailedError();
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new GeocodeFailedError();
  }

  const parsed = parseMapboxReverseResponse(payload);
  if (!parsed) {
    throw new GeocodeFailedError();
  }

  if (!parsed.address && !parsed.suburb && !parsed.postcode) {
    throw new GeocodeFailedError();
  }

  return parsed;
}
