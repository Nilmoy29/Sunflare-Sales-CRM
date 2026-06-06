import type {
  CreateCallBody,
  CreateCallResponse,
} from "@/lib/validators/call-logs";
import type { PromoteCallResponse } from "@/lib/validators/leads";
import type {
  ContactSearchResponse,
  ContactSummary,
  CreateContactBody,
  CreateContactResponse,
} from "@/lib/validators/contacts";

export type CreateCallApiResult =
  | { status: "ok"; call: CreateCallResponse["call"] }
  | { status: "error"; message: string };

export type PromoteCallApiResult =
  | { status: "ok"; lead: PromoteCallResponse["lead"]; created: boolean }
  | { status: "error"; message: string };

export type CreateContactApiResult =
  | { status: "ok"; contact: ContactSummary }
  | { status: "duplicate"; contact: ContactSummary }
  | { status: "error"; message: string };

export async function fetchContactSearch(
  query: string,
  signal?: AbortSignal,
): Promise<ContactSearchResponse> {
  const params = new URLSearchParams({ q: query });
  const res = await fetch(`/api/v1/contacts/search?${params.toString()}`, {
    credentials: "include",
    signal,
  });

  const body = (await res.json()) as {
    data?: ContactSearchResponse;
    error?: { code: string; message: string };
  };

  if (!res.ok) {
    throw new Error(body.error?.message ?? "Failed to search contacts");
  }

  if (!body.data) {
    throw new Error("Invalid search response");
  }

  return body.data;
}

export async function createContact(
  payload: CreateContactBody,
): Promise<CreateContactApiResult> {
  const res = await fetch("/api/v1/contacts", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const body = (await res.json()) as {
    data?: CreateContactResponse;
    error?: {
      code: string;
      message: string;
      details?: { contact?: ContactSummary };
    };
  };

  if (res.status === 409 && body.error?.code === "DUPLICATE_CONTACT") {
    const contact = body.error.details?.contact;
    if (contact) {
      return { status: "duplicate", contact };
    }
  }

  if (!res.ok) {
    return {
      status: "error",
      message: body.error?.message ?? "Failed to create contact",
    };
  }

  if (!body.data?.contact) {
    return { status: "error", message: "Invalid create response" };
  }

  return { status: "ok", contact: body.data.contact };
}

export async function createCall(
  payload: CreateCallBody,
): Promise<CreateCallApiResult> {
  const res = await fetch("/api/v1/calls", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const body = (await res.json()) as {
    data?: CreateCallResponse;
    error?: { code: string; message: string };
  };

  if (!res.ok) {
    return {
      status: "error",
      message: body.error?.message ?? "Failed to log call",
    };
  }

  if (!body.data?.call) {
    return { status: "error", message: "Invalid call response" };
  }

  return { status: "ok", call: body.data.call };
}

export async function promoteCall(
  callLogId: string,
): Promise<PromoteCallApiResult> {
  const res = await fetch(`/api/v1/calls/${callLogId}/promote`, {
    method: "POST",
    credentials: "include",
  });

  const body = (await res.json()) as {
    data?: PromoteCallResponse;
    error?: { code: string; message: string };
  };

  if (!res.ok) {
    return {
      status: "error",
      message: body.error?.message ?? "Failed to promote call",
    };
  }

  if (!body.data?.lead) {
    return { status: "error", message: "Invalid promote response" };
  }

  return {
    status: "ok",
    lead: body.data.lead,
    created: body.data.created,
  };
}
