import { createClient } from "@/lib/supabase/server";
import {
  bookAppointmentResponseSchema,
  type BookAppointmentBody,
  type BookAppointmentResponse,
} from "@/lib/validators/book-appointment";

export async function bookD2dAppointment(
  body: BookAppointmentBody,
  idempotencyKey: string | null = null,
): Promise<BookAppointmentResponse> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("book_d2d_appointment", {
    p_lat: body.lat,
    p_lng: body.lng,
    p_customer_name: body.customer_name,
    p_phone: body.phone,
    p_appointment_at: body.appointment_at,
    p_closer_name: body.closer_name,
    p_notes: body.notes,
    p_address: body.address,
    p_suburb: body.suburb,
    p_postcode: body.postcode,
    p_idempotency_key: idempotencyKey,
  } as never);

  if (error) {
    throw error;
  }

  const row = (Array.isArray(data) ? data[0] : data) as Record<
    string,
    unknown
  > | null;

  if (!row || typeof row !== "object") {
    throw new Error("Invalid appointment response from database");
  }

  const knockedAt = row.knocked_at;
  const parsed = bookAppointmentResponseSchema.safeParse({
    knock_id: row.knock_id,
    lat: row.lat,
    lng: row.lng,
    knocked_at:
      typeof knockedAt === "string"
        ? knockedAt
        : knockedAt instanceof Date
          ? knockedAt.toISOString()
          : knockedAt,
    lead: {
      id: row.lead_id,
      stage: row.lead_stage,
      source: "d2d",
    },
  });

  if (!parsed.success) {
    throw new Error("Invalid appointment response from database");
  }

  return parsed.data;
}
