"use client";

import { useMemo } from "react";
import { ActivityFeed } from "@/components/admin/activity-feed";
import { DailyRepSummaryGrid } from "@/components/admin/daily-rep-summary-grid";
import { DashboardDateRangeControl } from "@/components/admin/dashboard-date-range-control";
import { DashboardMetricCard } from "@/components/admin/dashboard-metric-card";
import { DashboardTopPerformers } from "@/components/admin/dashboard-top-performers";
import { GeographicYieldPanel } from "@/components/admin/geographic-yield-panel";
import { TeamActivityChart } from "@/components/admin/team-activity-chart";
import { useAdminActivityFeed } from "@/features/admin/use-admin-activity-feed";
import { useDailyRepSummary } from "@/features/admin/use-daily-rep-summary";
import {
  DashboardDateRangeProvider,
  useDashboardDateRange,
} from "@/features/dashboard/dashboard-date-range-context";
import { useGeographicYield } from "@/features/dashboard/use-geographic-yield";
import { useTeamActivityTrend } from "@/features/dashboard/use-team-activity-trend";
import { useTeamLeaderboard } from "@/features/dashboard/use-team-leaderboard";

function AdminDashboardContent() {
  const { from, to, label, isToday } = useDashboardDateRange();
  const dailyRepSummary = useDailyRepSummary();
  const activityTrend = useTeamActivityTrend();
  const leaderboard = useTeamLeaderboard();
  const geographicYield = useGeographicYield();

  const feed = useAdminActivityFeed({
    from,
    to,
    realtimeEnabled: isToday,
    onNewActivity: isToday
      ? () => {
          dailyRepSummary.refetch();
        }
      : undefined,
  });

  const totals = useMemo(() => {
    return dailyRepSummary.rows.reduce(
      (acc, row) => ({
        doors: acc.doors + row.doors,
        calls: acc.calls + row.calls,
        leads: acc.leads + row.leads_added,
        appointments: acc.appointments + row.appointments_set,
      }),
      { doors: 0, calls: 0, leads: 0, appointments: 0 },
    );
  }, [dailyRepSummary.rows]);

  return (
    <main className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto p-4 md:p-6 lg:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Dashboard
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Team performance and field activity for {label}.
          </p>
        </div>
        <div className="w-full sm:max-w-xl">
          <DashboardDateRangeControl />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <DashboardMetricCard
          title="Doors knocked"
          value={dailyRepSummary.loading ? "—" : String(totals.doors)}
          subtitle="Total in selected range"
        />
        <DashboardMetricCard
          title="Calls logged"
          value={dailyRepSummary.loading ? "—" : String(totals.calls)}
          subtitle="Total in selected range"
        />
        <DashboardMetricCard
          title="Leads added"
          value={dailyRepSummary.loading ? "—" : String(totals.leads)}
          subtitle="Interested outcomes only"
        />
        <DashboardMetricCard
          title="Appointments set"
          value={dailyRepSummary.loading ? "—" : String(totals.appointments)}
          subtitle="Pipeline stage moves"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <TeamActivityChart
            metric={activityTrend.metric}
            days={activityTrend.days}
            loading={activityTrend.loading}
            error={activityTrend.error}
            rangeLabel={label}
            onMetricChange={activityTrend.setMetric}
          />
        </div>
        <DashboardTopPerformers
          metric={leaderboard.metric}
          rows={leaderboard.rows}
          loading={leaderboard.loading}
          error={leaderboard.error}
          onMetricChange={leaderboard.setMetric}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ActivityFeed {...feed} />
        <DailyRepSummaryGrid
          rows={dailyRepSummary.rows}
          loading={dailyRepSummary.loading}
          error={dailyRepSummary.error}
        />
      </div>

      <GeographicYieldPanel
        metric={geographicYield.metric}
        rows={geographicYield.rows}
        loading={geographicYield.loading}
        error={geographicYield.error}
        onMetricChange={geographicYield.setMetric}
      />
    </main>
  );
}

export function AdminDashboardShell() {
  return (
    <DashboardDateRangeProvider defaultPreset="week">
      <AdminDashboardContent />
    </DashboardDateRangeProvider>
  );
}
