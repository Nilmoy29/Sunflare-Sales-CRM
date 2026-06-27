import { StyleSheet, Text, View } from "react-native";
import {
  CALL_OUTCOME_BUTTON_COLORS,
} from "@/features/calls/labels";
import {
  callOutcomeLabel,
  formatCallContactLine,
  formatCallDate,
  formatCallDurationMinutes,
} from "@/features/history/format";
import type { CallHistoryItem } from "@/features/history/types";

type CallHistoryRowProps = {
  item: CallHistoryItem;
};

export function CallHistoryRow({ item }: CallHistoryRowProps) {
  const duration = formatCallDurationMinutes(item.duration_seconds);

  return (
    <View style={styles.card}>
      <View
        style={[
          styles.badge,
          { backgroundColor: CALL_OUTCOME_BUTTON_COLORS[item.outcome] },
        ]}
      >
        <Text style={styles.badgeText}>{callOutcomeLabel(item.outcome)}</Text>
      </View>
      <Text style={styles.date}>{formatCallDate(item.called_at)}</Text>
      <Text style={styles.contact}>{formatCallContactLine(item)}</Text>
      {duration ? <Text style={styles.meta}>{duration}</Text> : null}
      {item.notes ? <Text style={styles.notes}>{item.notes}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 14,
    gap: 6,
  },
  badge: {
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: { color: "#fff", fontSize: 12, fontWeight: "600" },
  date: { fontSize: 13, color: "#64748b" },
  contact: { fontSize: 15, fontWeight: "600", color: "#0f172a" },
  meta: { fontSize: 13, color: "#475569" },
  notes: { fontSize: 14, color: "#475569" },
});
