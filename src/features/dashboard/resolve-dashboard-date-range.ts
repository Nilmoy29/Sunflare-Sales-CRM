import {
  formatSydneyDateString,
  startOfDaySydney,
} from "@/features/knocks/format-knock-date";
import type { DashboardDatePreset } from "@/lib/validators/dashboard-date-range";

const SYDNEY_TZ = "Australia/Sydney";

const WEEKDAY_SHORT_TO_ISO: Record<string, number> = {
  Mon: 0,
  Tue: 1,
  Wed: 2,
  Thu: 3,
  Fri: 4,
  Sat: 5,
  Sun: 6,
};

function getIsoWeekdaySydney(dateStr: string): number {
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: SYDNEY_TZ,
    weekday: "short",
  }).format(new Date(startOfDaySydney(dateStr)));
  return WEEKDAY_SHORT_TO_ISO[weekday] ?? 0;
}

export function addDaysSydney(dateStr: string, days: number): string {
  const start = new Date(startOfDaySydney(dateStr));
  const next = new Date(start.getTime() + days * 24 * 60 * 60 * 1000);
  return formatSydneyDateString(next);
}

function startOfMonthSydney(dateStr: string): string {
  const [y, m] = dateStr.split("-").map(Number);
  return `${y}-${String(m).padStart(2, "0")}-01`;
}

function endOfMonthSydney(dateStr: string): string {
  const [y, m] = dateStr.split("-").map(Number);
  return formatSydneyDateString(new Date(Date.UTC(y, m, 0)));
}

function formatSingleDayLabel(dateStr: string): string {
  const date = new Date(startOfDaySydney(dateStr));
  return new Intl.DateTimeFormat("en-AU", {
    timeZone: SYDNEY_TZ,
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatMonthLabel(dateStr: string): string {
  const date = new Date(startOfDaySydney(dateStr));
  return new Intl.DateTimeFormat("en-AU", {
    timeZone: SYDNEY_TZ,
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatDayMonth(dateStr: string): string {
  const date = new Date(startOfDaySydney(dateStr));
  return new Intl.DateTimeFormat("en-AU", {
    timeZone: SYDNEY_TZ,
    day: "numeric",
    month: "short",
  }).format(date);
}

export function formatDashboardRangeLabel(from: string, to: string): string {
  if (from === to) {
    const today = formatSydneyDateString(new Date());
    if (from === today) {
      return `Today — ${formatSingleDayLabel(from)}`;
    }
    return formatSingleDayLabel(from);
  }

  const fromYear = from.slice(0, 4);
  const toYear = to.slice(0, 4);
  const fromPart = formatDayMonth(from);
  const toPart =
    fromYear === toYear
      ? formatDayMonth(to)
      : `${formatDayMonth(to)} ${toYear}`;

  return `${fromPart} – ${toPart}`;
}

export function resolveDashboardDateRange(
  preset: DashboardDatePreset,
  customFrom?: string,
  customTo?: string,
): { from: string; to: string; label: string } {
  const today = formatSydneyDateString(new Date());

  if (preset === "today") {
    return {
      from: today,
      to: today,
      label: formatDashboardRangeLabel(today, today),
    };
  }

  if (preset === "week") {
    const weekday = getIsoWeekdaySydney(today);
    const from = addDaysSydney(today, -weekday);
    const to = addDaysSydney(from, 6);
    return {
      from,
      to,
      label: formatDashboardRangeLabel(from, to),
    };
  }

  if (preset === "month") {
    const from = startOfMonthSydney(today);
    const to = endOfMonthSydney(today);
    return {
      from,
      to,
      label: formatMonthLabel(from),
    };
  }

  const from = customFrom ?? today;
  const to = customTo ?? today;

  return {
    from,
    to,
    label: formatDashboardRangeLabel(from, to),
  };
}

export function isTodayRange(from: string, to: string): boolean {
  const today = formatSydneyDateString(new Date());
  return from === today && to === today;
}
