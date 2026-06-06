import {
  formatSydneyDateString,
  startOfDaySydney,
} from "@/features/knocks/format-knock-date";
import type { PipelineFilters } from "@/lib/validators/pipeline";

export function defaultPipelineFilters(): PipelineFilters {
  const today = formatSydneyDateString(new Date());
  const todayStart = new Date(startOfDaySydney(today));
  const fromInstant = new Date(todayStart.getTime() - 30 * 24 * 60 * 60 * 1000);

  return {
    stages: null,
    repIds: null,
    sources: null,
    suburb: "",
    from: formatSydneyDateString(fromInstant),
    to: today,
  };
}
