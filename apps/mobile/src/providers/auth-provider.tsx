import * as Linking from "expo-linking";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { fetchAuthProfile } from "@/features/auth/fetch-profile";
import {
  GENERIC_LOGIN_ERROR,
  INACTIVE_ACCOUNT_ERROR,
  type MobileAuthProfile,
} from "@/features/auth/types";
import { clearLocalUserData } from "@/lib/local-user-data";
import { getSupabase, signOut as supabaseSignOut } from "@/lib/supabase";

type AuthContextValue = {
  loading: boolean;
  profile: MobileAuthProfile | null;
  isRep: boolean;
  isAdmin: boolean;
  signIn: (email: string, password: string) => Promise<"rep" | "admin">;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

async function createSessionFromUrl(url: string) {
  const hash = url.includes("#") ? url.split("#")[1] : "";
  const params = new URLSearchParams(hash);
  const access_token = params.get("access_token");
  const refresh_token = params.get("refresh_token");
  if (!access_token || !refresh_token) {
    return null;
  }
  const { error } = await getSupabase().auth.setSession({
    access_token,
    refresh_token,
  });
  if (error) {
    throw error;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<MobileAuthProfile | null>(null);

  const refreshProfile = useCallback(async () => {
    const next = await fetchAuthProfile();
    setProfile(next);
  }, []);

  const bootstrap = useCallback(async () => {
    setLoading(true);
    try {
      const initialUrl = await Linking.getInitialURL();
      if (initialUrl) {
        await createSessionFromUrl(initialUrl);
      }
      await refreshProfile();
    } finally {
      setLoading(false);
    }
  }, [refreshProfile]);

  useEffect(() => {
    bootstrap();
    const subscription = Linking.addEventListener("url", ({ url }) => {
      createSessionFromUrl(url)
        .then(() => refreshProfile())
        .catch(() => undefined);
    });
    const {
      data: { subscription: authSub },
    } = getSupabase().auth.onAuthStateChange(async (event) => {
      if (event === "SIGNED_OUT") {
        setProfile(null);
        return;
      }
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        await refreshProfile();
      }
    });

    return () => {
      subscription.remove();
      authSub.unsubscribe();
    };
  }, [bootstrap, refreshProfile]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await getSupabase().auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error) {
      throw new Error(GENERIC_LOGIN_ERROR);
    }

    const nextProfile = await fetchAuthProfile();
    if (!nextProfile) {
      await supabaseSignOut();
      throw new Error(GENERIC_LOGIN_ERROR);
    }
    if (!nextProfile.active) {
      await supabaseSignOut();
      throw new Error(INACTIVE_ACCOUNT_ERROR);
    }

    setProfile(nextProfile);
    return nextProfile.role === "admin" ? "admin" : "rep";
  }, []);

  const signOut = useCallback(async () => {
    await clearLocalUserData();
    await supabaseSignOut();
    setProfile(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      loading,
      profile,
      isRep: profile?.role === "rep",
      isAdmin: profile?.role === "admin",
      signIn,
      signOut,
      refreshProfile,
    }),
    [loading, profile, signIn, signOut, refreshProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
