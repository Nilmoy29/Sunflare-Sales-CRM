import { apiJson, getApiErrorMessage } from "@/lib/api-client";
import type {
  ShiftEndResponse,
  ShiftSummary,
} from "@/features/shifts/types";

export async function fetchCurrentShift(): Promise<ShiftSummary | null> {
  const { response, json } = await apiJson<ShiftSummary | null>(
    "/api/v1/shifts/current",
  );
  if (!response.ok) {
    throw new Error(getApiErrorMessage(json, "Failed to load shift"));
  }
  return json.data ?? null;
}

export async function startShift(): Promise<ShiftSummary> {
  const { response, json } = await apiJson<{
    id: string;
    started_at: string;
  }>("/api/v1/shifts/start", { method: "POST" });

  if (!response.ok) {
    throw new Error(getApiErrorMessage(json, "Failed to start shift"));
  }

  if (!json.data) {
    throw new Error("Failed to start shift");
  }

  return {
    id: json.data.id,
    started_at: json.data.started_at,
    ended_at: null,
  };
}

export async function endShift(): Promise<ShiftEndResponse> {
  const { response, json } = await apiJson<ShiftEndResponse>(
    "/api/v1/shifts/end",
    { method: "POST" },
  );

  if (!response.ok) {
    throw new Error(getApiErrorMessage(json, "Failed to end shift"));
  }

  if (!json.data) {
    throw new Error("Failed to end shift");
  }

  return json.data;
}

export async function postGpsPing(payload: {
  shift_id: string;
  lat: number;
  lng: number;
}): Promise<void> {
  const { response, json } = await apiJson<{ id: string; recorded_at: string }>(
    "/api/v1/gps/pings",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );

  if (!response.ok) {
    throw new Error(getApiErrorMessage(json, "Failed to record GPS ping"));
  }
}
