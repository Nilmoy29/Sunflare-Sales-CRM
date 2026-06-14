import type { ReactNode } from "react";
import { FollowUpPushPrompt } from "@/components/push/follow-up-push-prompt";
import { LeadFollowUpCompose } from "@/components/pipeline/lead-follow-up-compose";
import { LeadNoteCompose } from "@/components/pipeline/lead-note-compose";
import { formatNextActionCountdown } from "@/features/pipeline/format-pipeline-dates";
import { formatStageChangeDisplay } from "@/features/pipeline/pipeline-stage-labels";
import { formatKnockHistoryDate } from "@/features/knocks/format-knock-date";
import { CALL_OUTCOME_LABELS } from "@/lib/call-outcome-labels";
import { DOOR_OUTCOME_LABELS } from "@/lib/geo/door-outcome-colors";
import { formatCallDurationMinutes } from "@/lib/validators/call-logs";
import type { LeadDetailTimelineItem } from "@/lib/validators/lead-detail";

type LeadDetailTimelineProps = {
  timeline: LeadDetailTimelineItem[];
  onAddNote?: (content: string) => Promise<void>;
  onScheduleFollowUp?: (input: {
    due_at: string;
    note: string;
  }) => Promise<void>;
  followUpComposeDisabled?: boolean;
  showPushPrompt?: boolean;
};

function sortNewestFirst<T extends LeadDetailTimelineItem>(items: T[]): T[] {
  return [...items].sort((a, b) => b.occurred_at.localeCompare(a.occurred_at));
}

function TimelineSection({
  title,
  emptyCopy,
  children,
}: {
  title: string;
  emptyCopy: string;
  children: ReactNode;
}) {
  const hasItems = Array.isArray(children)
    ? children.length > 0
    : Boolean(children);

  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      {hasItems ? (
        <ul className="flex flex-col gap-2">{children}</ul>
      ) : (
        <p className="text-sm text-zinc-500">{emptyCopy}</p>
      )}
    </section>
  );
}

function TimelineItemCard({
  title,
  meta,
  body,
}: {
  title: string;
  meta: string;
  body?: ReactNode;
}) {
  return (
    <li className="rounded-md border border-border bg-card p-3 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="text-xs text-zinc-500">{meta}</p>
      </div>
      {body ? <div className="mt-2 text-sm text-muted-foreground">{body}</div> : null}
    </li>
  );
}

function renderKnockItem(item: Extract<LeadDetailTimelineItem, { kind: "knock" }>) {
  const location = [item.address, item.suburb].filter(Boolean).join(", ");
  return (
    <TimelineItemCard
      key={item.id}
      title={`${DOOR_OUTCOME_LABELS[item.outcome]}${item.is_origin ? " (origin)" : ""}`}
      meta={`${item.rep_name} · ${formatKnockHistoryDate(item.occurred_at)}`}
      body={location || undefined}
    />
  );
}

function renderNoteItem(item: Extract<LeadDetailTimelineItem, { kind: "note" }>) {
  return (
    <TimelineItemCard
      key={item.id}
      title="Note"
      meta={`${item.rep_name} · ${formatKnockHistoryDate(item.occurred_at)}`}
      body={item.content}
    />
  );
}

function renderStageChangeItem(
  item: Extract<LeadDetailTimelineItem, { kind: "stage_change" }>,
) {
  const body =
    item.from_stage && item.to_stage
      ? formatStageChangeDisplay(item.from_stage, item.to_stage)
      : item.content;

  return (
    <TimelineItemCard
      key={item.id}
      title="Stage change"
      meta={`${item.rep_name} · ${formatKnockHistoryDate(item.occurred_at)}`}
      body={body}
    />
  );
}

function renderCallItem(item: Extract<LeadDetailTimelineItem, { kind: "call" }>) {
  const duration = formatCallDurationMinutes(item.duration_seconds);
  const metaParts = [
    item.rep_name,
    formatKnockHistoryDate(item.occurred_at),
    duration,
  ].filter(Boolean);

  return (
    <TimelineItemCard
      key={item.id}
      title={CALL_OUTCOME_LABELS[item.outcome]}
      meta={metaParts.join(" · ")}
      body={item.notes || undefined}
    />
  );
}

function renderFollowUpItem(
  item: Extract<LeadDetailTimelineItem, { kind: "follow_up" }>,
) {
  const status = item.completed
    ? "Completed"
    : formatNextActionCountdown(item.due_at);
  return (
    <TimelineItemCard
      key={item.id}
      title={`Follow-up — ${status}`}
      meta={`${item.rep_name} · ${formatKnockHistoryDate(item.due_at)}`}
      body={item.note || undefined}
    />
  );
}

export function LeadDetailTimeline({
  timeline,
  onAddNote,
  onScheduleFollowUp,
  followUpComposeDisabled = false,
  showPushPrompt = false,
}: LeadDetailTimelineProps) {
  const knocks = sortNewestFirst(
    timeline.filter(
      (item): item is Extract<LeadDetailTimelineItem, { kind: "knock" }> =>
        item.kind === "knock",
    ),
  );
  const calls = sortNewestFirst(
    timeline.filter(
      (item): item is Extract<LeadDetailTimelineItem, { kind: "call" }> =>
        item.kind === "call",
    ),
  );
  const notes = sortNewestFirst(
    timeline.filter(
      (item): item is Extract<LeadDetailTimelineItem, { kind: "note" }> =>
        item.kind === "note",
    ),
  );
  const stageChanges = sortNewestFirst(
    timeline.filter(
      (
        item,
      ): item is Extract<LeadDetailTimelineItem, { kind: "stage_change" }> =>
        item.kind === "stage_change",
    ),
  );
  const followUps = sortNewestFirst(
    timeline.filter(
      (item): item is Extract<LeadDetailTimelineItem, { kind: "follow_up" }> =>
        item.kind === "follow_up",
    ),
  );

  const callsEmptyCopy = "No calls logged yet.";

  return (
    <div className="flex flex-col gap-6">
      <TimelineSection
        title="Knocks"
        emptyCopy="No knocks recorded for this contact."
      >
        {knocks.map(renderKnockItem)}
      </TimelineSection>

      <TimelineSection title="Calls" emptyCopy={callsEmptyCopy}>
        {calls.map(renderCallItem)}
      </TimelineSection>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-foreground">Notes</h2>
        {onAddNote ? <LeadNoteCompose onSubmit={onAddNote} /> : null}
        {notes.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {notes.map(renderNoteItem)}
          </ul>
        ) : (
          <p className="text-sm text-zinc-500">No notes yet.</p>
        )}
      </section>

      <TimelineSection
        title="Stage changes"
        emptyCopy="No stage changes recorded yet."
      >
        {stageChanges.map(renderStageChangeItem)}
      </TimelineSection>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-foreground">Follow-ups</h2>
        {showPushPrompt ? <FollowUpPushPrompt /> : null}
        {onScheduleFollowUp ? (
          <LeadFollowUpCompose
            onSubmit={onScheduleFollowUp}
            disabled={followUpComposeDisabled}
          />
        ) : null}
        {followUps.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {followUps.map(renderFollowUpItem)}
          </ul>
        ) : (
          <p className="text-sm text-zinc-500">No follow-ups scheduled.</p>
        )}
      </section>
    </div>
  );
}
