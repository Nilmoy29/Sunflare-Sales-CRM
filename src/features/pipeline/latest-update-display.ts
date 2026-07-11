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

export type FollowUpQueueReason = "overdue" | "signed" | "lost";

function hasOpenFollowUp(lead: PipelineLeadCard): boolean {
  return Boolean(lead.next_follow_up_id && lead.next_action_due_at);
}

export function getFollowUpQueueReason(
  lead: PipelineLeadCard,
): FollowUpQueueReason | null {
  if (lead.stage === "lost") {
    return "lost";
  }

  if (lead.stage === "signed") {
    return "signed";
  }

  if (
    hasOpenFollowUp(lead) &&
    isFollowUpOverdue(lead.next_action_due_at)
  ) {
    return "overdue";
  }

  return null;
}

export function filterFollowUpQueueLeads(
  leads: PipelineLeadCard[],
): PipelineLeadCard[] {
  return leads.filter((lead) => getFollowUpQueueReason(lead) !== null);
}

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

/** @deprecated Use filterFollowUpQueueLeads */
export function filterOverdueFollowUpLeads(
  leads: PipelineLeadCard[],
): PipelineLeadCard[] {
  return filterFollowUpQueueLeads(leads);
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

export function sortLeadsByFollowUpQueue(
  leads: PipelineLeadCard[],
): PipelineLeadCard[] {
  const priority: Record<FollowUpQueueReason, number> = {
    overdue: 0,
    signed: 1,
    lost: 2,
  };

  return [...leads].sort((a, b) => {
    const aReason = getFollowUpQueueReason(a);
    const bReason = getFollowUpQueueReason(b);
    if (!aReason || !bReason) {
      return 0;
    }

    const byPriority = priority[aReason] - priority[bReason];
    if (byPriority !== 0) {
      return byPriority;
    }

    const aDue = a.next_action_due_at ?? a.updated_at;
    const bDue = b.next_action_due_at ?? b.updated_at;
    return aDue.localeCompare(bDue);
  });
}

/** @deprecated Use sortLeadsByFollowUpQueue */
export function sortLeadsByOverdueDue(
  leads: PipelineLeadCard[],
): PipelineLeadCard[] {
  return sortLeadsByFollowUpQueue(leads);
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

export function followUpQueueReasonLabel(
  reason: FollowUpQueueReason,
): string {
  switch (reason) {
    case "overdue":
      return "Overdue follow-up";
    case "signed":
      return "Signed — needs review";
    case "lost":
      return "Lost / not interested";
  }
}
