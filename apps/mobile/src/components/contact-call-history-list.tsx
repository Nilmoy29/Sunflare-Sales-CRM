import { StyleSheet, Text, View } from "react-native";
import {
  CALL_OUTCOME_LABELS,
  formatCallDate,
  formatCallDurationMinutes,
} from "@/features/calls/labels";
import type { ContactCallHistoryItem } from "@/features/calls/types";

type ContactCallHistoryListProps = {
  calls: ContactCallHistoryItem[];
  loading?: boolean;
  error?: string | null;
};

export function ContactCallHistoryList({
  calls,
  loading = false,
  error = null,
}: ContactCallHistoryListProps) {
  if (loading) {
    return <Text style={styles.muted}>Loading call history…</Text>;
  }

  if (error) {
    return <Text style={styles.error}>{error}</Text>;
  }

  if (calls.length === 0) {
    return <Text style={styles.muted}>No calls logged for this contact yet.</Text>;
  }

  return (
    <View style={styles.list}>
      {calls.map((call) => {
        const duration = formatCallDurationMinutes(call.duration_seconds);
        const meta = [call.rep_name, formatCallDate(call.called_at), duration]
          .filter(Boolean)
          .join(" · ");

        return (
          <View key={call.id} style={styles.card}>
            <Text style={styles.title}>
              {CALL_OUTCOME_LABELS[call.outcome]}
            </Text>
            <Text style={styles.meta}>{meta}</Text>
            {call.notes ? <Text style={styles.notes}>{call.notes}</Text> : null}
            {call.has_linked_lead ? (
              <Text style={styles.linked}>Linked to pipeline</Text>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 8 },
  card: {
    borderWidth: 1,
    borderColor: "#e4e4e7",
    borderRadius: 10,
    padding: 12,
    backgroundColor: "#fff",
  },
  title: { fontSize: 14, fontWeight: "600", color: "#18181b" },
  meta: { fontSize: 12, color: "#71717a", marginTop: 4 },
  notes: { fontSize: 13, color: "#52525b", marginTop: 6 },
  linked: { fontSize: 12, color: "#15803d", fontWeight: "600", marginTop: 6 },
  muted: { fontSize: 13, color: "#71717a" },
  error: { fontSize: 13, color: "#b91c1c" },
});
