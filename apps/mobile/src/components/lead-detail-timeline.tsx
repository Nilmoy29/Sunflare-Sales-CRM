import {
  CALL_OUTCOME_LABELS,
  formatDisplayDate,
  formatNextActionCountdown,
  formatStageChangeDisplay,
  LEAD_STAGE_LABELS,
} from "@/features/pipeline/labels";
import type { LeadDetailTimelineItem } from "@/features/pipeline/types";
import { DOOR_OUTCOME_LABELS } from "@/lib/geo/door-outcome-colors";
import { StyleSheet, Text, View } from "react-native";
import type { DoorOutcome } from "@sunflare/shared";

type LeadDetailTimelineProps = {
  timeline: LeadDetailTimelineItem[];
};

function TimelineCard({
  title,
  meta,
  body,
}: {
  title: string;
  meta: string;
  body?: string | null;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardMeta}>{meta}</Text>
      </View>
      {body ? <Text style={styles.cardBody}>{body}</Text> : null}
    </View>
  );
}

function renderItem(item: LeadDetailTimelineItem) {
  const meta = `${item.rep_name} · ${formatDisplayDate(item.occurred_at)}`;

  switch (item.kind) {
    case "knock": {
      const location = [item.address, item.suburb].filter(Boolean).join(", ");
      const outcome = item.outcome as DoorOutcome;
      const label = DOOR_OUTCOME_LABELS[outcome] ?? item.outcome;
      return (
        <TimelineCard
          key={item.id}
          title={`${label}${item.is_origin ? " (origin)" : ""}`}
          meta={meta}
          body={location || null}
        />
      );
    }
    case "call":
      return (
        <TimelineCard
          key={item.id}
          title={CALL_OUTCOME_LABELS[item.outcome] ?? item.outcome}
          meta={meta}
          body={item.notes}
        />
      );
    case "note":
      return (
        <TimelineCard
          key={item.id}
          title="Note"
          meta={meta}
          body={item.content}
        />
      );
    case "stage_change": {
      const body =
        item.from_stage && item.to_stage
          ? formatStageChangeDisplay(item.from_stage, item.to_stage)
          : item.content;
      return (
        <TimelineCard
          key={item.id}
          title="Stage change"
          meta={meta}
          body={body}
        />
      );
    }
    case "follow_up": {
      const status = item.completed
        ? "Completed"
        : formatNextActionCountdown(item.due_at);
      return (
        <TimelineCard
          key={item.id}
          title={`Follow-up — ${status}`}
          meta={meta}
          body={item.note || null}
        />
      );
    }
    default:
      return null;
  }
}

export function LeadDetailTimeline({ timeline }: LeadDetailTimelineProps) {
  const sorted = [...timeline].sort((a, b) =>
    b.occurred_at.localeCompare(a.occurred_at),
  );

  if (sorted.length === 0) {
    return <Text style={styles.empty}>No activity yet.</Text>;
  }

  return <View style={styles.list}>{sorted.map(renderItem)}</View>;
}

export function LeadDetailHeaderInfo({
  contactName,
  stage,
  source,
  phone,
  address,
  suburb,
  postcode,
}: {
  contactName: string;
  stage: string;
  source: string;
  phone: string | null;
  address: string | null;
  suburb: string | null;
  postcode: string | null;
}) {
  const lines = [
    phone,
    [address, suburb, postcode].filter(Boolean).join(", ") || null,
  ].filter(Boolean);

  return (
    <View style={styles.headerCard}>
      <Text style={styles.contactName}>{contactName}</Text>
      <Text style={styles.stageLine}>
        {LEAD_STAGE_LABELS[stage as keyof typeof LEAD_STAGE_LABELS] ?? stage} ·{" "}
        {source.toUpperCase()}
      </Text>
      {lines.map((line) => (
        <Text key={line} style={styles.detailLine}>
          {line}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 8 },
  empty: { fontSize: 14, color: "#71717a" },
  card: {
    borderWidth: 1,
    borderColor: "#e4e4e7",
    borderRadius: 10,
    padding: 12,
    backgroundColor: "#fff",
  },
  cardHeader: { gap: 4 },
  cardTitle: { fontSize: 14, fontWeight: "600", color: "#18181b" },
  cardMeta: { fontSize: 12, color: "#71717a" },
  cardBody: { marginTop: 6, fontSize: 13, color: "#52525b", lineHeight: 18 },
  headerCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e4e4e7",
    padding: 14,
    gap: 4,
    marginBottom: 12,
  },
  contactName: { fontSize: 20, fontWeight: "700", color: "#18181b" },
  stageLine: { fontSize: 14, fontWeight: "600", color: "#15803d" },
  detailLine: { fontSize: 14, color: "#52525b" },
});
