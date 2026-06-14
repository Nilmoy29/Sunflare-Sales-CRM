"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import {
  formatLastTouchDate,
  formatNextActionCountdown,
} from "@/features/pipeline/format-pipeline-dates";
import {
  LEAD_SOURCE_BADGE_CLASS,
  LEAD_SOURCE_LABELS,
} from "@/features/pipeline/pipeline-source-labels";
import {
  LEAD_STAGE_LABELS,
  PIPELINE_STAGE_ORDER,
} from "@/features/pipeline/pipeline-stage-labels";
import { LostReasonDialog } from "@/components/pipeline/lost-reason-dialog";
import type { MoveLeadStageOptions } from "@/features/pipeline/use-pipeline-leads";
import { LEAD_STAGES, type LeadStage, type LostReason } from "@/lib/validators/enums";
import type { PipelineLeadCard } from "@/lib/validators/pipeline";

type PipelineKanbanProps = {
  leads: PipelineLeadCard[];
  loading: boolean;
  error: string | null;
  showRepName: boolean;
  detailBasePath: string;
  onStageChange: (
    leadId: string,
    stage: LeadStage,
    options?: MoveLeadStageOptions,
  ) => Promise<boolean>;
  allowDelete?: boolean;
  onDeleteLead?: (leadId: string) => Promise<boolean>;
};

type PendingLostMove = {
  leadId: string;
  lead: PipelineLeadCard;
};

const COLUMN_WIDTH_CLASS = "w-[min(85vw,260px)] shrink-0 snap-start";

function resolveDropStage(
  overId: string | undefined,
  leads: PipelineLeadCard[],
): LeadStage | undefined {
  if (!overId) {
    return undefined;
  }
  if ((LEAD_STAGES as readonly string[]).includes(overId)) {
    return overId as LeadStage;
  }
  return leads.find((lead) => lead.id === overId)?.stage;
}

function PipelineLeadCardView({
  lead,
  showRepName,
  detailBasePath,
  dragging = false,
  showDetailsLink = true,
  allowDelete = false,
  deleting = false,
  onDelete,
}: {
  lead: PipelineLeadCard;
  showRepName: boolean;
  detailBasePath: string;
  dragging?: boolean;
  showDetailsLink?: boolean;
  allowDelete?: boolean;
  deleting?: boolean;
  onDelete?: () => void;
}) {
  return (
    <div
      className={`rounded-md border border-border bg-card p-3 shadow-sm ${
        dragging ? "opacity-50" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-foreground">{lead.contact_name}</p>
        <div className="flex shrink-0 items-center gap-1">
          <span
            className={`rounded px-1.5 py-0.5 text-xs font-medium ${LEAD_SOURCE_BADGE_CLASS[lead.source]}`}
          >
            {LEAD_SOURCE_LABELS[lead.source]}
          </span>
          {allowDelete && onDelete ? (
            <button
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              disabled={deleting}
              aria-label={`Delete ${lead.contact_name}`}
              className="rounded px-1.5 py-0.5 text-xs font-medium text-destructive hover:bg-destructive/10 disabled:opacity-60"
            >
              {deleting ? "…" : "×"}
            </button>
          ) : null}
        </div>
      </div>
      {lead.address ? (
        <p className="mt-1 text-xs text-muted-foreground">{lead.address}</p>
      ) : null}
      {lead.suburb ? (
        <p className="mt-0.5 text-xs text-muted-foreground">{lead.suburb}</p>
      ) : null}
      {showRepName ? (
        <p className="mt-2 text-xs text-muted-foreground">Owner: {lead.rep_name}</p>
      ) : null}
      <p className="mt-2 text-xs text-muted-foreground">
        Last touch: {formatLastTouchDate(lead.last_touch_at)}
      </p>
      <p className="mt-0.5 text-xs text-muted-foreground">
        Next: {formatNextActionCountdown(lead.next_action_due_at)}
      </p>
      {showDetailsLink ? (
        <Link
          href={`${detailBasePath}/${lead.id}`}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          className="mt-2 inline-block min-h-11 text-xs font-medium text-accent underline"
        >
          Details
        </Link>
      ) : null}
    </div>
  );
}

function DraggableLeadCard({
  lead,
  showRepName,
  detailBasePath,
  allowDelete = false,
  deleting = false,
  onDelete,
}: {
  lead: PipelineLeadCard;
  showRepName: boolean;
  detailBasePath: string;
  allowDelete?: boolean;
  deleting?: boolean;
  onDelete?: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: lead.id,
      data: { lead },
    });

  const style = transform
    ? { transform: CSS.Translate.toString(transform) }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="min-h-11 touch-manipulation"
      {...listeners}
      {...attributes}
    >
      <PipelineLeadCardView
        lead={lead}
        showRepName={showRepName}
        detailBasePath={detailBasePath}
        dragging={isDragging}
        allowDelete={allowDelete}
        deleting={deleting}
        onDelete={onDelete}
      />
    </div>
  );
}

function PipelineColumn({
  stage,
  leads,
  showRepName,
  detailBasePath,
  allowDelete = false,
  deletingLeadId,
  onDeleteLead,
}: {
  stage: LeadStage;
  leads: PipelineLeadCard[];
  showRepName: boolean;
  detailBasePath: string;
  allowDelete?: boolean;
  deletingLeadId?: string | null;
  onDeleteLead?: (leadId: string, contactName: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });

  return (
    <div className={`flex flex-col ${COLUMN_WIDTH_CLASS}`}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-foreground">
          {LEAD_STAGE_LABELS[stage]}
        </h2>
        <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-muted-foreground">
          {leads.length}
        </span>
      </div>
      <div
        ref={setNodeRef}
        className={`flex min-h-[12rem] flex-1 flex-col gap-2 rounded-lg border border-dashed p-2 ${
          isOver
            ? "border-accent/60 bg-accent/5"
            : "border-border bg-secondary/30"
        }`}
      >
        {leads.map((lead) => (
          <DraggableLeadCard
            key={lead.id}
            lead={lead}
            showRepName={showRepName}
            detailBasePath={detailBasePath}
            allowDelete={allowDelete}
            deleting={deletingLeadId === lead.id}
            onDelete={
              onDeleteLead
                ? () => onDeleteLead(lead.id, lead.contact_name)
                : undefined
            }
          />
        ))}
      </div>
    </div>
  );
}

export function PipelineKanban({
  leads,
  loading,
  error,
  showRepName,
  detailBasePath,
  onStageChange,
  allowDelete = false,
  onDeleteLead,
}: PipelineKanbanProps) {
  const [activeLeadId, setActiveLeadId] = useState<string | null>(null);
  const [moving, setMoving] = useState(false);
  const [deletingLeadId, setDeletingLeadId] = useState<string | null>(null);
  const [pendingLost, setPendingLost] = useState<PendingLostMove | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
  );

  const leadsByStage = useMemo(() => {
    const grouped = new Map<LeadStage, PipelineLeadCard[]>();
    for (const stage of PIPELINE_STAGE_ORDER) {
      grouped.set(stage, []);
    }
    for (const lead of leads) {
      const bucket = grouped.get(lead.stage);
      if (bucket) {
        bucket.push(lead);
      }
    }
    for (const stage of PIPELINE_STAGE_ORDER) {
      grouped.get(stage)?.sort((a, b) =>
        b.updated_at.localeCompare(a.updated_at),
      );
    }
    return grouped;
  }, [leads]);

  const activeLead = activeLeadId
    ? leads.find((lead) => lead.id === activeLeadId)
    : null;

  function handleDragStart(event: DragStartEvent) {
    setActiveLeadId(String(event.active.id));
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveLeadId(null);
    const leadId = String(event.active.id);
    const lead = leads.find((item) => item.id === leadId);
    const newStage = resolveDropStage(
      event.over ? String(event.over.id) : undefined,
      leads,
    );

    if (!lead || !newStage || newStage === lead.stage || moving) {
      return;
    }

    if (newStage === "lost") {
      setPendingLost({ leadId, lead });
      return;
    }

    setMoving(true);
    try {
      await onStageChange(leadId, newStage);
    } finally {
      setMoving(false);
    }
  }

  async function handleLostConfirm(lostReason: LostReason) {
    if (!pendingLost || moving) {
      return;
    }

    setMoving(true);
    try {
      const ok = await onStageChange(pendingLost.leadId, "lost", {
        lost_reason: lostReason,
      });
      if (ok) {
        setPendingLost(null);
      }
    } finally {
      setMoving(false);
    }
  }

  async function handleDeleteLead(leadId: string, contactName: string) {
    if (!onDeleteLead || deletingLeadId) {
      return;
    }

    if (
      !window.confirm(
        `Delete "${contactName}" from the pipeline? This removes the lead and its notes/follow-ups.`,
      )
    ) {
      return;
    }

    setDeletingLeadId(leadId);
    try {
      await onDeleteLead(leadId);
    } finally {
      setDeletingLeadId(null);
    }
  }

  if (loading) {
    return (
      <p className="text-sm text-muted-foreground" role="status">
        Loading pipeline…
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {error ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={(event) => {
          void handleDragEnd(event);
        }}
      >
        <div className="-mx-4 overflow-x-auto px-4 pb-2 snap-x snap-mandatory scroll-px-4 sm:mx-0 sm:px-0">
          <div className="flex min-w-max gap-3 sm:gap-4">
            {PIPELINE_STAGE_ORDER.map((stage) => (
              <PipelineColumn
                key={stage}
                stage={stage}
                leads={leadsByStage.get(stage) ?? []}
                showRepName={showRepName}
                detailBasePath={detailBasePath}
                allowDelete={allowDelete}
                deletingLeadId={deletingLeadId}
                onDeleteLead={
                  allowDelete && onDeleteLead ? handleDeleteLead : undefined
                }
              />
            ))}
          </div>
        </div>

        <DragOverlay>
          {activeLead ? (
            <div className={COLUMN_WIDTH_CLASS}>
              <PipelineLeadCardView
                lead={activeLead}
                showRepName={showRepName}
                detailBasePath={detailBasePath}
                dragging
                showDetailsLink={false}
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {pendingLost ? (
        <LostReasonDialog
          contactName={pendingLost.lead.contact_name}
          submitting={moving}
          onCancel={() => {
            if (!moving) {
              setPendingLost(null);
            }
          }}
          onConfirm={(lostReason) => {
            void handleLostConfirm(lostReason);
          }}
        />
      ) : null}
    </div>
  );
}
