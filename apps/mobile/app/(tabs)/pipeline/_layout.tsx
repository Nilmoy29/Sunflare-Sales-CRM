import { Stack } from "expo-router";

export default function PipelineLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: "#fff" },
        headerTintColor: "#18181b",
        headerTitleStyle: { fontWeight: "600" },
      }}
    >
      <Stack.Screen name="index" options={{ title: "My pipeline" }} />
      <Stack.Screen name="[leadId]" options={{ title: "Lead detail" }} />
    </Stack>
  );
}
