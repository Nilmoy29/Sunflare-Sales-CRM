import { z } from "zod";
import { doorOutcomeSchema } from "./enums";

export const NOTES_MAX_LENGTH = 2000;
export const ADDRESS_MAX_LENGTH = 500;
export const SUBURB_MAX_LENGTH = 120;
export const POSTCODE_MAX_LENGTH = 16;

const optionalTrimmedNullableString = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .nullable()
    .transform((value) => (value ? value : null));

export const contactAddressFieldsSchema = z.object({
  address: optionalTrimmedNullableString(ADDRESS_MAX_LENGTH),
  suburb: optionalTrimmedNullableString(SUBURB_MAX_LENGTH),
  postcode: optionalTrimmedNullableString(POSTCODE_MAX_LENGTH),
});

export const createKnockBodySchema = z
  .object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
    outcome: doorOutcomeSchema,
    notes: z
      .string()
      .trim()
      .max(NOTES_MAX_LENGTH)
      .optional()
      .nullable()
      .transform((value) => (value ? value : null)),
    follow_up_at: z
      .string()
      .datetime({ offset: true })
      .optional()
      .nullable()
      .transform((value) => (value ? value : null)),
  })
  .merge(contactAddressFieldsSchema);

export type CreateKnockBody = z.infer<typeof createKnockBodySchema>;

export const SYNC_KNOCKS_MAX_BATCH = 50;

export const syncKnockItemSchema = z
  .object({
    client_id: z.string().uuid(),
    idempotency_key: z.string().uuid(),
  })
  .merge(createKnockBodySchema);

export type SyncKnockItem = z.infer<typeof syncKnockItemSchema>;

export const syncKnocksBodySchema = z.object({
  knocks: z.array(syncKnockItemSchema).min(1).max(SYNC_KNOCKS_MAX_BATCH),
});

export type SyncKnocksBody = z.infer<typeof syncKnocksBodySchema>;
