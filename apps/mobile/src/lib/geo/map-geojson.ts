import type { FeatureCollection, Point } from "geojson";
import type { KnockPin, PendingKnockPin } from "@/features/knocks/types";
import type { RepTerritoryOverlay } from "@/features/territories/use-rep-territories";

export function knocksToFeatureCollection(
  knocks: KnockPin[],
  pendingKnocks: PendingKnockPin[],
): FeatureCollection<Point> {
  const serverFeatures = knocks.map((knock) => ({
    type: "Feature" as const,
    geometry: {
      type: "Point" as const,
      coordinates: [knock.lng, knock.lat] as [number, number],
    },
    properties: {
      id: knock.id,
      outcome: knock.outcome,
      knocked_at: knock.knocked_at,
      pending: false,
    },
  }));

  const pendingFeatures = pendingKnocks.map((knock) => ({
    type: "Feature" as const,
    geometry: {
      type: "Point" as const,
      coordinates: [knock.lng, knock.lat] as [number, number],
    },
    properties: {
      id: knock.id,
      outcome: knock.outcome,
      knocked_at: knock.knocked_at,
      pending: true,
    },
  }));

  return {
    type: "FeatureCollection",
    features: [...serverFeatures, ...pendingFeatures],
  };
}

export function territoriesToFeatureCollection(
  territories: RepTerritoryOverlay[],
): FeatureCollection {
  return {
    type: "FeatureCollection",
    features: territories.map((territory) => ({
      type: "Feature" as const,
      geometry: territory.geometry,
      properties: {
        id: territory.id,
        name: territory.name,
      },
    })),
  };
}

export function emptyFeatureCollection(): FeatureCollection {
  return { type: "FeatureCollection", features: [] };
}
