import { z } from "zod";

export const gpsPingBodySchema = z.object({
  shift_id: z.string().uuid(),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

export type GpsPingBody = z.infer<typeof gpsPingBodySchema>;
