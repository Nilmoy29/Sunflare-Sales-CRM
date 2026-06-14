import { createClient } from "@/lib/supabase/server";

export async function deleteLead(leadId: string): Promise<boolean> {
  const supabase = await createClient();

  const { data: existing, error: fetchError } = await supabase
    .from("leads")
    .select("id")
    .eq("id", leadId)
    .maybeSingle();

  if (fetchError) {
    throw fetchError;
  }

  if (!existing) {
    return false;
  }

  const { error } = await supabase.from("leads").delete().eq("id", leadId);

  if (error) {
    throw error;
  }

  return true;
}
