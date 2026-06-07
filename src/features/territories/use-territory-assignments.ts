"use client";

import { useCallback, useEffect, useState } from "react";
import {
  createTerritoryAssignment,
  fetchTerritoryAssignments,
} from "@/features/territories/api";
import {
  assignedDateSchema,
  type CreateTerritoryAssignmentBody,
  type TerritoryAssignmentSummary,
} from "@/lib/validators/territory-assignments";

type UseTerritoryAssignmentsOptions = {
  assignedDate: string;
};

export function useTerritoryAssignments({
  assignedDate,
}: UseTerritoryAssignmentsOptions) {
  const [assignments, setAssignments] = useState<TerritoryAssignmentSummary[]>(
    [],
  );
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
      if (!assignedDateSchema.safeParse(assignedDate).success) {
        setAssignments([]);
        setError(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const result = await fetchTerritoryAssignments(
          { assigned_date: assignedDate },
          controller.signal,
        );
        if (cancelled) {
          return;
        }
        setAssignments(result.assignments);
        setError(null);
      } catch (e: unknown) {
        if (cancelled) {
          return;
        }
        setAssignments([]);
        setError(
          e instanceof Error
            ? e.message
            : "Failed to load territory assignments",
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
  }, [assignedDate, refreshKey]);

  const create = useCallback(
    async (body: CreateTerritoryAssignmentBody) => {
      const result = await createTerritoryAssignment(body);
      if (result.status === "error") {
        return result;
      }

      if (result.assignment.assigned_date === assignedDate) {
        setAssignments((prev) =>
          [...prev, result.assignment].sort((a, b) =>
            a.rep_name.localeCompare(b.rep_name),
          ),
        );
      }

      return result;
    },
    [assignedDate],
  );

  return {
    assignments,
    loading,
    error,
    refresh,
    create,
  };
}
