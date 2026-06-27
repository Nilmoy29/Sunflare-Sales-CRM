import type { PipelineLeadCard } from "@/features/pipeline/types";
import {
  formatDisplayDate,
  formatNextActionCountdown,
  LEAD_SOURCE_LABELS,
  LEAD_STAGE_LABELS,
} from "@/features/pipeline/labels";
import { Pressable, StyleSheet, Text, View } from "react-native";

type PipelineLeadRowProps = {
  lead: PipelineLeadCard;
  onPress: () => void;
  onChangeStage: () => void;
  updating?: boolean;
};

export function PipelineLeadRow({
  lead,
  onPress,
  onChangeStage,
  updating = false,
}: PipelineLeadRowProps) {
  const address = [lead.address, lead.suburb].filter(Boolean).join(", ");

  return (
    <Pressable
      style={styles.card}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${lead.contact_name}, ${LEAD_STAGE_LABELS[lead.stage]}`}
    >
      <View style={styles.header}>
        <Text style={styles.name}>{lead.contact_name}</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{LEAD_SOURCE_LABELS[lead.source]}</Text>
        </View>
      </View>

      {address ? <Text style={styles.meta}>{address}</Text> : null}
      {lead.phone ? <Text style={styles.meta}>{lead.phone}</Text> : null}

      <Text style={styles.countdown}>
        {formatNextActionCountdown(lead.next_action_due_at)}
      </Text>
      <Text style={styles.touch}>Last touch {formatDisplayDate(lead.last_touch_at)}</Text>

      <Pressable
        style={[styles.stageButton, updating && styles.disabled]}
        onPress={(e) => {
          e.stopPropagation();
          onChangeStage();
        }}
        disabled={updating}
        accessibilityRole="button"
        accessibilityLabel={`Change stage, currently ${LEAD_STAGE_LABELS[lead.stage]}`}
      >
        <Text style={styles.stageButtonText}>
          {updating ? "Updating…" : LEAD_STAGE_LABELS[lead.stage]}
        </Text>
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e4e4e7",
    padding: 12,
    gap: 4,
    marginBottom: 8,
  },
  header: { flexDirection: "row", justifyContent: "space-between", gap: 8 },
  name: { flex: 1, fontSize: 16, fontWeight: "600", color: "#18181b" },
  badge: {
    backgroundColor: "#ecfdf5",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeText: { fontSize: 11, fontWeight: "700", color: "#065f46" },
  meta: { fontSize: 13, color: "#52525b" },
  countdown: { fontSize: 13, fontWeight: "600", color: "#1d4ed8", marginTop: 4 },
  touch: { fontSize: 12, color: "#71717a" },
  stageButton: {
    marginTop: 8,
    minHeight: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#d4d4d8",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f4f4f5",
  },
  stageButtonText: { fontSize: 14, fontWeight: "600", color: "#18181b" },
  disabled: { opacity: 0.6 },
});
