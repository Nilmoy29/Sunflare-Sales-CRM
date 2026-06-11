import { createClient } from "@/lib/supabase/server";

export class TerritoryNotFoundError extends Error {
  constructor() {
    super("Territory not found");
    this.name = "TerritoryNotFoundError";
  }
}

export async function deleteTerritoryForAdmin(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("delete_territory" as never, {
    p_id: id,
  } as never);

  if (error) {
    if (error.code === "P0002") {
      throw new TerritoryNotFoundError();
    }
    throw error;
  }
}
