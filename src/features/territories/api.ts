import type {
  CreateTerritoryAssignmentBody,
  CreateTerritoryAssignmentResponse,
  TerritoryAssignmentsListQuery,
  TerritoryAssignmentsListResponse,
  TerritoryAssignmentSummary,
} from "@/lib/validators/territory-assignments";
import type { RepTerritoriesForDateResponse } from "@/lib/validators/territories";
import type {
  CreateTerritoryBody,
  CreateTerritoryResponse,
  TerritoriesListResponse,
  TerritorySummary,
  UpdateTerritoryBody,
  UpdateTerritoryResponse,
} from "@/lib/validators/territories";

export type CreateTerritoryApiResult =
  | { status: "ok"; territory: TerritorySummary }
  | { status: "error"; message: string };

export type UpdateTerritoryApiResult =
  | { status: "ok"; territory: TerritorySummary }
  | { status: "error"; message: string };

export type DeleteTerritoryApiResult =
  | { status: "ok" }
  | { status: "error"; message: string };

export async function fetchTerritories(
  signal?: AbortSignal,
): Promise<TerritoriesListResponse> {
  const res = await fetch("/api/v1/territories", {
    credentials: "include",
    signal,
  });

  const body = (await res.json()) as {
    data?: TerritoriesListResponse;
    error?: { code: string; message: string };
  };

  if (!res.ok) {
    throw new Error(body.error?.message ?? "Failed to load territories");
  }

  if (!body.data) {
    throw new Error("Invalid territories response");
  }

  return body.data;
}

export async function createTerritory(
  payload: CreateTerritoryBody,
): Promise<CreateTerritoryApiResult> {
  const res = await fetch("/api/v1/territories", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const body = (await res.json()) as {
    data?: CreateTerritoryResponse;
    error?: { code: string; message: string };
  };

  if (!res.ok) {
    return {
      status: "error",
      message: body.error?.message ?? "Could not create territory",
    };
  }

  if (!body.data?.territory) {
    return { status: "error", message: "Invalid create territory response" };
  }

  return { status: "ok", territory: body.data.territory };
}

export async function updateTerritory(
  id: string,
  payload: UpdateTerritoryBody,
): Promise<UpdateTerritoryApiResult> {
  const res = await fetch(`/api/v1/territories/${id}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const body = (await res.json()) as {
    data?: UpdateTerritoryResponse;
    error?: { code: string; message: string };
  };

  if (!res.ok) {
    return {
      status: "error",
      message: body.error?.message ?? "Could not update territory",
    };
  }

  if (!body.data?.territory) {
    return { status: "error", message: "Invalid update territory response" };
  }

  return { status: "ok", territory: body.data.territory };
}

export async function deleteTerritory(
  id: string,
): Promise<DeleteTerritoryApiResult> {
  const res = await fetch(`/api/v1/territories/${id}`, {
    method: "DELETE",
    credentials: "include",
  });

  const body = (await res.json()) as {
    data?: { ok: boolean };
    error?: { code: string; message: string };
  };

  if (!res.ok) {
    return {
      status: "error",
      message: body.error?.message ?? "Could not delete territory",
    };
  }

  return { status: "ok" };
}

export type CreateTerritoryAssignmentApiResult =
  | { status: "ok"; assignment: TerritoryAssignmentSummary }
  | { status: "error"; message: string };

export async function fetchTerritoryAssignments(
  query: TerritoryAssignmentsListQuery = {},
  signal?: AbortSignal,
): Promise<TerritoryAssignmentsListResponse> {
  const params = new URLSearchParams();

  if (query.assigned_date) {
    params.set("assigned_date", query.assigned_date);
  }
  if (query.rep_id) {
    params.set("rep_id", query.rep_id);
  }
  if (query.territory_id) {
    params.set("territory_id", query.territory_id);
  }

  const qs = params.toString();
  const url = qs
    ? `/api/v1/territory-assignments?${qs}`
    : "/api/v1/territory-assignments";

  const res = await fetch(url, {
    credentials: "include",
    signal,
  });

  const body = (await res.json()) as {
    data?: TerritoryAssignmentsListResponse;
    error?: { code: string; message: string };
  };

  if (!res.ok) {
    throw new Error(body.error?.message ?? "Failed to load territory assignments");
  }

  if (!body.data) {
    throw new Error("Invalid territory assignments response");
  }

  return body.data;
}

export async function createTerritoryAssignment(
  payload: CreateTerritoryAssignmentBody,
): Promise<CreateTerritoryAssignmentApiResult> {
  const res = await fetch("/api/v1/territory-assignments", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const body = (await res.json()) as {
    data?: CreateTerritoryAssignmentResponse;
    error?: { code: string; message: string };
  };

  if (!res.ok) {
    return {
      status: "error",
      message: body.error?.message ?? "Could not create territory assignment",
    };
  }

  if (!body.data?.assignment) {
    return {
      status: "error",
      message: "Invalid create territory assignment response",
    };
  }

  return { status: "ok", assignment: body.data.assignment };
}

export async function fetchRepTerritoriesForDate(
  signal?: AbortSignal,
): Promise<RepTerritoriesForDateResponse> {
  const res = await fetch("/api/v1/territories/mine", {
    credentials: "include",
    signal,
  });

  const body = (await res.json()) as {
    data?: RepTerritoriesForDateResponse;
    error?: { code: string; message: string };
  };

  if (!res.ok) {
    throw new Error(body.error?.message ?? "Failed to load assigned territories");
  }

  if (!body.data) {
    throw new Error("Invalid rep territories response");
  }

  return body.data;
}
