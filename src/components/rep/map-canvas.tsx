"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { GeoJSONSource, Map as MapboxMap } from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import type { RepLocation } from "@/features/gps/use-rep-location";
import { useMapKnocks } from "@/features/knocks/use-map-knocks";
import { doorOutcomeMapboxColorExpression } from "@/lib/geo/door-outcome-colors";
import {
  DEFAULT_MAP_CENTER,
  DEFAULT_MAP_STYLE,
  DEFAULT_MAP_ZOOM,
  getMapboxAccessToken,
  getMapboxClientTokenIssue,
} from "@/lib/geo/mapbox";
import {
  clampMapBbox,
  type KnockPin,
  type MapBbox,
  type PendingKnockPin,
} from "@/lib/validators/knocks";
import { boundsForTerritoryOverlays } from "@/lib/geo/territory-bounds";
import type { RepTerritoryOverlay } from "@/lib/validators/territories";

const REP_TERRITORIES_SOURCE_ID = "rep-territories";
const REP_TERRITORIES_FILL_LAYER_ID = "rep-territories-fill";
const REP_TERRITORIES_LINE_LAYER_ID = "rep-territories-line";

const REP_TERRITORY_FILL_COLOR = "#10b981";

const KNOCKS_SOURCE_ID = "knocks";
const CLUSTER_LAYER_ID = "knocks-clusters";
const CLUSTER_COUNT_LAYER_ID = "knocks-cluster-count";
const UNCLUSTERED_LAYER_ID = "knocks-unclustered";
const USER_SOURCE_ID = "rep-location";
const USER_LAYER_ID = "rep-location-dot";

const INTERACTIVE_LAYERS = [
  CLUSTER_LAYER_ID,
  CLUSTER_COUNT_LAYER_ID,
  UNCLUSTERED_LAYER_ID,
  USER_LAYER_ID,
];

const MOVEEND_DEBOUNCE_MS = 300;
const USER_LOCATION_ZOOM = 16;

type MapCanvasProps = {
  userLocation: RepLocation | null;
  geoWarning?: string | null;
  knockRefreshKey?: number;
  pendingKnocks?: PendingKnockPin[];
  territoryOverlays?: RepTerritoryOverlay[];
  onMapClick?: (coords: { lat: number; lng: number }) => void;
  onPinClick?: (coords: { lat: number; lng: number }) => void;
};

function territoriesToFeatureCollection(
  territories: RepTerritoryOverlay[],
): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: territories.map((territory) => ({
      type: "Feature",
      geometry: territory.geometry,
      properties: {
        id: territory.id,
        name: territory.name,
      },
    })),
  };
}

function boundsToBbox(bounds: {
  getWest: () => number;
  getSouth: () => number;
  getEast: () => number;
  getNorth: () => number;
}): MapBbox {
  return clampMapBbox({
    west: bounds.getWest(),
    south: bounds.getSouth(),
    east: bounds.getEast(),
    north: bounds.getNorth(),
  });
}

function emptyFeatureCollection(): GeoJSON.FeatureCollection {
  return { type: "FeatureCollection", features: [] };
}

function knocksToFeatureCollection(
  knocks: KnockPin[],
  pendingKnocks: PendingKnockPin[],
): GeoJSON.FeatureCollection {
  const serverFeatures = knocks.map((knock) => ({
    type: "Feature" as const,
    geometry: {
      type: "Point" as const,
      coordinates: [knock.lng, knock.lat],
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
      coordinates: [knock.lng, knock.lat],
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

export function MapCanvas({
  userLocation,
  geoWarning = null,
  knockRefreshKey = 0,
  pendingKnocks = [],
  territoryOverlays = [],
  onMapClick,
  onPinClick,
}: MapCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapboxMap | null>(null);
  const mapReadyRef = useRef(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onMapClickRef = useRef(onMapClick);
  const onPinClickRef = useRef(onPinClick);
  const userLocationRef = useRef(userLocation);
  const hasCenteredOnUserRef = useRef(false);
  const hasFitTerritoryBoundsRef = useRef(false);

  userLocationRef.current = userLocation;

  const token = getMapboxAccessToken();
  const tokenIssue = getMapboxClientTokenIssue();
  const [bbox, setBbox] = useState<MapBbox | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);

  const { knocks, loading, error, truncated } = useMapKnocks(
    bbox,
    knockRefreshKey,
  );

  useEffect(() => {
    onMapClickRef.current = onMapClick;
  }, [onMapClick]);

  useEffect(() => {
    onPinClickRef.current = onPinClick;
  }, [onPinClick]);

  const syncKnocksToMap = useCallback(
    (nextKnocks: KnockPin[], nextPending: PendingKnockPin[]) => {
      const map = mapRef.current;
      if (!map || !mapReadyRef.current) {
        return;
      }

      const source = map.getSource(KNOCKS_SOURCE_ID) as GeoJSONSource | undefined;
      source?.setData(knocksToFeatureCollection(nextKnocks, nextPending));
    },
    [],
  );

  const syncTerritoriesToMap = useCallback(
    (nextTerritories: RepTerritoryOverlay[]) => {
      const map = mapRef.current;
      if (!map || !mapReadyRef.current) {
        return;
      }

      const source = map.getSource(REP_TERRITORIES_SOURCE_ID) as
        | GeoJSONSource
        | undefined;
      source?.setData(territoriesToFeatureCollection(nextTerritories));
    },
    [],
  );

  const updateUserMarker = useCallback((lat: number, lng: number) => {
    const map = mapRef.current;
    if (!map || !mapReadyRef.current) {
      return;
    }

    const source = map.getSource(USER_SOURCE_ID) as GeoJSONSource | undefined;
    source?.setData({
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          geometry: { type: "Point", coordinates: [lng, lat] },
          properties: {},
        },
      ],
    });
  }, []);

  useEffect(() => {
    if (tokenIssue || !token || !containerRef.current) {
      return;
    }

    let cancelled = false;
    setMapError(null);

    void (async () => {
      const mapboxgl = (await import("mapbox-gl")).default;
      if (cancelled || !containerRef.current) {
        return;
      }

      mapboxgl.accessToken = token;

      const loc = userLocationRef.current;
      const initialCenter: [number, number] = loc
        ? [loc.lng, loc.lat]
        : DEFAULT_MAP_CENTER;
      const initialZoom = loc ? USER_LOCATION_ZOOM : DEFAULT_MAP_ZOOM;

      if (loc) {
        hasCenteredOnUserRef.current = true;
      }

      const map = new mapboxgl.Map({
        container: containerRef.current,
        style: DEFAULT_MAP_STYLE,
        center: initialCenter,
        zoom: initialZoom,
      });

      mapRef.current = map;

      map.on("error", (event) => {
        const message =
          event.error?.message ??
          "Map tiles failed to load. Check your Mapbox public token.";
        setMapError(message);
      });

      map.on("load", () => {
        if (cancelled) {
          return;
        }

        map.addSource(REP_TERRITORIES_SOURCE_ID, {
          type: "geojson",
          data: emptyFeatureCollection(),
        });

        map.addLayer({
          id: REP_TERRITORIES_FILL_LAYER_ID,
          type: "fill",
          source: REP_TERRITORIES_SOURCE_ID,
          paint: {
            "fill-color": REP_TERRITORY_FILL_COLOR,
            "fill-opacity": 0.22,
          },
        });

        map.addLayer({
          id: REP_TERRITORIES_LINE_LAYER_ID,
          type: "line",
          source: REP_TERRITORIES_SOURCE_ID,
          paint: {
            "line-color": REP_TERRITORY_FILL_COLOR,
            "line-width": 2,
          },
        });

        map.addSource(KNOCKS_SOURCE_ID, {
          type: "geojson",
          data: emptyFeatureCollection(),
          cluster: true,
          clusterMaxZoom: 14,
          clusterRadius: 50,
        });

        map.addLayer({
          id: CLUSTER_LAYER_ID,
          type: "circle",
          source: KNOCKS_SOURCE_ID,
          filter: ["has", "point_count"],
          paint: {
            "circle-color": "#6366f1",
            "circle-radius": [
              "step",
              ["get", "point_count"],
              18,
              10,
              22,
              50,
              28,
            ],
            "circle-stroke-width": 2,
            "circle-stroke-color": "#fff",
          },
        });

        map.addLayer({
          id: CLUSTER_COUNT_LAYER_ID,
          type: "symbol",
          source: KNOCKS_SOURCE_ID,
          filter: ["has", "point_count"],
          layout: {
            "text-field": ["get", "point_count_abbreviated"],
            "text-size": 12,
            "text-font": ["DIN Offc Pro Medium", "Arial Unicode MS Bold"],
          },
          paint: {
            "text-color": "#ffffff",
          },
        });

        map.addLayer({
          id: UNCLUSTERED_LAYER_ID,
          type: "circle",
          source: KNOCKS_SOURCE_ID,
          filter: ["!", ["has", "point_count"]],
          paint: {
            "circle-color": doorOutcomeMapboxColorExpression(),
            "circle-radius": 8,
            "circle-opacity": [
              "case",
              ["==", ["get", "pending"], true],
              0.55,
              1,
            ],
            "circle-stroke-width": 2,
            "circle-stroke-color": "#ffffff",
          },
        });

        map.addSource(USER_SOURCE_ID, {
          type: "geojson",
          data: emptyFeatureCollection(),
        });

        map.addLayer({
          id: USER_LAYER_ID,
          type: "circle",
          source: USER_SOURCE_ID,
          paint: {
            "circle-color": "#2563eb",
            "circle-radius": 10,
            "circle-stroke-width": 3,
            "circle-stroke-color": "#ffffff",
          },
        });

        mapReadyRef.current = true;
        setMapLoaded(true);

        const bounds = map.getBounds();
        if (bounds) {
          setBbox(boundsToBbox(bounds));
        }

        map.on("click", (e) => {
          if (!mapReadyRef.current) {
            return;
          }
          const hits = map.queryRenderedFeatures(e.point, {
            layers: INTERACTIVE_LAYERS,
          });

          const pinHit = hits.find(
            (feature) => feature.layer?.id === UNCLUSTERED_LAYER_ID,
          );
          if (pinHit?.geometry.type === "Point") {
            const [lng, lat] = pinHit.geometry.coordinates;
            onPinClickRef.current?.({ lat, lng });
            return;
          }

          if (hits.length > 0) {
            return;
          }

          onMapClickRef.current?.({
            lat: e.lngLat.lat,
            lng: e.lngLat.lng,
          });
        });
      });

      map.on("moveend", () => {
        if (debounceRef.current) {
          clearTimeout(debounceRef.current);
        }

        debounceRef.current = setTimeout(() => {
          const bounds = map.getBounds();
          if (bounds) {
            setBbox(boundsToBbox(bounds));
          }
        }, MOVEEND_DEBOUNCE_MS);
      });
    })();

    return () => {
      cancelled = true;
      hasCenteredOnUserRef.current = false;
      hasFitTerritoryBoundsRef.current = false;
      mapReadyRef.current = false;
      setMapLoaded(false);
      setMapError(null);
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [token, tokenIssue, syncKnocksToMap, syncTerritoriesToMap]);

  useEffect(() => {
    if (!mapLoaded) {
      return;
    }
    syncTerritoriesToMap(territoryOverlays);
  }, [territoryOverlays, mapLoaded, syncTerritoriesToMap]);

  useEffect(() => {
    if (
      !mapLoaded ||
      territoryOverlays.length === 0 ||
      hasFitTerritoryBoundsRef.current
    ) {
      return;
    }

    const map = mapRef.current;
    if (!map) {
      return;
    }

    const bounds = boundsForTerritoryOverlays(
      territoryOverlays,
      userLocationRef.current,
    );
    if (!bounds) {
      return;
    }

    hasFitTerritoryBoundsRef.current = true;
    map.fitBounds(bounds, {
      padding: 48,
      maxZoom: 15,
      duration: 600,
    });
  }, [mapLoaded, territoryOverlays]);

  useEffect(() => {
    if (!mapLoaded) {
      return;
    }
    syncKnocksToMap(knocks, pendingKnocks);
  }, [knocks, pendingKnocks, mapLoaded, syncKnocksToMap]);

  useEffect(() => {
    if (!userLocation) {
      return;
    }
    updateUserMarker(userLocation.lat, userLocation.lng);
  }, [userLocation, mapLoaded, updateUserMarker]);

  useEffect(() => {
    if (!mapLoaded || !userLocation || hasCenteredOnUserRef.current) {
      return;
    }

    const map = mapRef.current;
    if (!map) {
      return;
    }

    hasCenteredOnUserRef.current = true;
    map.flyTo({
      center: [userLocation.lng, userLocation.lat],
      zoom: USER_LOCATION_ZOOM,
    });
  }, [userLocation, mapLoaded]);

  const recenter = useCallback(() => {
    const map = mapRef.current;
    if (!map || !userLocation) {
      return;
    }

    map.flyTo({
      center: [userLocation.lng, userLocation.lat],
      zoom: USER_LOCATION_ZOOM,
    });
  }, [userLocation]);

  if (tokenIssue === "missing") {
    return (
      <div className="flex h-full min-h-0 flex-1 flex-col items-center justify-center gap-3 bg-white p-8 text-center">
        <p className="text-lg font-semibold text-zinc-950">Mapbox not configured</p>
        <p className="max-w-md text-sm text-zinc-800">
          Add{" "}
          <code className="rounded bg-zinc-100 px-1 py-0.5">
            NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN
          </code>{" "}
          (a public <code className="rounded bg-zinc-100 px-1 py-0.5">pk.</code>{" "}
          token) to <code className="rounded bg-zinc-100 px-1 py-0.5">.env.local</code>.
          See <span className="font-medium">docs/SETUP_KEYS.md</span>.
        </p>
      </div>
    );
  }

  if (tokenIssue === "secret_token") {
    return (
      <div className="flex h-full min-h-0 flex-1 flex-col items-center justify-center gap-3 bg-white p-8 text-center">
        <p className="text-lg font-semibold text-zinc-950">Wrong Mapbox token for the map</p>
        <p className="max-w-md text-sm text-zinc-800">
          <code className="rounded bg-zinc-100 px-1 py-0.5">
            NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN
          </code>{" "}
          must be a <strong>public</strong> token (
          <code className="rounded bg-zinc-100 px-1 py-0.5">pk.</code>
          ) with map scopes such as{" "}
          <code className="rounded bg-zinc-100 px-1 py-0.5">STYLES:READ</code> and{" "}
          <code className="rounded bg-zinc-100 px-1 py-0.5">STYLES:TILES</code>.
          Your secret token (
          <code className="rounded bg-zinc-100 px-1 py-0.5">sk.</code>
          ) belongs in{" "}
          <code className="rounded bg-zinc-100 px-1 py-0.5">MAPBOX_SECRET_TOKEN</code>{" "}
          for address lookup only.
        </p>
      </div>
    );
  }

  return (
    <div className="relative h-full min-h-0 w-full flex-1">
      <div
        ref={containerRef}
        className="h-full min-h-[240px] w-full"
        aria-label="Rep map"
      />

      <button
        type="button"
        onClick={recenter}
        disabled={!userLocation}
        className="absolute bottom-4 left-4 z-10 flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-950 shadow-lg hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60 touch-manipulation"
        aria-label="Recenter map on my location"
      >
        Recenter
      </button>

      {(mapError || loading || error || truncated || geoWarning) && (
        <div className="pointer-events-none absolute left-4 top-4 z-10 flex max-w-xs flex-col gap-2">
          {mapError ? (
            <p className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm font-medium text-red-950 shadow-sm">
              {mapError}
            </p>
          ) : null}
          {geoWarning ? (
            <p className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-950 shadow-sm">
              {geoWarning}
            </p>
          ) : null}
          {loading ? (
            <p className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-900 shadow-sm">
              Loading pins…
            </p>
          ) : null}
          {error ? (
            <p className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-950 shadow-sm">
              {error}
            </p>
          ) : null}
          {truncated ? (
            <p className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-900 shadow-sm">
              Showing the 500 most recent pins in this area.
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}
