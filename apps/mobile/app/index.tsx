import { Redirect } from "expo-router";
import { LoadingGate } from "@/components/loading-gate";
import { useAuth } from "@/providers/auth-provider";

export default function Index() {
  const { loading, profile, isAdmin, isRep } = useAuth();

  if (loading) {
    return <LoadingGate />;
  }

  if (!profile) {
    return <Redirect href="/(auth)/login" />;
  }

  if (isAdmin) {
    return <Redirect href="/(auth)/admin-block" />;
  }

  if (isRep) {
    return <Redirect href="/(tabs)/map" />;
  }

  return <Redirect href="/(auth)/login" />;
}
