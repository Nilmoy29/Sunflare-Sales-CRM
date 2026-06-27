import { Redirect, Tabs } from "expo-router";
import { LoadingGate } from "@/components/loading-gate";
import { useAuth } from "@/providers/auth-provider";

export default function TabsLayout() {
  const { loading, isRep } = useAuth();

  if (loading) {
    return <LoadingGate />;
  }

  if (!isRep) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        tabBarActiveTintColor: "#15803d",
        tabBarInactiveTintColor: "#64748b",
        tabBarStyle: { minHeight: 56 },
        tabBarLabelStyle: { fontSize: 12, paddingBottom: 4 },
      }}
    >
      <Tabs.Screen
        name="map"
        options={{
          title: "Map",
          tabBarLabel: "Map",
          headerTitle: "Field map",
        }}
      />
      <Tabs.Screen
        name="pipeline"
        options={{
          title: "Pipeline",
          tabBarLabel: "Pipeline",
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="calls"
        options={{
          title: "Calls",
          tabBarLabel: "Calls",
          headerTitle: "Call log",
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: "History",
          tabBarLabel: "History",
          headerTitle: "History",
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarLabel: "Profile",
          headerTitle: "Profile",
        }}
      />
    </Tabs>
  );
}
