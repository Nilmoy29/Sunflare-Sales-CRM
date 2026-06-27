import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { configureMapbox } from "@/lib/geo/mapbox";
import { getDatabase } from "@/lib/sqlite/database";
import { checkForAppUpdate } from "@/lib/updates/check-for-updates";
import { AuthProvider } from "@/providers/auth-provider";
import { PushProvider } from "@/providers/push-provider";
import { AppQueryProvider } from "@/providers/query-provider";
import "@/tasks/gps-background-task";

export default function RootLayout() {
  useEffect(() => {
    configureMapbox();
    void getDatabase();
    void checkForAppUpdate();
  }, []);

  return (
    <AppQueryProvider>
      <AuthProvider>
        <PushProvider>
          <StatusBar style="auto" />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(tabs)" />
          </Stack>
        </PushProvider>
      </AuthProvider>
    </AppQueryProvider>
  );
}
