import type { DoorOutcome } from "@sunflare/shared";
import type { CallOutcome } from "@sunflare/shared";
import {
  CALL_OUTCOME_LABELS,
  formatCallDate,
  formatCallDurationMinutes,
} from "@/features/calls/labels";
import { DOOR_OUTCOME_LABELS } from "@/lib/geo/door-outcome-colors";

export function formatKnockHistoryDate(knockedAt: string): string {
  const date = new Date(knockedAt);
  if (Number.isNaN(date.getTime())) {
    return knockedAt;
  }
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatKnockAddress(item: {
  lat: number;
  lng: number;
  address: string | null;
  suburb: string | null;
  postcode?: string | null;
}): string {
  const parts = [item.address, item.suburb, item.postcode].filter(
    (part): part is string => Boolean(part?.trim()),
  );
  if (parts.length > 0) {
    return parts.join(", ");
  }
  return `${item.lat.toFixed(5)}, ${item.lng.toFixed(5)}`;
}

export function formatCallContactLine(item: {
  contact_name: string | null;
  contact_phone: string | null;
  address: string | null;
  suburb: string | null;
}): string {
  const name = item.contact_name?.trim();
  const phone = item.contact_phone?.trim();
  const addressParts = [item.address, item.suburb]
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part));

  if (name && phone) {
    return `${name} · ${phone}`;
  }
  if (name) {
    return name;
  }
  if (phone) {
    return phone;
  }
  if (addressParts.length > 0) {
    return addressParts.join(", ");
  }
  return "Unknown contact";
}

export function doorOutcomeLabel(outcome: DoorOutcome): string {
  return DOOR_OUTCOME_LABELS[outcome];
}

export function callOutcomeLabel(outcome: CallOutcome): string {
  return CALL_OUTCOME_LABELS[outcome];
}

export { formatCallDate, formatCallDurationMinutes };
