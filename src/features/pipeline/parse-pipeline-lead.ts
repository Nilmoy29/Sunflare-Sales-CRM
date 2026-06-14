import { formatContactDisplayName } from "@/features/pipeline/pipeline-stage-labels";
import {
  pipelineLeadCardBaseSchema,
  type PipelineLeadCardBase,
} from "@/lib/validators/pipeline";
import { leadSourceSchema, leadStageSchema } from "@/lib/validators/enums";

export const PIPELINE_LEAD_SELECT = `
  id,
  stage,
  source,
  rep_id,
  updated_at,
  profiles!leads_rep_id_fkey ( name ),
  contacts!leads_contact_id_fkey ( first_name, last_name, phone, address, suburb )
`;

export function pipelineLeadSelectWithSuburbFilter(): string {
  return PIPELINE_LEAD_SELECT.replace(
    "contacts!leads_contact_id_fkey",
    "contacts!leads_contact_id_fkey!inner",
  );
}

function toIsoString(value: unknown): string | null {
  if (typeof value === "string") {
    return value;
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  return null;
}

export function parsePipelineLeadRow(
  row: Record<string, unknown>,
): PipelineLeadCardBase | null {
  const profiles = row.profiles as { name?: string } | null;
  const contacts = row.contacts as {
    first_name?: string | null;
    last_name?: string | null;
    phone?: string | null;
    address?: string | null;
    suburb?: string | null;
  } | null;

  const id = typeof row.id === "string" ? row.id : null;
  const rep_id = typeof row.rep_id === "string" ? row.rep_id : null;
  const rep_name = profiles?.name;
  const stageParsed = leadStageSchema.safeParse(row.stage);
  const sourceParsed = leadSourceSchema.safeParse(row.source);
  const updated_at = toIsoString(row.updated_at);

  if (
    !id ||
    !rep_id ||
    !rep_name ||
    !stageParsed.success ||
    !sourceParsed.success ||
    !updated_at
  ) {
    return null;
  }

  const contact_name = formatContactDisplayName({
    first_name: contacts?.first_name ?? null,
    last_name: contacts?.last_name ?? null,
    address: contacts?.address ?? null,
    suburb: contacts?.suburb ?? null,
  });

  return pipelineLeadCardBaseSchema.parse({
    id,
    stage: stageParsed.data,
    source: sourceParsed.data,
    rep_id,
    rep_name,
    contact_name,
    phone: contacts?.phone ?? null,
    address: contacts?.address ?? null,
    suburb: contacts?.suburb ?? null,
    updated_at,
  });
}
