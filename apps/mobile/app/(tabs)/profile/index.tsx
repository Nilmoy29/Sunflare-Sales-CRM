import { useQuery } from "@tanstack/react-query";
import Constants from "expo-constants";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SHARED_PACKAGE_VERSION } from "@sunflare/shared";
import { apiJson } from "@/lib/api-client";
import { getApiUrl, isMapboxConfigured } from "@/lib/env";
import {
  getLastUpdateCheckResult,
  getRuntimeVersionLabel,
  getUpdateChannelLabel,
} from "@/lib/updates/check-for-updates";
import { useAuth } from "@/providers/auth-provider";
import { usePush } from "@/providers/push-provider";

type HealthData = { status: string };

function formatBuildLabel(): string {
  const version = Constants.expoConfig?.version ?? "0.1.0";
  const build =
    Constants.nativeBuildVersion ??
    Constants.expoConfig?.android?.versionCode ??
    Constants.expoConfig?.ios?.buildNumber ??
    "dev";
  return `${version} (${build})`;
}

export default function ProfileScreen() {
  const router = useRouter();
  const { profile, signOut } = useAuth();
  const { promptStatus, showOptInModal } = usePush();
  const updateResult = getLastUpdateCheckResult();

  const health = useQuery({
    queryKey: ["health"],
    queryFn: async () => {
      const { response, json } = await apiJson<HealthData>("/api/v1/health");
      if (!response.ok) {
        throw new Error(json.error?.message ?? "Health check failed");
      }
      return json.data;
    },
    retry: false,
  });

  async function onLogout() {
    await signOut();
    router.replace("/(auth)/login");
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{profile?.name ?? "Rep"}</Text>
      <Text style={styles.row}>Build {formatBuildLabel()}</Text>
      <Text style={styles.row}>Update channel {getUpdateChannelLabel()}</Text>
      <Text style={styles.row}>
        Runtime version {getRuntimeVersionLabel()}
      </Text>
      <Text style={styles.row}>
        OTA check{" "}
        {updateResult.status === "unavailable"
          ? "n/a (dev)"
          : updateResult.status === "error"
            ? updateResult.message
            : updateResult.status}
      </Text>
      <Text style={styles.row}>
        Push reminders{" "}
        {promptStatus === "enabled"
          ? "on"
          : promptStatus === "declined"
            ? "off"
            : "not set"}
      </Text>
      {promptStatus !== "enabled" ? (
        <Pressable
          style={styles.linkButton}
          onPress={showOptInModal}
          accessibilityRole="button"
        >
          <Text style={styles.linkButtonText}>Enable follow-up reminders</Text>
        </Pressable>
      ) : null}
      <Text style={styles.row}>Shared package {SHARED_PACKAGE_VERSION}</Text>
      <Text style={styles.row}>API {getApiUrl()}</Text>
      <Text style={styles.row}>
        Mapbox {isMapboxConfigured() ? "configured" : "not configured"}
      </Text>
      <Text style={styles.row}>
        API health{" "}
        {health.isLoading
          ? "checking…"
          : health.isError
            ? "unreachable"
            : health.data?.status ?? "ok"}
      </Text>

      <Pressable
        style={styles.logout}
        onPress={onLogout}
        accessibilityRole="button"
        accessibilityLabel="Log out"
      >
        <Text style={styles.logoutText}>Log out</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, gap: 10, backgroundColor: "#fff" },
  title: { fontSize: 22, fontWeight: "700", marginBottom: 8 },
  row: { fontSize: 15, color: "#334155" },
  logout: {
    marginTop: 24,
    minHeight: 48,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#b91c1c",
    alignItems: "center",
    justifyContent: "center",
  },
  logoutText: { color: "#b91c1c", fontSize: 16, fontWeight: "600" },
  linkButton: {
    alignSelf: "flex-start",
    paddingVertical: 4,
  },
  linkButtonText: { color: "#15803d", fontSize: 15, fontWeight: "600" },
});
