"use client";

import { useCallback, useEffect, useRef } from "react";
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

const TERRITORIES_SOURCE_ID = "territories-existing";
const TERRITORIES_FILL_LAYER_ID = "territories-fill";
const TERRITORIES_LINE_LAYER_ID = "territories-line";
const TERRITORIES_SELECTED_FILL_LAYER_ID = "territories-selected-fill";
const TERRITORIES_SELECTED_LINE_LAYER_ID = "territories-selected-line";

const TERRITORY_FILL_COLOR = "#3b82f6";
const TERRITORY_SELECTED_COLOR = "#f59e0b";

type TerritoryDrawToolProps = {
  territories: TerritorySummary[];
  selectedId: string | null;
  drawEnabled: boolean;
  onPolygonDrawn: (polygon: GeoJsonPolygon) => void;
};

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

export function TerritoryDrawTool({
  territories,
  selectedId,
  drawEnabled,
  onPolygonDrawn,
}: TerritoryDrawToolProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapboxMap | null>(null);
  const drawRef = useRef<import("@mapbox/mapbox-gl-draw").default | null>(null);
  const mapReadyRef = useRef(false);
  const drawEnabledRef = useRef(drawEnabled);
  const onPolygonDrawnRef = useRef(onPolygonDrawn);

  const token = getMapboxAccessToken();

  useEffect(() => {
    onPolygonDrawnRef.current = onPolygonDrawn;
  }, [onPolygonDrawn]);

  useEffect(() => {
    drawEnabledRef.current = drawEnabled;
  }, [drawEnabled]);

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
          polygon: true,
          trash: true,
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

        map.addSource(TERRITORIES_SOURCE_ID, {
          type: "geojson",
          data: territoriesToFeatureCollection([]),
        });

        map.addLayer({
          id: TERRITORIES_FILL_LAYER_ID,
          type: "fill",
          source: TERRITORIES_SOURCE_ID,
          paint: {
            "fill-color": TERRITORY_FILL_COLOR,
            "fill-opacity": 0.28,
          },
        });

        map.addLayer({
          id: TERRITORIES_LINE_LAYER_ID,
          type: "line",
          source: TERRITORIES_SOURCE_ID,
          paint: {
            "line-color": TERRITORY_FILL_COLOR,
            "line-width": 2,
          },
        });

        map.addLayer({
          id: TERRITORIES_SELECTED_FILL_LAYER_ID,
          type: "fill",
          source: TERRITORIES_SOURCE_ID,
          filter: ["==", ["get", "id"], ""],
          paint: {
            "fill-color": TERRITORY_SELECTED_COLOR,
            "fill-opacity": 0.35,
          },
        });

        map.addLayer({
          id: TERRITORIES_SELECTED_LINE_LAYER_ID,
          type: "line",
          source: TERRITORIES_SOURCE_ID,
          filter: ["==", ["get", "id"], ""],
          paint: {
            "line-color": TERRITORY_SELECTED_COLOR,
            "line-width": 3,
          },
        });

        mapReadyRef.current = true;

        if (drawEnabledRef.current) {
          draw.changeMode("draw_polygon");
        }
      });

      map.on("draw.create", (event: { features: GeoJSON.Feature[] }) => {
        const feature = event.features[0];
        if (!feature?.geometry || feature.geometry.type !== "Polygon") {
          return;
        }

        draw.deleteAll();
        draw.changeMode("simple_select");

        onPolygonDrawnRef.current(feature.geometry as GeoJsonPolygon);
      });
    })();

    return () => {
      cancelled = true;
      mapReadyRef.current = false;
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
    const draw = drawRef.current;
    if (!draw) {
      return;
    }

    if (drawEnabled) {
      draw.changeMode("draw_polygon");
    } else {
      draw.changeMode("simple_select");
    }
  }, [drawEnabled]);

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
      <div
        ref={containerRef}
        className="h-full w-full"
        aria-label="Territory map"
      />
    </div>
  );
}
