import { z } from "zod";
import {
  ADDRESS_MAX_LENGTH,
  NOTES_MAX_LENGTH,
  POSTCODE_MAX_LENGTH,
  SUBURB_MAX_LENGTH,
  contactAddressFieldsSchema,
} from "@/lib/validators/knocks";
import { leadStageSchema } from "@/lib/validators/enums";
import { leadSummarySchema } from "@/lib/validators/leads";

export const CUSTOMER_NAME_MAX_LENGTH = 100;
export const CLOSER_NAME_MAX_LENGTH = 100;
export const PHONE_MAX_LENGTH = 32;

const optionalPhoneSchema = z
  .string()
  .trim()
  .max(PHONE_MAX_LENGTH)
  .optional()
  .nullable()
  .transform((value) => (value ? value : null));

export const bookAppointmentBodySchema = z
  .object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
    customer_name: z
      .string()
      .trim()
      .min(1, "Customer name is required")
      .max(CUSTOMER_NAME_MAX_LENGTH),
    phone: optionalPhoneSchema,
    appointment_at: z.string().datetime({ offset: true }),
    closer_name: z
      .string()
      .trim()
      .min(1, "Closer name is required")
      .max(CLOSER_NAME_MAX_LENGTH),
    notes: z
      .string()
      .trim()
      .max(NOTES_MAX_LENGTH)
      .optional()
      .nullable()
      .transform((value) => (value ? value : null)),
  })
  .merge(contactAddressFieldsSchema);

export type BookAppointmentBody = z.infer<typeof bookAppointmentBodySchema>;

export const bookAppointmentResponseSchema = z.object({
  knock_id: z.string().uuid(),
  lat: z.number(),
  lng: z.number(),
  knocked_at: z.string(),
  lead: leadSummarySchema.extend({
    stage: leadStageSchema,
  }),
});

export type BookAppointmentResponse = z.infer<
  typeof bookAppointmentResponseSchema
>;
