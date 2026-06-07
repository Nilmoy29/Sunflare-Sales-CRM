import { z } from "zod";

export const assignedDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD");

export const territoryAssignmentRowSchema = z.object({
  id: z.string().uuid(),
  territory_id: z.string().uuid(),
  rep_id: z.string().uuid(),
  assigned_date: assignedDateSchema,
  assigned_by: z.string().uuid(),
  created_at: z.string(),
});

export type TerritoryAssignmentRow = z.infer<
  typeof territoryAssignmentRowSchema
>;

export const territoryAssignmentSummarySchema = z.object({
  id: z.string().uuid(),
  territory_id: z.string().uuid(),
  territory_name: z.string(),
  rep_id: z.string().uuid(),
  rep_name: z.string(),
  assigned_date: assignedDateSchema,
  assigned_by: z.string().uuid(),
  created_at: z.string(),
});

export type TerritoryAssignmentSummary = z.infer<
  typeof territoryAssignmentSummarySchema
>;

export const createTerritoryAssignmentBodySchema = z.object({
  territory_id: z.string().uuid(),
  rep_id: z.string().uuid(),
  assigned_date: assignedDateSchema,
});

export type CreateTerritoryAssignmentBody = z.infer<
  typeof createTerritoryAssignmentBodySchema
>;

export const territoryAssignmentsListQuerySchema = z.object({
  assigned_date: assignedDateSchema.optional(),
  rep_id: z.string().uuid().optional(),
  territory_id: z.string().uuid().optional(),
});

export type TerritoryAssignmentsListQuery = z.infer<
  typeof territoryAssignmentsListQuerySchema
>;

export const territoryAssignmentsListResponseSchema = z.object({
  assignments: z.array(territoryAssignmentSummarySchema),
});

export type TerritoryAssignmentsListResponse = z.infer<
  typeof territoryAssignmentsListResponseSchema
>;

export const createTerritoryAssignmentResponseSchema = z.object({
  assignment: territoryAssignmentSummarySchema,
});

export type CreateTerritoryAssignmentResponse = z.infer<
  typeof createTerritoryAssignmentResponseSchema
>;

function coerceDateString(value: unknown): unknown {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }
  return value;
}

function coerceTimestamp(value: unknown): unknown {
  if (value instanceof Date) {
    return value.toISOString();
  }
  return value;
}

export function parseTerritoryAssignmentsListQuery(
  searchParams: URLSearchParams,
): z.SafeParseReturnType<unknown, TerritoryAssignmentsListQuery> {
  const raw: Record<string, string | undefined> = {};

  const assignedDate = searchParams.get("assigned_date");
  if (assignedDate) {
    raw.assigned_date = assignedDate;
  }

  const repId = searchParams.get("rep_id");
  if (repId) {
    raw.rep_id = repId;
  }

  const territoryId = searchParams.get("territory_id");
  if (territoryId) {
    raw.territory_id = territoryId;
  }

  return territoryAssignmentsListQuerySchema.safeParse(raw);
}

export function parseTerritoryAssignmentSummary(
  row: Record<string, unknown>,
): TerritoryAssignmentSummary | null {
  const parsed = territoryAssignmentSummarySchema.safeParse({
    id: row.id,
    territory_id: row.territory_id,
    territory_name: row.territory_name,
    rep_id: row.rep_id,
    rep_name: row.rep_name,
    assigned_date: coerceDateString(row.assigned_date),
    assigned_by: row.assigned_by,
    created_at: coerceTimestamp(row.created_at),
  });

  return parsed.success ? parsed.data : null;
}
