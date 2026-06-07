import { normalizePhoneForMatch } from "@/lib/validators/contacts";

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
