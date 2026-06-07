import { createClient } from "@/lib/supabase/server";
import {
  parseTerritorySummary,
  type CreateTerritoryBody,
  type TerritorySummary,
} from "@/lib/validators/territories";

export class InvalidTerritoryGeometryError extends Error {
  constructor() {
    super("Invalid polygon geometry");
    this.name = "InvalidTerritoryGeometryError";
  }
}

export async function createTerritoryForAdmin(
  body: CreateTerritoryBody,
): Promise<TerritorySummary> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc(
    "create_territory" as never,
    {
      p_name: body.name,
      p_notes: body.notes,
      p_polygon: body.polygon,
    } as never,
  );

  if (error) {
    if (error.code === "22023") {
      throw new InvalidTerritoryGeometryError();
    }
    throw error;
  }

  const row = Array.isArray(data) ? data[0] : data;
  const parsed = parseTerritorySummary(row as Record<string, unknown>);

  if (!parsed) {
    throw new Error("Invalid territory response");
  }

  return parsed;
}
