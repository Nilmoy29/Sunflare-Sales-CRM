import { z } from "zod";
import { doorOutcomeSchema } from "@/lib/validators/enums";
import { leadSummarySchema } from "@/lib/validators/leads";

const MAX_BBOX_SPAN_DEGREES = 5;

export { MAX_BBOX_SPAN_DEGREES };

export const mapBboxSchema = z
  .object({
    west: z.number().min(-180).max(180),
    south: z.number().min(-90).max(90),
    east: z.number().min(-180).max(180),
    north: z.number().min(-90).max(90),
  })
  .refine((bbox) => bbox.west < bbox.east, {
    message: "west must be less than east",
  })
  .refine((bbox) => bbox.south < bbox.north, {
    message: "south must be less than north",
  })
  .refine(
    (bbox) =>
      bbox.east - bbox.west <= MAX_BBOX_SPAN_DEGREES &&
      bbox.north - bbox.south <= MAX_BBOX_SPAN_DEGREES,
    { message: "bbox span exceeds allowed limit" },
  );

export type MapBbox = z.infer<typeof mapBboxSchema>;

/** Expands to the maximum server-allowed span centered on a point. */
export function maxSpanBboxAround(lng: number, lat: number): MapBbox {
  const half = MAX_BBOX_SPAN_DEGREES / 2;
  return clampMapBbox({
    west: lng - half,
    south: lat - half,
    east: lng + half,
    north: lat + half,
  });
}

/** Shrinks viewport bbox to the server-allowed span (centered). */
export function clampMapBbox(bbox: MapBbox): MapBbox {
  let { west, south, east, north } = bbox;
  const lngSpan = east - west;
  const latSpan = north - south;

  if (lngSpan > MAX_BBOX_SPAN_DEGREES) {
    const midLng = (west + east) / 2;
    west = midLng - MAX_BBOX_SPAN_DEGREES / 2;
    east = midLng + MAX_BBOX_SPAN_DEGREES / 2;
  }

  if (latSpan > MAX_BBOX_SPAN_DEGREES) {
    const midLat = (south + north) / 2;
    south = midLat - MAX_BBOX_SPAN_DEGREES / 2;
    north = midLat + MAX_BBOX_SPAN_DEGREES / 2;
  }

  return { west, south, east, north };
}

export function parseBboxParam(value: string | null) {
  if (!value) {
    return {
      success: false as const,
      error: "bbox query param is required (west,south,east,north)",
    };
  }

  const parts = value.split(",").map((part) => Number(part.trim()));
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n))) {
    return {
      success: false as const,
      error: "bbox must be four comma-separated numbers: west,south,east,north",
    };
  }

  const parsed = mapBboxSchema.safeParse({
    west: parts[0],
    south: parts[1],
    east: parts[2],
    north: parts[3],
  });

  if (!parsed.success) {
    return {
      success: false as const,
      error: parsed.error.issues[0]?.message ?? "Invalid bbox",
    };
  }

  return { success: true as const, data: parsed.data };
}

export const knockPinSchema = z.object({
  id: z.string().uuid(),
  lat: z.number(),
  lng: z.number(),
  outcome: doorOutcomeSchema,
  knocked_at: z.string(),
});

export type KnockPin = z.infer<typeof knockPinSchema>;

export const KNOCKS_PAGE_LIMIT = 500;

export const knockDraftSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  source: z.enum(["map_tap", "gps_quick_add"]),
});

export type KnockDraft = z.infer<typeof knockDraftSchema>;

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

export const pendingKnockPinSchema = knockPinSchema.extend({
  pending: z.literal(true),
});

export type PendingKnockPin = z.infer<typeof pendingKnockPinSchema>;

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

export const createKnockResponseSchema = z.object({
  knock: knockPinSchema,
  lead: leadSummarySchema.optional(),
});

export type CreateKnockResponse = z.infer<typeof createKnockResponseSchema>;

export const syncKnockResultSchema = z.object({
  client_id: z.string().uuid(),
  status: z.enum(["created", "duplicate"]),
  knock: knockPinSchema,
  lead: leadSummarySchema.optional(),
});

export type SyncKnockResult = z.infer<typeof syncKnockResultSchema>;

export const priorKnockSchema = z.object({
  id: z.string().uuid(),
  outcome: doorOutcomeSchema,
  knocked_at: z.string(),
  rep_id: z.string().uuid(),
  rep_name: z.string(),
  is_own: z.boolean(),
});

export type PriorKnock = z.infer<typeof priorKnockSchema>;

export const duplicateAlertSchema = z.object({
  rep_name: z.string(),
  knocked_at: z.string(),
  outcome: doorOutcomeSchema,
});

export type DuplicateAlert = z.infer<typeof duplicateAlertSchema>;

export const knocksNearResponseSchema = z.object({
  priorKnocks: z.array(priorKnockSchema),
  duplicateAlert: duplicateAlertSchema.nullable(),
});

export type KnocksNearResponse = z.infer<typeof knocksNearResponseSchema>;

export const KNOCK_HISTORY_DEFAULT_LIMIT = 50;
export const KNOCK_HISTORY_MAX_LIMIT = 100;

const sydneyDateStringSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD");

export const knockHistoryQuerySchema = z
  .object({
    from: sydneyDateStringSchema,
    to: sydneyDateStringSchema,
    outcome: z.array(doorOutcomeSchema).default([]),
    limit: z.coerce.number().int().min(1).max(KNOCK_HISTORY_MAX_LIMIT).default(KNOCK_HISTORY_DEFAULT_LIMIT),
    offset: z.coerce.number().int().min(0).default(0),
  })
  .refine((data) => data.from <= data.to, {
    message: "from must be on or before to",
  });

export type KnockHistoryQuery = z.infer<typeof knockHistoryQuerySchema>;

export function parseKnockHistorySearchParams(searchParams: URLSearchParams) {
  const outcomes = searchParams.getAll("outcome");
  return knockHistoryQuerySchema.safeParse({
    from: searchParams.get("from"),
    to: searchParams.get("to"),
    outcome: outcomes.length > 0 ? outcomes : [],
    limit: searchParams.get("limit") ?? undefined,
    offset: searchParams.get("offset") ?? undefined,
  });
}

export const knockHistoryItemSchema = z.object({
  id: z.string().uuid(),
  outcome: doorOutcomeSchema,
  knocked_at: z.string(),
  lat: z.number(),
  lng: z.number(),
  notes: z.string().nullable(),
  follow_up_at: z.string().nullable(),
  has_linked_lead: z.boolean(),
  address: z.string().nullable(),
  suburb: z.string().nullable(),
  postcode: z.string().nullable(),
});

export const updateKnockBodySchema = z.object({
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
});

export type UpdateKnockBody = z.infer<typeof updateKnockBodySchema>;

export const updateKnockResponseSchema = z.object({
  knock: knockHistoryItemSchema,
});

export type UpdateKnockResponse = z.infer<typeof updateKnockResponseSchema>;

export type KnockHistoryItem = z.infer<typeof knockHistoryItemSchema>;

export const knockHistoryResponseSchema = z.object({
  knocks: z.array(knockHistoryItemSchema),
  total: z.number().nullable(),
  truncated: z.boolean(),
});

export type KnockHistoryResponse = z.infer<typeof knockHistoryResponseSchema>;

export const adminKnockPinSchema = knockPinSchema.extend({
  rep_id: z.string().uuid(),
  rep_name: z.string(),
  address: z.string().nullable(),
  suburb: z.string().nullable(),
  postcode: z.string().nullable(),
});

export type AdminKnockPin = z.infer<typeof adminKnockPinSchema>;

export const adminKnocksResponseSchema = z.object({
  knocks: z.array(adminKnockPinSchema),
  truncated: z.boolean(),
});

export type AdminKnocksResponse = z.infer<typeof adminKnocksResponseSchema>;

export const adminKnocksQuerySchema = z
  .object({
    bbox: mapBboxSchema,
    from: sydneyDateStringSchema.nullable().optional(),
    to: sydneyDateStringSchema.nullable().optional(),
    rep: z.array(z.string().uuid()).default([]),
    outcome: z.array(doorOutcomeSchema).default([]),
  })
  .refine(
    (data) => {
      if (!data.from || !data.to) {
        return true;
      }
      return data.from <= data.to;
    },
    { message: "from must be on or before to" },
  );

export type AdminKnocksQuery = z.infer<typeof adminKnocksQuerySchema>;

export function parseAdminKnocksSearchParams(searchParams: URLSearchParams) {
  const bboxParsed = parseBboxParam(searchParams.get("bbox"));
  if (!bboxParsed.success) {
    return {
      success: false as const,
      error: bboxParsed.error,
    };
  }

  const reps = searchParams.getAll("rep");
  const outcomes = searchParams.getAll("outcome");

  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");

  const parsed = adminKnocksQuerySchema.safeParse({
    bbox: bboxParsed.data,
    from: fromParam && fromParam.length > 0 ? fromParam : null,
    to: toParam && toParam.length > 0 ? toParam : null,
    rep: reps.length > 0 ? reps : [],
    outcome: outcomes.length > 0 ? outcomes : [],
  });

  if (!parsed.success) {
    return {
      success: false as const,
      error: parsed.error.issues[0]?.message ?? "Invalid query parameters",
    };
  }

  return { success: true as const, data: parsed.data };
}
