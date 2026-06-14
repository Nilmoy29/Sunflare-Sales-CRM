"use client";

import { useCallback, useMemo, useState } from "react";
import { AdminMapCanvas } from "@/components/admin/admin-map-canvas";
import { AdminMapViewport } from "@/components/admin/admin-map-viewport";
import { useShiftBreadcrumbs } from "@/features/admin/use-shift-breadcrumbs";
import type { AdminMapFilters } from "@/features/knocks/use-admin-map-knocks";
import {
  DOOR_OUTCOME_COLORS,
  DOOR_OUTCOME_LABELS,
} from "@/lib/geo/door-outcome-colors";
import { DOOR_OUTCOMES, type DoorOutcome } from "@/lib/validators/enums";

export type AdminMapRep = {
  id: string;
  name: string;
};

type AdminMapShellProps = {
  reps: AdminMapRep[];
};

function defaultFilters(): AdminMapFilters {
  return {
    from: null,
    to: null,
    repIds: null,
    outcomes: null,
  };
}

const DEFAULT_HEATMAP_OPACITY = 0.6;
const MIN_HEATMAP_OPACITY = 0.2;
const MAX_HEATMAP_OPACITY = 0.9;
const HEATMAP_OPACITY_STEP = 0.05;

export function AdminMapShell({ reps }: AdminMapShellProps) {
  const [filters, setFilters] = useState<AdminMapFilters>(defaultFilters);
  const [refreshKey, setRefreshKey] = useState(0);
  const [heatmapEnabled, setHeatmapEnabled] = useState(false);
  const [heatmapOpacity, setHeatmapOpacity] = useState(DEFAULT_HEATMAP_OPACITY);

  const allRepsSelected = filters.repIds === null;
  const allOutcomesSelected = filters.outcomes === null;

  const sortedReps = useMemo(
    () => [...reps].sort((a, b) => a.name.localeCompare(b.name)),
    [reps],
  );

  const selectAllReps = useCallback(() => {
    setFilters((prev) => ({ ...prev, repIds: null }));
    setRefreshKey((k) => k + 1);
  }, []);

  const toggleRep = useCallback((repId: string) => {
    setFilters((prev) => {
      if (prev.repIds === null) {
        return { ...prev, repIds: [repId] };
      }
      const next = prev.repIds.includes(repId)
        ? prev.repIds.filter((id) => id !== repId)
        : [...prev.repIds, repId];
      return { ...prev, repIds: next.length === 0 ? null : next };
    });
    setRefreshKey((k) => k + 1);
  }, []);

  const selectAllOutcomes = useCallback(() => {
    setFilters((prev) => ({ ...prev, outcomes: null }));
    setRefreshKey((k) => k + 1);
  }, []);

  const toggleOutcome = useCallback((outcome: DoorOutcome) => {
    setFilters((prev) => {
      if (prev.outcomes === null) {
        return { ...prev, outcomes: [outcome] };
      }
      const next = prev.outcomes.includes(outcome)
        ? prev.outcomes.filter((value) => value !== outcome)
        : [...prev.outcomes, outcome];
      return { ...prev, outcomes: next.length === 0 ? null : next };
    });
    setRefreshKey((k) => k + 1);
  }, []);

  const updateDate = useCallback((field: "from" | "to", value: string) => {
    setFilters((prev) => ({
      ...prev,
      [field]: value.length > 0 ? value : null,
    }));
    setRefreshKey((k) => k + 1);
  }, []);

  const clearDateRange = useCallback(() => {
    setFilters((prev) => ({ ...prev, from: null, to: null }));
    setRefreshKey((k) => k + 1);
  }, []);

  const allDatesSelected = filters.from === null && filters.to === null;
  const singleDay =
    filters.from !== null &&
    filters.to !== null &&
    filters.from === filters.to;
  const breadcrumbRepId =
    filters.repIds?.length === 1 ? filters.repIds[0]! : null;
  const breadcrumbDate = singleDay ? filters.from : null;
  const breadcrumbEnabled = breadcrumbRepId !== null && breadcrumbDate !== null;

  const breadcrumbs = useShiftBreadcrumbs(
    breadcrumbRepId,
    breadcrumbDate,
    breadcrumbEnabled,
  );

  const selectedRepName = useMemo(() => {
    if (!breadcrumbRepId) {
      return null;
    }
    return reps.find((rep) => rep.id === breadcrumbRepId)?.name ?? "Rep";
  }, [breadcrumbRepId, reps]);

  const routeHint = useMemo(() => {
    if (!singleDay) {
      return "Select a single day to view routes";
    }
    if (!breadcrumbRepId) {
      return null;
    }
    if (breadcrumbs.loading) {
      return "Loading route…";
    }
    if (breadcrumbs.error) {
      return breadcrumbs.error;
    }
    if (!breadcrumbs.shift) {
      return "No shift on this day";
    }
    const status = breadcrumbs.shift.ended_at ? "completed" : "active";
    const pingLabel =
      breadcrumbs.points.length === 1
        ? "1 ping"
        : `${breadcrumbs.points.length} pings`;
    return `Route: ${selectedRepName} · ${status} shift · ${pingLabel}`;
  }, [
    singleDay,
    breadcrumbRepId,
    breadcrumbs.loading,
    breadcrumbs.error,
    breadcrumbs.shift,
    breadcrumbs.points.length,
    selectedRepName,
  ]);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto lg:flex-row lg:overflow-hidden">
      <AdminMapViewport>
        <AdminMapCanvas
          filters={filters}
          refreshKey={refreshKey}
          heatmapEnabled={heatmapEnabled}
          heatmapOpacity={heatmapOpacity}
          breadcrumbs={{
            enabled: breadcrumbEnabled,
            points: breadcrumbs.points,
            loading: breadcrumbs.loading,
            error: breadcrumbs.error,
          }}
        />
      </AdminMapViewport>

      <aside className="flex w-full shrink-0 flex-col border-t border-border bg-card lg:min-h-0 lg:w-72 lg:overflow-y-auto lg:border-t-0 lg:border-r">
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <h1 className="text-lg font-semibold text-foreground">Global map</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          All reps&apos; knock pins. Showing all time by default.
        </p>

        <div className="mt-6 space-y-6">
          <section className="space-y-2">
            <p className="text-sm font-medium text-foreground">Reps</p>
            <div className="max-h-40 space-y-2 overflow-y-auto">
              <label className="flex min-h-10 cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={allRepsSelected}
                  onChange={selectAllReps}
                  className="size-4 rounded border-border"
                />
                <span className="font-medium">All reps</span>
              </label>
              {sortedReps.map((rep) => {
                const checked =
                  !allRepsSelected &&
                  filters.repIds !== null &&
                  filters.repIds.includes(rep.id);
                return (
                  <label
                    key={rep.id}
                    className="flex min-h-10 cursor-pointer items-center gap-2 text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleRep(rep.id)}
                      className="size-4 rounded border-border"
                    />
                    <span>{rep.name}</span>
                  </label>
                );
              })}
            </div>
            {routeHint ? (
              <p className="text-xs text-muted-foreground">{routeHint}</p>
            ) : null}
          </section>

          <section className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium text-foreground">Date range</p>
              <button
                type="button"
                onClick={clearDateRange}
                className={`min-h-8 rounded-lg px-2.5 text-xs font-semibold ring-2 ${
                  allDatesSelected
                    ? "bg-accent text-accent-foreground ring-zinc-900"
                    : "bg-card text-muted-foreground ring-border hover:bg-secondary"
                }`}
                aria-pressed={allDatesSelected}
              >
                All time
              </button>
            </div>
            <div className="grid gap-3">
              <div className="space-y-1">
                <label htmlFor="admin-map-from" className="text-sm text-muted-foreground">
                  From
                </label>
                <input
                  id="admin-map-from"
                  type="date"
                  value={filters.from ?? ""}
                  onChange={(e) => updateDate("from", e.target.value)}
                  className="min-h-10 w-full rounded-lg border border-border px-3 py-2 text-sm text-foreground"
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="admin-map-to" className="text-sm text-muted-foreground">
                  To
                </label>
                <input
                  id="admin-map-to"
                  type="date"
                  value={filters.to ?? ""}
                  onChange={(e) => updateDate("to", e.target.value)}
                  className="min-h-10 w-full rounded-lg border border-border px-3 py-2 text-sm text-foreground"
                />
              </div>
            </div>
          </section>

          <section className="space-y-2">
            <p className="text-sm font-medium text-foreground">Outcome</p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={selectAllOutcomes}
                className={`min-h-10 rounded-lg px-3 py-1.5 text-sm font-semibold ring-2 ${
                  allOutcomesSelected
                    ? "bg-accent text-accent-foreground ring-zinc-900"
                    : "bg-card text-muted-foreground ring-border hover:bg-secondary"
                }`}
                aria-pressed={allOutcomesSelected}
              >
                All
              </button>
              {DOOR_OUTCOMES.map((outcome) => {
                const selected =
                  filters.outcomes !== null && filters.outcomes.includes(outcome);
                return (
                  <button
                    key={outcome}
                    type="button"
                    onClick={() => toggleOutcome(outcome)}
                    className={`min-h-10 rounded-lg px-3 py-1.5 text-sm font-semibold text-accent-foreground ring-2 ${
                      selected ? "ring-zinc-900" : "ring-transparent opacity-80"
                    }`}
                    style={{ backgroundColor: DOOR_OUTCOME_COLORS[outcome] }}
                    aria-pressed={selected}
                  >
                    {DOOR_OUTCOME_LABELS[outcome]}
                  </button>
                );
              })}
            </div>
          </section>

          <section className="space-y-3">
            <p className="text-sm font-medium text-foreground">Coverage heatmap</p>
            <label className="flex min-h-10 cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={heatmapEnabled}
                onChange={(e) => setHeatmapEnabled(e.target.checked)}
                className="size-4 rounded border-border"
              />
              <span>Show knock density</span>
            </label>
            <div className="space-y-1">
              <label
                htmlFor="admin-map-heatmap-opacity"
                className="flex items-center justify-between text-sm text-muted-foreground"
              >
                <span>Opacity</span>
                <span>{Math.round(heatmapOpacity * 100)}%</span>
              </label>
              <input
                id="admin-map-heatmap-opacity"
                type="range"
                min={MIN_HEATMAP_OPACITY}
                max={MAX_HEATMAP_OPACITY}
                step={HEATMAP_OPACITY_STEP}
                value={heatmapOpacity}
                onChange={(e) => setHeatmapOpacity(Number(e.target.value))}
                disabled={!heatmapEnabled}
                aria-label="Heatmap opacity"
                aria-valuenow={heatmapOpacity}
                aria-valuemin={MIN_HEATMAP_OPACITY}
                aria-valuemax={MAX_HEATMAP_OPACITY}
                className="h-2 w-full cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
          </section>
        </div>
        </div>
      </aside>
    </div>
  );
}
