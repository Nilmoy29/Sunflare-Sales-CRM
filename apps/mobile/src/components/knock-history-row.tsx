import { StyleSheet, Text, View } from "react-native";
import {
  doorOutcomeLabel,
  formatKnockAddress,
  formatKnockHistoryDate,
} from "@/features/history/format";
import type {
  KnockHistoryItem,
  PendingKnockHistoryItem,
} from "@/features/history/types";
import {
  DOOR_OUTCOME_BUTTON_COLORS,
} from "@/lib/geo/door-outcome-colors";

type KnockHistoryRowProps = {
  item: KnockHistoryItem | PendingKnockHistoryItem;
};

export function KnockHistoryRow({ item }: KnockHistoryRowProps) {
  const pending = "pending" in item && item.pending;
  const address = formatKnockAddress(item);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View
          style={[
            styles.badge,
            { backgroundColor: DOOR_OUTCOME_BUTTON_COLORS[item.outcome] },
          ]}
        >
          <Text style={styles.badgeText}>{doorOutcomeLabel(item.outcome)}</Text>
        </View>
        {pending ? (
          <View style={styles.pendingBadge}>
            <Text style={styles.pendingText}>Pending sync</Text>
          </View>
        ) : null}
      </View>
      <Text style={styles.date}>{formatKnockHistoryDate(item.knocked_at)}</Text>
      <Text style={styles.address}>{address}</Text>
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
  header: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: { color: "#fff", fontSize: 12, fontWeight: "600" },
  pendingBadge: {
    borderRadius: 999,
    backgroundColor: "#fef3c7",
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  pendingText: { color: "#92400e", fontSize: 12, fontWeight: "600" },
  date: { fontSize: 13, color: "#64748b" },
  address: { fontSize: 15, fontWeight: "600", color: "#0f172a" },
  notes: { fontSize: 14, color: "#475569" },
});
