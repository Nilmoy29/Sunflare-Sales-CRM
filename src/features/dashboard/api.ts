import type { GeographicYieldResponse } from "@/lib/validators/geographic-yield";
import type { FunnelConversionResponse } from "@/lib/validators/funnel-conversion";
import type {
  RepActivityTrendResponse,
  RepPipelineSnapshotResponse,
} from "@/lib/validators/rep-deep-dive";

export async function fetchFunnelConversion(
  from: string,
  to: string,
  signal?: AbortSignal,
): Promise<FunnelConversionResponse> {
  const params = new URLSearchParams({ from, to });

  const res = await fetch(
    `/api/v1/admin/dashboard/funnel?${params.toString()}`,
    {
      credentials: "include",
      signal,
    },
  );

  const body = (await res.json()) as {
    data?: FunnelConversionResponse;
    error?: { code: string; message: string };
  };

  if (!res.ok) {
    throw new Error(body.error?.message ?? "Could not load funnel conversion");
  }

  if (!body.data) {
    throw new Error("Could not load funnel conversion");
  }

  return body.data;
}

export async function fetchRepActivityTrend(
  repId: string,
  from: string,
  to: string,
  signal?: AbortSignal,
): Promise<RepActivityTrendResponse> {
  const params = new URLSearchParams({ from, to });

  const res = await fetch(
    `/api/v1/admin/reps/${encodeURIComponent(repId)}/activity-trend?${params.toString()}`,
    {
      credentials: "include",
      signal,
    },
  );

  const body = (await res.json()) as {
    data?: RepActivityTrendResponse;
    error?: { code: string; message: string };
  };

  if (!res.ok) {
    throw new Error(body.error?.message ?? "Could not load rep activity trend");
  }

  if (!body.data) {
    throw new Error("Could not load rep activity trend");
  }

  return body.data;
}

export async function fetchRepPipelineSnapshot(
  repId: string,
  signal?: AbortSignal,
): Promise<RepPipelineSnapshotResponse> {
  const res = await fetch(
    `/api/v1/admin/reps/${encodeURIComponent(repId)}/pipeline`,
    {
      credentials: "include",
      signal,
    },
  );

  const body = (await res.json()) as {
    data?: RepPipelineSnapshotResponse;
    error?: { code: string; message: string };
  };

  if (!res.ok) {
    throw new Error(
      body.error?.message ?? "Could not load rep pipeline snapshot",
    );
  }

  if (!body.data) {
    throw new Error("Could not load rep pipeline snapshot");
  }

  return body.data;
}

export async function fetchGeographicYield(
  from: string,
  to: string,
  signal?: AbortSignal,
): Promise<GeographicYieldResponse> {
  const params = new URLSearchParams({ from, to });

  const res = await fetch(
    `/api/v1/admin/dashboard/geographic-yield?${params.toString()}`,
    {
      credentials: "include",
      signal,
    },
  );

  const body = (await res.json()) as {
    data?: GeographicYieldResponse;
    error?: { code: string; message: string };
  };

  if (!res.ok) {
    throw new Error(body.error?.message ?? "Could not load geographic yield");
  }

  if (!body.data) {
    throw new Error("Could not load geographic yield");
  }

  return body.data;
}
