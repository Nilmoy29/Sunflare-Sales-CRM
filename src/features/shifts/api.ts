import type {
  ShiftEndResponse,
  ShiftSummary,
} from "@/lib/validators/shifts";

async function parseJson<T>(res: Response): Promise<T> {
  const body = (await res.json()) as T;
  return body;
}

export async function fetchCurrentShift(): Promise<ShiftSummary | null> {
  const res = await fetch("/api/v1/shifts/current", { credentials: "include" });
  if (!res.ok) {
    throw new Error("Failed to load shift status");
  }
  const body = await parseJson<{ data: ShiftSummary | null }>(res);
  return body.data;
}

export async function startShift(): Promise<ShiftSummary> {
  const res = await fetch("/api/v1/shifts/start", {
    method: "POST",
    credentials: "include",
  });
  const body = await parseJson<{
    data?: { id: string; started_at: string };
    error?: { code: string; message: string };
  }>(res);

  if (!res.ok) {
    throw new Error(body.error?.message ?? "Failed to start shift");
  }

  if (!body.data) {
    throw new Error("Failed to start shift");
  }

  return {
    id: body.data.id,
    started_at: body.data.started_at,
    ended_at: null,
  };
}

export async function endShift(): Promise<ShiftEndResponse> {
  const res = await fetch("/api/v1/shifts/end", {
    method: "POST",
    credentials: "include",
  });
  const body = await parseJson<{
    data?: ShiftEndResponse;
    error?: { code: string; message: string };
  }>(res);

  if (!res.ok) {
    throw new Error(body.error?.message ?? "Failed to end shift");
  }

  if (!body.data) {
    throw new Error("Failed to end shift");
  }

  return body.data;
}

export async function postGpsPing(payload: {
  shift_id: string;
  lat: number;
  lng: number;
}): Promise<void> {
  const res = await fetch("/api/v1/gps/pings", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const body = await parseJson<{ error?: { message: string } }>(res);
    throw new Error(body.error?.message ?? "Failed to record GPS ping");
  }
}
