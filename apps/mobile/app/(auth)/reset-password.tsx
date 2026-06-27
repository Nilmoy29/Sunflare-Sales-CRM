import * as Linking from "expo-linking";
import { Link, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { getApiUrl } from "@/lib/env";
import { getSupabase } from "@/lib/supabase";

export default function ResetPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [mode, setMode] = useState<"request" | "update" | "checking">(
    "checking",
  );
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      const {
        data: { session },
      } = await getSupabase().auth.getSession();
      if (!active) {
        return;
      }
      setMode(session ? "update" : "request");
    })();
    return () => {
      active = false;
    };
  }, []);

  async function sendResetEmail() {
    setError(null);
    setMessage(null);
    setBusy(true);
    try {
      const redirectTo = Linking.createURL("reset-password");
      const { error: resetError } = await getSupabase().auth.resetPasswordForEmail(
        email.trim(),
        { redirectTo },
      );
      if (resetError) {
        throw resetError;
      }
      setMessage("If that email exists, a reset link is on its way.");
    } catch {
      setMessage("If that email exists, a reset link is on its way.");
    } finally {
      setBusy(false);
    }
  }

  async function updatePassword() {
    setError(null);
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      const { error: updateError } = await getSupabase().auth.updateUser({
        password,
      });
      if (updateError) {
        throw updateError;
      }
      setMessage("Password updated. You can sign in now.");
      router.replace("/(auth)/login");
    } catch {
      setError(
        "This reset link is invalid or expired. Request a new link below.",
      );
      setMode("request");
    } finally {
      setBusy(false);
    }
  }

  if (mode === "checking") {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#15803d" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        {mode === "update" ? "Set new password" : "Reset password"}
      </Text>

      {mode === "request" ? (
        <>
          <Text style={styles.label}>Email</Text>
          <TextInput
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
            style={styles.input}
          />
          <Pressable
            style={styles.button}
            onPress={sendResetEmail}
            disabled={busy || !email.trim()}
          >
            <Text style={styles.buttonText}>
              {busy ? "Sending…" : "Send reset link"}
            </Text>
          </Pressable>
        </>
      ) : (
        <>
          <Text style={styles.label}>New password</Text>
          <TextInput
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            style={styles.input}
          />
          <Text style={styles.label}>Confirm password</Text>
          <TextInput
            secureTextEntry
            value={confirm}
            onChangeText={setConfirm}
            style={styles.input}
          />
          <Pressable
            style={styles.button}
            onPress={updatePassword}
            disabled={busy || !password}
          >
            <Text style={styles.buttonText}>
              {busy ? "Saving…" : "Save password"}
            </Text>
          </Pressable>
        </>
      )}

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {message ? <Text style={styles.success}>{message}</Text> : null}

      <Link href="/(auth)/login" style={styles.link}>
        Back to sign in
      </Link>

      <Pressable
        style={styles.fallback}
        onPress={() => Linking.openURL(`${getApiUrl()}/reset-password`)}
      >
        <Text style={styles.fallbackText}>Reset in browser instead</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: "center", gap: 8 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 24, fontWeight: "700", marginBottom: 8 },
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
  button: {
    minHeight: 48,
    marginTop: 12,
    borderRadius: 10,
    backgroundColor: "#15803d",
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  error: { color: "#b91c1c", fontSize: 14 },
  success: { color: "#15803d", fontSize: 14 },
  link: { marginTop: 16, fontSize: 15, color: "#1d4ed8" },
  fallback: { marginTop: 12, alignItems: "center" },
  fallbackText: {
    fontSize: 14,
    color: "#64748b",
    textDecorationLine: "underline",
  },
});
