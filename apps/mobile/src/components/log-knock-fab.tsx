import { Pressable, StyleSheet, Text } from "react-native";

type LogKnockFabProps = {
  disabled: boolean;
  disabledReason?: string | null;
  onPress: () => void;
};

export function LogKnockFab({
  disabled,
  disabledReason,
  onPress,
}: LogKnockFabProps) {
  return (
    <Pressable
      style={[styles.button, disabled && styles.disabled]}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel="Log knock at my location"
      accessibilityHint={disabledReason ?? undefined}
    >
      <Text style={styles.label}>Log here</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    position: "absolute",
    left: 12,
    bottom: 24,
    minHeight: 44,
    minWidth: 44,
    borderRadius: 24,
    backgroundColor: "#15803d",
    paddingHorizontal: 18,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  label: { color: "#fff", fontSize: 14, fontWeight: "700" },
  disabled: { opacity: 0.5 },
});
