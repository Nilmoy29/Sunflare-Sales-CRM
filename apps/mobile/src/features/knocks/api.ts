import type { MapBbox, SyncKnockItem } from "@sunflare/shared";
import { SYNC_KNOCKS_MAX_BATCH } from "@sunflare/shared";
import type {
  CreateKnockBody,
  CreateKnockResponse,
  KnocksInBboxResponse,
  KnocksNearResponse,
  ReverseGeocodeResult,
  SyncKnockResult,
} from "@/features/knocks/types";
import { apiJson, getApiErrorMessage } from "@/lib/api-client";

export { SYNC_KNOCKS_MAX_BATCH };

function bboxToQuery(bbox: MapBbox): string {
  return `${bbox.west},${bbox.south},${bbox.east},${bbox.north}`;
}

export type FetchReverseGeocodeOutcome =
  | { status: "ok"; data: ReverseGeocodeResult }
  | { status: "not_configured" }
  | { status: "failed" };

export async function fetchKnocksInBbox(
  bbox: MapBbox,
  signal?: AbortSignal,
): Promise<KnocksInBboxResponse> {
  const params = new URLSearchParams({ bbox: bboxToQuery(bbox) });
  const { response, json } = await apiJson<KnocksInBboxResponse>(
    `/api/v1/knocks?${params.toString()}`,
    { signal },
  );

  if (!response.ok) {
    throw new Error(getApiErrorMessage(json, "Failed to load knock pins"));
  }

  if (!json.data) {
    throw new Error("Failed to load knock pins");
  }

  return json.data;
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
  const { response, json } = await apiJson<ReverseGeocodeResult>(
    `/api/v1/geocode/reverse?${params.toString()}`,
    { signal },
  );

  if (response.status === 503 && json.error?.code === "GEOCODE_NOT_CONFIGURED") {
    return { status: "not_configured" };
  }

  if (!response.ok || !json.data) {
    return { status: "failed" };
  }

  return { status: "ok", data: json.data };
}

export async function createKnock(
  payload: CreateKnockBody,
): Promise<CreateKnockResponse> {
  const { response, json } = await apiJson<CreateKnockResponse>(
    "/api/v1/knocks",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );

  if (!response.ok) {
    throw new Error(getApiErrorMessage(json, "Failed to save knock"));
  }

  if (!json.data?.knock) {
    throw new Error("Failed to save knock");
  }

  return json.data;
}

export async function syncPendingKnocks(
  knocks: SyncKnockItem[],
): Promise<SyncKnockResult[]> {
  const { response, json } = await apiJson<{ results: SyncKnockResult[] }>(
    "/api/v1/knocks/sync",
    {
      method: "POST",
      body: JSON.stringify({ knocks }),
    },
  );

  if (!response.ok) {
    const error = new Error(
      getApiErrorMessage(json, "Failed to sync knocks"),
    ) as Error & { code?: string };
    error.code = json.error?.code;
    throw error;
  }

  if (!json.data?.results) {
    throw new Error("Failed to sync knocks");
  }

  return json.data.results;
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

  const { response, json } = await apiJson<KnocksNearResponse>(
    `/api/v1/knocks/near?${params.toString()}`,
    { signal },
  );

  if (!response.ok) {
    throw new Error(getApiErrorMessage(json, "Failed to load knock history"));
  }

  if (!json.data) {
    throw new Error("Failed to load knock history");
  }

  return json.data;
}
