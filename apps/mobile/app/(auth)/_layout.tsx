import { Redirect, Stack } from "expo-router";

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="reset-password" />
      <Stack.Screen name="admin-block" />
    </Stack>
  );
}
