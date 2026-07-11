import Mapbox from "@rnmapbox/maps";
import type { Feature, Point } from "geojson";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { clampMapBbox, DOOR_OUTCOMES, type MapBbox } from "@sunflare/shared";
import { doorOutcomeMapboxColorExpression } from "@/lib/geo/door-outcome-colors";
import {
  emptyFeatureCollection,
  knocksToFeatureCollection,
  territoriesToFeatureCollection,
} from "@/lib/geo/map-geojson";
import { DEFAULT_MAP_STYLE } from "@/lib/geo/mapbox";
import type {
  KnockPin,
  PendingKnockPin,
  SelectedMapKnockPin,
} from "@/features/knocks/types";
import type { RepLocation } from "@/features/gps/use-rep-location";
import type { RepTerritoryOverlay } from "@/features/territories/use-rep-territories";
import { useMapKnocks } from "@/features/knocks/use-map-knocks";

const MOVEEND_DEBOUNCE_MS = 300;
const USER_LOCATION_ZOOM = 16;

const KNOCKS_SOURCE_ID = "knocks";
const CLUSTER_LAYER_ID = "knocks-clusters";
const CLUSTER_COUNT_LAYER_ID = "knocks-cluster-count";
const UNCLUSTERED_LAYER_ID = "knocks-unclustered";
const TERRITORIES_SOURCE_ID = "rep-territories";
const TERRITORIES_FILL_LAYER_ID = "rep-territories-fill";
const TERRITORIES_LINE_LAYER_ID = "rep-territories-line";

type KnockMapProps = {
  userLocation: RepLocation | null;
  knockRefreshKey?: number;
  pendingKnocks?: PendingKnockPin[];
  territoryOverlays?: RepTerritoryOverlay[];
  onMapPress?: (coords: { lat: number; lng: number }) => void;
  onPinPress?: (knock: SelectedMapKnockPin) => void;
};

function knockPinFromFeature(
  feature: Feature,
  coords: { lat: number; lng: number },
): SelectedMapKnockPin | null {
  const props = feature.properties;
  if (!props?.id || props.outcome == null || !props.knocked_at) {
    return null;
  }

  const outcome = String(props.outcome);
  if (!DOOR_OUTCOMES.includes(outcome as (typeof DOOR_OUTCOMES)[number])) {
    return null;
  }

  return {
    id: String(props.id),
    lat: coords.lat,
    lng: coords.lng,
    outcome: outcome as SelectedMapKnockPin["outcome"],
    knocked_at: String(props.knocked_at),
    pending: props.pending === true || props.pending === "true",
  };
}

export function KnockMap({
  userLocation,
  knockRefreshKey = 0,
  pendingKnocks = [],
  territoryOverlays = [],
  onMapPress,
  onPinPress,
}: KnockMapProps) {
  const mapRef = useRef<Mapbox.MapView>(null);
  const cameraRef = useRef<Mapbox.Camera>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasCenteredOnUserRef = useRef(false);
  const suppressMapPressRef = useRef(false);
  const suppressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onMapPressRef = useRef(onMapPress);
  const onPinPressRef = useRef(onPinPress);

  onMapPressRef.current = onMapPress;
  onPinPressRef.current = onPinPress;

  const [bbox, setBbox] = useState<MapBbox | null>(null);

  const { knocks } = useMapKnocks(bbox, knockRefreshKey);

  const knockShape = useMemo(
    () => knocksToFeatureCollection(knocks, pendingKnocks),
    [knocks, pendingKnocks],
  );

  const territoryShape = useMemo(
    () =>
      territoryOverlays.length > 0
        ? territoriesToFeatureCollection(territoryOverlays)
        : emptyFeatureCollection(),
    [territoryOverlays],
  );

  const updateBboxFromMap = useCallback(async () => {
    const map = mapRef.current;
    if (!map) {
      return;
    }

    const bounds = await map.getVisibleBounds();
    if (!bounds) {
      return;
    }

    const [ne, sw] = bounds;
    setBbox(
      clampMapBbox({
        west: sw[0],
        south: sw[1],
        east: ne[0],
        north: ne[1],
      }),
    );
  }, []);

  const handleRegionDidChange = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      void updateBboxFromMap();
    }, MOVEEND_DEBOUNCE_MS);
  }, [updateBboxFromMap]);

  useEffect(() => {
    if (!userLocation || hasCenteredOnUserRef.current) {
      return;
    }

    hasCenteredOnUserRef.current = true;
    cameraRef.current?.setCamera({
      centerCoordinate: [userLocation.lng, userLocation.lat],
      zoomLevel: USER_LOCATION_ZOOM,
      animationDuration: 0,
    });
    void updateBboxFromMap();
  }, [userLocation, updateBboxFromMap]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      if (suppressTimerRef.current) {
        clearTimeout(suppressTimerRef.current);
      }
    };
  }, []);

  const handlePinPress = useCallback((event: { features: Feature[] }) => {
    const feature = event.features[0];
    if (!feature || feature.geometry.type !== "Point") {
      return;
    }

    if (
      feature.properties &&
      "point_count" in feature.properties &&
      feature.properties.point_count
    ) {
      return;
    }

    const [lng, lat] = (feature.geometry as Point).coordinates;
    const knock = knockPinFromFeature(feature, { lat, lng });
    if (!knock) {
      return;
    }

    suppressMapPressRef.current = true;
    if (suppressTimerRef.current) {
      clearTimeout(suppressTimerRef.current);
    }
    suppressTimerRef.current = setTimeout(() => {
      suppressMapPressRef.current = false;
      suppressTimerRef.current = null;
    }, 300);

    onPinPressRef.current?.(knock);
  }, []);

  return (
    <View style={styles.container}>
      <Mapbox.MapView
        ref={mapRef}
        style={styles.map}
        styleURL={DEFAULT_MAP_STYLE}
        onPress={(event) => {
          if (suppressMapPressRef.current) {
            return;
          }
          const { geometry } = event;
          if (geometry.type === "Point") {
            const [lng, lat] = geometry.coordinates;
            onMapPressRef.current?.({ lat, lng });
          }
        }}
        onRegionDidChange={handleRegionDidChange}
        onDidFinishLoadingMap={() => {
          void updateBboxFromMap();
        }}
      >
        <Mapbox.Camera ref={cameraRef} />

        {territoryOverlays.length > 0 ? (
          <Mapbox.ShapeSource id={TERRITORIES_SOURCE_ID} shape={territoryShape}>
            <Mapbox.FillLayer
              id={TERRITORIES_FILL_LAYER_ID}
              style={{
                fillColor: "#10b981",
                fillOpacity: 0.15,
              }}
            />
            <Mapbox.LineLayer
              id={TERRITORIES_LINE_LAYER_ID}
              style={{
                lineColor: "#059669",
                lineWidth: 2,
              }}
            />
          </Mapbox.ShapeSource>
        ) : null}

        <Mapbox.ShapeSource
          id={KNOCKS_SOURCE_ID}
          shape={knockShape}
          cluster
          clusterRadius={50}
          onPress={handlePinPress}
        >
          <Mapbox.CircleLayer
            id={CLUSTER_LAYER_ID}
            filter={["has", "point_count"]}
            style={{
              circleColor: "#64748b",
              circleRadius: 18,
              circleOpacity: 0.85,
            }}
          />
          <Mapbox.SymbolLayer
            id={CLUSTER_COUNT_LAYER_ID}
            filter={["has", "point_count"]}
            style={{
              textField: ["get", "point_count_abbreviated"],
              textSize: 12,
              textColor: "#ffffff",
            }}
          />
          <Mapbox.CircleLayer
            id={UNCLUSTERED_LAYER_ID}
            filter={["!", ["has", "point_count"]]}
            style={{
              circleColor: doorOutcomeMapboxColorExpression(),
              circleRadius: 8,
              circleStrokeWidth: 2,
              circleStrokeColor: "#ffffff",
            }}
          />
        </Mapbox.ShapeSource>

        <Mapbox.UserLocation visible showsUserHeadingIndicator />
      </Mapbox.MapView>
    </View>
  );
}

export type { KnockPin };

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
});
