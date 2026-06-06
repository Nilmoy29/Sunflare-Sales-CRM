"use client";

import { useEffect, useState } from "react";
import { postGpsPing } from "@/features/shifts/api";
import { GPS_PING_INTERVAL_MS } from "@/lib/validators/shifts";

type UseGpsPingLoopOptions = {
  shiftId: string | null;
  enabled: boolean;
  intervalMs?: number;
};

function readPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation unavailable"));
      return;
    }

    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 15_000,
      maximumAge: 30_000,
    });
  });
}

export function useGpsPingLoop({
  shiftId,
  enabled,
  intervalMs = GPS_PING_INTERVAL_MS,
}: UseGpsPingLoopOptions) {
  const [geoWarning, setGeoWarning] = useState<string | null>(null);
  const [pingWarning, setPingWarning] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || !shiftId) {
      return;
    }

    let cancelled = false;

    const sendPing = async () => {
      if (cancelled) {
        return;
      }

      try {
        const position = await readPosition();
        if (cancelled) {
          return;
        }
        setGeoWarning(null);

        try {
          await postGpsPing({
            shift_id: shiftId,
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
          if (!cancelled) {
            setPingWarning(null);
          }
        } catch (e) {
          if (!cancelled) {
            setPingWarning(
              e instanceof Error
                ? e.message
                : "Failed to record GPS ping",
            );
          }
        }
      } catch (e) {
        if (cancelled) {
          return;
        }
        setGeoWarning(
          e instanceof GeolocationPositionError
            ? "Location access is off — GPS trail paused until permission is granted."
            : e instanceof Error
              ? e.message
              : "GPS trail paused",
        );
      }
    };

    void sendPing();
    const intervalId = setInterval(() => {
      void sendPing();
    }, intervalMs);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [enabled, shiftId, intervalMs]);

  const active = enabled && shiftId;

  return {
    geoWarning: active ? geoWarning : null,
    pingWarning: active ? pingWarning : null,
  };
}
