import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchMyKnocks } from "@/features/history/api";
import { defaultHistoryDateRange } from "@/features/history/date-range";
import type {
  KnockHistoryItem,
  PendingKnockHistoryItem,
} from "@/features/history/types";
import { HISTORY_DEFAULT_LIMIT } from "@/features/history/types";
import type { DoorOutcome } from "@sunflare/shared";
import { decryptNullableField } from "@/lib/offline/crypto";
import { listPendingKnockRows } from "@/lib/sqlite/pending-knocks";

export type KnockHistoryFilters = {
  from: string;
  to: string;
  outcomes: DoorOutcome[] | null;
  limit: number;
  offset: number;
};

function defaultFilters(): KnockHistoryFilters {
  const { from, to } = defaultHistoryDateRange();
  return {
    from,
    to,
    outcomes: null,
    limit: HISTORY_DEFAULT_LIMIT,
    offset: 0,
  };
}

function filtersToQuery(filters: KnockHistoryFilters) {
  return {
    from: filters.from,
    to: filters.to,
    outcome: filters.outcomes ?? [],
    limit: filters.limit,
    offset: filters.offset,
  };
}

function requestKey(filters: KnockHistoryFilters): string {
  return JSON.stringify(filtersToQuery(filters));
}

export function useKnockHistory() {
  const [filters, setFiltersState] = useState<KnockHistoryFilters>(defaultFilters);
  const [knocks, setKnocks] = useState<KnockHistoryItem[]>([]);
  const [pendingKnocks, setPendingKnocks] = useState<PendingKnockHistoryItem[]>(
    [],
  );
  const [truncated, setTruncated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);

  const key = useMemo(() => requestKey(filters), [filters]);
  const loading = loadedKey !== key;

  const refreshPending = useCallback(async () => {
    const rows = await listPendingKnockRows(["pending", "syncing"]);
    const items = await Promise.all(
      rows.map(async (row) => ({
        id: row.client_id,
        pending: true as const,
        outcome: row.outcome,
        knocked_at: row.created_at,
        lat: row.lat,
        lng: row.lng,
        notes: await decryptNullableField(row.notes_enc),
        address: await decryptNullableField(row.address_enc),
        suburb: await decryptNullableField(row.suburb_enc),
        postcode: await decryptNullableField(row.postcode_enc),
      })),
    );
    setPendingKnocks(items.reverse());
  }, []);

  useEffect(() => {
    void refreshPending();
    const interval = setInterval(() => {
      void refreshPending();
    }, 3000);
    return () => clearInterval(interval);
  }, [refreshPending]);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    const query = filtersToQuery(filters);
    const append = filters.offset > 0;

    async function load() {
      try {
        const result = await fetchMyKnocks(query, controller.signal);
        if (cancelled) {
          return;
        }
        setKnocks((prev) =>
          append ? [...prev, ...result.knocks] : result.knocks,
        );
        setTruncated(result.truncated);
        setError(null);
        setLoadedKey(key);
      } catch (e: unknown) {
        if (cancelled) {
          return;
        }
        if (e instanceof Error && e.name === "AbortError") {
          return;
        }
        if (!append) {
          setKnocks([]);
          setTruncated(false);
        }
        setError(
          e instanceof Error ? e.message : "Could not load knock history",
        );
        setLoadedKey(key);
      }
    }

    void load();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [filters, key]);

  const setFilters = useCallback((partial: Partial<KnockHistoryFilters>) => {
    setFiltersState((prev) => ({
      ...prev,
      ...partial,
      offset: partial.offset ?? 0,
    }));
  }, []);

  const loadMore = useCallback(() => {
    setFiltersState((prev) => ({
      ...prev,
      offset: prev.offset + prev.limit,
    }));
  }, []);

  const toggleOutcome = useCallback((outcome: DoorOutcome) => {
    setFiltersState((prev) => {
      if (prev.outcomes === null) {
        return { ...prev, outcomes: [outcome], offset: 0 };
      }
      const next = prev.outcomes.includes(outcome)
        ? prev.outcomes.filter((value) => value !== outcome)
        : [...prev.outcomes, outcome];
      return {
        ...prev,
        outcomes: next.length > 0 ? next : null,
        offset: 0,
      };
    });
  }, []);

  const selectAllOutcomes = useCallback(() => {
    setFiltersState((prev) => ({ ...prev, outcomes: null, offset: 0 }));
  }, []);

  return {
    knocks,
    pendingKnocks,
    loading,
    error,
    truncated,
    filters,
    setFilters,
    loadMore,
    toggleOutcome,
    selectAllOutcomes,
    refreshPending,
  };
}
