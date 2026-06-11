"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchMyKnocks } from "@/features/knocks/api";
import { defaultKnockHistoryDateRange } from "@/features/knocks/format-knock-date";
import type { DoorOutcome } from "@/lib/validators/enums";
import {
  KNOCK_HISTORY_DEFAULT_LIMIT,
  type KnockHistoryItem,
  type KnockHistoryQuery,
} from "@/lib/validators/knocks";

export type KnockHistoryFilters = {
  from: string;
  to: string;
  outcomes: DoorOutcome[] | null;
  limit: number;
  offset: number;
};

function defaultFilters(): KnockHistoryFilters {
  const { from, to } = defaultKnockHistoryDateRange();
  return {
    from,
    to,
    outcomes: null,
    limit: KNOCK_HISTORY_DEFAULT_LIMIT,
    offset: 0,
  };
}

function filtersToQuery(filters: KnockHistoryFilters): KnockHistoryQuery {
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
  const [truncated, setTruncated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);

  const key = useMemo(() => requestKey(filters), [filters]);
  const loading = loadedKey !== key;

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

  const replaceKnock = useCallback((knock: KnockHistoryItem) => {
    setKnocks((prev) =>
      prev.map((item) => (item.id === knock.id ? knock : item)),
    );
  }, []);

  const removeKnock = useCallback((knockId: string) => {
    setKnocks((prev) => prev.filter((item) => item.id !== knockId));
  }, []);

  return {
    knocks,
    loading,
    error,
    truncated,
    filters,
    setFilters,
    loadMore,
    toggleOutcome,
    selectAllOutcomes,
    replaceKnock,
    removeKnock,
  };
}
