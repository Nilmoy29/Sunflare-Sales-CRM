import type {
  BookAppointmentBody,
  BookAppointmentResponse,
} from "@/lib/validators/book-appointment";

export async function bookAppointment(
  payload: BookAppointmentBody,
): Promise<BookAppointmentResponse> {
  const res = await fetch("/api/v1/knocks/book-appointment", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const body = (await res.json()) as {
    data?: BookAppointmentResponse;
    error?: { code: string; message: string };
  };

  if (!res.ok) {
    throw new Error(body.error?.message ?? "Failed to book appointment");
  }

  if (!body.data) {
    throw new Error("Failed to book appointment");
  }

  return body.data;
}
