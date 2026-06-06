"use client";

import { useEffect, useState } from "react";
import { fetchKnocksInBbox } from "@/features/knocks/api";
import type { KnockPin, MapBbox } from "@/lib/validators/knocks";

function loadKey(bbox: MapBbox, refreshKey: number): string {
  return `${bbox.west},${bbox.south},${bbox.east},${bbox.north}:${refreshKey}`;
}

export function useMapKnocks(bbox: MapBbox | null, refreshKey = 0) {
  const [knocks, setKnocks] = useState<KnockPin[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [truncated, setTruncated] = useState(false);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);

  const requestKey = bbox ? loadKey(bbox, refreshKey) : null;
  const loading = requestKey !== null && loadedKey !== requestKey;

  useEffect(() => {
    if (!bbox || !requestKey) {
      return;
    }

    let cancelled = false;
    const controller = new AbortController();
    const requestBbox = bbox;

    async function load() {
      try {
        const result = await fetchKnocksInBbox(requestBbox, controller.signal);
        if (cancelled) {
          return;
        }
        setKnocks(result.knocks);
        setTruncated(result.truncated);
        setError(null);
        setLoadedKey(requestKey);
      } catch (e: unknown) {
        if (cancelled) {
          return;
        }
        setKnocks([]);
        setTruncated(false);
        setError(
          e instanceof Error ? e.message : "Failed to load knock pins",
        );
        setLoadedKey(requestKey);
      }
    }

    void load();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [bbox, refreshKey, requestKey]);

  return { knocks, loading, error, truncated };
}
