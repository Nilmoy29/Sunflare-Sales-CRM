"use client";

import Link from "next/link";
import { DashboardDateRangeControl } from "@/components/admin/dashboard-date-range-control";
import { RepActivityTrendChart } from "@/components/admin/rep-activity-trend-chart";
import { RepPeriodTotals } from "@/components/admin/rep-period-totals";
import { RepPipelineSnapshot } from "@/components/admin/rep-pipeline-snapshot";
import { RepSelector } from "@/components/admin/rep-selector";
import type { RepListItem, RepProfile } from "@/features/admin/get-rep-profile";
import {
  DashboardDateRangeProvider,
  useDashboardDateRange,
} from "@/features/dashboard/dashboard-date-range-context";
import { useRepActivityTrend } from "@/features/dashboard/use-rep-activity-trend";
import { useRepPipelineSnapshot } from "@/features/dashboard/use-rep-pipeline-snapshot";

type RepDeepDiveShellProps = {
  rep: RepProfile;
  reps: RepListItem[];
};

function RepDeepDiveContent({ rep, reps }: RepDeepDiveShellProps) {
  const { label } = useDashboardDateRange();
  const trend = useRepActivityTrend(rep.id);
  const pipeline = useRepPipelineSnapshot(rep.id);

  return (
    <main className="flex flex-1 flex-col gap-6 p-4 md:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link
            href="/admin/dashboard"
            className="text-sm text-zinc-600 underline hover:text-zinc-900"
          >
            ← Back to dashboard
          </Link>
          <h1 className="mt-2 text-2xl font-semibold text-zinc-900">
            {rep.name}
          </h1>
          <p className="mt-1 text-sm text-zinc-600">
            Rep deep dive · {label}
          </p>
        </div>
        <RepSelector reps={reps} value={rep.id} />
      </div>

      <DashboardDateRangeControl />

      <RepPeriodTotals
        totals={trend.periodTotals}
        loading={trend.loading}
        hasError={Boolean(trend.error)}
      />

      <RepActivityTrendChart
        metric={trend.metric}
        rows={trend.days}
        loading={trend.loading}
        error={trend.error}
        onMetricChange={trend.setMetric}
      />

      <RepPipelineSnapshot
        stages={pipeline.stages}
        loading={pipeline.loading}
        error={pipeline.error}
      />
    </main>
  );
}

export function RepDeepDiveShell({ rep, reps }: RepDeepDiveShellProps) {
  return (
    <DashboardDateRangeProvider defaultPreset="week">
      <RepDeepDiveContent rep={rep} reps={reps} />
    </DashboardDateRangeProvider>
  );
}
