import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { DoorOutcomeSheet } from "@/components/door-outcome-sheet";
import { KnockMap } from "@/components/knock-map";
import { LogKnockFab } from "@/components/log-knock-fab";
import { PendingSyncBanner } from "@/components/pending-sync-banner";
import { ShiftControls } from "@/components/shift-controls";
import { useRepLocation } from "@/features/gps/use-rep-location";
import {
  isPromotableDoorOutcome,
  type SubmitKnockResult,
} from "@/features/knocks/submit-knock";
import type { KnockDraft } from "@/features/knocks/types";
import { useKnockSyncLoop } from "@/features/knocks/use-knock-sync-loop";
import { usePendingKnocks } from "@/features/knocks/use-pending-knocks";
import { useActiveShift } from "@/features/shifts/use-active-shift";
import { useRepTerritories } from "@/features/territories/use-rep-territories";
import { isMapboxConfigured } from "@/lib/geo/mapbox";

function isPointInRing(
  lng: number,
  lat: number,
  ring: number[][],
): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i]?.[0] ?? 0;
    const yi = ring[i]?.[1] ?? 0;
    const xj = ring[j]?.[0] ?? 0;
    const yj = ring[j]?.[1] ?? 0;
    const intersect =
      yi > lat !== yj > lat &&
      lng < ((xj - xi) * (lat - yi)) / (yj - yi + Number.EPSILON) + xi;
    if (intersect) {
      inside = !inside;
    }
  }
  return inside;
}

function isPointInTerritory(
  lng: number,
  lat: number,
  geometry: { type: "Polygon"; coordinates: number[][][] },
): boolean {
  const outer = geometry.coordinates[0];
  if (!outer) {
    return false;
  }
  return isPointInRing(lng, lat, outer);
}

export default function MapScreen() {
  const {
    isActive,
    loading,
    busy,
    error,
    permissionMessage,
    onStart,
    onEnd,
    openSettings,
    lastEndedSummary,
    dismissEndedSummary,
  } = useActiveShift();

  const { territories, error: territoryError } = useRepTerritories(isActive);
  const { userLocation, geoWarning } = useRepLocation(isActive);
  const { pendingKnocks, pendingCount, refreshPendingKnocks } =
    usePendingKnocks();

  const [knockDraft, setKnockDraft] = useState<KnockDraft | null>(null);
  const [knockRefreshKey, setKnockRefreshKey] = useState(0);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);

  const handleSynced = useCallback(() => {
    setKnockRefreshKey((key) => key + 1);
    void refreshPendingKnocks();
  }, [refreshPendingKnocks]);

  const { syncBlockedMessage } = useKnockSyncLoop({
    enabled: isActive,
    onSynced: handleSynced,
  });

  const territoryWarning = useMemo(() => {
    if (!knockDraft || territories.length === 0) {
      return null;
    }
    const inside = territories.some((territory) =>
      isPointInTerritory(knockDraft.lng, knockDraft.lat, territory.geometry),
    );
    return inside ? null : "Outside your assigned territory for today";
  }, [knockDraft, territories]);

  useEffect(() => {
    if (!saveNotice) {
      return;
    }
    const timer = setTimeout(() => setSaveNotice(null), 4000);
    return () => clearTimeout(timer);
  }, [saveNotice]);

  useEffect(() => {
    if (!isActive) {
      setKnockDraft(null);
    }
  }, [isActive]);

  function confirmEndShift() {
    Alert.alert(
      "End shift?",
      "GPS tracking will stop and your shift summary will be saved.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "End Shift", style: "destructive", onPress: () => void onEnd() },
      ],
    );
  }

  function openDraft(coords: { lat: number; lng: number }, source: KnockDraft["source"]) {
    setKnockDraft({ lat: coords.lat, lng: coords.lng, source });
  }

  function handleKnockSaved(result: SubmitKnockResult) {
    if (result.mode === "online") {
      setKnockRefreshKey((key) => key + 1);
      if (result.lead) {
        setSaveNotice("Knock saved · Added to pipeline");
      } else {
        setSaveNotice("Knock saved");
      }
    } else if (isPromotableDoorOutcome(result.pending.outcome)) {
      setSaveNotice("Knock saved offline · Will add to pipeline when synced");
    } else {
      setSaveNotice("Knock saved offline");
    }
    setKnockDraft(null);
    void refreshPendingKnocks();
  }

  if (!isMapboxConfigured()) {
    return (
      <View style={styles.placeholder}>
        <Text style={styles.title}>Map unavailable</Text>
        <Text style={styles.body}>
          Set EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN in apps/mobile/.env (public pk.*
          token only).
        </Text>
      </View>
    );
  }

  if (!isActive) {
    return (
      <View style={styles.inactive}>
        <Text style={styles.inactiveTitle}>Rep map</Text>
        <Text style={styles.inactiveBody}>
          Start your shift to open the map, see your live location, and log door
          knocks on the route.
        </Text>
        <ShiftControls
          isActive={isActive}
          loading={loading}
          busy={busy}
          error={error}
          permissionMessage={permissionMessage}
          onStart={onStart}
          onEnd={confirmEndShift}
          onOpenSettings={openSettings}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <KnockMap
        userLocation={userLocation}
        knockRefreshKey={knockRefreshKey}
        pendingKnocks={pendingKnocks}
        territoryOverlays={territories}
        onMapPress={(coords) => openDraft(coords, "map_tap")}
      />

      <View style={styles.topBanners} pointerEvents="box-none">
        <PendingSyncBanner
          count={pendingCount}
          syncBlockedMessage={syncBlockedMessage}
        />
        {territoryError ? (
          <Text style={styles.territoryError}>
            Could not load territory: {territoryError}
          </Text>
        ) : null}
        {territories.length === 0 && !territoryError ? (
          <Text style={styles.territoryEmpty}>No territory assigned today</Text>
        ) : null}
        {saveNotice ? <Text style={styles.saveNotice}>{saveNotice}</Text> : null}
        {geoWarning ? <Text style={styles.geoWarning}>{geoWarning}</Text> : null}
      </View>

      <LogKnockFab
        disabled={!userLocation}
        disabledReason={geoWarning}
        onPress={() => {
          if (userLocation) {
            openDraft(userLocation, "gps_quick_add");
          }
        }}
      />

      <ShiftControls
        isActive={isActive}
        loading={loading}
        busy={busy}
        error={error}
        permissionMessage={permissionMessage}
        onStart={onStart}
        onEnd={confirmEndShift}
        onOpenSettings={openSettings}
      />

      {lastEndedSummary ? (
        <View style={styles.summary}>
          <Text style={styles.summaryTitle}>Shift ended</Text>
          <Text style={styles.summaryBody}>
            Doors: {lastEndedSummary.doors} · Calls: {lastEndedSummary.calls} ·
            Leads: {lastEndedSummary.leads_added}
          </Text>
          <Text style={styles.summaryDismiss} onPress={dismissEndedSummary}>
            Dismiss
          </Text>
        </View>
      ) : null}

      <DoorOutcomeSheet
        visible={knockDraft !== null}
        draft={knockDraft}
        territoryWarning={territoryWarning}
        onClose={() => setKnockDraft(null)}
        onSuccess={handleKnockSaved}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  placeholder: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#f8fafc",
  },
  inactive: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    backgroundColor: "#fff",
  },
  inactiveTitle: { fontSize: 20, fontWeight: "700", marginBottom: 8 },
  inactiveBody: {
    fontSize: 15,
    color: "#52525b",
    textAlign: "center",
    lineHeight: 22,
    maxWidth: 320,
    marginBottom: 24,
  },
  title: { fontSize: 18, fontWeight: "600", marginBottom: 8 },
  body: { fontSize: 15, color: "#475569", lineHeight: 22 },
  topBanners: {
    position: "absolute",
    top: 12,
    left: 12,
    right: 12,
    alignItems: "center",
    gap: 8,
  },
  territoryError: {
    fontSize: 12,
    color: "#78350f",
    backgroundColor: "#fffbeb",
    padding: 8,
    borderRadius: 8,
    maxWidth: 320,
    textAlign: "center",
  },
  territoryEmpty: {
    fontSize: 12,
    color: "#52525b",
    backgroundColor: "#fff",
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e4e4e7",
  },
  saveNotice: {
    fontSize: 13,
    fontWeight: "600",
    color: "#18181b",
    backgroundColor: "#fff",
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#d4d4d8",
  },
  geoWarning: {
    fontSize: 12,
    color: "#78350f",
    backgroundColor: "#fffbeb",
    padding: 8,
    borderRadius: 8,
  },
  summary: {
    position: "absolute",
    left: 12,
    right: 140,
    bottom: 24,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  summaryTitle: { fontSize: 16, fontWeight: "600", marginBottom: 4 },
  summaryBody: { fontSize: 14, color: "#475569" },
  summaryDismiss: {
    marginTop: 8,
    color: "#1d4ed8",
    fontSize: 14,
    fontWeight: "600",
  },
});
