import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchMyCalls } from "@/features/history/api";
import { defaultHistoryDateRange } from "@/features/history/date-range";
import type { CallHistoryItem } from "@/features/history/types";
import { HISTORY_DEFAULT_LIMIT } from "@/features/history/types";
import type { CallOutcome } from "@sunflare/shared";

export type CallHistoryFilters = {
  from: string;
  to: string;
  outcomes: CallOutcome[] | null;
  limit: number;
  offset: number;
};

function defaultFilters(): CallHistoryFilters {
  const { from, to } = defaultHistoryDateRange();
  return {
    from,
    to,
    outcomes: null,
    limit: HISTORY_DEFAULT_LIMIT,
    offset: 0,
  };
}

function filtersToQuery(filters: CallHistoryFilters) {
  return {
    from: filters.from,
    to: filters.to,
    outcome: filters.outcomes ?? [],
    limit: filters.limit,
    offset: filters.offset,
  };
}

function requestKey(filters: CallHistoryFilters): string {
  return JSON.stringify(filtersToQuery(filters));
}

export function useCallHistory() {
  const [filters, setFiltersState] = useState<CallHistoryFilters>(defaultFilters);
  const [calls, setCalls] = useState<CallHistoryItem[]>([]);
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
        const result = await fetchMyCalls(query, controller.signal);
        if (cancelled) {
          return;
        }
        setCalls((prev) => (append ? [...prev, ...result.calls] : result.calls));
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
          setCalls([]);
          setTruncated(false);
        }
        setError(
          e instanceof Error ? e.message : "Could not load call history",
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

  const setFilters = useCallback((partial: Partial<CallHistoryFilters>) => {
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

  const toggleOutcome = useCallback((outcome: CallOutcome) => {
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
    calls,
    loading,
    error,
    truncated,
    filters,
    setFilters,
    loadMore,
    toggleOutcome,
    selectAllOutcomes,
  };
}
