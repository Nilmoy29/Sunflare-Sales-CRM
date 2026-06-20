import { formatSydneyDateString } from "@/features/knocks/format-knock-date";

export function sydneyTodayAssignDate(): string {
  return formatSydneyDateString(new Date());
}

export function refreshStaleAssignDate(current: string): string {
  const today = sydneyTodayAssignDate();
  return current < today ? today : current;
}
