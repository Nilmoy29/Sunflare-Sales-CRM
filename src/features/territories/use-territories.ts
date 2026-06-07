"use client";

import { useCallback, useEffect, useState } from "react";
import {
  createTerritory,
  fetchTerritories,
  updateTerritory,
} from "@/features/territories/api";
import type {
  CreateTerritoryBody,
  TerritorySummary,
  UpdateTerritoryBody,
} from "@/lib/validators/territories";

export function useTerritories() {
  const [territories, setTerritories] = useState<TerritorySummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => {
    setRefreshKey((key) => key + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    async function load() {
      setLoading(true);
      try {
        const result = await fetchTerritories(controller.signal);
        if (cancelled) {
          return;
        }
        setTerritories(result.territories);
        setError(null);
      } catch (e: unknown) {
        if (cancelled) {
          return;
        }
        setTerritories([]);
        setError(
          e instanceof Error ? e.message : "Failed to load territories",
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [refreshKey]);

  const create = useCallback(async (body: CreateTerritoryBody) => {
    const result = await createTerritory(body);
    if (result.status === "error") {
      return result;
    }
    setTerritories((prev) =>
      [...prev, result.territory].sort((a, b) =>
        a.name.localeCompare(b.name),
      ),
    );
    return result;
  }, []);

  const update = useCallback(async (id: string, body: UpdateTerritoryBody) => {
    const result = await updateTerritory(id, body);
    if (result.status === "error") {
      return result;
    }
    setTerritories((prev) =>
      prev
        .map((territory) =>
          territory.id === id ? result.territory : territory,
        )
        .sort((a, b) => a.name.localeCompare(b.name)),
    );
    return result;
  }, []);

  return {
    territories,
    loading,
    error,
    refresh,
    create,
    update,
  };
}
