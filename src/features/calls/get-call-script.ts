import { createClient } from "@/lib/supabase/server";
import { callScriptResponseSchema } from "@/lib/validators/call-script";

export async function getCallScript(): Promise<{
  body: string;
  updated_at: string | null;
}> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("call_script")
    .select("body, updated_at")
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  const row = data as { body: string; updated_at: string } | null;

  return callScriptResponseSchema.parse({
    body: row?.body ?? "",
    updated_at: row?.updated_at ?? null,
  });
}
