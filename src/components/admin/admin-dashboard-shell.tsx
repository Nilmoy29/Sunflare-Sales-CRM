"use client";

import { useMemo } from "react";
import { ActivityFeed } from "@/components/admin/activity-feed";
import { DailyRepSummaryGrid } from "@/components/admin/daily-rep-summary-grid";
import { LowActivityPanel } from "@/components/admin/low-activity-panel";
import { MorningOverviewCard } from "@/components/admin/morning-overview-card";
import { useAdminActivityFeed } from "@/features/admin/use-admin-activity-feed";
import { useLowActivityReps } from "@/features/admin/use-low-activity-reps";
import { useMorningOverview } from "@/features/admin/use-morning-overview";

export function AdminDashboardShell() {
  const lowActivity = useLowActivityReps();
  const morning = useMorningOverview();

  const feed = useAdminActivityFeed({
    onNewActivity: lowActivity.refetch,
  });

  const flaggedRepIds = useMemo(
    () => new Set(lowActivity.flagged.map((rep) => rep.rep_id)),
    [lowActivity.flagged],
  );

  return (
    <main className="flex flex-1 flex-col gap-6 p-4 md:p-8">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Admin dashboard</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Live field activity from your team today.
        </p>
      </div>

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

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <ActivityFeed {...feed} />

        <DailyRepSummaryGrid flaggedRepIds={flaggedRepIds} />
      </div>
    </main>
  );
}
