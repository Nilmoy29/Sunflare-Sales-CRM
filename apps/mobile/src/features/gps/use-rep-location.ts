import { useCallback, useEffect, useState } from "react";
import * as Location from "expo-location";

export type RepLocation = {
  lat: number;
  lng: number;
};

export function useRepLocation(enabled: boolean) {
  const [userLocation, setUserLocation] = useState<RepLocation | null>(null);
  const [geoWarning, setGeoWarning] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      setUserLocation(null);
      setGeoWarning(null);
      return;
    }

    let cancelled = false;
    let subscription: Location.LocationSubscription | null = null;

    async function start() {
      const permission = await Location.getForegroundPermissionsAsync();
      if (permission.status !== "granted") {
        if (!cancelled) {
          setGeoWarning("Location permission is required to show your position.");
        }
        return;
      }

      subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          distanceInterval: 5,
        },
        (position) => {
          if (!cancelled) {
            setUserLocation({
              lat: position.coords.latitude,
              lng: position.coords.longitude,
            });
            setGeoWarning(null);
          }
        },
      );
    }

    void start();

    return () => {
      cancelled = true;
      subscription?.remove();
    };
  }, [enabled]);

  const refreshLocation = useCallback(async (): Promise<RepLocation | null> => {
    const permission = await Location.getForegroundPermissionsAsync();
    if (permission.status !== "granted") {
      return null;
    }
    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    const next = {
      lat: position.coords.latitude,
      lng: position.coords.longitude,
    };
    setUserLocation(next);
    return next;
  }, []);

  return { userLocation, geoWarning, refreshLocation };
}
