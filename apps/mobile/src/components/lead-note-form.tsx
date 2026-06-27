import { NOTES_MAX_LENGTH } from "@sunflare/shared";
import { useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

type LeadNoteFormProps = {
  onSubmit: (content: string) => Promise<void>;
  disabled?: boolean;
};

export function LeadNoteForm({ onSubmit, disabled = false }: LeadNoteFormProps) {
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    const trimmed = content.trim();
    if (!trimmed || submitting || disabled) {
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await onSubmit(trimmed);
      setContent("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not add note");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.wrap}>
      <TextInput
        style={styles.input}
        value={content}
        onChangeText={setContent}
        placeholder="Add a note…"
        multiline
        maxLength={NOTES_MAX_LENGTH}
        editable={!disabled && !submitting}
        accessibilityLabel="Note"
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Pressable
        style={[styles.button, (!content.trim() || submitting) && styles.disabled]}
        onPress={() => void handleSubmit()}
        disabled={!content.trim() || submitting || disabled}
        accessibilityRole="button"
        accessibilityLabel="Save note"
      >
        <Text style={styles.buttonText}>
          {submitting ? "Saving…" : "Add note"}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
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
    backgroundColor: "#18181b",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 16,
  },
  buttonText: { color: "#fff", fontWeight: "600", fontSize: 14 },
  disabled: { opacity: 0.5 },
});
