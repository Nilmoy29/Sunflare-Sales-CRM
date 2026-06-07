import { createClient } from "@/lib/supabase/server";
import { callScriptResponseSchema } from "@/lib/validators/call-script";

export class CallScriptUpdateError extends Error {
  constructor(message = "Could not update call script") {
    super(message);
    this.name = "CallScriptUpdateError";
  }
}

export async function updateCallScript(
  body: string,
  adminId: string,
): Promise<{ body: string; updated_at: string }> {
  const supabase = await createClient();
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("call_script")
    .update({
      body,
      updated_at: now,
      updated_by: adminId,
    } as never)
    .eq("id", 1)
    .select("body, updated_at")
    .single();

  if (error || !data) {
    throw new CallScriptUpdateError();
  }

  const row = data as { body: string; updated_at: string };

  const parsed = callScriptResponseSchema.safeParse({
    body: row.body,
    updated_at: row.updated_at,
  });

  if (!parsed.success) {
    return { body: row.body, updated_at: row.updated_at };
  }

  return {
    body: parsed.data.body,
    updated_at: parsed.data.updated_at ?? row.updated_at,
  };
}
