import { StyleSheet, Text, View } from "react-native";

type PendingSyncBannerProps = {
  count: number;
  syncBlockedMessage?: string | null;
};

export function PendingSyncBanner({
  count,
  syncBlockedMessage,
}: PendingSyncBannerProps) {
  if (count <= 0 && !syncBlockedMessage) {
    return null;
  }

  const label =
    count === 1
      ? "1 knock waiting to sync"
      : count > 1
        ? `${count} knocks waiting to sync`
        : null;

  return (
    <View style={styles.wrap} accessibilityLiveRegion="polite">
      {label ? <Text style={styles.text}>{label}</Text> : null}
      {syncBlockedMessage ? (
        <Text style={styles.blocked}>{syncBlockedMessage}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: "#fff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#d4d4d8",
    paddingHorizontal: 12,
    paddingVertical: 8,
    maxWidth: 280,
    gap: 4,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  text: { fontSize: 13, fontWeight: "600", color: "#18181b" },
  blocked: { fontSize: 12, color: "#b45309", fontWeight: "500" },
});
