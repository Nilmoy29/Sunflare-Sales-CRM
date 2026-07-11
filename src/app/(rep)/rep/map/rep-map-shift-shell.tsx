"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { AddLeadButton } from "@/components/rep/add-lead-button";
import { BookAppointmentSheet } from "@/components/rep/book-appointment-sheet";
import { DoorOutcomeSheet } from "@/components/rep/door-outcome-sheet";
import { KnockPinDetailSheet } from "@/components/rep/knock-pin-detail-sheet";
import { LogKnockButton } from "@/components/rep/log-knock-button";
import { OfflinePendingIndicator } from "@/components/rep/offline-pending-indicator";
import { ShiftControls } from "@/components/rep/shift-controls";
import { ShiftEndSummarySheet } from "@/components/rep/shift-end-summary-sheet";
import { useRepLocation } from "@/features/gps/use-rep-location";
import { useGpsPingLoop } from "@/features/gps/use-gps-ping-loop";
import { useAppointmentDraft } from "@/features/knocks/use-appointment-draft";
import { useKnockDraft } from "@/features/knocks/use-knock-draft";
import { useKnockSyncLoop } from "@/features/knocks/use-knock-sync-loop";
import { usePendingKnocks } from "@/features/knocks/use-pending-knocks";
import type { BookAppointmentResponse } from "@/lib/validators/book-appointment";
import type { SubmitKnockResult } from "@/features/knocks/submit-knock";
import { isPromotableDoorOutcome } from "@/lib/validators/leads";
import type { SelectedMapKnockPin } from "@/lib/validators/knocks";
import { useActiveShift } from "@/features/shifts/use-active-shift";
import { useRepTerritoryOverlay } from "@/features/territories/use-rep-territory-overlay";
import { isPointInAnyTerritory } from "@/lib/geo/point-in-polygon";

const MapCanvas = dynamic(
  () =>
    import("@/components/rep/map-canvas").then((module) => module.MapCanvas),
  {
    ssr: false,
    loading: () => (
      <div className="flex flex-1 items-center justify-center bg-white text-sm font-medium text-zinc-800">
        Loading map…
      </div>
    ),
  },
);

export function RepMapShiftShell() {
  const { shift, isActive, loading, busy, error, lastEndedSummary, dismissEndedSummary, onStart, onEnd } =
    useActiveShift();

  const { territories: territoryOverlays, error: territoryOverlayError } =
    useRepTerritoryOverlay({
      enabled: isActive,
    });

  const { userLocation, geoWarning: locationGeoWarning } =
    useRepLocation(isActive);

  const { draft, isOpen, openDraft, closeDraft } = useKnockDraft();
  const {
    draft: appointmentDraft,
    isOpen: isAppointmentOpen,
    openDraft: openAppointmentDraft,
    closeDraft: closeAppointmentDraft,
  } = useAppointmentDraft();
  const [knockRefreshKey, setKnockRefreshKey] = useState(0);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);
  const [selectedPin, setSelectedPin] = useState<SelectedMapKnockPin | null>(
    null,
  );
  const { pendingKnocks, pendingCount } = usePendingKnocks();

  const handleSynced = useCallback(() => {
    setSelectedPin(null);
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

  const handleAppointmentBooked = useCallback(
    (_result: BookAppointmentResponse) => {
      setKnockRefreshKey((key) => key + 1);
      setSaveNotice("Appointment booked · Added to pipeline");
      closeAppointmentDraft();
    },
    [closeAppointmentDraft],
  );

  useEffect(() => {
    if (!isActive) {
      closeDraft();
      closeAppointmentDraft();
      setSelectedPin(null);
    }
  }, [isActive, closeDraft, closeAppointmentDraft]);

  const handleMapClick = (coords: { lat: number; lng: number }) => {
    setSelectedPin(null);
    closeAppointmentDraft();
    openDraft({
      lat: coords.lat,
      lng: coords.lng,
      source: "map_tap",
    });
  };

  const handlePinClick = (knock: SelectedMapKnockPin) => {
    closeDraft();
    closeAppointmentDraft();
    setSelectedPin(knock);
  };

  const handleKnockAgain = (coords: { lat: number; lng: number }) => {
    setSelectedPin(null);
    closeAppointmentDraft();
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
    setSelectedPin(null);
    closeAppointmentDraft();
    openDraft({
      lat: userLocation.lat,
      lng: userLocation.lng,
      source: "gps_quick_add",
    });
  };

  const handleAddLead = () => {
    if (!userLocation) {
      return;
    }
    setSelectedPin(null);
    closeDraft();
    openAppointmentDraft({
      lat: userLocation.lat,
      lng: userLocation.lng,
      source: "gps_quick_add",
    });
  };

  const activeLocationDraft = appointmentDraft ?? draft;

  const territoryWarning = useMemo(() => {
    if (!activeLocationDraft || territoryOverlays.length === 0) {
      return null;
    }

    if (
      isPointInAnyTerritory(
        activeLocationDraft.lng,
        activeLocationDraft.lat,
        territoryOverlays,
      )
    ) {
      return null;
    }

    return "Outside your assigned territory for today";
  }, [activeLocationDraft, territoryOverlays]);

  return (
    <>
      <main className="relative flex min-h-0 flex-1 flex-col">
        {isActive ? (
          <>
            <div className="pointer-events-none absolute inset-x-0 top-4 z-10 flex flex-col items-center gap-2 px-4">
              <OfflinePendingIndicator count={pendingCount} />
              {territoryOverlayError ? (
                <p
                  className="max-w-[min(100%,24rem)] rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-center text-sm font-medium text-amber-950 shadow-lg"
                  role="status"
                  aria-live="polite"
                >
                  Could not load your assigned territory: {territoryOverlayError}
                </p>
              ) : null}
              {saveNotice ? (
                <p
                  className="max-w-[min(100%,20rem)] rounded-lg border border-zinc-300 bg-white px-4 py-2 text-center text-sm font-semibold text-zinc-950 shadow-lg"
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
            <div className="absolute bottom-4 right-4 z-10 flex flex-col items-end gap-3">
              <AddLeadButton
                disabled={!userLocation}
                disabledReason={locationGeoWarning}
                onClick={handleAddLead}
              />
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
            </div>
            {selectedPin ? (
              <KnockPinDetailSheet
                key={`pin-${selectedPin.id}`}
                knock={selectedPin}
                onClose={() => setSelectedPin(null)}
                onKnockAgain={handleKnockAgain}
              />
            ) : null}
            {isOpen && draft ? (
              <DoorOutcomeSheet
                key={`knock-${draft.lat}-${draft.lng}-${draft.source}`}
                draft={draft}
                territoryWarning={territoryWarning}
                onClose={closeDraft}
                onSuccess={handleKnockSaved}
              />
            ) : null}
            {isAppointmentOpen && appointmentDraft ? (
              <BookAppointmentSheet
                key={`appt-${appointmentDraft.lat}-${appointmentDraft.lng}-${appointmentDraft.source}`}
                draft={appointmentDraft}
                territoryWarning={territoryWarning}
                onClose={closeAppointmentDraft}
                onSuccess={handleAppointmentBooked}
              />
            ) : null}
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 bg-white p-6 text-center sm:p-8">
            <h1 className="text-xl font-semibold text-zinc-950 sm:text-2xl">
              Rep map
            </h1>
            <p className="max-w-md text-sm text-zinc-800">
              Start your shift to open the map, see your live location, and log
              door knocks on the route.
            </p>
            <div className="absolute bottom-4 right-4 z-10">
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
            </div>
          </div>
        )}
      </main>
      {lastEndedSummary ? (
        <ShiftEndSummarySheet
          summary={lastEndedSummary}
          onDismiss={dismissEndedSummary}
        />
      ) : null}
    </>
  );
}
