import { z } from "zod";
import { assignedDateSchema } from "@/lib/validators/territory-assignments";

export const TERRITORY_NAME_MAX_LENGTH = 120;
export const TERRITORY_NOTES_MAX_LENGTH = 2000;

const geoJsonPositionSchema = z.tuple([z.number(), z.number()]);

const geoJsonLinearRingSchema = z
  .array(geoJsonPositionSchema)
  .min(4, "Polygon ring must have at least 4 positions")
  .refine(
    (ring) => {
      const first = ring[0];
      const last = ring[ring.length - 1];
      return first[0] === last[0] && first[1] === last[1];
    },
    { message: "Polygon ring must be closed" },
  );

export const geoJsonPolygonSchema = z.object({
  type: z.literal("Polygon"),
  coordinates: z
    .array(geoJsonLinearRingSchema)
    .min(1, "Polygon must have at least one ring"),
});

export type GeoJsonPolygon = z.infer<typeof geoJsonPolygonSchema>;

export const territoryRowSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  polygon_geojson: z.unknown(),
  notes: z.string().nullable(),
  created_by_admin_id: z.string().uuid(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type TerritoryRow = z.infer<typeof territoryRowSchema>;

export const territorySummarySchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  notes: z.string().nullable(),
  geometry: geoJsonPolygonSchema,
  created_at: z.string(),
  updated_at: z.string(),
});

export type TerritorySummary = z.infer<typeof territorySummarySchema>;

export const createTerritoryBodySchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Territory name is required")
    .max(
      TERRITORY_NAME_MAX_LENGTH,
      `Name must be at most ${TERRITORY_NAME_MAX_LENGTH} characters`,
    ),
  notes: z
    .string()
    .trim()
    .max(
      TERRITORY_NOTES_MAX_LENGTH,
      `Notes must be at most ${TERRITORY_NOTES_MAX_LENGTH} characters`,
    )
    .optional()
    .nullable()
    .transform((value) => (value ? value : null)),
  polygon: geoJsonPolygonSchema,
});

export type CreateTerritoryBody = z.infer<typeof createTerritoryBodySchema>;

export const updateTerritoryBodySchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Territory name cannot be empty")
      .max(TERRITORY_NAME_MAX_LENGTH)
      .optional(),
    notes: z
      .string()
      .trim()
      .max(TERRITORY_NOTES_MAX_LENGTH)
      .optional()
      .nullable()
      .transform((value) => (value === undefined ? undefined : value || null)),
    polygon: geoJsonPolygonSchema.optional(),
  })
  .refine(
    (value) =>
      value.name !== undefined ||
      value.notes !== undefined ||
      value.polygon !== undefined,
    { message: "At least one field must be provided" },
  );

export type UpdateTerritoryBody = z.infer<typeof updateTerritoryBodySchema>;

export const territoriesListResponseSchema = z.object({
  territories: z.array(territorySummarySchema),
});

export type TerritoriesListResponse = z.infer<
  typeof territoriesListResponseSchema
>;

export const createTerritoryResponseSchema = z.object({
  territory: territorySummarySchema,
});

export type CreateTerritoryResponse = z.infer<
  typeof createTerritoryResponseSchema
>;

export const updateTerritoryResponseSchema = z.object({
  territory: territorySummarySchema,
});

export type UpdateTerritoryResponse = z.infer<
  typeof updateTerritoryResponseSchema
>;

export const repTerritoryOverlaySchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  geometry: geoJsonPolygonSchema,
});

export type RepTerritoryOverlay = z.infer<typeof repTerritoryOverlaySchema>;

export const repTerritoriesForDateQuerySchema = z.object({
  assigned_date: assignedDateSchema.optional(),
});

export type RepTerritoriesForDateQuery = z.infer<
  typeof repTerritoriesForDateQuerySchema
>;

export const repTerritoriesForDateResponseSchema = z.object({
  territories: z.array(repTerritoryOverlaySchema),
});

export type RepTerritoriesForDateResponse = z.infer<
  typeof repTerritoriesForDateResponseSchema
>;

export function parseRepTerritoriesForDateQuery(
  searchParams: URLSearchParams,
): z.SafeParseReturnType<unknown, RepTerritoriesForDateQuery> {
  const assignedDate = searchParams.get("assigned_date");
  const raw =
    assignedDate !== null && assignedDate !== ""
      ? { assigned_date: assignedDate }
      : {};

  return repTerritoriesForDateQuerySchema.safeParse(raw);
}

export function parseRepTerritoryOverlay(
  row: Record<string, unknown>,
): RepTerritoryOverlay | null {
  const parsed = repTerritoryOverlaySchema.safeParse({
    id: row.id,
    name: row.name,
    geometry: row.geometry,
  });

  return parsed.success ? parsed.data : null;
}

export function parseTerritorySummary(
  row: Record<string, unknown>,
): TerritorySummary | null {
  const geometry = row.geometry;
  const createdAt = row.created_at;
  const updatedAt = row.updated_at;

  const parsed = territorySummarySchema.safeParse({
    id: row.id,
    name: row.name,
    notes: row.notes ?? null,
    geometry,
    created_at:
      typeof createdAt === "string"
        ? createdAt
        : createdAt instanceof Date
          ? createdAt.toISOString()
          : createdAt,
    updated_at:
      typeof updatedAt === "string"
        ? updatedAt
        : updatedAt instanceof Date
          ? updatedAt.toISOString()
          : updatedAt,
  });

  return parsed.success ? parsed.data : null;
}
