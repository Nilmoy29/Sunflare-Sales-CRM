import type { CreateLeadNoteResponse } from "@/lib/validators/lead-activity";
import type {
  CreateFollowUpBody,
  CreateFollowUpResponse,
} from "@/lib/validators/follow-ups";
import type { LeadDetailResponse } from "@/lib/validators/lead-detail";
import type {
  PipelineFilters,
  PipelineLeadsResponse,
  UpdateLeadStageResponse,
} from "@/lib/validators/pipeline";
import { pipelineFiltersToQuery } from "@/lib/validators/pipeline";
import type { LeadStage } from "@/lib/validators/enums";

function buildLeadsQueryString(filters: PipelineFilters): string {
  const query = pipelineFiltersToQuery(filters);
  const params = new URLSearchParams();

  if (query.stages?.length) {
    params.set("stages", query.stages.join(","));
  }
  if (query.rep_ids?.length) {
    params.set("rep_ids", query.rep_ids.join(","));
  }
  if (query.sources?.length) {
    params.set("sources", query.sources.join(","));
  }
  if (query.suburb) {
    params.set("suburb", query.suburb);
  }
  if (query.from) {
    params.set("from", query.from);
  }
  if (query.to) {
    params.set("to", query.to);
  }

  const serialized = params.toString();
  return serialized ? `?${serialized}` : "";
}

export async function fetchPipelineLeads(
  filters: PipelineFilters,
  signal?: AbortSignal,
): Promise<PipelineLeadsResponse> {
  const res = await fetch(`/api/v1/leads${buildLeadsQueryString(filters)}`, {
    credentials: "include",
    signal,
  });

  const body = (await res.json()) as {
    data?: PipelineLeadsResponse;
    error?: { code: string; message: string };
  };

  if (!res.ok) {
    throw new Error(body.error?.message ?? "Could not load pipeline leads");
  }

  if (!body.data) {
    throw new Error("Could not load pipeline leads");
  }

  return body.data;
}

export async function updateLeadStage(
  leadId: string,
  stage: LeadStage,
  signal?: AbortSignal,
): Promise<UpdateLeadStageResponse> {
  const res = await fetch(`/api/v1/leads/${leadId}/stage`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ stage }),
    signal,
  });

  const body = (await res.json()) as {
    data?: UpdateLeadStageResponse;
    error?: { code: string; message: string };
  };

  if (!res.ok) {
    throw new Error(body.error?.message ?? "Could not update lead stage");
  }

  if (!body.data) {
    throw new Error("Could not update lead stage");
  }

  return body.data;
}

export async function fetchLeadDetail(
  leadId: string,
  signal?: AbortSignal,
): Promise<LeadDetailResponse> {
  const res = await fetch(`/api/v1/leads/${leadId}`, {
    credentials: "include",
    signal,
  });

  const body = (await res.json()) as {
    data?: LeadDetailResponse;
    error?: { code: string; message: string };
  };

  if (!res.ok) {
    throw new Error(body.error?.message ?? "Could not load lead detail");
  }

  if (!body.data) {
    throw new Error("Could not load lead detail");
  }

  return body.data;
}

export async function createLeadNote(
  leadId: string,
  content: string,
  signal?: AbortSignal,
): Promise<CreateLeadNoteResponse> {
  const res = await fetch(`/api/v1/leads/${leadId}/notes`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content }),
    signal,
  });

  const body = (await res.json()) as {
    data?: CreateLeadNoteResponse;
    error?: { code: string; message: string };
  };

  if (!res.ok) {
    throw new Error(body.error?.message ?? "Could not add note");
  }

  if (!body.data) {
    throw new Error("Could not add note");
  }

  return body.data;
}

export async function createLeadFollowUp(
  leadId: string,
  body: CreateFollowUpBody,
  signal?: AbortSignal,
): Promise<CreateFollowUpResponse> {
  const res = await fetch(`/api/v1/leads/${leadId}/follow-ups`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });

  const responseBody = (await res.json()) as {
    data?: CreateFollowUpResponse;
    error?: { code: string; message: string };
  };

  if (!res.ok) {
    throw new Error(
      responseBody.error?.message ?? "Could not schedule follow-up",
    );
  }

  if (!responseBody.data) {
    throw new Error("Could not schedule follow-up");
  }

  return responseBody.data;
}
