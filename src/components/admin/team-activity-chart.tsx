"use client";

import { startOfDaySydney } from "@/features/knocks/format-knock-date";
import {
  LEADERBOARD_METRIC_LABELS,
  LEADERBOARD_METRIC_OPTIONS,
  type LeaderboardMetric,
} from "@/lib/validators/team-leaderboard";
import type { RepActivityTrendDay } from "@/lib/validators/rep-deep-dive";

type TeamActivityChartProps = {
  metric: LeaderboardMetric;
  days: RepActivityTrendDay[];
  loading: boolean;
  error: string | null;
  rangeLabel: string;
  onMetricChange: (metric: LeaderboardMetric) => void;
};

function metricValue(day: RepActivityTrendDay, metric: LeaderboardMetric): number {
  switch (metric) {
    case "doors":
      return day.doors;
    case "calls":
      return day.calls;
    case "leads_added":
      return day.leads_added;
    case "appointments_set":
      return day.appointments_set;
    default:
      return day.doors;
  }
}

function formatChartDate(dateStr: string): string {
  const date = new Date(startOfDaySydney(dateStr));
  return new Intl.DateTimeFormat("en-AU", {
    timeZone: "Australia/Sydney",
    weekday: "short",
    day: "numeric",
  }).format(date);
}

function buildAreaPath(
  values: number[],
  width: number,
  height: number,
  padding: { top: number; right: number; bottom: number; left: number },
): string {
  if (values.length === 0) {
    return "";
  }

  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const max = Math.max(...values, 1);
  const stepX = values.length > 1 ? chartWidth / (values.length - 1) : 0;

  const points = values.map((value, index) => {
    const x = padding.left + index * stepX;
    const y = padding.top + chartHeight - (value / max) * chartHeight;
    return { x, y };
  });

  const line = points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");

  const last = points[points.length - 1]!;
  const first = points[0]!;
  const baseY = padding.top + chartHeight;

  return `${line} L ${last.x} ${baseY} L ${first.x} ${baseY} Z`;
}

function buildLinePath(
  values: number[],
  width: number,
  height: number,
  padding: { top: number; right: number; bottom: number; left: number },
): string {
  if (values.length === 0) {
    return "";
  }

  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const max = Math.max(...values, 1);
  const stepX = values.length > 1 ? chartWidth / (values.length - 1) : 0;

  return values
    .map((value, index) => {
      const x = padding.left + index * stepX;
      const y = padding.top + chartHeight - (value / max) * chartHeight;
      return `${index === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");
}

export function TeamActivityChart({
  metric,
  days,
  loading,
  error,
  rangeLabel,
  onMetricChange,
}: TeamActivityChartProps) {
  const metricLabel = LEADERBOARD_METRIC_LABELS[metric];
  const values = days.map((day) => metricValue(day, metric));
  const total = values.reduce((sum, value) => sum + value, 0);

  const width = 640;
  const height = 240;
  const padding = { top: 16, right: 16, bottom: 8, left: 8 };
  const areaPath = buildAreaPath(values, width, height, padding);
  const linePath = buildLinePath(values, width, height, padding);

  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-foreground">
            Team activity
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Daily {metricLabel.toLowerCase()} · {rangeLabel}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {LEADERBOARD_METRIC_OPTIONS.map((option) => {
            const active = metric === option.id;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => onMetricChange(option.id)}
                aria-pressed={active}
                className={
                  active
                    ? "rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-accent-foreground"
                    : "rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-secondary"
                }
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      {error ? (
        <p className="rounded-lg bg-secondary px-3 py-2 text-sm text-muted-foreground ring-1 ring-border">
          {error}
        </p>
      ) : null}

      {loading && !error ? (
        <div className="h-[220px] animate-pulse rounded-lg bg-secondary" />
      ) : null}

      {!loading && !error && days.length === 0 ? (
        <p className="rounded-lg bg-secondary px-4 py-10 text-center text-sm text-muted-foreground ring-1 ring-border">
          No activity in this period
        </p>
      ) : null}

      {!loading && !error && days.length > 0 ? (
        <div>
          <p className="mb-4 text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{total}</span> total{" "}
            {metricLabel.toLowerCase()} in range
          </p>
          <div className="overflow-x-auto">
            <svg
              viewBox={`0 0 ${width} ${height}`}
              className="h-[220px] w-full min-w-[280px]"
              role="img"
              aria-label={`Team ${metricLabel.toLowerCase()} trend chart`}
            >
              <defs>
                <linearGradient id="teamActivityFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="oklch(0.7 0.18 220)" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="oklch(0.7 0.18 220)" stopOpacity="0" />
                </linearGradient>
              </defs>
              {Array.from({ length: 4 }).map((_, index) => {
                const y =
                  padding.top +
                  ((height - padding.top - padding.bottom) / 3) * index;
                return (
                  <line
                    key={index}
                    x1={padding.left}
                    x2={width - padding.right}
                    y1={y}
                    y2={y}
                    stroke="oklch(0.22 0.005 260)"
                    strokeDasharray="4 4"
                  />
                );
              })}
              {areaPath ? (
                <path d={areaPath} fill="url(#teamActivityFill)" />
              ) : null}
              {linePath ? (
                <path
                  d={linePath}
                  fill="none"
                  stroke="oklch(0.7 0.18 220)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ) : null}
              {values.map((value, index) => {
                const chartWidth = width - padding.left - padding.right;
                const chartHeight = height - padding.top - padding.bottom;
                const max = Math.max(...values, 1);
                const stepX = values.length > 1 ? chartWidth / (values.length - 1) : 0;
                const x = padding.left + index * stepX;
                const y = padding.top + chartHeight - (value / max) * chartHeight;
                return (
                  <circle
                    key={days[index]!.activity_date}
                    cx={x}
                    cy={y}
                    r="4"
                    fill="oklch(0.7 0.18 220)"
                  />
                );
              })}
            </svg>
          </div>
          <div className="mt-2 flex justify-between gap-1 text-xs text-muted-foreground">
            {days.map((day) => (
              <span key={day.activity_date} className="min-w-0 truncate text-center">
                {formatChartDate(day.activity_date)}
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
