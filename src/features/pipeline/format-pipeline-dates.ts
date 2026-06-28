import { formatKnockHistoryDate } from "@/features/knocks/format-knock-date";

const SYDNEY_TZ = "Australia/Sydney";

function sydneyDateString(instant: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: SYDNEY_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(instant);
}

function sydneyDayDiff(fromIso: string, toIso: string): number {
  const fromDay = sydneyDateString(new Date(fromIso));
  const toDay = sydneyDateString(new Date(toIso));
  const fromMs = new Date(`${fromDay}T12:00:00Z`).getTime();
  const toMs = new Date(`${toDay}T12:00:00Z`).getTime();
  return Math.round((toMs - fromMs) / (24 * 60 * 60 * 1000));
}

export function formatLastTouchDate(iso: string): string {
  return formatKnockHistoryDate(iso);
}

export function formatPipelineDate(iso: string | null): string {
  if (!iso) {
    return "—";
  }
  return formatKnockHistoryDate(iso);
}

export function formatNextActionCountdown(dueAt: string | null): string {
  if (!dueAt) {
    return "None scheduled";
  }

  const now = new Date();
  const diff = sydneyDayDiff(now.toISOString(), dueAt);

  if (diff === 0) {
    return "Due today";
  }
  if (diff === 1) {
    return "Due tomorrow";
  }
  if (diff > 1) {
    return `Due in ${diff}d`;
  }
  if (diff === -1) {
    return "Overdue 1d";
  }
  return `Overdue ${Math.abs(diff)}d`;
}

export function isFollowUpOverdue(dueAt: string | null): boolean {
  if (!dueAt) {
    return false;
  }
  return formatNextActionCountdown(dueAt).startsWith("Overdue");
}
