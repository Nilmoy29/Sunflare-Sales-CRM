const SYDNEY_TZ = "Australia/Sydney";

const dateFormatter = new Intl.DateTimeFormat("en-AU", {
  timeZone: SYDNEY_TZ,
  day: "numeric",
  month: "short",
});

const timeFormatter = new Intl.DateTimeFormat("en-AU", {
  timeZone: SYDNEY_TZ,
  hour: "numeric",
  minute: "2-digit",
});

export function formatKnockHistoryDate(knockedAt: string): string {
  const date = new Date(knockedAt);
  return `${dateFormatter.format(date)}, ${timeFormatter.format(date)}`;
}

export function isKnockTodaySydney(knockedAt: string): boolean {
  const dayFormatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: SYDNEY_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const today = dayFormatter.format(new Date());
  const knockedDay = dayFormatter.format(new Date(knockedAt));
  return today === knockedDay;
}

export function repDisplayFirstName(fullName: string, isOwn: boolean): string {
  if (isOwn) {
    return "You";
  }
  const first = fullName.trim().split(/\s+/)[0];
  return first.length > 0 ? first : fullName;
}

export function formatSydneyDateString(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: SYDNEY_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function yesterdaySydneyDateString(): string {
  const today = formatSydneyDateString(new Date());
  const todayStart = new Date(startOfDaySydney(today));
  const yesterdayInstant = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);
  return formatSydneyDateString(yesterdayInstant);
}

export function formatSydneyMorningLabel(dateStr: string): string {
  const date = new Date(startOfDaySydney(dateStr));
  return new Intl.DateTimeFormat("en-AU", {
    timeZone: SYDNEY_TZ,
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function startOfDaySydney(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  let candidate = Date.UTC(y, m - 1, d - 1, 12, 0, 0);
  for (let i = 0; i < 72; i++) {
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

export function endOfDaySydney(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const nextDay = formatSydneyDateString(new Date(Date.UTC(y, m - 1, d + 1)));
  const nextStart = new Date(startOfDaySydney(nextDay));
  return new Date(nextStart.getTime() - 1).toISOString();
}

export function defaultKnockHistoryDateRange(): { from: string; to: string } {
  const to = formatSydneyDateString(new Date());
  const toStart = new Date(startOfDaySydney(to));
  const fromInstant = new Date(toStart.getTime() - 6 * 24 * 60 * 60 * 1000);
  return { from: formatSydneyDateString(fromInstant), to };
}

export function formatKnockAddress(item: {
  lat: number;
  lng: number;
  address: string | null;
  suburb: string | null;
  postcode: string | null;
}): string {
  const parts = [item.address, item.suburb, item.postcode].filter(
    (part): part is string => Boolean(part?.trim()),
  );
  if (parts.length > 0) {
    return parts.join(", ");
  }
  return `${item.lat.toFixed(5)}, ${item.lng.toFixed(5)}`;
}
