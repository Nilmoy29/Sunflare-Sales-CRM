"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { GeoJSONSource, Map as MapboxMap, Popup } from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import {
  formatKnockAddress,
  formatKnockHistoryDate,
} from "@/features/knocks/format-knock-date";
import {
  useAdminMapKnocks,
  type AdminMapFilters,
} from "@/features/knocks/use-admin-map-knocks";
import {
  DOOR_OUTCOME_COLORS,
  DOOR_OUTCOME_LABELS,
  doorOutcomeMapboxColorExpression,
} from "@/lib/geo/door-outcome-colors";
import {
  DEFAULT_MAP_CENTER,
  DEFAULT_MAP_STYLE,
  DEFAULT_MAP_ZOOM,
  getMapboxAccessToken,
} from "@/lib/geo/mapbox";
import {
  clampMapBbox,
  maxSpanBboxAround,
  type AdminKnockPin,
  type MapBbox,
} from "@/lib/validators/knocks";
import type { ShiftBreadcrumbPoint } from "@/lib/validators/shift-breadcrumbs";

const BREADCRUMB_SOURCE_ID = "admin-breadcrumbs";
const BREADCRUMB_LINE_LAYER_ID = "admin-breadcrumbs-line";
const BREADCRUMB_POINT_LAYER_ID = "admin-breadcrumbs-point";
const BREADCRUMB_COLOR = "#3b82f6";

const HEATMAP_SOURCE_ID = "admin-knocks-heatmap";
const HEATMAP_LAYER_ID = "admin-knocks-heatmap-layer";

const KNOCKS_SOURCE_ID = "admin-knocks";
const CLUSTER_LAYER_ID = "admin-knocks-clusters";
const CLUSTER_COUNT_LAYER_ID = "admin-knocks-cluster-count";
const UNCLUSTERED_LAYER_ID = "admin-knocks-unclustered";

const INTERACTIVE_LAYERS = [
  CLUSTER_LAYER_ID,
  CLUSTER_COUNT_LAYER_ID,
  UNCLUSTERED_LAYER_ID,
];

const MOVEEND_DEBOUNCE_MS = 300;
const FIT_BOUNDS_PADDING = 48;
const FIT_BOUNDS_MAX_ZOOM = 16;
const MIN_BOUNDS_PAD_DEGREES = 0.002;

type AdminMapBreadcrumbs = {
  enabled: boolean;
  points: ShiftBreadcrumbPoint[];
  loading: boolean;
  error: string | null;
};

type AdminMapCanvasProps = {
  filters: AdminMapFilters;
  refreshKey?: number;
  heatmapEnabled?: boolean;
  heatmapOpacity?: number;
  breadcrumbs?: AdminMapBreadcrumbs;
};

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

function initialSearchBbox(): MapBbox {
  return maxSpanBboxAround(DEFAULT_MAP_CENTER[0], DEFAULT_MAP_CENTER[1]);
}

function knockBounds(
  knocks: AdminKnockPin[],
): [[number, number], [number, number]] | null {
  if (knocks.length === 0) {
    return null;
  }

  let west = knocks[0]!.lng;
  let east = knocks[0]!.lng;
  let south = knocks[0]!.lat;
  let north = knocks[0]!.lat;

  for (const knock of knocks) {
    west = Math.min(west, knock.lng);
    east = Math.max(east, knock.lng);
    south = Math.min(south, knock.lat);
    north = Math.max(north, knock.lat);
  }

  const lngPad = Math.max((east - west) * 0.1, MIN_BOUNDS_PAD_DEGREES);
  const latPad = Math.max((north - south) * 0.1, MIN_BOUNDS_PAD_DEGREES);

  return [
    [west - lngPad, south - latPad],
    [east + lngPad, north + latPad],
  ];
}

function emptyFeatureCollection(): GeoJSON.FeatureCollection {
  return { type: "FeatureCollection", features: [] };
}

function breadcrumbsToFeatureCollection(
  points: ShiftBreadcrumbPoint[],
): GeoJSON.FeatureCollection {
  if (points.length >= 2) {
    return {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          geometry: {
            type: "LineString",
            coordinates: points.map((point) => [point.lng, point.lat]),
          },
          properties: {},
        },
      ],
    };
  }

  if (points.length === 1) {
    const point = points[0]!;
    return {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          geometry: {
            type: "Point",
            coordinates: [point.lng, point.lat],
          },
          properties: {},
        },
      ],
    };
  }

  return emptyFeatureCollection();
}

function adminKnocksToFeatureCollection(
  knocks: AdminKnockPin[],
): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: knocks.map((knock) => ({
      type: "Feature" as const,
      geometry: {
        type: "Point" as const,
        coordinates: [knock.lng, knock.lat],
      },
      properties: {
        id: knock.id,
        outcome: knock.outcome,
        knocked_at: knock.knocked_at,
        rep_id: knock.rep_id,
        rep_name: knock.rep_name,
        address: knock.address ?? "",
        suburb: knock.suburb ?? "",
        postcode: knock.postcode ?? "",
        lat: knock.lat,
        lng: knock.lng,
      },
    })),
  };
}

function buildPopupHtml(knock: AdminKnockPin): string {
  const color = DOOR_OUTCOME_COLORS[knock.outcome];
  const label = DOOR_OUTCOME_LABELS[knock.outcome];
  const address = formatKnockAddress(knock);
  const when = formatKnockHistoryDate(knock.knocked_at);

  return `
    <div style="font-family: system-ui, sans-serif; font-size: 13px; line-height: 1.4; min-width: 180px;">
      <p style="margin: 0 0 6px; font-weight: 600;">${escapeHtml(knock.rep_name)}</p>
      <span style="display: inline-block; border-radius: 4px; padding: 2px 6px; font-size: 11px; font-weight: 600; color: #fff; background: ${color};">${escapeHtml(label)}</span>
      <p style="margin: 8px 0 4px; color: #52525b;">${escapeHtml(when)}</p>
      <p style="margin: 0; font-weight: 500;">${escapeHtml(address)}</p>
    </div>
  `;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function knockFromFeatureProperties(
  props: GeoJSON.GeoJsonProperties,
): AdminKnockPin | null {
  if (!props?.id || !props.outcome || !props.knocked_at || !props.rep_id) {
    return null;
  }

  return {
    id: String(props.id),
    lat: Number(props.lat),
    lng: Number(props.lng),
    outcome: props.outcome as AdminKnockPin["outcome"],
    knocked_at: String(props.knocked_at),
    rep_id: String(props.rep_id),
    rep_name: String(props.rep_name ?? "Unknown"),
    address: props.address ? String(props.address) : null,
    suburb: props.suburb ? String(props.suburb) : null,
    postcode: props.postcode ? String(props.postcode) : null,
  };
}

export function AdminMapCanvas({
  filters,
  refreshKey = 0,
  heatmapEnabled = false,
  heatmapOpacity = 0.6,
  breadcrumbs = {
    enabled: false,
    points: [],
    loading: false,
    error: null,
  },
}: AdminMapCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapboxMap | null>(null);
  const popupRef = useRef<Popup | null>(null);
  const mapReadyRef = useRef(false);
  const hasFittedToKnocksRef = useRef(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const token = getMapboxAccessToken();
  const [bbox, setBbox] = useState<MapBbox | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  const { knocks, loading, error, truncated } = useAdminMapKnocks(
    bbox,
    filters,
    refreshKey,
  );

  const syncKnocksToMap = useCallback((nextKnocks: AdminKnockPin[]) => {
    const map = mapRef.current;
    if (!map || !mapReadyRef.current) {
      return;
    }

    const source = map.getSource(KNOCKS_SOURCE_ID) as GeoJSONSource | undefined;
    source?.setData(adminKnocksToFeatureCollection(nextKnocks));
  }, []);

  const syncHeatmapToMap = useCallback((nextKnocks: AdminKnockPin[]) => {
    const map = mapRef.current;
    if (!map || !mapReadyRef.current) {
      return;
    }

    const source = map.getSource(HEATMAP_SOURCE_ID) as GeoJSONSource | undefined;
    source?.setData(adminKnocksToFeatureCollection(nextKnocks));
  }, []);

  const syncBreadcrumbsToMap = useCallback(
    (enabled: boolean, points: ShiftBreadcrumbPoint[]) => {
      const map = mapRef.current;
      if (!map || !mapReadyRef.current) {
        return;
      }

      const source = map.getSource(BREADCRUMB_SOURCE_ID) as
        | GeoJSONSource
        | undefined;
      const data = enabled
        ? breadcrumbsToFeatureCollection(points)
        : emptyFeatureCollection();
      source?.setData(data);
    },
    [],
  );

  useEffect(() => {
    if (!token || !containerRef.current) {
      return;
    }

    let cancelled = false;

    void (async () => {
      const mapboxgl = (await import("mapbox-gl")).default;
      if (cancelled || !containerRef.current) {
        return;
      }

      mapboxgl.accessToken = token;

      const map = new mapboxgl.Map({
        container: containerRef.current,
        style: DEFAULT_MAP_STYLE,
        center: DEFAULT_MAP_CENTER,
        zoom: DEFAULT_MAP_ZOOM,
      });

      mapRef.current = map;
      popupRef.current = new mapboxgl.Popup({
        closeButton: true,
        closeOnClick: true,
        maxWidth: "280px",
      });

      map.on("load", () => {
        if (cancelled) {
          return;
        }

        map.addSource(BREADCRUMB_SOURCE_ID, {
          type: "geojson",
          data: emptyFeatureCollection(),
        });

        map.addLayer({
          id: BREADCRUMB_LINE_LAYER_ID,
          type: "line",
          source: BREADCRUMB_SOURCE_ID,
          filter: ["==", ["geometry-type"], "LineString"],
          paint: {
            "line-color": BREADCRUMB_COLOR,
            "line-width": 3,
            "line-opacity": 0.85,
          },
        });

        map.addLayer({
          id: BREADCRUMB_POINT_LAYER_ID,
          type: "circle",
          source: BREADCRUMB_SOURCE_ID,
          filter: ["==", ["geometry-type"], "Point"],
          paint: {
            "circle-color": BREADCRUMB_COLOR,
            "circle-radius": 6,
            "circle-stroke-width": 2,
            "circle-stroke-color": "#ffffff",
          },
        });

        map.addSource(HEATMAP_SOURCE_ID, {
          type: "geojson",
          data: emptyFeatureCollection(),
        });

        map.addLayer({
          id: HEATMAP_LAYER_ID,
          type: "heatmap",
          source: HEATMAP_SOURCE_ID,
          paint: {
            "heatmap-weight": 1,
            "heatmap-intensity": [
              "interpolate",
              ["linear"],
              ["zoom"],
              9,
              1,
              15,
              3,
            ],
            "heatmap-radius": [
              "interpolate",
              ["linear"],
              ["zoom"],
              9,
              15,
              15,
              25,
            ],
            "heatmap-opacity": 0.6,
            "heatmap-color": [
              "interpolate",
              ["linear"],
              ["heatmap-density"],
              0,
              "rgba(33,102,172,0)",
              0.2,
              "rgb(103,169,207)",
              0.4,
              "rgb(209,229,240)",
              0.6,
              "rgb(253,219,199)",
              0.8,
              "rgb(239,138,98)",
              1,
              "rgb(178,24,43)",
            ],
          },
          layout: {
            visibility: "none",
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
            "circle-stroke-width": 2,
            "circle-stroke-color": "#ffffff",
          },
        });

        mapReadyRef.current = true;
        setMapLoaded(true);
        setBbox(initialSearchBbox());

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
            const knock = knockFromFeatureProperties(pinHit.properties);
            if (knock) {
              popupRef.current
                ?.setLngLat([knock.lng, knock.lat])
                .setHTML(buildPopupHtml(knock))
                .addTo(map);
            }
            return;
          }

          if (hits.length > 0) {
            return;
          }

          popupRef.current?.remove();
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
      mapReadyRef.current = false;
      setMapLoaded(false);
      popupRef.current?.remove();
      popupRef.current = null;
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [token, syncKnocksToMap]);

  useEffect(() => {
    hasFittedToKnocksRef.current = false;
    if (mapReadyRef.current) {
      setBbox(initialSearchBbox());
    }
  }, [refreshKey]);

  useEffect(() => {
    if (!mapLoaded) {
      return;
    }
    syncKnocksToMap(knocks);
    syncHeatmapToMap(knocks);
  }, [knocks, mapLoaded, syncKnocksToMap, syncHeatmapToMap]);

  useEffect(() => {
    if (!mapLoaded || knocks.length === 0 || hasFittedToKnocksRef.current) {
      return;
    }

    const map = mapRef.current;
    const bounds = knockBounds(knocks);
    if (!map || !bounds) {
      return;
    }

    hasFittedToKnocksRef.current = true;
    map.fitBounds(bounds, {
      padding: FIT_BOUNDS_PADDING,
      maxZoom: FIT_BOUNDS_MAX_ZOOM,
      duration: 0,
    });
  }, [knocks, mapLoaded]);

  useEffect(() => {
    if (!mapLoaded) {
      return;
    }

    const map = mapRef.current;
    if (!map || !mapReadyRef.current || !map.getLayer(HEATMAP_LAYER_ID)) {
      return;
    }

    map.setPaintProperty(HEATMAP_LAYER_ID, "heatmap-opacity", heatmapOpacity);
    map.setLayoutProperty(
      HEATMAP_LAYER_ID,
      "visibility",
      heatmapEnabled ? "visible" : "none",
    );
  }, [heatmapEnabled, heatmapOpacity, mapLoaded]);

  useEffect(() => {
    if (!mapLoaded) {
      return;
    }
    syncBreadcrumbsToMap(breadcrumbs.enabled, breadcrumbs.points);
  }, [
    breadcrumbs.enabled,
    breadcrumbs.points,
    mapLoaded,
    syncBreadcrumbsToMap,
  ]);

  if (!token) {
    return (
      <div className="flex h-full flex-1 flex-col items-center justify-center gap-3 bg-zinc-50 p-8 text-center">
        <p className="text-lg font-semibold text-zinc-900">Mapbox not configured</p>
        <p className="max-w-md text-sm text-zinc-600">
          Add{" "}
          <code className="rounded bg-zinc-100 px-1 py-0.5">
            NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN
          </code>{" "}
          to <code className="rounded bg-zinc-100 px-1 py-0.5">.env.local</code>{" "}
          when you have credentials. See{" "}
          <span className="font-medium">docs/SETUP_KEYS.md</span> for setup steps.
        </p>
      </div>
    );
  }

  return (
    <div className="relative h-full min-h-0 w-full flex-1">
      <div ref={containerRef} className="h-full w-full" aria-label="Admin map" />

      {(loading ||
        error ||
        truncated ||
        breadcrumbs.loading ||
        breadcrumbs.error) && (
        <div className="pointer-events-none absolute left-4 top-4 z-10 flex max-w-xs flex-col gap-2">
          {loading ? (
            <p className="rounded-lg bg-white/95 px-3 py-2 text-sm text-zinc-700 shadow-sm ring-1 ring-zinc-200">
              Loading pins…
            </p>
          ) : null}
          {error ? (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900 shadow-sm ring-1 ring-amber-200">
              {error}
            </p>
          ) : null}
          {truncated ? (
            <p className="rounded-lg bg-white/95 px-3 py-2 text-sm text-zinc-700 shadow-sm ring-1 ring-zinc-200">
              Showing the 500 most recent pins in this area.
            </p>
          ) : null}
          {breadcrumbs.loading ? (
            <p className="rounded-lg bg-white/95 px-3 py-2 text-sm text-zinc-700 shadow-sm ring-1 ring-zinc-200">
              Loading route…
            </p>
          ) : null}
          {breadcrumbs.error ? (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900 shadow-sm ring-1 ring-amber-200">
              {breadcrumbs.error}
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}
