import { createClient } from "@/lib/supabase/server";

export class CallLogNotFoundError extends Error {
  constructor() {
    super("Call log not found");
    this.name = "CallLogNotFoundError";
  }
}

export class CallLogDeleteConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CallLogDeleteConflictError";
  }
}

export async function deleteCallLogForRep(callLogId: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("delete_call_log", {
    p_id: callLogId,
  } as never);

  if (error) {
    if (error.code === "P0002") {
      throw new CallLogNotFoundError();
    }
    if (error.code === "23514") {
      throw new CallLogDeleteConflictError(
        error.message ?? "Cannot delete this call",
      );
    }
    throw error;
  }
}
