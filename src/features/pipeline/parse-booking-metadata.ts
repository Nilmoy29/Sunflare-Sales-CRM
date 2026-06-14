export type ParsedBookingFollowUp = {
  closer_name: string | null;
  booking_notes: string | null;
};

const CLOSER_PREFIX = /^Closer:\s*(.+?)(?:\n|$)/;

export function parseBookingFollowUpNote(note: string | null | undefined): ParsedBookingFollowUp {
  if (!note?.trim()) {
    return { closer_name: null, booking_notes: null };
  }

  const trimmed = note.trim();
  const closerMatch = trimmed.match(CLOSER_PREFIX);
  const closer_name = closerMatch?.[1]?.trim() ?? null;

  let booking_notes: string | null = null;
  if (closerMatch) {
    const remainder = trimmed.slice(closerMatch[0].length).trim();
    booking_notes = remainder.length > 0 ? remainder : null;
  } else {
    booking_notes = trimmed;
  }

  return { closer_name, booking_notes };
}

export function pickLatestNote(
  activityNote: string | null,
  activityAt: string | null,
  bookingNotes: string | null,
  bookingAt: string | null,
): string | null {
  if (activityNote && activityAt) {
    if (!bookingAt || activityAt >= bookingAt) {
      return activityNote;
    }
  }
  if (bookingNotes) {
    return bookingNotes;
  }
  return activityNote;
}
