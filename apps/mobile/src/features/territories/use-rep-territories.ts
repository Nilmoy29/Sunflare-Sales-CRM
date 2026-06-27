import { useEffect, useState } from "react";
import { apiJson, getApiErrorMessage } from "@/lib/api-client";

export type RepTerritoryOverlay = {
  id: string;
  name: string;
  geometry: {
    type: "Polygon";
    coordinates: number[][][];
  };
};

type RepTerritoriesResponse = {
  territories: RepTerritoryOverlay[];
};

export async function fetchRepTerritoriesForDate(): Promise<RepTerritoriesResponse> {
  const { response, json } = await apiJson<RepTerritoriesResponse>(
    "/api/v1/territories/mine",
  );

  if (!response.ok) {
    throw new Error(
      getApiErrorMessage(json, "Failed to load assigned territories"),
    );
  }

  if (!json.data) {
    throw new Error("Invalid rep territories response");
  }

  return json.data;
}

export function useRepTerritories(enabled: boolean) {
  const [territories, setTerritories] = useState<RepTerritoryOverlay[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(enabled);

  useEffect(() => {
    if (!enabled) {
      setTerritories([]);
      setError(null);
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const data = await fetchRepTerritoriesForDate();
        if (!cancelled) {
          setTerritories(data.territories);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) {
          setTerritories([]);
          setError(
            e instanceof Error ? e.message : "Failed to load territories",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return { territories, error, loading };
}
