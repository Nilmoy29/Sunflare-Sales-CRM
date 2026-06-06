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
import { LEAD_STAGES, type LeadStage } from "@/lib/validators/enums";
import type { PipelineLeadCard } from "@/lib/validators/pipeline";

type PipelineKanbanProps = {
  leads: PipelineLeadCard[];
  loading: boolean;
  error: string | null;
  showRepName: boolean;
  detailBasePath: string;
  onStageChange: (leadId: string, stage: LeadStage) => Promise<void>;
};

const COLUMN_WIDTH_CLASS = "w-[260px] shrink-0";

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
}: {
  lead: PipelineLeadCard;
  showRepName: boolean;
  detailBasePath: string;
  dragging?: boolean;
  showDetailsLink?: boolean;
}) {
  return (
    <div
      className={`rounded-md border border-zinc-200 bg-white p-3 shadow-sm ${
        dragging ? "opacity-50" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-zinc-900">{lead.contact_name}</p>
        <span
          className={`shrink-0 rounded px-1.5 py-0.5 text-xs font-medium ${LEAD_SOURCE_BADGE_CLASS[lead.source]}`}
        >
          {LEAD_SOURCE_LABELS[lead.source]}
        </span>
      </div>
      {lead.address ? (
        <p className="mt-1 text-xs text-zinc-600">{lead.address}</p>
      ) : null}
      {lead.suburb ? (
        <p className="mt-0.5 text-xs text-zinc-500">{lead.suburb}</p>
      ) : null}
      {showRepName ? (
        <p className="mt-2 text-xs text-zinc-600">Owner: {lead.rep_name}</p>
      ) : null}
      <p className="mt-2 text-xs text-zinc-500">
        Last touch: {formatLastTouchDate(lead.last_touch_at)}
      </p>
      <p className="mt-0.5 text-xs text-zinc-600">
        Next: {formatNextActionCountdown(lead.next_action_due_at)}
      </p>
      {showDetailsLink ? (
        <Link
          href={`${detailBasePath}/${lead.id}`}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          className="mt-2 inline-block min-h-11 text-xs font-medium text-zinc-700 underline"
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
}: {
  lead: PipelineLeadCard;
  showRepName: boolean;
  detailBasePath: string;
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
      />
    </div>
  );
}

function PipelineColumn({
  stage,
  leads,
  showRepName,
  detailBasePath,
}: {
  stage: LeadStage;
  leads: PipelineLeadCard[];
  showRepName: boolean;
  detailBasePath: string;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });

  return (
    <div className={`flex flex-col ${COLUMN_WIDTH_CLASS}`}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-zinc-900">
          {LEAD_STAGE_LABELS[stage]}
        </h2>
        <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600">
          {leads.length}
        </span>
      </div>
      <div
        ref={setNodeRef}
        className={`flex min-h-[12rem] flex-1 flex-col gap-2 rounded-lg border border-dashed p-2 ${
          isOver
            ? "border-zinc-400 bg-zinc-50"
            : "border-zinc-200 bg-zinc-50/50"
        }`}
      >
        {leads.map((lead) => (
          <DraggableLeadCard
            key={lead.id}
            lead={lead}
            showRepName={showRepName}
            detailBasePath={detailBasePath}
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
}: PipelineKanbanProps) {
  const [activeLeadId, setActiveLeadId] = useState<string | null>(null);
  const [moving, setMoving] = useState(false);

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

    setMoving(true);
    try {
      await onStageChange(leadId, newStage);
    } finally {
      setMoving(false);
    }
  }

  if (loading) {
    return (
      <p className="text-sm text-zinc-600" role="status">
        Loading pipeline…
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
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
        <div className="overflow-x-auto pb-2">
          <div className="flex min-w-max gap-4">
            {PIPELINE_STAGE_ORDER.map((stage) => (
              <PipelineColumn
                key={stage}
                stage={stage}
                leads={leadsByStage.get(stage) ?? []}
                showRepName={showRepName}
                detailBasePath={detailBasePath}
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
    </div>
  );
}
