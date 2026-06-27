import { ActivityIndicator, StyleSheet, View } from "react-native";

export function LoadingGate() {
  return (
    <View style={styles.centered}>
      <ActivityIndicator size="large" color="#15803d" />
    </View>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
});
