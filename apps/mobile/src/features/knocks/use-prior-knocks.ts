import { useEffect, useState } from "react";
import NetInfo from "@react-native-community/netinfo";
import { fetchKnocksNear } from "@/features/knocks/api";
import type { DuplicateAlert, PriorKnock } from "@/features/knocks/types";

type UsePriorKnocksResult = {
  priorKnocks: PriorKnock[];
  duplicateAlert: DuplicateAlert | null;
  loading: boolean;
  offline: boolean;
  error: string | null;
};

function loadKey(lat: number, lng: number): string {
  return `${lat.toFixed(6)},${lng.toFixed(6)}`;
}

export function usePriorKnocks(lat: number, lng: number): UsePriorKnocksResult {
  const [priorKnocks, setPriorKnocks] = useState<PriorKnock[]>([]);
  const [duplicateAlert, setDuplicateAlert] = useState<DuplicateAlert | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const [offline, setOffline] = useState(false);

  const requestKey = offline ? null : loadKey(lat, lng);
  const loading = requestKey !== null && loadedKey !== requestKey;

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const nowOffline = state.isConnected !== true;
      setOffline(nowOffline);
      if (nowOffline) {
        setPriorKnocks([]);
        setDuplicateAlert(null);
        setError(null);
        setLoadedKey(null);
      }
    });

    void NetInfo.fetch().then((state) => {
      setOffline(state.isConnected !== true);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!requestKey) {
      return;
    }

    let cancelled = false;
    const controller = new AbortController();

    async function load() {
      try {
        const data = await fetchKnocksNear(lat, lng, controller.signal);
        if (cancelled) {
          return;
        }
        setPriorKnocks(data.priorKnocks);
        setDuplicateAlert(data.duplicateAlert);
        setError(null);
        setLoadedKey(requestKey);
      } catch (e: unknown) {
        if (cancelled) {
          return;
        }
        setPriorKnocks([]);
        setDuplicateAlert(null);
        setError(
          e instanceof Error ? e.message : "Could not load knock history",
        );
        setLoadedKey(requestKey);
      }
    }

    void load();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [lat, lng, requestKey]);

  return { priorKnocks, duplicateAlert, loading, offline, error };
}
