import { Pressable, StyleSheet, Text, View } from "react-native";

type ShiftControlsProps = {
  isActive: boolean;
  loading: boolean;
  busy: boolean;
  error: string | null;
  permissionMessage: string | null;
  onStart: () => void;
  onEnd: () => void;
  onOpenSettings: () => void;
};

export function ShiftControls({
  isActive,
  loading,
  busy,
  error,
  permissionMessage,
  onStart,
  onEnd,
  onOpenSettings,
}: ShiftControlsProps) {
  const warnings = [error, permissionMessage].filter(
    (message): message is string => Boolean(message),
  );

  return (
    <View style={styles.wrap} accessibilityLiveRegion="polite">
      {warnings.map((message) => (
        <View key={message} style={styles.warning}>
          <Text style={styles.warningText}>{message}</Text>
          {permissionMessage && message === permissionMessage ? (
            <Pressable
              onPress={onOpenSettings}
              accessibilityRole="button"
              accessibilityLabel="Open settings"
            >
              <Text style={styles.settingsLink}>Open Settings</Text>
            </Pressable>
          ) : null}
        </View>
      ))}

      <View style={styles.card}>
        {loading ? (
          <Text style={styles.loadingText}>Loading shift…</Text>
        ) : isActive ? (
          <View style={styles.column}>
            <View style={styles.activeRow}>
              <View style={styles.dot} />
              <Text style={styles.activeLabel}>On shift</Text>
            </View>
            <Pressable
              style={[styles.endButton, busy && styles.disabled]}
              onPress={onEnd}
              disabled={busy}
              accessibilityRole="button"
              accessibilityLabel="End shift"
            >
              <Text style={styles.endButtonText}>
                {busy ? "Ending…" : "End Shift"}
              </Text>
            </Pressable>
          </View>
        ) : (
          <Pressable
            style={[styles.startButton, busy && styles.disabled]}
            onPress={onStart}
            disabled={busy}
            accessibilityRole="button"
            accessibilityLabel="Start shift"
          >
            <Text style={styles.startButtonText}>
              {busy ? "Starting…" : "Start Shift"}
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    right: 12,
    top: 12,
    maxWidth: 220,
    gap: 8,
  },
  warning: {
    backgroundColor: "#fffbeb",
    borderColor: "#fcd34d",
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
  },
  warningText: { color: "#78350f", fontSize: 13, lineHeight: 18 },
  settingsLink: {
    marginTop: 6,
    color: "#1d4ed8",
    fontSize: 13,
    fontWeight: "600",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#d4d4d8",
    padding: 12,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  loadingText: { fontSize: 14, color: "#334155", minHeight: 44 },
  column: { gap: 8 },
  activeRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#22c55e",
  },
  activeLabel: { fontSize: 14, fontWeight: "600", color: "#166534" },
  startButton: {
    minHeight: 44,
    minWidth: 44,
    borderRadius: 10,
    backgroundColor: "#15803d",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  startButtonText: { color: "#fff", fontSize: 14, fontWeight: "600" },
  endButton: {
    minHeight: 44,
    minWidth: 44,
    borderRadius: 10,
    backgroundColor: "#18181b",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  endButtonText: { color: "#fff", fontSize: 14, fontWeight: "600" },
  disabled: { opacity: 0.6 },
});
