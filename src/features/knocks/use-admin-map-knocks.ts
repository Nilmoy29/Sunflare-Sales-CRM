"use client";

import { useEffect, useState } from "react";
import { fetchAdminKnocksInBbox } from "@/features/knocks/api";
import type { DoorOutcome } from "@/lib/validators/enums";
import type { AdminKnockPin, MapBbox } from "@/lib/validators/knocks";

export type AdminMapFilters = {
  from: string | null;
  to: string | null;
  repIds: string[] | null;
  outcomes: DoorOutcome[] | null;
};

function loadKey(
  bbox: MapBbox,
  filters: AdminMapFilters,
  refreshKey: number,
): string {
  const repPart =
    filters.repIds === null ? "all" : filters.repIds.slice().sort().join(",");
  const outcomePart =
    filters.outcomes === null
      ? "all"
      : filters.outcomes.slice().sort().join(",");
  const fromPart = filters.from ?? "all";
  const toPart = filters.to ?? "all";
  return `${bbox.west},${bbox.south},${bbox.east},${bbox.north}:${fromPart}:${toPart}:${repPart}:${outcomePart}:${refreshKey}`;
}

export function useAdminMapKnocks(
  bbox: MapBbox | null,
  filters: AdminMapFilters,
  refreshKey = 0,
) {
  const [knocks, setKnocks] = useState<AdminKnockPin[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [truncated, setTruncated] = useState(false);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);

  const requestKey = bbox ? loadKey(bbox, filters, refreshKey) : null;
  const loading = requestKey !== null && loadedKey !== requestKey;

  useEffect(() => {
    if (!bbox || !requestKey) {
      return;
    }

    let cancelled = false;
    const controller = new AbortController();
    const requestBbox = bbox;
    const requestFilters = filters;

    async function load() {
      try {
        const result = await fetchAdminKnocksInBbox(
          {
            bbox: requestBbox,
            from: requestFilters.from,
            to: requestFilters.to,
            repIds: requestFilters.repIds,
            outcomes: requestFilters.outcomes,
          },
          controller.signal,
        );
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
  }, [bbox, filters, refreshKey, requestKey]);

  return { knocks, loading, error, truncated };
}
