import { parseBookingFollowUpNote } from "@/features/pipeline/parse-booking-metadata";

export function displayFollowUpNote(note: string | null | undefined): string | null {
  if (!note?.trim()) {
    return null;
  }

  const parsed = parseBookingFollowUpNote(note);
  if (parsed.booking_notes) {
    return parsed.booking_notes;
  }
  if (parsed.closer_name) {
    return `Closer: ${parsed.closer_name}`;
  }
  return note.trim();
}
