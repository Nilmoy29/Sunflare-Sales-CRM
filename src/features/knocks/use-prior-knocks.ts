"use client";

import { useEffect, useState } from "react";
import { fetchKnocksNear } from "@/features/knocks/api";
import type { DuplicateAlert, PriorKnock } from "@/lib/validators/knocks";

type UsePriorKnocksResult = {
  priorKnocks: PriorKnock[];
  duplicateAlert: DuplicateAlert | null;
  loading: boolean;
  offline: boolean;
  error: string | null;
};

function readOffline(): boolean {
  return typeof navigator !== "undefined" && !navigator.onLine;
}

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
  const [offline, setOffline] = useState(readOffline);

  const requestKey = offline ? null : loadKey(lat, lng);
  const loading = requestKey !== null && loadedKey !== requestKey;

  useEffect(() => {
    const syncOffline = () => {
      const nowOffline = readOffline();
      setOffline(nowOffline);
      if (nowOffline) {
        setPriorKnocks([]);
        setDuplicateAlert(null);
        setError(null);
        setLoadedKey(null);
      }
    };
    window.addEventListener("online", syncOffline);
    window.addEventListener("offline", syncOffline);
    return () => {
      window.removeEventListener("online", syncOffline);
      window.removeEventListener("offline", syncOffline);
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
        if (e instanceof Error && e.name === "AbortError") {
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
