"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { DoorOutcomeSheet } from "@/components/rep/door-outcome-sheet";
import { LogKnockButton } from "@/components/rep/log-knock-button";
import { OfflinePendingIndicator } from "@/components/rep/offline-pending-indicator";
import { ShiftControls } from "@/components/rep/shift-controls";
import { ShiftEndSummarySheet } from "@/components/rep/shift-end-summary-sheet";
import { useRepLocation } from "@/features/gps/use-rep-location";
import { useGpsPingLoop } from "@/features/gps/use-gps-ping-loop";
import { useKnockDraft } from "@/features/knocks/use-knock-draft";
import { useKnockSyncLoop } from "@/features/knocks/use-knock-sync-loop";
import { usePendingKnocks } from "@/features/knocks/use-pending-knocks";
import type { SubmitKnockResult } from "@/features/knocks/submit-knock";
import { isPromotableDoorOutcome } from "@/lib/validators/leads";
import { useActiveShift } from "@/features/shifts/use-active-shift";
import { useRepTerritoryOverlay } from "@/features/territories/use-rep-territory-overlay";
import { isPointInAnyTerritory } from "@/lib/geo/point-in-polygon";

const MapCanvas = dynamic(
  () =>
    import("@/components/rep/map-canvas").then((module) => module.MapCanvas),
  {
    ssr: false,
    loading: () => (
      <div className="flex flex-1 items-center justify-center text-sm text-zinc-600">
        Loading map…
      </div>
    ),
  },
);

export function RepMapShiftShell() {
  const { shift, isActive, loading, busy, error, lastEndedSummary, dismissEndedSummary, onStart, onEnd } =
    useActiveShift();

  const { territories: territoryOverlays } = useRepTerritoryOverlay({
    enabled: isActive,
  });

  const { userLocation, geoWarning: locationGeoWarning } =
    useRepLocation(isActive);

  const { draft, isOpen, openDraft, closeDraft } = useKnockDraft();
  const [knockRefreshKey, setKnockRefreshKey] = useState(0);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);
  const { pendingKnocks, pendingCount } = usePendingKnocks();

  const handleSynced = useCallback(() => {
    setKnockRefreshKey((key) => key + 1);
  }, []);

  useKnockSyncLoop({
    enabled: isActive,
    onSynced: handleSynced,
  });

  const handleKnockSaved = useCallback(
    (result: SubmitKnockResult) => {
      if (result.mode === "online") {
        setKnockRefreshKey((key) => key + 1);
        if (result.lead) {
          setSaveNotice("Knock saved · Added to pipeline");
        } else {
          setSaveNotice("Knock saved");
        }
      } else if (isPromotableDoorOutcome(result.pending.outcome)) {
        setSaveNotice(
          "Knock saved offline · Will add to pipeline when synced",
        );
      } else {
        setSaveNotice("Knock saved offline");
      }
      closeDraft();
    },
    [closeDraft],
  );

  useEffect(() => {
    if (!saveNotice) {
      return;
    }
    const timer = window.setTimeout(() => {
      setSaveNotice(null);
    }, 4000);
    return () => {
      window.clearTimeout(timer);
    };
  }, [saveNotice]);

  const { geoWarning, pingWarning } = useGpsPingLoop({
    shiftId: shift?.id ?? null,
    enabled: isActive,
  });

  useEffect(() => {
    if (!isActive) {
      closeDraft();
    }
  }, [isActive, closeDraft]);

  const handleMapClick = (coords: { lat: number; lng: number }) => {
    openDraft({
      lat: coords.lat,
      lng: coords.lng,
      source: "map_tap",
    });
  };

  const handlePinClick = (coords: { lat: number; lng: number }) => {
    openDraft({
      lat: coords.lat,
      lng: coords.lng,
      source: "map_tap",
    });
  };

  const handleLogKnock = () => {
    if (!userLocation) {
      return;
    }
    openDraft({
      lat: userLocation.lat,
      lng: userLocation.lng,
      source: "gps_quick_add",
    });
  };

  const territoryWarning = useMemo(() => {
    if (!draft || territoryOverlays.length === 0) {
      return null;
    }

    if (isPointInAnyTerritory(draft.lng, draft.lat, territoryOverlays)) {
      return null;
    }

    return "Outside your assigned territory for today";
  }, [draft, territoryOverlays]);

  return (
    <>
      <main className="relative flex min-h-0 flex-1 flex-col">
        {isActive ? (
          <>
            <div className="pointer-events-none absolute inset-x-0 top-4 z-10 flex flex-col items-center gap-2 px-4">
              <OfflinePendingIndicator count={pendingCount} />
              {saveNotice ? (
                <p
                  className="rounded-lg bg-zinc-900/90 px-4 py-2 text-sm font-medium text-white shadow-lg"
                  role="status"
                  aria-live="polite"
                >
                  {saveNotice}
                </p>
              ) : null}
            </div>
            <MapCanvas
              userLocation={userLocation}
              geoWarning={locationGeoWarning}
              knockRefreshKey={knockRefreshKey}
              pendingKnocks={pendingKnocks}
              territoryOverlays={territoryOverlays}
              onMapClick={handleMapClick}
              onPinClick={handlePinClick}
            />
            <LogKnockButton
              disabled={!userLocation}
              disabledReason={locationGeoWarning}
              onClick={handleLogKnock}
            />
            {isOpen && draft ? (
              <DoorOutcomeSheet
                key={`${draft.lat}-${draft.lng}-${draft.source}`}
                draft={draft}
                territoryWarning={territoryWarning}
                onClose={closeDraft}
                onSuccess={handleKnockSaved}
              />
            ) : null}
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
            <h1 className="text-2xl font-semibold text-zinc-900">Rep map</h1>
            <p className="max-w-md text-sm text-zinc-600">
              Start your shift to open the map, see your live location, and log
              door knocks on the route.
            </p>
          </div>
        )}
      </main>
      <ShiftControls
        isActive={isActive}
        loading={loading}
        busy={busy}
        error={error}
        geoWarning={geoWarning}
        pingWarning={pingWarning}
        onStart={() => {
          void onStart();
        }}
        onEnd={() => {
          void onEnd();
        }}
      />
      {lastEndedSummary ? (
        <ShiftEndSummarySheet
          summary={lastEndedSummary}
          onDismiss={dismissEndedSummary}
        />
      ) : null}
    </>
  );
}
