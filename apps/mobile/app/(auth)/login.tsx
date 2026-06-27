import { Link, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useAuth } from "@/providers/auth-provider";

export default function LoginScreen() {
  const router = useRouter();
  const { signIn, loading: authLoading, profile, isAdmin, isRep } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (authLoading) {
      return;
    }
    if (isAdmin) {
      router.replace("/(auth)/admin-block");
    } else if (isRep) {
      router.replace("/(tabs)/map");
    }
  }, [authLoading, isAdmin, isRep, router]);

  if (authLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#15803d" />
      </View>
    );
  }

  async function onSubmit() {
    setError(null);
    setSubmitting(true);
    try {
      const role = await signIn(email, password);
      if (role === "admin") {
        router.replace("/(auth)/admin-block");
      } else {
        router.replace("/(tabs)/map");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sign in failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.card}>
        <Text style={styles.title}>Sunflare</Text>
        <Text style={styles.subtitle}>Sign in to your rep account</Text>

        <Text style={styles.label}>Email</Text>
        <TextInput
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
          style={styles.input}
          editable={!submitting}
        />

        <Text style={styles.label}>Password</Text>
        <TextInput
          secureTextEntry
          autoComplete="password"
          value={password}
          onChangeText={setPassword}
          style={styles.input}
          editable={!submitting}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable
          style={[styles.button, submitting && styles.buttonDisabled]}
          onPress={onSubmit}
          disabled={submitting || !email.trim() || !password}
          accessibilityRole="button"
          accessibilityLabel="Sign in"
        >
          <Text style={styles.buttonText}>
            {submitting ? "Signing in…" : "Sign in"}
          </Text>
        </Pressable>

        <Link href="/(auth)/reset-password" style={styles.link}>
          Forgot password?
        </Link>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#f8fafc",
  },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  card: { gap: 8 },
  title: { fontSize: 28, fontWeight: "700", color: "#0f172a" },
  subtitle: { fontSize: 15, color: "#64748b", marginBottom: 12 },
  label: { fontSize: 14, fontWeight: "500", color: "#334155", marginTop: 4 },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 16,
    backgroundColor: "#fff",
  },
  error: { color: "#b91c1c", fontSize: 14, marginTop: 4 },
  button: {
    minHeight: 48,
    marginTop: 12,
    borderRadius: 10,
    backgroundColor: "#15803d",
    alignItems: "center",
    justifyContent: "center",
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  link: { marginTop: 16, fontSize: 15, color: "#1d4ed8" },
});
