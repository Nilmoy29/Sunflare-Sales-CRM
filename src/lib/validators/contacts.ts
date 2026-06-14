import { z } from "zod";
import { phoneSchema } from "@/lib/validators/auth";

export const CONTACT_SEARCH_MIN_LENGTH = 2;
export const CONTACT_SEARCH_DEFAULT_LIMIT = 20;
export const CONTACT_SEARCH_MAX_LIMIT = 50;

export function normalizePhoneForMatch(phone: string): string {
  const trimmed = phone.trim();
  const digits = trimmed.replace(/\D/g, "");
  return digits.length > 0 ? digits : trimmed;
}

export const contactSummarySchema = z.object({
  id: z.string().uuid(),
  first_name: z.string().nullable(),
  last_name: z.string().nullable(),
  phone: z.string().nullable(),
  address: z.string().nullable(),
  suburb: z.string().nullable(),
  postcode: z.string().nullable(),
});

export type ContactSummary = z.infer<typeof contactSummarySchema>;

export const contactSearchResultSchema = contactSummarySchema.extend({
  is_linked: z.boolean(),
});

export type ContactSearchResult = z.infer<typeof contactSearchResultSchema>;

export const contactSearchQuerySchema = z.object({
  q: z
    .string()
    .trim()
    .min(CONTACT_SEARCH_MIN_LENGTH, "Enter at least 2 characters to search"),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(CONTACT_SEARCH_MAX_LIMIT)
    .optional()
    .default(CONTACT_SEARCH_DEFAULT_LIMIT),
});

export const contactSearchResponseSchema = z.object({
  contacts: z.array(contactSearchResultSchema),
});

export type ContactSearchResponse = z.infer<typeof contactSearchResponseSchema>;

export const createContactBodySchema = z.object({
  first_name: z.string().trim().min(1, "First name is required").max(100),
  last_name: z.string().trim().min(1, "Last name is required").max(100),
  phone: phoneSchema.min(1, "Phone is required"),
  address: z.string().trim().max(200).optional().nullable(),
  suburb: z.string().trim().max(100).optional().nullable(),
  postcode: z.string().trim().max(16).optional().nullable(),
});

export type CreateContactBody = z.infer<typeof createContactBodySchema>;

const optionalTrimmedNullableString = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .nullable()
    .transform((value) => (value ? value : null));

export const updateContactBodySchema = z.object({
  first_name: z.string().trim().min(1, "Customer name is required").max(100),
  last_name: optionalTrimmedNullableString(100),
  phone: optionalTrimmedNullableString(32),
  address: optionalTrimmedNullableString(500),
  suburb: optionalTrimmedNullableString(120),
  postcode: optionalTrimmedNullableString(16),
});

export type UpdateContactBody = z.infer<typeof updateContactBodySchema>;

export const updateContactResponseSchema = z.object({
  contact: contactSummarySchema,
});

export type UpdateContactResponse = z.infer<typeof updateContactResponseSchema>;

export const createContactResponseSchema = z.object({
  contact: contactSummarySchema,
});

export type CreateContactResponse = z.infer<typeof createContactResponseSchema>;

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
  postcode: string | null;
}): string | null {
  const parts = [contact.address, contact.suburb, contact.postcode]
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part));
  return parts.length > 0 ? parts.join(", ") : null;
}

export function parseContactSummary(row: Record<string, unknown>): ContactSummary | null {
  const parsed = contactSummarySchema.safeParse({
    id: row.id,
    first_name: row.first_name ?? null,
    last_name: row.last_name ?? null,
    phone: row.phone ?? null,
    address: row.address ?? null,
    suburb: row.suburb ?? null,
    postcode: row.postcode ?? null,
  });
  return parsed.success ? parsed.data : null;
}

export function parseContactSearchResult(
  row: Record<string, unknown>,
): ContactSearchResult | null {
  const parsed = contactSearchResultSchema.safeParse({
    id: row.id,
    first_name: row.first_name ?? null,
    last_name: row.last_name ?? null,
    phone: row.phone ?? null,
    address: row.address ?? null,
    suburb: row.suburb ?? null,
    postcode: row.postcode ?? null,
    is_linked: row.is_linked === true,
  });
  return parsed.success ? parsed.data : null;
}
