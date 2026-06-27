import type {
  CreateFollowUpBody,
  CreateFollowUpResponse,
  LeadDetailResponse,
  PipelineFilters,
  PipelineLeadsResponse,
  UpdateLeadStageResponse,
} from "@/features/pipeline/types";
import { apiJson, getApiErrorMessage } from "@/lib/api-client";
import type { LeadStage, LostReason } from "@sunflare/shared";

function buildLeadsQueryString(filters: PipelineFilters): string {
  const params = new URLSearchParams();

  if (filters.stages?.length) {
    params.set("stages", filters.stages.join(","));
  }
  if (filters.repIds?.length) {
    params.set("rep_ids", filters.repIds.join(","));
  }
  if (filters.sources?.length) {
    params.set("sources", filters.sources.join(","));
  }
  const suburb = filters.suburb.trim();
  if (suburb) {
    params.set("suburb", suburb);
  }
  if (filters.from) {
    params.set("from", filters.from);
  }
  if (filters.to) {
    params.set("to", filters.to);
  }

  const serialized = params.toString();
  return serialized ? `?${serialized}` : "";
}

export async function fetchPipelineLeads(
  filters: PipelineFilters,
  signal?: AbortSignal,
): Promise<PipelineLeadsResponse> {
  const { response, json } = await apiJson<PipelineLeadsResponse>(
    `/api/v1/leads${buildLeadsQueryString(filters)}`,
    { signal },
  );

  if (!response.ok) {
    throw new Error(getApiErrorMessage(json, "Could not load pipeline leads"));
  }

  if (!json.data) {
    throw new Error("Could not load pipeline leads");
  }

  return json.data;
}

export async function updateLeadStage(
  leadId: string,
  stage: LeadStage,
  lostReason?: LostReason,
  signal?: AbortSignal,
): Promise<UpdateLeadStageResponse> {
  const payload: { stage: LeadStage; lost_reason?: LostReason } = { stage };
  if (lostReason) {
    payload.lost_reason = lostReason;
  }

  const { response, json } = await apiJson<UpdateLeadStageResponse>(
    `/api/v1/leads/${leadId}/stage`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
      signal,
    },
  );

  if (!response.ok) {
    throw new Error(getApiErrorMessage(json, "Could not update lead stage"));
  }

  if (!json.data) {
    throw new Error("Could not update lead stage");
  }

  return json.data;
}

export async function fetchLeadDetail(
  leadId: string,
  signal?: AbortSignal,
): Promise<LeadDetailResponse> {
  const { response, json } = await apiJson<LeadDetailResponse>(
    `/api/v1/leads/${leadId}`,
    { signal },
  );

  if (!response.ok) {
    throw new Error(getApiErrorMessage(json, "Could not load lead detail"));
  }

  if (!json.data) {
    throw new Error("Could not load lead detail");
  }

  return json.data;
}

export async function createLeadNote(
  leadId: string,
  content: string,
  signal?: AbortSignal,
): Promise<void> {
  const { response, json } = await apiJson<{ note: { id: string } }>(
    `/api/v1/leads/${leadId}/notes`,
    {
      method: "POST",
      body: JSON.stringify({ content }),
      signal,
    },
  );

  if (!response.ok) {
    throw new Error(getApiErrorMessage(json, "Could not add note"));
  }
}

export async function createLeadFollowUp(
  leadId: string,
  body: CreateFollowUpBody,
  signal?: AbortSignal,
): Promise<CreateFollowUpResponse> {
  const { response, json } = await apiJson<CreateFollowUpResponse>(
    `/api/v1/leads/${leadId}/follow-ups`,
    {
      method: "POST",
      body: JSON.stringify(body),
      signal,
    },
  );

  if (!response.ok) {
    throw new Error(
      getApiErrorMessage(json, "Could not schedule follow-up"),
    );
  }

  if (!json.data) {
    throw new Error("Could not schedule follow-up");
  }

  return json.data;
}
