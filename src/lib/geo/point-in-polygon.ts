import type { GeoJsonPolygon } from "@/lib/validators/territories";

type PointInPolygonTerritory = {
  geometry: GeoJsonPolygon;
};

function isPointInRing(
  lng: number,
  lat: number,
  ring: [number, number][],
): boolean {
  let inside = false;

  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0];
    const yi = ring[i][1];
    const xj = ring[j][0];
    const yj = ring[j][1];

    const intersects =
      yi > lat !== yj > lat &&
      lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;

    if (intersects) {
      inside = !inside;
    }
  }

  return inside;
}

export function isPointInGeoJsonPolygon(
  lng: number,
  lat: number,
  polygon: GeoJsonPolygon,
): boolean {
  const outerRing = polygon.coordinates[0];
  if (!outerRing || outerRing.length < 4) {
    return false;
  }

  return isPointInRing(lng, lat, outerRing);
}

export function isPointInAnyTerritory(
  lng: number,
  lat: number,
  territories: PointInPolygonTerritory[],
): boolean {
  return territories.some((territory) =>
    isPointInGeoJsonPolygon(lng, lat, territory.geometry),
  );
}
