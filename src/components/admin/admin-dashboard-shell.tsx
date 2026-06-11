"use client";

import { useMemo } from "react";
import { ActivityFeed } from "@/components/admin/activity-feed";
import { DailyRepSummaryGrid } from "@/components/admin/daily-rep-summary-grid";
import { DashboardDateRangeControl } from "@/components/admin/dashboard-date-range-control";
import { FunnelChart } from "@/components/admin/funnel-chart";
import { GeographicYieldPanel } from "@/components/admin/geographic-yield-panel";
import { LowActivityPanel } from "@/components/admin/low-activity-panel";
import { MorningOverviewCard } from "@/components/admin/morning-overview-card";
import { useAdminActivityFeed } from "@/features/admin/use-admin-activity-feed";
import { useDailyRepSummary } from "@/features/admin/use-daily-rep-summary";
import { useLowActivityReps } from "@/features/admin/use-low-activity-reps";
import { useMorningOverview } from "@/features/admin/use-morning-overview";
import {
  DashboardDateRangeProvider,
  useDashboardDateRange,
} from "@/features/dashboard/dashboard-date-range-context";
import { TeamLeaderboard } from "@/components/admin/team-leaderboard";
import { useFunnelConversion } from "@/features/dashboard/use-funnel-conversion";
import { useGeographicYield } from "@/features/dashboard/use-geographic-yield";
import { useTeamLeaderboard } from "@/features/dashboard/use-team-leaderboard";

function AdminDashboardContent() {
  const { from, to, label, isToday } = useDashboardDateRange();
  const lowActivity = useLowActivityReps({ enabled: isToday });
  const morning = useMorningOverview({ enabled: isToday });
  const dailyRepSummary = useDailyRepSummary();

  const feed = useAdminActivityFeed({
    from,
    to,
    realtimeEnabled: isToday,
    onNewActivity: isToday
      ? () => {
          lowActivity.refetch();
          dailyRepSummary.refetch();
        }
      : undefined,
  });
  const funnel = useFunnelConversion();
  const leaderboard = useTeamLeaderboard();
  const geographicYield = useGeographicYield();

  const flaggedRepIds = useMemo(
    () => new Set(lowActivity.flagged.map((rep) => rep.rep_id)),
    [lowActivity.flagged],
  );

  return (
    <main className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto p-4 md:p-8">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Admin dashboard</h1>
        <p className="mt-1 text-sm text-zinc-600">
          {isToday
            ? "Live field activity from your team today."
            : `Field activity and rep metrics for ${label}.`}
        </p>
      </div>

      <DashboardDateRangeControl />

      {isToday ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <MorningOverviewCard
            overview={morning.overview}
            loading={morning.loading}
            error={morning.error}
          />
          <LowActivityPanel
            flagged={lowActivity.flagged}
            windowMinutes={lowActivity.windowMinutes}
            loading={lowActivity.loading}
            error={lowActivity.error}
          />
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-2">
        <FunnelChart
          stages={funnel.stages}
          loading={funnel.loading}
          error={funnel.error}
        />

        <TeamLeaderboard
          metric={leaderboard.metric}
          rows={leaderboard.rows}
          loading={leaderboard.loading}
          error={leaderboard.error}
          onMetricChange={leaderboard.setMetric}
        />
      </div>

      <GeographicYieldPanel
        metric={geographicYield.metric}
        rows={geographicYield.rows}
        loading={geographicYield.loading}
        error={geographicYield.error}
        onMetricChange={geographicYield.setMetric}
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <ActivityFeed {...feed} />

        <DailyRepSummaryGrid
          flaggedRepIds={isToday ? flaggedRepIds : undefined}
          rows={dailyRepSummary.rows}
          loading={dailyRepSummary.loading}
          error={dailyRepSummary.error}
        />
      </div>
    </main>
  );
}

export function AdminDashboardShell() {
  return (
    <DashboardDateRangeProvider>
      <AdminDashboardContent />
    </DashboardDateRangeProvider>
  );
}
