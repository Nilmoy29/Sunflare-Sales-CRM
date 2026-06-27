import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import {
  fetchLeadDetail,
  fetchPipelineLeads,
  updateLeadStage,
} from "@/features/pipeline/api";
import { defaultRepPipelineFilters } from "@/features/pipeline/labels";
import type { PipelineFilters, PipelineLeadCard } from "@/features/pipeline/types";
import type { LeadStage, LostReason } from "@sunflare/shared";

export type MoveLeadStageOptions = {
  lost_reason?: LostReason;
};

const PIPELINE_QUERY_KEY = ["pipeline-leads"] as const;

export function usePipelineLeads(filters: PipelineFilters = defaultRepPipelineFilters()) {
  const queryClient = useQueryClient();
  const filtersKey = useMemo(() => JSON.stringify(filters), [filters]);

  const query = useQuery({
    queryKey: [...PIPELINE_QUERY_KEY, filtersKey],
    queryFn: ({ signal }) => fetchPipelineLeads(filters, signal),
  });

  const stageMutation = useMutation({
    mutationFn: async ({
      leadId,
      stage,
      lost_reason,
    }: {
      leadId: string;
      stage: LeadStage;
      lost_reason?: LostReason;
    }) => updateLeadStage(leadId, stage, lost_reason),
    onMutate: async ({ leadId, stage }) => {
      await queryClient.cancelQueries({ queryKey: PIPELINE_QUERY_KEY });
      const previous = queryClient.getQueryData<{ leads: PipelineLeadCard[] }>([
        ...PIPELINE_QUERY_KEY,
        filtersKey,
      ]);

      queryClient.setQueryData(
        [...PIPELINE_QUERY_KEY, filtersKey],
        (old: { leads: PipelineLeadCard[] } | undefined) => {
          if (!old) {
            return old;
          }
          return {
            leads: old.leads.map((lead) =>
              lead.id === leadId ? { ...lead, stage } : lead,
            ),
          };
        },
      );

      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(
          [...PIPELINE_QUERY_KEY, filtersKey],
          context.previous,
        );
      }
    },
    onSuccess: (data) => {
      queryClient.setQueryData(
        [...PIPELINE_QUERY_KEY, filtersKey],
        (old: { leads: PipelineLeadCard[] } | undefined) => {
          if (!old) {
            return { leads: [data.lead] };
          }
          return {
            leads: old.leads.map((lead) =>
              lead.id === data.lead.id ? data.lead : lead,
            ),
          };
        },
      );
    },
  });

  async function moveLeadStage(
    leadId: string,
    stage: LeadStage,
    options?: MoveLeadStageOptions,
  ): Promise<boolean> {
    try {
      await stageMutation.mutateAsync({
        leadId,
        stage,
        lost_reason: options?.lost_reason,
      });
      return true;
    } catch {
      return false;
    }
  }

  return {
    leads: query.data?.leads ?? [],
    loading: query.isLoading,
    refreshing: query.isRefetching,
    error: query.error instanceof Error ? query.error.message : null,
    refresh: () => query.refetch(),
    moveLeadStage,
    updatingLeadId: stageMutation.isPending
      ? (stageMutation.variables?.leadId ?? null)
      : null,
  };
}

export function useLeadDetailQuery(leadId: string) {
  return useQuery({
    queryKey: ["lead-detail", leadId],
    queryFn: ({ signal }) => fetchLeadDetail(leadId, signal),
    enabled: Boolean(leadId),
  });
}

export function invalidateLeadQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  leadId?: string,
) {
  void queryClient.invalidateQueries({ queryKey: PIPELINE_QUERY_KEY });
  if (leadId) {
    void queryClient.invalidateQueries({ queryKey: ["lead-detail", leadId] });
  }
}
