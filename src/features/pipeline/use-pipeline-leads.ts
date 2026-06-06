"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  fetchPipelineLeads,
  updateLeadStage as updateLeadStageApi,
} from "@/features/pipeline/api";
import type { PipelineFilters } from "@/lib/validators/pipeline";
import type { PipelineLeadCard } from "@/lib/validators/pipeline";
import type { LeadStage, LostReason } from "@/lib/validators/enums";

export type MoveLeadStageOptions = {
  lost_reason?: LostReason;
};

function filtersRequestKey(filters: PipelineFilters): string {
  return JSON.stringify(filters);
}

export function usePipelineLeads(filters: PipelineFilters) {
  const [leads, setLeads] = useState<PipelineLeadCard[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);

  const requestKey = useMemo(() => filtersRequestKey(filters), [filters]);
  const loading = loadedKey !== requestKey;

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    const key = requestKey;

    async function load() {
      try {
        const result = await fetchPipelineLeads(filters, controller.signal);
        if (cancelled) {
          return;
        }
        setLeads(result.leads);
        setError(null);
        setLoadedKey(key);
      } catch (e: unknown) {
        if (cancelled) {
          return;
        }
        if (e instanceof Error && e.name === "AbortError") {
          return;
        }
        setLeads([]);
        setError(
          e instanceof Error ? e.message : "Could not load pipeline leads",
        );
        setLoadedKey(key);
      }
    }

    void load();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [filters, requestKey]);

  const moveLeadStage = useCallback(
    async (
      leadId: string,
      newStage: LeadStage,
      options?: MoveLeadStageOptions,
    ) => {
      let previousLead: PipelineLeadCard | undefined;

      setLeads((current) => {
        previousLead = current.find((lead) => lead.id === leadId);
        return current.map((lead) =>
          lead.id === leadId ? { ...lead, stage: newStage } : lead,
        );
      });
      setError(null);

      try {
        const result = await updateLeadStageApi(
          leadId,
          newStage,
          options?.lost_reason,
        );
        setLeads((current) => {
          if (
            filters.stages !== null &&
            !filters.stages.includes(newStage)
          ) {
            return current.filter((lead) => lead.id !== leadId);
          }
          return current.map((lead) =>
            lead.id === leadId ? result.lead : lead,
          );
        });
        return true;
      } catch (e: unknown) {
        if (previousLead) {
          setLeads((current) =>
            current.map((lead) =>
              lead.id === leadId ? previousLead! : lead,
            ),
          );
        }
        setError(
          e instanceof Error ? e.message : "Could not update lead stage",
        );
        return false;
      }
    },
    [filters.stages],
  );

  const displayLeads = loading ? [] : leads;

  return {
    leads: displayLeads,
    loading,
    error,
    moveLeadStage,
  };
}
