const SYDNEY_TZ = "Australia/Sydney";

export function formatSydneyDateString(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: SYDNEY_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function startOfDaySydney(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  let candidate = Date.UTC(y, m - 1, d - 1, 12, 0, 0);
  for (let i = 0; i < 72; i += 1) {
    candidate += 3600000;
    const day = formatSydneyDateString(new Date(candidate));
    const hm = new Intl.DateTimeFormat("en-GB", {
      timeZone: SYDNEY_TZ,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date(candidate));
    if (day === dateStr && hm === "00:00") {
      return new Date(candidate).toISOString();
    }
  }
  throw new Error(`Invalid Sydney date: ${dateStr}`);
}

export function defaultHistoryDateRange(): { from: string; to: string } {
  const to = formatSydneyDateString(new Date());
  const toStart = new Date(startOfDaySydney(to));
  const fromInstant = new Date(toStart.getTime() - 6 * 24 * 60 * 60 * 1000);
  return { from: formatSydneyDateString(fromInstant), to };
}

export function formatHistoryDateLabel(dateStr: string): string {
  const date = new Date(startOfDaySydney(dateStr));
  return new Intl.DateTimeFormat("en-AU", {
    timeZone: SYDNEY_TZ,
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function sydneyDateToDate(dateStr: string): Date {
  return new Date(startOfDaySydney(dateStr));
}

export function dateToSydneyDateString(date: Date): string {
  return formatSydneyDateString(date);
}
