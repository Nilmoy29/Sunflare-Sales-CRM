"use client";

import { useEffect, useState } from "react";

export type RepLocation = {
  lat: number;
  lng: number;
};

export function useRepLocation(enabled: boolean) {
  const [userLocation, setUserLocation] = useState<RepLocation | null>(null);
  const [watchGeoWarning, setWatchGeoWarning] = useState<string | null>(null);

  const geoWarning =
    typeof navigator !== "undefined" && !navigator.geolocation
      ? "Geolocation is not available on this device."
      : watchGeoWarning;

  useEffect(() => {
    if (!enabled) {
      return;
    }

    if (!navigator.geolocation) {
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setWatchGeoWarning(null);
      },
      (e) => {
        setWatchGeoWarning(
          e instanceof GeolocationPositionError
            ? "Location access is off — live marker paused until permission is granted."
            : "Location unavailable — live marker paused.",
        );
      },
      {
        enableHighAccuracy: true,
        maximumAge: 10_000,
      },
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [enabled]);

  return { userLocation, geoWarning };
}
