import { z } from "zod";

export const reverseGeocodeQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
});

export const reverseGeocodeResultSchema = z.object({
  address: z.string().nullable(),
  suburb: z.string().nullable(),
  postcode: z.string().nullable(),
});

export type ReverseGeocodeResult = z.infer<typeof reverseGeocodeResultSchema>;
