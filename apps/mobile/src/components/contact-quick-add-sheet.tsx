import { useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { createContact } from "@/features/calls/api";
import type { ContactSummary } from "@/features/calls/types";

type ContactQuickAddSheetProps = {
  visible: boolean;
  onClose: () => void;
  onCreated: (contact: ContactSummary) => void;
  onDuplicate: (contact: ContactSummary) => void;
};

export function ContactQuickAddSheet({
  visible,
  onClose,
  onCreated,
  onDuplicate,
}: ContactQuickAddSheetProps) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [suburb, setSuburb] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);

    const result = await createContact({
      first_name: firstName,
      last_name: lastName,
      phone,
      address: address.trim() || null,
      suburb: suburb.trim() || null,
    });

    setSubmitting(false);

    if (result.status === "ok") {
      onCreated(result.contact);
      setFirstName("");
      setLastName("");
      setPhone("");
      setAddress("");
      setSuburb("");
      onClose();
      return;
    }

    if (result.status === "duplicate") {
      onDuplicate(result.contact);
      onClose();
      return;
    }

    setError(result.message);
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.sheet}>
          <ScrollView contentContainerStyle={styles.content}>
            <Text style={styles.title}>Quick add contact</Text>

            <Text style={styles.label}>First name</Text>
            <TextInput
              style={styles.input}
              value={firstName}
              onChangeText={setFirstName}
              accessibilityLabel="First name"
            />

            <Text style={styles.label}>Last name</Text>
            <TextInput
              style={styles.input}
              value={lastName}
              onChangeText={setLastName}
              accessibilityLabel="Last name"
            />

            <Text style={styles.label}>Phone</Text>
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              accessibilityLabel="Phone"
            />

            <Text style={styles.label}>Address (optional)</Text>
            <TextInput
              style={styles.input}
              value={address}
              onChangeText={setAddress}
              accessibilityLabel="Address"
            />

            <Text style={styles.label}>Suburb (optional)</Text>
            <TextInput
              style={styles.input}
              value={suburb}
              onChangeText={setSuburb}
              accessibilityLabel="Suburb"
            />

            {error ? (
              <Text style={styles.error} accessibilityRole="alert">
                {error}
              </Text>
            ) : null}

            <Pressable
              style={[styles.save, submitting && styles.disabled]}
              onPress={() => void handleSubmit()}
              disabled={submitting || !firstName.trim() || !lastName.trim() || !phone.trim()}
              accessibilityRole="button"
              accessibilityLabel="Save contact"
            >
              <Text style={styles.saveText}>
                {submitting ? "Saving…" : "Save contact"}
              </Text>
            </Pressable>
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
    paddingTop: 16,
  },
  content: { padding: 16, gap: 8, paddingBottom: 32 },
  title: { fontSize: 18, fontWeight: "700", marginBottom: 8 },
  label: { fontSize: 14, fontWeight: "600", marginTop: 4 },
  input: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: "#d4d4d8",
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 15,
  },
  error: { color: "#b91c1c", fontSize: 13, marginTop: 8 },
  save: {
    marginTop: 12,
    minHeight: 44,
    borderRadius: 10,
    backgroundColor: "#18181b",
    alignItems: "center",
    justifyContent: "center",
  },
  saveText: { color: "#fff", fontWeight: "600", fontSize: 15 },
  disabled: { opacity: 0.6 },
});
