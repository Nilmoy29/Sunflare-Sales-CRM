import {
  DOOR_OUTCOME_COLORS,
  DOOR_OUTCOME_LABELS,
} from "@/lib/geo/door-outcome-colors";
import { formatKnockHistoryDate } from "@/features/history/format";
import type { SelectedMapKnockPin } from "@/features/knocks/types";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

type KnockPinDetailSheetProps = {
  visible: boolean;
  knock: SelectedMapKnockPin | null;
  onClose: () => void;
  onKnockAgain: (coords: { lat: number; lng: number }) => void;
};

function formatKnockWhen(knockedAt: string): string {
  if (Number.isNaN(Date.parse(knockedAt))) {
    return "Unknown time";
  }
  return formatKnockHistoryDate(knockedAt);
}

export function KnockPinDetailSheet({
  visible,
  knock,
  onClose,
  onKnockAgain,
}: KnockPinDetailSheetProps) {
  if (!knock) {
    return null;
  }

  const color = DOOR_OUTCOME_COLORS[knock.outcome];
  const label = DOOR_OUTCOME_LABELS[knock.outcome];
  const when = formatKnockWhen(knock.knocked_at);
  const hasCoords =
    Number.isFinite(knock.lat) && Number.isFinite(knock.lng);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.root}>
        <Pressable
          style={styles.backdrop}
          onPress={onClose}
          accessibilityLabel="Close knock details"
        />
        <View
          style={styles.sheet}
          accessibilityViewIsModal
          accessibilityLabel="Knock details"
        >
          <View style={styles.header}>
            <View style={styles.headerText}>
              <Text style={styles.title}>Knock details</Text>
              <Text style={styles.when}>{when}</Text>
            </View>
            <Pressable
              onPress={onClose}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Close"
            >
              <Text style={styles.close}>Close</Text>
            </Pressable>
          </View>

          <View style={styles.badges}>
            <View style={[styles.outcomeBadge, { backgroundColor: color }]}>
              <Text style={styles.outcomeLabel}>{label}</Text>
            </View>
            {knock.pending ? (
              <View style={styles.pendingBadge}>
                <Text style={styles.pendingLabel}>Pending sync</Text>
              </View>
            ) : null}
          </View>

          {hasCoords ? (
            <Text style={styles.coords}>
              {knock.lat.toFixed(5)}, {knock.lng.toFixed(5)}
            </Text>
          ) : null}

          {hasCoords ? (
            <Pressable
              style={styles.againButton}
              onPress={() => onKnockAgain({ lat: knock.lat, lng: knock.lng })}
              accessibilityRole="button"
              accessibilityLabel="Knock again here"
            >
              <Text style={styles.againLabel}>Knock again here</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderTopWidth: 1,
    borderColor: "#d4d4d8",
    padding: 16,
    paddingBottom: 28,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
    gap: 12,
  },
  headerText: { flex: 1 },
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: "#09090b",
  },
  when: {
    marginTop: 4,
    fontSize: 14,
    color: "#52525b",
  },
  close: {
    fontSize: 14,
    fontWeight: "500",
    color: "#3f3f46",
  },
  badges: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },
  outcomeBadge: {
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  outcomeLabel: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  pendingBadge: {
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#fcd34d",
    backgroundColor: "#fffbeb",
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  pendingLabel: {
    fontSize: 12,
    fontWeight: "500",
    color: "#78350f",
  },
  coords: {
    fontSize: 14,
    color: "#52525b",
    marginBottom: 16,
  },
  againButton: {
    backgroundColor: "#09090b",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  againLabel: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
});
