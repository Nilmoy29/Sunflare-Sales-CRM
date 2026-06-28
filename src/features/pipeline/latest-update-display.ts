import { displayFollowUpNote } from "@/features/pipeline/display-follow-up-note";
import {
  formatPipelineDate,
  isFollowUpOverdue,
} from "@/features/pipeline/format-pipeline-dates";
import type { PipelineLeadCard } from "@/lib/validators/pipeline";

export type LatestUpdateDisplay = {
  text: string;
  date: string | null;
};

export function getLatestUpdateDisplay(lead: PipelineLeadCard): LatestUpdateDisplay {
  const followUpNote = displayFollowUpNote(lead.next_follow_up_note);
  const noteAt = lead.latest_note_at;
  const followUpAt = lead.next_action_due_at;

  if (
    lead.latest_note &&
    noteAt &&
    (!followUpAt || noteAt >= followUpAt)
  ) {
    return { text: lead.latest_note, date: noteAt };
  }

  if (followUpNote && followUpAt) {
    return { text: followUpNote, date: followUpAt };
  }

  if (lead.latest_note) {
    return { text: lead.latest_note, date: noteAt };
  }

  if (lead.booking_notes) {
    return { text: lead.booking_notes, date: lead.booked_at };
  }

  return { text: "—", date: null };
}

export function filterOverdueFollowUpLeads(
  leads: PipelineLeadCard[],
): PipelineLeadCard[] {
  return leads.filter(
    (lead) =>
      Boolean(lead.next_follow_up_id) &&
      isFollowUpOverdue(lead.next_action_due_at),
  );
}

export function sortLeadsByBookedDate(
  leads: PipelineLeadCard[],
): PipelineLeadCard[] {
  return [...leads].sort((a, b) => {
    const aBooked = a.booked_at;
    const bBooked = b.booked_at;

    if (aBooked && bBooked) {
      const byBooked = bBooked.localeCompare(aBooked);
      if (byBooked !== 0) {
        return byBooked;
      }
    } else if (aBooked) {
      return -1;
    } else if (bBooked) {
      return 1;
    }

    return b.updated_at.localeCompare(a.updated_at);
  });
}

export function sortLeadsByOverdueDue(
  leads: PipelineLeadCard[],
): PipelineLeadCard[] {
  return [...leads].sort((a, b) => {
    const aDue = a.next_action_due_at ?? "";
    const bDue = b.next_action_due_at ?? "";
    return aDue.localeCompare(bDue);
  });
}

export function formatLatestUpdateSummary(lead: PipelineLeadCard): string {
  const update = getLatestUpdateDisplay(lead);
  if (update.text === "—") {
    return "—";
  }
  if (update.date) {
    return `${formatPipelineDate(update.date)} · ${update.text}`;
  }
  return update.text;
}
