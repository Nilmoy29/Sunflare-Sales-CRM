import { createClient } from "@/lib/supabase/server";
import {
  parseTerritoryAssignmentSummary,
  type CreateTerritoryAssignmentBody,
  type TerritoryAssignmentSummary,
} from "@/lib/validators/territory-assignments";

export class DuplicateTerritoryAssignmentError extends Error {
  constructor() {
    super("Territory assignment already exists");
    this.name = "DuplicateTerritoryAssignmentError";
  }
}

export class InvalidTerritoryAssignmentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidTerritoryAssignmentError";
  }
}

export async function createTerritoryAssignmentForAdmin(
  body: CreateTerritoryAssignmentBody,
): Promise<TerritoryAssignmentSummary> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc(
    "create_territory_assignment" as never,
    {
      p_territory_id: body.territory_id,
      p_rep_id: body.rep_id,
      p_assigned_date: body.assigned_date,
    } as never,
  );

  if (error) {
    if (error.code === "23505") {
      throw new DuplicateTerritoryAssignmentError();
    }
    if (error.code === "22023") {
      throw new InvalidTerritoryAssignmentError(
        error.message || "Invalid territory assignment",
      );
    }
    throw error;
  }

  const row = Array.isArray(data) ? data[0] : data;
  const parsed = parseTerritoryAssignmentSummary(
    row as Record<string, unknown>,
  );

  if (!parsed) {
    throw new Error("Invalid territory assignment response");
  }

  return parsed;
}
