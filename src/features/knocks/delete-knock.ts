import { createClient } from "@/lib/supabase/server";

export class KnockNotFoundError extends Error {
  constructor() {
    super("Knock not found");
    this.name = "KnockNotFoundError";
  }
}

export class KnockDeleteConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "KnockDeleteConflictError";
  }
}

export async function deleteKnockForRep(knockId: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("delete_door_knock", {
    p_id: knockId,
  } as never);

  if (error) {
    if (error.code === "P0002") {
      throw new KnockNotFoundError();
    }
    if (error.code === "23514") {
      throw new KnockDeleteConflictError(
        error.message ?? "Cannot delete this knock",
      );
    }
    throw error;
  }
}
