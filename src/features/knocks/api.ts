import type {
  AdminKnockPin,
  CreateKnockBody,
  CreateKnockResponse,
  KnockHistoryQuery,
  KnockHistoryResponse,
  KnockPin,
  KnocksNearResponse,
  MapBbox,
  SyncKnockItem,
  SyncKnockResult,
} from "@/lib/validators/knocks";
import type { DoorOutcome } from "@/lib/validators/enums";
import type { ReverseGeocodeResult } from "@/lib/validators/geocode";

export type FetchReverseGeocodeOutcome =
  | { status: "ok"; data: ReverseGeocodeResult }
  | { status: "not_configured" }
  | { status: "failed" };

export type KnocksInBboxResponse = {
  knocks: KnockPin[];
  truncated: boolean;
};

export type AdminKnocksInBboxParams = {
  bbox: MapBbox;
  from: string;
  to: string;
  repIds: string[] | null;
  outcomes: DoorOutcome[] | null;
};

export type AdminKnocksInBboxResponse = {
  knocks: AdminKnockPin[];
  truncated: boolean;
};

function bboxToQuery(bbox: MapBbox): string {
  return `${bbox.west},${bbox.south},${bbox.east},${bbox.north}`;
}

export async function fetchKnocksInBbox(
  bbox: MapBbox,
  signal?: AbortSignal,
): Promise<KnocksInBboxResponse> {
  const params = new URLSearchParams({ bbox: bboxToQuery(bbox) });
  const res = await fetch(`/api/v1/knocks?${params.toString()}`, {
    credentials: "include",
    signal,
  });

  const body = (await res.json()) as {
    data?: KnocksInBboxResponse;
    error?: { code: string; message: string };
  };

  if (!res.ok) {
    throw new Error(body.error?.message ?? "Failed to load knock pins");
  }

  if (!body.data) {
    throw new Error("Failed to load knock pins");
  }

  return body.data;
}

export async function fetchAdminKnocksInBbox(
  params: AdminKnocksInBboxParams,
  signal?: AbortSignal,
): Promise<AdminKnocksInBboxResponse> {
  const searchParams = new URLSearchParams({
    bbox: bboxToQuery(params.bbox),
    from: params.from,
    to: params.to,
  });

  if (params.repIds !== null) {
    for (const repId of params.repIds) {
      searchParams.append("rep", repId);
    }
  }

  if (params.outcomes !== null) {
    for (const outcome of params.outcomes) {
      searchParams.append("outcome", outcome);
    }
  }

  const res = await fetch(`/api/v1/admin/knocks?${searchParams.toString()}`, {
    credentials: "include",
    signal,
  });

  const body = (await res.json()) as {
    data?: AdminKnocksInBboxResponse;
    error?: { code: string; message: string };
  };

  if (!res.ok) {
    throw new Error(body.error?.message ?? "Failed to load knock pins");
  }

  if (!body.data) {
    throw new Error("Failed to load knock pins");
  }

  return body.data;
}

export async function fetchReverseGeocode(
  lat: number,
  lng: number,
  signal?: AbortSignal,
): Promise<FetchReverseGeocodeOutcome> {
  const params = new URLSearchParams({
    lat: String(lat),
    lng: String(lng),
  });
  const res = await fetch(`/api/v1/geocode/reverse?${params.toString()}`, {
    credentials: "include",
    signal,
  });

  const body = (await res.json()) as {
    data?: ReverseGeocodeResult;
    error?: { code: string; message: string };
  };

  if (res.status === 503 && body.error?.code === "GEOCODE_NOT_CONFIGURED") {
    return { status: "not_configured" };
  }

  if (!res.ok) {
    return { status: "failed" };
  }

  if (!body.data) {
    return { status: "failed" };
  }

  return { status: "ok", data: body.data };
}

export async function createKnock(
  payload: CreateKnockBody,
): Promise<CreateKnockResponse> {
  const res = await fetch("/api/v1/knocks", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const body = (await res.json()) as {
    data?: CreateKnockResponse;
    error?: { code: string; message: string };
  };

  if (!res.ok) {
    throw new Error(body.error?.message ?? "Failed to save knock");
  }

  if (!body.data?.knock) {
    throw new Error("Failed to save knock");
  }

  return body.data;
}

export async function syncPendingKnocks(
  knocks: SyncKnockItem[],
): Promise<SyncKnockResult[]> {
  const res = await fetch("/api/v1/knocks/sync", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ knocks }),
  });

  const body = (await res.json()) as {
    data?: { results: SyncKnockResult[] };
    error?: { code: string; message: string };
  };

  if (!res.ok) {
    throw new Error(body.error?.message ?? "Failed to sync knocks");
  }

  if (!body.data?.results) {
    throw new Error("Failed to sync knocks");
  }

  return body.data.results;
}

export async function fetchKnocksNear(
  lat: number,
  lng: number,
  signal?: AbortSignal,
  radiusM?: number,
): Promise<KnocksNearResponse> {
  const params = new URLSearchParams({
    lat: String(lat),
    lng: String(lng),
  });
  if (radiusM !== undefined) {
    params.set("radius", String(radiusM));
  }

  const res = await fetch(`/api/v1/knocks/near?${params.toString()}`, {
    credentials: "include",
    signal,
  });

  const body = (await res.json()) as {
    data?: KnocksNearResponse;
    error?: { code: string; message: string };
  };

  if (!res.ok) {
    throw new Error(body.error?.message ?? "Failed to load knock history");
  }

  if (!body.data) {
    throw new Error("Failed to load knock history");
  }

  return body.data;
}

export async function fetchMyKnocks(
  query: KnockHistoryQuery,
  signal?: AbortSignal,
): Promise<KnockHistoryResponse> {
  const params = new URLSearchParams({
    from: query.from,
    to: query.to,
    limit: String(query.limit),
    offset: String(query.offset),
  });
  for (const outcome of query.outcome) {
    params.append("outcome", outcome);
  }

  const res = await fetch(`/api/v1/knocks/mine?${params.toString()}`, {
    credentials: "include",
    signal,
  });

  const body = (await res.json()) as {
    data?: KnockHistoryResponse;
    error?: { code: string; message: string };
  };

  if (!res.ok) {
    throw new Error(body.error?.message ?? "Could not load knock history");
  }

  if (!body.data) {
    throw new Error("Could not load knock history");
  }

  return body.data;
}
