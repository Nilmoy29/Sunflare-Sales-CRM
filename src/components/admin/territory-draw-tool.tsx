"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import type {
  FilterSpecification,
  GeoJSONSource,
  Map as MapboxMap,
} from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import "@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css";
import {
  DEFAULT_MAP_CENTER,
  DEFAULT_MAP_STYLE,
  DEFAULT_MAP_ZOOM,
  getMapboxAccessToken,
} from "@/lib/geo/mapbox";
import type {
  GeoJsonPolygon,
  TerritorySummary,
} from "@/lib/validators/territories";
import { useMapboxResize } from "@/lib/geo/use-mapbox-resize";
import { waitForElementSize } from "@/lib/geo/wait-for-element-size";

const TERRITORIES_SOURCE_ID = "territories-existing";
const TERRITORIES_FILL_LAYER_ID = "territories-fill";
const TERRITORIES_LINE_LAYER_ID = "territories-line";
const TERRITORIES_SELECTED_FILL_LAYER_ID = "territories-selected-fill";
const TERRITORIES_SELECTED_LINE_LAYER_ID = "territories-selected-line";
const PENDING_SOURCE_ID = "territory-pending";
const PENDING_FILL_LAYER_ID = "territory-pending-fill";
const PENDING_LINE_LAYER_ID = "territory-pending-line";

const TERRITORY_FILL_COLOR = "#3b82f6";
const TERRITORY_SELECTED_COLOR = "#f59e0b";
const TERRITORY_PENDING_COLOR = "#8b5cf6";

export type TerritoryDrawToolHandle = {
  getDrawnPolygon: () => GeoJsonPolygon | null;
};

type TerritoryDrawToolProps = {
  territories: TerritorySummary[];
  selectedId: string | null;
  drawEnabled: boolean;
  pendingPolygon: GeoJsonPolygon | null;
  onPolygonDrawn: (polygon: GeoJsonPolygon) => void;
};

function firstDrawLayerId(map: MapboxMap): string | undefined {
  const layers = map.getStyle()?.layers ?? [];
  return layers.find((layer) => layer.id.includes("gl-draw"))?.id;
}

function polygonFromDraw(
  draw: import("@mapbox/mapbox-gl-draw").default,
): GeoJsonPolygon | null {
  const feature = draw
    .getAll()
    .features.find((item) => item.geometry?.type === "Polygon");

  if (!feature?.geometry || feature.geometry.type !== "Polygon") {
    return null;
  }

  return feature.geometry as GeoJsonPolygon;
}

function pendingPolygonToFeatureCollection(
  polygon: GeoJsonPolygon | null,
): GeoJSON.FeatureCollection {
  if (!polygon) {
    return { type: "FeatureCollection", features: [] };
  }

  return {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        geometry: polygon,
        properties: { pending: true },
      },
    ],
  };
}

function territoriesToFeatureCollection(
  territories: TerritorySummary[],
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

type MapboxDrawControl = import("@mapbox/mapbox-gl-draw").default;

function safeDrawMode(draw: MapboxDrawControl, mode: string): void {
  try {
    const currentMode = (draw as { getMode?: () => string }).getMode?.();
    if (currentMode === mode) {
      return;
    }
    draw.changeMode(mode);
  } catch {
    try {
      const currentMode = (draw as { getMode?: () => string }).getMode?.();
      if (currentMode !== "simple_select") {
        draw.changeMode("simple_select");
      }
    } catch {
      // Draw may be mid-transition; ignore stale mode errors.
    }
  }
}

function boundsForTerritory(territory: TerritorySummary): [[number, number], [number, number]] {
  const ring = territory.geometry.coordinates[0] ?? [];
  let minLng = Infinity;
  let minLat = Infinity;
  let maxLng = -Infinity;
  let maxLat = -Infinity;

  for (const [lng, lat] of ring) {
    minLng = Math.min(minLng, lng);
    minLat = Math.min(minLat, lat);
    maxLng = Math.max(maxLng, lng);
    maxLat = Math.max(maxLat, lat);
  }

  return [
    [minLng, minLat],
    [maxLng, maxLat],
  ];
}

export const TerritoryDrawTool = forwardRef<
  TerritoryDrawToolHandle,
  TerritoryDrawToolProps
>(function TerritoryDrawTool(
  {
    territories,
    selectedId,
    drawEnabled,
    pendingPolygon,
    onPolygonDrawn,
  },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapboxMap | null>(null);
  const drawRef = useRef<import("@mapbox/mapbox-gl-draw").default | null>(null);
  const mapReadyRef = useRef(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const drawEnabledRef = useRef(drawEnabled);
  const isCapturingRef = useRef(false);
  const onPolygonDrawnRef = useRef(onPolygonDrawn);
  const pendingPolygonRef = useRef(pendingPolygon);

  useImperativeHandle(ref, () => ({
    getDrawnPolygon: () => {
      const draw = drawRef.current;
      if (draw) {
        const fromDraw = polygonFromDraw(draw);
        if (fromDraw) {
          return fromDraw;
        }
      }
      return pendingPolygonRef.current;
    },
  }));

  const token = getMapboxAccessToken();

  useMapboxResize(mapRef, containerRef, mapLoaded);

  useEffect(() => {
    onPolygonDrawnRef.current = onPolygonDrawn;
  }, [onPolygonDrawn]);

  useEffect(() => {
    drawEnabledRef.current = drawEnabled;
  }, [drawEnabled]);

  useEffect(() => {
    pendingPolygonRef.current = pendingPolygon;
  }, [pendingPolygon]);

  const syncTerritoriesToMap = useCallback((nextTerritories: TerritorySummary[]) => {
    const map = mapRef.current;
    if (!map || !mapReadyRef.current) {
      return;
    }

    const source = map.getSource(TERRITORIES_SOURCE_ID) as GeoJSONSource | undefined;
    source?.setData(territoriesToFeatureCollection(nextTerritories));
  }, []);

  useEffect(() => {
    if (!token || !containerRef.current) {
      return;
    }

    let cancelled = false;

    void (async () => {
      const mapboxgl = (await import("mapbox-gl")).default;
      const MapboxDraw = (await import("@mapbox/mapbox-gl-draw")).default;

      if (cancelled || !containerRef.current) {
        return;
      }

      await waitForElementSize(containerRef.current);
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

      const draw = new MapboxDraw({
        displayControlsDefault: false,
        controls: {
          polygon: false,
          trash: false,
        },
        defaultMode: "simple_select",
      });

      map.addControl(draw, "top-right");
      mapRef.current = map;
      drawRef.current = draw;

      map.on("load", () => {
        if (cancelled) {
          return;
        }

        map.doubleClickZoom.disable();

        const beforeDraw = firstDrawLayerId(map);

        map.addSource(TERRITORIES_SOURCE_ID, {
          type: "geojson",
          data: territoriesToFeatureCollection([]),
        });

        map.addSource(PENDING_SOURCE_ID, {
          type: "geojson",
          data: pendingPolygonToFeatureCollection(null),
        });

        map.addLayer(
          {
            id: TERRITORIES_FILL_LAYER_ID,
            type: "fill",
            source: TERRITORIES_SOURCE_ID,
            paint: {
              "fill-color": TERRITORY_FILL_COLOR,
              "fill-opacity": 0.28,
            },
          },
          beforeDraw,
        );

        map.addLayer(
          {
            id: TERRITORIES_LINE_LAYER_ID,
            type: "line",
            source: TERRITORIES_SOURCE_ID,
            paint: {
              "line-color": TERRITORY_FILL_COLOR,
              "line-width": 2,
            },
          },
          beforeDraw,
        );

        map.addLayer(
          {
            id: TERRITORIES_SELECTED_FILL_LAYER_ID,
            type: "fill",
            source: TERRITORIES_SOURCE_ID,
            filter: ["==", ["get", "id"], ""],
            paint: {
              "fill-color": TERRITORY_SELECTED_COLOR,
              "fill-opacity": 0.35,
            },
          },
          beforeDraw,
        );

        map.addLayer(
          {
            id: TERRITORIES_SELECTED_LINE_LAYER_ID,
            type: "line",
            source: TERRITORIES_SOURCE_ID,
            filter: ["==", ["get", "id"], ""],
            paint: {
              "line-color": TERRITORY_SELECTED_COLOR,
              "line-width": 3,
            },
          },
          beforeDraw,
        );

        map.addLayer(
          {
            id: PENDING_FILL_LAYER_ID,
            type: "fill",
            source: PENDING_SOURCE_ID,
            paint: {
              "fill-color": TERRITORY_PENDING_COLOR,
              "fill-opacity": 0.35,
            },
          },
          beforeDraw,
        );

        map.addLayer(
          {
            id: PENDING_LINE_LAYER_ID,
            type: "line",
            source: PENDING_SOURCE_ID,
            paint: {
              "line-color": TERRITORY_PENDING_COLOR,
              "line-width": 3,
              "line-dasharray": [2, 1],
            },
          },
          beforeDraw,
        );

        mapReadyRef.current = true;
        setMapLoaded(true);
        requestAnimationFrame(() => map.resize());

        if (drawEnabledRef.current) {
          safeDrawMode(draw, "draw_polygon");
        }
      });

      map.on("draw.create", (event: { features: GeoJSON.Feature[] }) => {
        if (isCapturingRef.current) {
          return;
        }

        const feature = event.features[0];
        if (!feature?.geometry || feature.geometry.type !== "Polygon") {
          return;
        }

        isCapturingRef.current = true;
        onPolygonDrawnRef.current(feature.geometry as GeoJsonPolygon);

        requestAnimationFrame(() => {
          safeDrawMode(draw, "simple_select");
          isCapturingRef.current = false;
        });
      });
    })();

    return () => {
      cancelled = true;
      mapReadyRef.current = false;
      setMapLoaded(false);
      drawRef.current = null;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [token, syncTerritoriesToMap]);

  useEffect(() => {
    syncTerritoriesToMap(territories);
  }, [territories, syncTerritoriesToMap]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReadyRef.current) {
      return;
    }

    const filter: FilterSpecification = [
      "==",
      ["get", "id"],
      selectedId ?? "",
    ];

    if (map.getLayer(TERRITORIES_SELECTED_FILL_LAYER_ID)) {
      map.setFilter(TERRITORIES_SELECTED_FILL_LAYER_ID, filter);
    }
    if (map.getLayer(TERRITORIES_SELECTED_LINE_LAYER_ID)) {
      map.setFilter(TERRITORIES_SELECTED_LINE_LAYER_ID, filter);
    }
  }, [selectedId]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReadyRef.current) {
      return;
    }

    const territoryVisibility = drawEnabled ? "none" : "visible";

    for (const layerId of [
      TERRITORIES_FILL_LAYER_ID,
      TERRITORIES_LINE_LAYER_ID,
      TERRITORIES_SELECTED_FILL_LAYER_ID,
      TERRITORIES_SELECTED_LINE_LAYER_ID,
    ]) {
      if (map.getLayer(layerId)) {
        map.setLayoutProperty(layerId, "visibility", territoryVisibility);
      }
    }
  }, [drawEnabled]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReadyRef.current) {
      return;
    }

    const source = map.getSource(PENDING_SOURCE_ID) as GeoJSONSource | undefined;
    source?.setData(pendingPolygonToFeatureCollection(pendingPolygon));
  }, [pendingPolygon]);

  useEffect(() => {
    const draw = drawRef.current;
    if (!draw || !mapReadyRef.current) {
      return;
    }

    if (drawEnabled && !pendingPolygon) {
      try {
        draw.deleteAll();
      } catch {
        // Feature may already be cleared after capture.
      }
      safeDrawMode(draw, "draw_polygon");
      return;
    }

    if (
      !drawEnabled &&
      (draw as { getMode?: () => string }).getMode?.() === "draw_polygon"
    ) {
      safeDrawMode(draw, "simple_select");
    }
  }, [drawEnabled, pendingPolygon]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReadyRef.current || !selectedId) {
      return;
    }

    const territory = territories.find((item) => item.id === selectedId);
    if (!territory) {
      return;
    }

    map.fitBounds(boundsForTerritory(territory), {
      padding: 48,
      maxZoom: 15,
      duration: 600,
    });
  }, [selectedId, territories]);

  if (!token) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-secondary p-8 text-center">
        <p className="text-lg font-semibold text-foreground">Mapbox not configured</p>
        <p className="max-w-md text-sm text-muted-foreground">
          Add{" "}
          <code className="rounded bg-secondary px-1 py-0.5">
            NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN
          </code>{" "}
          to <code className="rounded bg-secondary px-1 py-0.5">.env.local</code>{" "}
          when you have credentials. See{" "}
          <span className="font-medium">docs/SETUP_KEYS.md</span> for setup steps.
        </p>
      </div>
    );
  }

  return (
    <div className="absolute inset-0">
      <div
        ref={containerRef}
        className="h-full w-full touch-manipulation"
        aria-label="Territory map"
      />
    </div>
  );
});
