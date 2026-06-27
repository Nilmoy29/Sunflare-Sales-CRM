import { NOTES_MAX_LENGTH } from "@sunflare/shared";
import DateTimePicker, {
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { useState } from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

type LeadFollowUpFormProps = {
  onSubmit: (input: { due_at: string; note: string }) => Promise<void>;
  disabled?: boolean;
};

export function LeadFollowUpForm({
  onSubmit,
  disabled = false,
}: LeadFollowUpFormProps) {
  const [dueAt, setDueAt] = useState(() => {
    const d = new Date();
    d.setHours(d.getHours() + 24, 0, 0, 0);
    return d;
  });
  const [showPicker, setShowPicker] = useState(false);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function onDateChange(_event: DateTimePickerEvent, selected?: Date) {
    if (Platform.OS === "android") {
      setShowPicker(false);
    }
    if (selected) {
      setDueAt(selected);
    }
  }

  async function handleSubmit() {
    if (submitting || disabled) {
      return;
    }

    if (Number.isNaN(dueAt.getTime())) {
      setError("Enter a valid date and time");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await onSubmit({
        due_at: dueAt.toISOString(),
        note: note.trim(),
      });
      setNote("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not schedule follow-up");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>Due date and time</Text>
      <Pressable
        style={styles.dateButton}
        onPress={() => setShowPicker(true)}
        disabled={disabled || submitting}
        accessibilityRole="button"
        accessibilityLabel="Pick follow-up date and time"
      >
        <Text style={styles.dateText}>{dueAt.toLocaleString()}</Text>
      </Pressable>

      {showPicker ? (
        <DateTimePicker
          value={dueAt}
          mode="datetime"
          onChange={onDateChange}
          minimumDate={new Date()}
        />
      ) : null}

      <Text style={styles.label}>Note (optional)</Text>
      <TextInput
        style={styles.input}
        value={note}
        onChangeText={setNote}
        placeholder="What to follow up on…"
        multiline
        maxLength={NOTES_MAX_LENGTH}
        editable={!disabled && !submitting}
        accessibilityLabel="Follow-up note"
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable
        style={[styles.button, submitting && styles.disabled]}
        onPress={() => void handleSubmit()}
        disabled={submitting || disabled}
        accessibilityRole="button"
        accessibilityLabel="Schedule follow-up"
      >
        <Text style={styles.buttonText}>
          {submitting ? "Scheduling…" : "Schedule follow-up"}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  label: { fontSize: 14, fontWeight: "600", color: "#18181b" },
  dateButton: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: "#d4d4d8",
    borderRadius: 10,
    paddingHorizontal: 12,
    justifyContent: "center",
  },
  dateText: { fontSize: 15, color: "#18181b" },
  input: {
    minHeight: 72,
    borderWidth: 1,
    borderColor: "#d4d4d8",
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    textAlignVertical: "top",
  },
  error: { color: "#b91c1c", fontSize: 13 },
  button: {
    minHeight: 44,
    borderRadius: 10,
    backgroundColor: "#15803d",
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: { color: "#fff", fontWeight: "600", fontSize: 14 },
  disabled: { opacity: 0.6 },
});
