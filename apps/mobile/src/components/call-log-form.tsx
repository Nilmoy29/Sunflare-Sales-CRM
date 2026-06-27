import { useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import type { CallOutcome } from "@sunflare/shared";
import { createCall } from "@/features/calls/api";
import {
  CALL_DURATION_MINUTES_MAX,
  CALL_NOTES_MAX_LENGTH,
} from "@/features/calls/types";
import {
  CALL_OUTCOME_BUTTON_COLORS,
  CALL_OUTCOME_LABELS,
  CALL_OUTCOMES,
} from "@/features/calls/labels";
import type { CallLogSummary } from "@/features/calls/types";

type CallLogFormProps = {
  contactId: string;
  onLogged: (call: CallLogSummary) => void;
};

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

function parseDurationMinutes(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const parsed = Number.parseInt(trimmed, 10);
  if (Number.isNaN(parsed)) {
    return Number.NaN;
  }
  return parsed;
}

export function CallLogForm({ contactId, onLogged }: CallLogFormProps) {
  const [selectedOutcome, setSelectedOutcome] = useState<CallOutcome | null>(
    null,
  );
  const [durationMinutes, setDurationMinutes] = useState("");
  const [notes, setNotes] = useState("");
  const [followUpLocal, setFollowUpLocal] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function resetForm() {
    setSelectedOutcome(null);
    setDurationMinutes("");
    setNotes("");
    setFollowUpLocal("");
    setError(null);
  }

  async function handleSubmit() {
    if (!selectedOutcome || submitting) {
      setError("Select a call outcome before logging.");
      return;
    }

    const duration = parseDurationMinutes(durationMinutes);
    if (Number.isNaN(duration)) {
      setError("Enter a valid duration in minutes.");
      return;
    }
    if (
      duration !== null &&
      (duration < 0 || duration > CALL_DURATION_MINUTES_MAX)
    ) {
      setError(
        `Duration must be between 0 and ${CALL_DURATION_MINUTES_MAX} minutes.`,
      );
      return;
    }

    const followUp = parseFollowUpLocal(followUpLocal);
    if (!followUp.ok) {
      setError("Enter a valid follow-up date and time.");
      return;
    }

    setSubmitting(true);
    setError(null);

    const result = await createCall({
      contact_id: contactId,
      outcome: selectedOutcome,
      duration_minutes: duration,
      notes: notes.trim() ? notes.trim() : null,
      follow_up_at: followUp.iso,
    });

    setSubmitting(false);

    if (result.status === "error") {
      setError(result.message);
      return;
    }

    resetForm();
    onLogged(result.call);
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.legend}>Outcome</Text>
      <View style={styles.outcomeGrid}>
        {CALL_OUTCOMES.map((outcome) => {
          const selected = selectedOutcome === outcome;
          return (
            <Pressable
              key={outcome}
              style={[
                styles.outcomeButton,
                { backgroundColor: CALL_OUTCOME_BUTTON_COLORS[outcome] },
                selected && styles.outcomeSelected,
              ]}
              onPress={() => setSelectedOutcome(outcome)}
              disabled={submitting}
              accessibilityRole="button"
              accessibilityLabel={CALL_OUTCOME_LABELS[outcome]}
              accessibilityState={{ selected }}
            >
              <Text style={styles.outcomeLabel}>
                {CALL_OUTCOME_LABELS[outcome]}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.label}>Duration (minutes, optional)</Text>
      <TextInput
        style={styles.input}
        value={durationMinutes}
        onChangeText={setDurationMinutes}
        keyboardType="number-pad"
        placeholder="e.g. 5"
        editable={!submitting}
        accessibilityLabel="Call duration in minutes"
      />

      <Text style={styles.label}>Notes (optional)</Text>
      <TextInput
        style={[styles.input, styles.notes]}
        value={notes}
        onChangeText={setNotes}
        multiline
        maxLength={CALL_NOTES_MAX_LENGTH}
        placeholder="Quick notes…"
        editable={!submitting}
        accessibilityLabel="Call notes"
      />

      <Text style={styles.label}>Follow-up (optional)</Text>
      <TextInput
        style={styles.input}
        value={followUpLocal}
        onChangeText={setFollowUpLocal}
        placeholder="e.g. 2026-06-27 14:00"
        editable={!submitting}
        accessibilityLabel="Follow-up date and time"
      />

      {error ? (
        <Text style={styles.error} accessibilityRole="alert">
          {error}
        </Text>
      ) : null}

      <Pressable
        style={[styles.submit, (!selectedOutcome || submitting) && styles.disabled]}
        onPress={() => void handleSubmit()}
        disabled={!selectedOutcome || submitting}
        accessibilityRole="button"
        accessibilityLabel="Log call"
      >
        <Text style={styles.submitText}>
          {submitting ? "Logging…" : "Log call"}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8, marginTop: 12 },
  legend: { fontSize: 14, fontWeight: "600", color: "#18181b" },
  outcomeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  outcomeButton: {
    minHeight: 44,
    minWidth: "47%",
    borderRadius: 10,
    paddingHorizontal: 8,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "transparent",
  },
  outcomeSelected: { borderColor: "#18181b" },
  outcomeLabel: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
  },
  label: { fontSize: 14, fontWeight: "600", marginTop: 4 },
  input: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: "#d4d4d8",
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 15,
  },
  notes: { minHeight: 72, textAlignVertical: "top" },
  error: {
    backgroundColor: "#fffbeb",
    color: "#78350f",
    padding: 10,
    borderRadius: 8,
    fontSize: 13,
  },
  submit: {
    minHeight: 44,
    borderRadius: 10,
    backgroundColor: "#18181b",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  submitText: { color: "#fff", fontWeight: "600", fontSize: 15 },
  disabled: { opacity: 0.6 },
});
