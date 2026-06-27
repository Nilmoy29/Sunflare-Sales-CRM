import type {
  CallLogSummary,
  ContactCallHistoryResponse,
  ContactSearchResponse,
  ContactSummary,
  CreateCallApiResult,
  CreateCallBody,
  CreateContactApiResult,
  CreateContactBody,
  PromoteCallApiResult,
  PromoteCallResponse,
  RepDailyCallCountResponse,
} from "@/features/calls/types";
import { apiJson, getApiErrorMessage } from "@/lib/api-client";

export async function fetchRepDailyCallCount(
  signal?: AbortSignal,
): Promise<RepDailyCallCountResponse> {
  const { response, json } = await apiJson<RepDailyCallCountResponse>(
    "/api/v1/calls/daily-count",
    { signal },
  );

  if (!response.ok) {
    throw new Error(getApiErrorMessage(json, "Failed to load daily call count"));
  }

  if (!json.data) {
    throw new Error("Invalid daily call count response");
  }

  return json.data;
}

export async function fetchContactSearch(
  query: string,
  signal?: AbortSignal,
): Promise<ContactSearchResponse> {
  const params = new URLSearchParams({ q: query });
  const { response, json } = await apiJson<ContactSearchResponse>(
    `/api/v1/contacts/search?${params.toString()}`,
    { signal },
  );

  if (!response.ok) {
    throw new Error(getApiErrorMessage(json, "Failed to search contacts"));
  }

  if (!json.data) {
    throw new Error("Invalid search response");
  }

  return json.data;
}

export async function createContact(
  payload: CreateContactBody,
): Promise<CreateContactApiResult> {
  const { response, json } = await apiJson<{ contact: ContactSummary }>(
    "/api/v1/contacts",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );

  if (response.status === 409 && json.error?.code === "DUPLICATE_CONTACT") {
    const contact = (
      json.error as { details?: { contact?: ContactSummary } }
    ).details?.contact;
    if (contact) {
      return { status: "duplicate", contact };
    }
  }

  if (!response.ok) {
    return {
      status: "error",
      message: getApiErrorMessage(json, "Failed to create contact"),
    };
  }

  if (!json.data?.contact) {
    return { status: "error", message: "Invalid create response" };
  }

  return { status: "ok", contact: json.data.contact };
}

export async function fetchContactCallHistory(
  contactId: string,
  signal?: AbortSignal,
): Promise<ContactCallHistoryResponse> {
  const { response, json } = await apiJson<ContactCallHistoryResponse>(
    `/api/v1/contacts/${contactId}/calls`,
    { signal },
  );

  if (!response.ok) {
    throw new Error(getApiErrorMessage(json, "Failed to load call history"));
  }

  if (!json.data) {
    throw new Error("Invalid call history response");
  }

  return json.data;
}

export async function createCall(
  payload: CreateCallBody,
): Promise<CreateCallApiResult> {
  const { response, json } = await apiJson<{ call: CallLogSummary }>(
    "/api/v1/calls",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );

  if (!response.ok) {
    return {
      status: "error",
      message: getApiErrorMessage(json, "Failed to log call"),
    };
  }

  if (!json.data?.call) {
    return { status: "error", message: "Invalid call response" };
  }

  return { status: "ok", call: json.data.call };
}

export async function promoteCall(
  callLogId: string,
): Promise<PromoteCallApiResult> {
  const { response, json } = await apiJson<PromoteCallResponse>(
    `/api/v1/calls/${callLogId}/promote`,
    { method: "POST" },
  );

  if (!response.ok) {
    return {
      status: "error",
      message: getApiErrorMessage(json, "Failed to promote call"),
    };
  }

  if (!json.data?.lead) {
    return { status: "error", message: "Invalid promote response" };
  }

  return {
    status: "ok",
    lead: json.data.lead,
    created: json.data.created,
  };
}
