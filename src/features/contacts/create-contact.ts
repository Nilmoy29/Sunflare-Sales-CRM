import { createClient } from "@/lib/supabase/server";
import type { ContactInsert } from "@/types/database";
import {
  parseContactSummary,
  type ContactSummary,
  type CreateContactBody,
} from "@/lib/validators/contacts";

export type CreateContactOutcome =
  | { status: "created"; contact: ContactSummary }
  | { status: "duplicate"; contact: ContactSummary };

export async function createContactForRep(
  repId: string,
  body: CreateContactBody,
): Promise<CreateContactOutcome> {
  const supabase = await createClient();

  const { data: duplicateRows, error: duplicateError } = await supabase.rpc(
    "find_contact_by_phone",
    { p_phone: body.phone } as never,
  );

  if (duplicateError) {
    throw duplicateError;
  }

  const duplicateRow = Array.isArray(duplicateRows)
    ? (duplicateRows[0] as Record<string, unknown> | undefined)
    : (duplicateRows as Record<string, unknown> | null);

  if (duplicateRow) {
    const existing = parseContactSummary(duplicateRow);
    if (existing) {
      return { status: "duplicate", contact: existing };
    }
  }

  const row: ContactInsert = {
    first_name: body.first_name,
    last_name: body.last_name,
    phone: body.phone.trim(),
    address: body.address?.trim() || null,
    suburb: body.suburb?.trim() || null,
    postcode: body.postcode?.trim() || null,
    created_by: repId,
  };

  const { data, error } = await supabase
    .from("contacts")
    .insert(row as never)
    .select("id, first_name, last_name, phone, address, suburb, postcode")
    .single();

  if (error) {
    throw error;
  }

  const contact = parseContactSummary(data as Record<string, unknown>);
  if (!contact) {
    throw new Error("Invalid contact response from database");
  }

  return { status: "created", contact };
}
