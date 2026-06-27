import type {
  CallHistoryResponse,
  KnockHistoryResponse,
} from "@/features/history/types";
import { apiJson, getApiErrorMessage } from "@/lib/api-client";

export type HistoryQuery = {
  from: string;
  to: string;
  outcome: string[];
  limit: number;
  offset: number;
};

function historyQueryToParams(query: HistoryQuery): URLSearchParams {
  const params = new URLSearchParams({
    from: query.from,
    to: query.to,
    limit: String(query.limit),
    offset: String(query.offset),
  });
  for (const outcome of query.outcome) {
    params.append("outcome", outcome);
  }
  return params;
}

export async function fetchMyKnocks(
  query: HistoryQuery,
  signal?: AbortSignal,
): Promise<KnockHistoryResponse> {
  const params = historyQueryToParams(query);
  const { response, json } = await apiJson<KnockHistoryResponse>(
    `/api/v1/knocks/mine?${params.toString()}`,
    { signal },
  );

  if (!response.ok) {
    throw new Error(getApiErrorMessage(json, "Could not load knock history"));
  }

  if (!json.data) {
    throw new Error("Invalid knock history response");
  }

  return json.data;
}

export async function fetchMyCalls(
  query: HistoryQuery,
  signal?: AbortSignal,
): Promise<CallHistoryResponse> {
  const params = historyQueryToParams(query);
  const { response, json } = await apiJson<CallHistoryResponse>(
    `/api/v1/calls/mine?${params.toString()}`,
    { signal },
  );

  if (!response.ok) {
    throw new Error(getApiErrorMessage(json, "Could not load call history"));
  }

  if (!json.data) {
    throw new Error("Invalid call history response");
  }

  return json.data;
}
