import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useAuth } from "@/providers/auth-provider";
import { getApiUrl } from "@/lib/env";

export default function AdminBlockScreen() {
  const router = useRouter();
  const { signOut } = useAuth();
  const webUrl = getApiUrl();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Web dashboard only</Text>
      <Text style={styles.body}>
        Admin accounts use the Sunflare manager console on desktop. The mobile app
        is for field reps only.
      </Text>
      <Pressable
        style={styles.button}
        onPress={() => Linking.openURL(webUrl)}
        accessibilityRole="link"
        accessibilityLabel="Open web dashboard"
      >
        <Text style={styles.buttonText}>Open web app</Text>
      </Pressable>
      <Pressable
        style={styles.secondary}
        onPress={async () => {
          await signOut();
          router.replace("/(auth)/login");
        }}
      >
        <Text style={styles.secondaryText}>Use a different account</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
    backgroundColor: "#f8fafc",
  },
  title: { fontSize: 24, fontWeight: "700", marginBottom: 12 },
  body: { fontSize: 16, color: "#475569", lineHeight: 24, marginBottom: 20 },
  button: {
    minHeight: 48,
    borderRadius: 10,
    backgroundColor: "#1d4ed8",
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  secondary: { marginTop: 16, alignItems: "center", minHeight: 44 },
  secondaryText: { color: "#1d4ed8", fontSize: 15 },
});
