import { CALL_OUTCOMES, type CallOutcome } from "@sunflare/shared";

export const CALL_OUTCOME_LABELS: Record<CallOutcome, string> = {
  answered_interested: "Answered – Interested",
  answered_not_interested: "Answered – Not Interested",
  voicemail: "Voicemail",
  no_answer: "No Answer",
  wrong_number: "Wrong Number",
  callback_scheduled: "Callback Scheduled",
};

export const CALL_OUTCOME_BUTTON_COLORS: Record<CallOutcome, string> = {
  answered_interested: "#15803d",
  answered_not_interested: "#b91c1c",
  voicemail: "#a16207",
  no_answer: "#475569",
  wrong_number: "#c2410c",
  callback_scheduled: "#1d4ed8",
};

export { CALL_OUTCOMES };

export function isPromotableCallOutcome(outcome: string): boolean {
  return outcome === "answered_interested";
}

export function formatContactDisplayName(contact: {
  first_name: string | null;
  last_name: string | null;
}): string {
  const parts = [contact.first_name, contact.last_name]
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part));
  return parts.length > 0 ? parts.join(" ") : "Unnamed contact";
}

export function formatContactAddressLine(contact: {
  address: string | null;
  suburb: string | null;
  postcode?: string | null;
}): string | null {
  const parts = [contact.address, contact.suburb, contact.postcode]
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part));
  return parts.length > 0 ? parts.join(", ") : null;
}

export function normalizePhoneForMatch(phone: string): string {
  const trimmed = phone.trim();
  const digits = trimmed.replace(/\D/g, "");
  return digits.length > 0 ? digits : trimmed;
}

export function toTelHref(phone: string | null | undefined): string | null {
  if (!phone?.trim()) {
    return null;
  }
  const normalized = normalizePhoneForMatch(phone);
  if (!/^\d+$/.test(normalized) || normalized.length < 3) {
    return null;
  }
  return `tel:${normalized}`;
}

export function formatCallDurationMinutes(
  durationSeconds: number | null,
): string | null {
  if (durationSeconds === null || durationSeconds <= 0) {
    return null;
  }
  const minutes = Math.max(1, Math.round(durationSeconds / 60));
  return `${minutes} min`;
}

export function formatCallDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
