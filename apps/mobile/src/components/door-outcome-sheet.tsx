import {
  ADDRESS_MAX_LENGTH,
  DOOR_OUTCOMES,
  NOTES_MAX_LENGTH,
  POSTCODE_MAX_LENGTH,
  SUBURB_MAX_LENGTH,
  type DoorOutcome,
} from "@sunflare/shared";
import { useEffect, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { fetchReverseGeocode } from "@/features/knocks/api";
import {
  isPromotableDoorOutcome,
  submitKnock,
  type SubmitKnockResult,
} from "@/features/knocks/submit-knock";
import type { KnockDraft } from "@/features/knocks/types";
import { usePriorKnocks } from "@/features/knocks/use-prior-knocks";
import {
  DOOR_OUTCOME_BUTTON_COLORS,
  DOOR_OUTCOME_LABELS,
} from "@/lib/geo/door-outcome-colors";

type DoorOutcomeSheetProps = {
  visible: boolean;
  draft: KnockDraft | null;
  territoryWarning?: string | null;
  onClose: () => void;
  onSuccess: (result: SubmitKnockResult) => void;
};

function formatKnockDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function repDisplayFirstName(repName: string, isOwn: boolean): string {
  if (isOwn) {
    return "You";
  }
  return repName.split(" ")[0] ?? repName;
}

function parseFollowUpLocal(
  value: string,
): { ok: true; iso: string | null } | { ok: false } {
  if (!value.trim()) {
    return { ok: true, iso: null };
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return { ok: false };
  }
  return { ok: true, iso: date.toISOString() };
}

function toNullableField(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function DoorOutcomeSheet({
  visible,
  draft,
  territoryWarning = null,
  onClose,
  onSuccess,
}: DoorOutcomeSheetProps) {
  const [dismissedTerritoryWarning, setDismissedTerritoryWarning] =
    useState(false);
  const [address, setAddress] = useState("");
  const [suburb, setSuburb] = useState("");
  const [postcode, setPostcode] = useState("");
  const [geocodeLoading, setGeocodeLoading] = useState(true);
  const [geocodeHint, setGeocodeHint] = useState<string | null>(null);
  const [selectedOutcome, setSelectedOutcome] = useState<DoorOutcome | null>(
    null,
  );
  const [notes, setNotes] = useState("");
  const [followUpLocal, setFollowUpLocal] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const lat = draft?.lat ?? 0;
  const lng = draft?.lng ?? 0;

  const {
    priorKnocks,
    duplicateAlert,
    loading: historyLoading,
    offline: historyOffline,
    error: historyError,
  } = usePriorKnocks(lat, lng);

  useEffect(() => {
    if (!visible || !draft) {
      return;
    }

    setDismissedTerritoryWarning(false);
    setAddress("");
    setSuburb("");
    setPostcode("");
    setGeocodeLoading(true);
    setGeocodeHint(null);
    setSelectedOutcome(null);
    setNotes("");
    setFollowUpLocal("");
    setError(null);

    const controller = new AbortController();

    async function loadAddress() {
      const currentDraft = draft;
      if (!currentDraft) {
        return;
      }
      try {
        const result = await fetchReverseGeocode(
          currentDraft.lat,
          currentDraft.lng,
          controller.signal,
        );
        if (controller.signal.aborted) {
          return;
        }

        if (result.status === "ok") {
          setAddress(result.data.address ?? "");
          setSuburb(result.data.suburb ?? "");
          setPostcode(result.data.postcode ?? "");
          return;
        }

        if (result.status === "not_configured") {
          setGeocodeHint("Address lookup is not configured. Enter manually.");
          return;
        }

        setGeocodeHint("Could not look up the address. Enter manually.");
      } catch {
        if (!controller.signal.aborted) {
          setGeocodeHint("Could not look up the address. Enter manually.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setGeocodeLoading(false);
        }
      }
    }

    void loadAddress();

    return () => {
      controller.abort();
    };
  }, [visible, draft]);

  if (!draft) {
    return null;
  }

  const handleSave = async () => {
    if (!selectedOutcome || submitting) {
      return;
    }

    const followUp = parseFollowUpLocal(followUpLocal);
    if (!followUp.ok) {
      setError("Enter a valid follow-up date and time.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const result = await submitKnock({
        lat: draft.lat,
        lng: draft.lng,
        outcome: selectedOutcome,
        notes: notes.trim() ? notes.trim() : null,
        follow_up_at: followUp.iso,
        address: toNullableField(address),
        suburb: toNullableField(suburb),
        postcode: toNullableField(postcode),
      });
      onSuccess(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save knock");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={() => {
        if (!submitting) {
          onClose();
        }
      }}
    >
      <View style={styles.overlay}>
        <Pressable
          style={styles.backdrop}
          onPress={() => {
            if (!submitting) {
              onClose();
            }
          }}
          accessibilityLabel="Close knock form"
        />
        <View style={styles.sheet} accessibilityViewIsModal>
          <ScrollView contentContainerStyle={styles.content}>
            {territoryWarning && !dismissedTerritoryWarning ? (
              <View style={styles.warning}>
                <Text style={styles.warningText}>{territoryWarning}</Text>
                <Pressable
                  onPress={() => setDismissedTerritoryWarning(true)}
                  accessibilityRole="button"
                >
                  <Text style={styles.dismissLink}>Dismiss</Text>
                </Pressable>
              </View>
            ) : null}

            <Text style={styles.title}>Log door knock</Text>
            <Text style={styles.coords}>
              {draft.lat.toFixed(6)}, {draft.lng.toFixed(6)}
            </Text>

            {historyOffline ? (
              <Text style={styles.muted}>History unavailable offline</Text>
            ) : null}
            {!historyOffline && historyError ? (
              <Text style={styles.muted}>{historyError}</Text>
            ) : null}
            {!historyOffline && duplicateAlert ? (
              <View style={styles.warning} accessibilityRole="alert">
                <Text style={styles.warningText}>
                  Already knocked today by {duplicateAlert.rep_name} at{" "}
                  {formatKnockDate(duplicateAlert.knocked_at)} (
                  {DOOR_OUTCOME_LABELS[duplicateAlert.outcome]})
                </Text>
              </View>
            ) : null}

            {!historyOffline && (historyLoading || priorKnocks.length > 0) ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Prior knocks</Text>
                {historyLoading ? (
                  <Text style={styles.muted}>Loading history…</Text>
                ) : (
                  priorKnocks.map((knock) => (
                    <View key={knock.id} style={styles.priorRow}>
                      <Text
                        style={[
                          styles.priorBadge,
                          {
                            backgroundColor:
                              DOOR_OUTCOME_BUTTON_COLORS[knock.outcome],
                          },
                        ]}
                      >
                        {DOOR_OUTCOME_LABELS[knock.outcome]}
                      </Text>
                      <Text style={styles.priorMeta}>
                        {formatKnockDate(knock.knocked_at)} ·{" "}
                        {repDisplayFirstName(knock.rep_name, knock.is_own)}
                      </Text>
                    </View>
                  ))
                )}
              </View>
            ) : null}

            <Text style={styles.sectionTitle}>Address</Text>
            {geocodeLoading ? (
              <Text style={styles.muted}>Looking up address…</Text>
            ) : null}
            <TextInput
              style={styles.input}
              value={address}
              onChangeText={setAddress}
              editable={!submitting}
              maxLength={ADDRESS_MAX_LENGTH}
              placeholder="Street address"
              accessibilityLabel="Street address"
            />
            <View style={styles.row}>
              <TextInput
                style={[styles.input, styles.half]}
                value={suburb}
                onChangeText={setSuburb}
                editable={!submitting}
                maxLength={SUBURB_MAX_LENGTH}
                placeholder="Suburb"
                accessibilityLabel="Suburb"
              />
              <TextInput
                style={[styles.input, styles.half]}
                value={postcode}
                onChangeText={setPostcode}
                editable={!submitting}
                maxLength={POSTCODE_MAX_LENGTH}
                placeholder="Postcode"
                keyboardType="number-pad"
                accessibilityLabel="Postcode"
              />
            </View>
            {geocodeHint ? <Text style={styles.muted}>{geocodeHint}</Text> : null}

            <Text style={styles.sectionTitle}>Outcome</Text>
            <View style={styles.outcomeGrid}>
              {DOOR_OUTCOMES.map((outcome) => {
                const selected = selectedOutcome === outcome;
                return (
                  <Pressable
                    key={outcome}
                    style={[
                      styles.outcomeButton,
                      {
                        backgroundColor: DOOR_OUTCOME_BUTTON_COLORS[outcome],
                      },
                      selected && styles.outcomeSelected,
                    ]}
                    onPress={() => setSelectedOutcome(outcome)}
                    disabled={submitting}
                    accessibilityRole="button"
                    accessibilityLabel={DOOR_OUTCOME_LABELS[outcome]}
                    accessibilityState={{ selected }}
                  >
                    <Text style={styles.outcomeLabel}>
                      {DOOR_OUTCOME_LABELS[outcome]}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.sectionTitle}>Notes (optional)</Text>
            <TextInput
              style={[styles.input, styles.notes]}
              value={notes}
              onChangeText={setNotes}
              editable={!submitting}
              maxLength={NOTES_MAX_LENGTH}
              multiline
              placeholder="Quick notes…"
              accessibilityLabel="Notes"
            />

            <Text style={styles.sectionTitle}>Follow-up (optional)</Text>
            <TextInput
              style={styles.input}
              value={followUpLocal}
              onChangeText={setFollowUpLocal}
              editable={!submitting}
              placeholder="e.g. 2026-06-27 14:00"
              accessibilityLabel="Follow-up date and time"
            />
            {selectedOutcome && isPromotableDoorOutcome(selectedOutcome) ? (
              <Text style={styles.promoteHint}>
                This outcome can create a pipeline lead when synced.
              </Text>
            ) : null}

            {error ? (
              <Text style={styles.error} accessibilityRole="alert">
                {error}
              </Text>
            ) : null}

            <View style={styles.actions}>
              <Pressable
                style={[styles.cancelButton, submitting && styles.disabled]}
                onPress={onClose}
                disabled={submitting}
                accessibilityRole="button"
                accessibilityLabel="Cancel"
              >
                <Text style={styles.cancelLabel}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.saveButton,
                  (!selectedOutcome || submitting) && styles.disabled,
                ]}
                onPress={() => void handleSave()}
                disabled={!selectedOutcome || submitting}
                accessibilityRole="button"
                accessibilityLabel="Save knock"
              >
                <Text style={styles.saveLabel}>
                  {submitting ? "Saving…" : "Save knock"}
                </Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end" },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: "rgba(0,0,0,0.4)" },
  sheet: {
    maxHeight: "85%",
    backgroundColor: "#fff",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderTopWidth: 1,
    borderColor: "#d4d4d8",
  },
  content: { padding: 16, gap: 8, paddingBottom: 32 },
  title: { fontSize: 18, fontWeight: "700", color: "#18181b" },
  coords: { fontFamily: "monospace", fontSize: 13, color: "#52525b" },
  section: { gap: 6, marginTop: 4 },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#18181b",
    marginTop: 8,
  },
  muted: { fontSize: 13, color: "#71717a" },
  warning: {
    backgroundColor: "#fffbeb",
    borderColor: "#fcd34d",
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    gap: 6,
  },
  warningText: { fontSize: 13, color: "#78350f", lineHeight: 18 },
  dismissLink: { color: "#1d4ed8", fontWeight: "600", fontSize: 13 },
  priorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 8,
    backgroundColor: "#f4f4f5",
    borderRadius: 8,
  },
  priorBadge: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    overflow: "hidden",
  },
  priorMeta: { flex: 1, fontSize: 12, color: "#3f3f46" },
  input: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: "#d4d4d8",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#18181b",
    backgroundColor: "#fff",
  },
  half: { flex: 1 },
  row: { flexDirection: "row", gap: 8 },
  notes: { minHeight: 72, textAlignVertical: "top" },
  outcomeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  outcomeButton: {
    minHeight: 44,
    minWidth: "47%",
    borderRadius: 10,
    paddingHorizontal: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "transparent",
  },
  outcomeSelected: { borderColor: "#18181b" },
  outcomeLabel: { color: "#fff", fontSize: 13, fontWeight: "700", textAlign: "center" },
  promoteHint: { fontSize: 12, color: "#166534", marginTop: 4 },
  error: {
    color: "#78350f",
    backgroundColor: "#fffbeb",
    borderRadius: 8,
    padding: 10,
    fontSize: 13,
  },
  actions: { flexDirection: "row", gap: 8, marginTop: 12 },
  cancelButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#d4d4d8",
    alignItems: "center",
    justifyContent: "center",
  },
  cancelLabel: { fontSize: 14, fontWeight: "600", color: "#18181b" },
  saveButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 10,
    backgroundColor: "#18181b",
    alignItems: "center",
    justifyContent: "center",
  },
  saveLabel: { fontSize: 14, fontWeight: "600", color: "#fff" },
  disabled: { opacity: 0.6 },
});
