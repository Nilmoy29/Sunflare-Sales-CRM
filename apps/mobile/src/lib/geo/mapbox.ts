import Mapbox from "@rnmapbox/maps";
import {
  getMapboxAccessToken,
  getMapboxTokenIssue,
  isMapboxConfigured,
} from "@/lib/env";

/** Hobart, Tasmania — matches web default. */
export const DEFAULT_MAP_CENTER: [number, number] = [147.3272, -42.8821];

export const DEFAULT_MAP_ZOOM = 13;

export const DEFAULT_MAP_STYLE = "mapbox://styles/mapbox/streets-v12";

let mapboxConfigured = false;

export function configureMapbox(): boolean {
  if (mapboxConfigured) {
    return isMapboxConfigured();
  }

  const issue = getMapboxTokenIssue();
  if (issue) {
    return false;
  }

  const token = getMapboxAccessToken();
  if (!token) {
    return false;
  }

  Mapbox.setAccessToken(token);
  mapboxConfigured = true;
  return true;
}

export { getMapboxTokenIssue, isMapboxConfigured };
