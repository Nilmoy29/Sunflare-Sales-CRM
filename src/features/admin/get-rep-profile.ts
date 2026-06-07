import { createClient } from "@/lib/supabase/server";

export type RepProfile = {
  id: string;
  name: string;
  role: "rep";
};

export async function getRepProfile(
  repId: string,
): Promise<RepProfile | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, name, role")
    .eq("id", repId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  const row = data as { id: string; name: string | null; role: string | null };
  if (row.role !== "rep" || typeof row.name !== "string") {
    return null;
  }

  return {
    id: row.id,
    name: row.name,
    role: "rep",
  };
}

export type RepListItem = {
  id: string;
  name: string;
};

export async function getRepList(): Promise<RepListItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, name")
    .eq("role", "rep")
    .order("name", { ascending: true });

  if (error) {
    throw error;
  }

  return ((data ?? []) as { id: string; name: string | null }[])
    .filter((row): row is { id: string; name: string } => typeof row.name === "string")
    .map((row) => ({ id: row.id, name: row.name }));
}
