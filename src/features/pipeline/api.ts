import type { CreateLeadNoteResponse } from "@/lib/validators/lead-activity";
import type {
  CreateFollowUpBody,
  CreateFollowUpResponse,
  UpdateFollowUpBody,
  UpdateFollowUpResponse,
} from "@/lib/validators/follow-ups";
import type { UpdateContactBody, UpdateContactResponse } from "@/lib/validators/contacts";
import type { LeadDetailResponse } from "@/lib/validators/lead-detail";
import type {
  PipelineFilters,
  PipelineLeadsResponse,
  ReassignLeadResponse,
  UpdateLeadStageResponse,
} from "@/lib/validators/pipeline";
import { pipelineFiltersToQuery } from "@/lib/validators/pipeline";
import type { LeadStage, LostReason } from "@/lib/validators/enums";

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
  if (query.follow_up_queue) {
    params.set("follow_up_queue", "true");
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
  lostReason?: LostReason,
  signal?: AbortSignal,
): Promise<UpdateLeadStageResponse> {
  const payload: { stage: LeadStage; lost_reason?: LostReason } = { stage };
  if (lostReason) {
    payload.lost_reason = lostReason;
  }

  const res = await fetch(`/api/v1/leads/${leadId}/stage`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
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

export async function reassignLead(
  leadId: string,
  repId: string,
  signal?: AbortSignal,
): Promise<ReassignLeadResponse> {
  const res = await fetch(`/api/v1/leads/${leadId}/rep`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ rep_id: repId }),
    signal,
  });

  const body = (await res.json()) as {
    data?: ReassignLeadResponse;
    error?: { code: string; message: string };
  };

  if (!res.ok) {
    throw new Error(body.error?.message ?? "Could not reassign lead");
  }

  if (!body.data) {
    throw new Error("Could not reassign lead");
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

export async function updateLeadFollowUp(
  leadId: string,
  followUpId: string,
  body: UpdateFollowUpBody,
  signal?: AbortSignal,
): Promise<UpdateFollowUpResponse> {
  const res = await fetch(`/api/v1/leads/${leadId}/follow-ups/${followUpId}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });

  const responseBody = (await res.json()) as {
    data?: UpdateFollowUpResponse;
    error?: { code: string; message: string };
  };

  if (!res.ok) {
    throw new Error(
      responseBody.error?.message ?? "Could not update follow-up",
    );
  }

  if (!responseBody.data) {
    throw new Error("Could not update follow-up");
  }

  return responseBody.data;
}

export async function updateContact(
  contactId: string,
  body: UpdateContactBody,
  signal?: AbortSignal,
): Promise<UpdateContactResponse> {
  const res = await fetch(`/api/v1/contacts/${contactId}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });

  const responseBody = (await res.json()) as {
    data?: UpdateContactResponse;
    error?: { code: string; message: string };
  };

  if (!res.ok) {
    throw new Error(
      responseBody.error?.message ?? "Could not update contact",
    );
  }

  if (!responseBody.data) {
    throw new Error("Could not update contact");
  }

  return responseBody.data;
}

export async function deleteLead(
  leadId: string,
  signal?: AbortSignal,
): Promise<void> {
  const res = await fetch(`/api/v1/leads/${leadId}`, {
    method: "DELETE",
    credentials: "include",
    signal,
  });

  const body = (await res.json()) as {
    data?: { deleted: boolean };
    error?: { code: string; message: string };
  };

  if (!res.ok) {
    throw new Error(body.error?.message ?? "Could not delete lead");
  }
}
