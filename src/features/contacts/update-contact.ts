import { createClient } from "@/lib/supabase/server";
import {
  parseContactSummary,
  type ContactSummary,
  type UpdateContactBody,
} from "@/lib/validators/contacts";

export async function updateContact(
  contactId: string,
  body: UpdateContactBody,
): Promise<ContactSummary | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("contacts")
    .update({
      first_name: body.first_name,
      last_name: body.last_name,
      phone: body.phone,
      address: body.address,
      suburb: body.suburb,
      postcode: body.postcode,
    } as never)
    .eq("id", contactId)
    .select("id, first_name, last_name, phone, address, suburb, postcode")
    .maybeSingle();

  if (error) {
    if (error.code === "42501" || error.code === "PGRST116") {
      return null;
    }
    throw error;
  }

  if (!data) {
    return null;
  }

  return parseContactSummary(data as Record<string, unknown>);
}
