import { createClient } from "@/lib/supabase/server";
import {
  parseTerritorySummary,
  type TerritorySummary,
  type UpdateTerritoryBody,
} from "@/lib/validators/territories";

export class TerritoryNotFoundError extends Error {
  constructor() {
    super("Territory not found");
    this.name = "TerritoryNotFoundError";
  }
}

export class InvalidTerritoryGeometryError extends Error {
  constructor() {
    super("Invalid polygon geometry");
    this.name = "InvalidTerritoryGeometryError";
  }
}

export async function updateTerritoryForAdmin(
  id: string,
  body: UpdateTerritoryBody,
): Promise<TerritorySummary> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc(
    "update_territory" as never,
    {
      p_id: id,
      p_name: body.name ?? null,
      p_notes: body.notes === undefined ? null : (body.notes ?? ""),
      p_polygon: body.polygon ?? null,
    } as never,
  );

  if (error) {
    if (error.code === "P0002") {
      throw new TerritoryNotFoundError();
    }
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
