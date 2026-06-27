import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import {
  getPushPermissionState,
  parseNotificationLeadPath,
  registerForPushNotifications,
} from "@/features/push/notifications";
import {
  getPushPromptStatus,
  setPushPromptStatus,
  type PushPromptStatus,
} from "@/features/push/prompt-state";

type PushContextValue = {
  promptStatus: PushPromptStatus;
  showOptInModal: () => void;
  enablePush: () => Promise<void>;
  declinePush: () => Promise<void>;
};

const PushContext = createContext<PushContextValue | null>(null);

export function usePush() {
  const value = useContext(PushContext);
  if (!value) {
    throw new Error("usePush must be used within PushProvider");
  }
  return value;
}

export function PushProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [promptStatus, setPromptStatus] = useState<PushPromptStatus>("pending");
  const [modalVisible, setModalVisible] = useState(false);
  const [enabling, setEnabling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void getPushPromptStatus().then(setPromptStatus);
  }, []);

  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const path = parseNotificationLeadPath(
          response.notification.request.content.data as Record<string, unknown>,
        );
        if (path) {
          router.push(path as never);
        }
      },
    );

    return () => subscription.remove();
  }, [router]);

  const showOptInModal = useCallback(() => {
    setError(null);
    setModalVisible(true);
  }, []);

  const declinePush = useCallback(async () => {
    await setPushPromptStatus("declined");
    setPromptStatus("declined");
    setModalVisible(false);
  }, []);

  const enablePush = useCallback(async () => {
    setEnabling(true);
    setError(null);
    try {
      const token = await registerForPushNotifications();
      if (!token) {
        const state = await getPushPermissionState();
        if (state === "denied") {
          setError("Notifications are blocked. Enable them in system settings.");
        } else {
          setError("Push is only available on a physical device.");
        }
        return;
      }
      await setPushPromptStatus("enabled");
      setPromptStatus("enabled");
      setModalVisible(false);
    } catch (e: unknown) {
      setError(
        e instanceof Error ? e.message : "Could not enable notifications",
      );
    } finally {
      setEnabling(false);
    }
  }, []);

  const value = useMemo(
    () => ({
      promptStatus,
      showOptInModal,
      enablePush,
      declinePush,
    }),
    [promptStatus, showOptInModal, enablePush, declinePush],
  );

  return (
    <PushContext.Provider value={value}>
      {children}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.backdrop}>
          <View style={styles.sheet}>
            <Text style={styles.title}>Follow-up reminders</Text>
            <Text style={styles.body}>
              Get a push notification when a scheduled follow-up is due so you
              can open the lead right away.
            </Text>
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <Pressable
              style={styles.primary}
              onPress={() => void enablePush()}
              disabled={enabling}
              accessibilityRole="button"
            >
              <Text style={styles.primaryText}>
                {enabling ? "Enabling…" : "Enable reminders"}
              </Text>
            </Pressable>
            <Pressable
              style={styles.secondary}
              onPress={() => void declinePush()}
              disabled={enabling}
              accessibilityRole="button"
            >
              <Text style={styles.secondaryText}>Not now</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </PushContext.Provider>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    justifyContent: "center",
    padding: 24,
  },
  sheet: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    gap: 12,
  },
  title: { fontSize: 18, fontWeight: "700", color: "#0f172a" },
  body: { fontSize: 15, color: "#475569", lineHeight: 22 },
  error: { color: "#b91c1c", fontSize: 14 },
  primary: {
    minHeight: 48,
    borderRadius: 10,
    backgroundColor: "#15803d",
    alignItems: "center",
    justifyContent: "center",
  },
  primaryText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  secondary: {
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryText: { color: "#64748b", fontSize: 15, fontWeight: "500" },
});
