import type { GeoJsonPolygon } from "@/lib/validators/territories";

type LatLng = { lat: number; lng: number };

export type MapBounds = [[number, number], [number, number]];

function extendBounds(
  bounds: { minLng: number; minLat: number; maxLng: number; maxLat: number },
  lng: number,
  lat: number,
) {
  bounds.minLng = Math.min(bounds.minLng, lng);
  bounds.minLat = Math.min(bounds.minLat, lat);
  bounds.maxLng = Math.max(bounds.maxLng, lng);
  bounds.maxLat = Math.max(bounds.maxLat, lat);
}

export function boundsForGeoJsonPolygon(
  polygon: GeoJsonPolygon,
): MapBounds | null {
  const ring = polygon.coordinates[0];
  if (!ring || ring.length === 0) {
    return null;
  }

  const bounds = {
    minLng: Infinity,
    minLat: Infinity,
    maxLng: -Infinity,
    maxLat: -Infinity,
  };

  for (const [lng, lat] of ring) {
    extendBounds(bounds, lng, lat);
  }

  if (!Number.isFinite(bounds.minLng)) {
    return null;
  }

  return [
    [bounds.minLng, bounds.minLat],
    [bounds.maxLng, bounds.maxLat],
  ];
}

export function boundsForTerritoryOverlays(
  territories: { geometry: GeoJsonPolygon }[],
  userLocation?: LatLng | null,
): MapBounds | null {
  const bounds = {
    minLng: Infinity,
    minLat: Infinity,
    maxLng: -Infinity,
    maxLat: -Infinity,
  };
  let hasPoint = false;

  for (const territory of territories) {
    const territoryBounds = boundsForGeoJsonPolygon(territory.geometry);
    if (!territoryBounds) {
      continue;
    }

    extendBounds(bounds, territoryBounds[0][0], territoryBounds[0][1]);
    extendBounds(bounds, territoryBounds[1][0], territoryBounds[1][1]);
    hasPoint = true;
  }

  if (userLocation) {
    extendBounds(bounds, userLocation.lng, userLocation.lat);
    hasPoint = true;
  }

  if (!hasPoint) {
    return null;
  }

  return [
    [bounds.minLng, bounds.minLat],
    [bounds.maxLng, bounds.maxLat],
  ];
}
