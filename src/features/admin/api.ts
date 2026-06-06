import type {
  ActivityFeedItem,
  ActivityFeedResponse,
} from "@/lib/validators/activity-feed";
import type { DailyRepSummaryResponse } from "@/lib/validators/daily-rep-summary";
import type {
  LowActivityResponse,
  MorningOverviewResponse,
} from "@/lib/validators/dashboard-coaching";
import type { ShiftBreadcrumbsResponse } from "@/lib/validators/shift-breadcrumbs";

export async function fetchRecentActivity(
  limit = 50,
  signal?: AbortSignal,
): Promise<ActivityFeedResponse> {
  const params = new URLSearchParams({ limit: String(limit) });
  const res = await fetch(`/api/v1/admin/activity?${params.toString()}`, {
    credentials: "include",
    signal,
  });

  const body = (await res.json()) as {
    data?: ActivityFeedResponse;
    error?: { code: string; message: string };
  };

  if (!res.ok) {
    throw new Error(body.error?.message ?? "Could not load activity feed");
  }

  if (!body.data) {
    throw new Error("Could not load activity feed");
  }

  return body.data;
}

export async function fetchActivityItem(
  id: string,
  signal?: AbortSignal,
): Promise<ActivityFeedItem> {
  const res = await fetch(`/api/v1/admin/activity/${id}`, {
    credentials: "include",
    signal,
  });

  const body = (await res.json()) as {
    data?: { item: ActivityFeedItem };
    error?: { code: string; message: string };
  };

  if (!res.ok) {
    throw new Error(body.error?.message ?? "Could not load activity item");
  }

  if (!body.data?.item) {
    throw new Error("Could not load activity item");
  }

  return body.data.item;
}

export async function fetchDailyRepSummary(
  date?: string,
  signal?: AbortSignal,
): Promise<DailyRepSummaryResponse> {
  const params = new URLSearchParams();
  if (date) {
    params.set("date", date);
  }

  const query = params.toString();
  const res = await fetch(
    `/api/v1/admin/dashboard/summary${query ? `?${query}` : ""}`,
    {
      credentials: "include",
      signal,
    },
  );

  const body = (await res.json()) as {
    data?: DailyRepSummaryResponse;
    error?: { code: string; message: string };
  };

  if (!res.ok) {
    throw new Error(body.error?.message ?? "Could not load daily rep summary");
  }

  if (!body.data) {
    throw new Error("Could not load daily rep summary");
  }

  return body.data;
}

export async function fetchMorningOverview(
  signal?: AbortSignal,
): Promise<MorningOverviewResponse> {
  const res = await fetch("/api/v1/admin/dashboard/morning-overview", {
    credentials: "include",
    signal,
  });

  const body = (await res.json()) as {
    data?: MorningOverviewResponse;
    error?: { code: string; message: string };
  };

  if (!res.ok) {
    throw new Error(body.error?.message ?? "Could not load morning overview");
  }

  if (!body.data) {
    throw new Error("Could not load morning overview");
  }

  return body.data;
}

export async function fetchLowActivityReps(
  windowMinutes?: number,
  signal?: AbortSignal,
): Promise<LowActivityResponse> {
  const params = new URLSearchParams();
  if (windowMinutes !== undefined) {
    params.set("window_minutes", String(windowMinutes));
  }

  const query = params.toString();
  const res = await fetch(
    `/api/v1/admin/dashboard/low-activity${query ? `?${query}` : ""}`,
    {
      credentials: "include",
      signal,
    },
  );

  const body = (await res.json()) as {
    data?: LowActivityResponse;
    error?: { code: string; message: string };
  };

  if (!res.ok) {
    throw new Error(body.error?.message ?? "Could not load low-activity reps");
  }

  if (!body.data) {
    throw new Error("Could not load low-activity reps");
  }

  return body.data;
}

export async function fetchShiftBreadcrumbs(
  repId: string,
  date: string,
  signal?: AbortSignal,
): Promise<ShiftBreadcrumbsResponse> {
  const params = new URLSearchParams({
    rep_id: repId,
    date,
  });

  const res = await fetch(
    `/api/v1/admin/gps/breadcrumbs?${params.toString()}`,
    {
      credentials: "include",
      signal,
    },
  );

  const body = (await res.json()) as {
    data?: ShiftBreadcrumbsResponse;
    error?: { code: string; message: string };
  };

  if (!res.ok) {
    throw new Error(body.error?.message ?? "Could not load shift breadcrumbs");
  }

  if (!body.data) {
    throw new Error("Could not load shift breadcrumbs");
  }

  return body.data;
}
