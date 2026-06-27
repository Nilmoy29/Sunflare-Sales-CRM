import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { CallLogForm } from "@/components/call-log-form";
import { ContactCallHistoryList } from "@/components/contact-call-history-list";
import { ContactQuickAddSheet } from "@/components/contact-quick-add-sheet";
import { PhoneDialLink } from "@/components/phone-dial-link";
import { fetchRepDailyCallCount, promoteCall } from "@/features/calls/api";
import {
  formatContactAddressLine,
  formatContactDisplayName,
  isPromotableCallOutcome,
} from "@/features/calls/labels";
import { useContactCallHistory } from "@/features/calls/use-contact-call-history";
import { useContactSearch } from "@/features/calls/use-contact-search";
import type {
  CallLogSummary,
  ContactSearchResult,
  ContactSummary,
} from "@/features/calls/types";
import { CONTACT_SEARCH_MIN_LENGTH } from "@/features/calls/types";
import { invalidateLeadQueries } from "@/features/pipeline/use-pipeline";

function toSelectedFromCreated(contact: ContactSummary): ContactSearchResult {
  return { ...contact, is_linked: true };
}

function toSelectedFromDuplicate(contact: ContactSummary): ContactSearchResult {
  return { ...contact, is_linked: false };
}

export default function CallsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [query, setQuery] = useState("");
  const [selectedContact, setSelectedContact] =
    useState<ContactSearchResult | null>(null);
  const [quickAddVisible, setQuickAddVisible] = useState(false);
  const [duplicateNotice, setDuplicateNotice] = useState<string | null>(null);
  const [callLoggedNotice, setCallLoggedNotice] = useState<string | null>(null);
  const [lastLoggedCall, setLastLoggedCall] = useState<CallLogSummary | null>(
    null,
  );
  const [promotedCallIds, setPromotedCallIds] = useState<string[]>([]);
  const [promoting, setPromoting] = useState(false);
  const [promoteError, setPromoteError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const { contacts, loading, error } = useContactSearch(query);
  const dailyCountQuery = useQuery({
    queryKey: ["rep-daily-call-count", refreshKey],
    queryFn: ({ signal }) => fetchRepDailyCallCount(signal),
  });
  const {
    calls: callHistory,
    loading: callHistoryLoading,
    error: callHistoryError,
  } = useContactCallHistory(selectedContact?.id ?? null, refreshKey);

  const trimmedQuery = query.trim();
  const showHint = trimmedQuery.length < CONTACT_SEARCH_MIN_LENGTH;

  function handleSelectContact(contact: ContactSearchResult) {
    setSelectedContact(contact);
    setDuplicateNotice(null);
    setCallLoggedNotice(null);
    setLastLoggedCall(null);
    setPromoteError(null);
  }

  function handleCallLogged(call: CallLogSummary) {
    setLastLoggedCall(call);
    setCallLoggedNotice("Call logged.");
    setPromoteError(null);
    setRefreshKey((key) => key + 1);
  }

  async function handlePromote() {
    if (!lastLoggedCall || promoting) {
      return;
    }

    setPromoting(true);
    setPromoteError(null);

    const result = await promoteCall(lastLoggedCall.id);
    setPromoting(false);

    if (result.status === "error") {
      setPromoteError(result.message);
      return;
    }

    setPromotedCallIds((ids) =>
      ids.includes(lastLoggedCall.id) ? ids : [...ids, lastLoggedCall.id],
    );
    setCallLoggedNotice("Call logged · Added to pipeline");
    invalidateLeadQueries(queryClient);
  }

  const showPromoteButton =
    lastLoggedCall !== null &&
    isPromotableCallOutcome(lastLoggedCall.outcome) &&
    !promotedCallIds.includes(lastLoggedCall.id);

  const dailyCount = dailyCountQuery.data?.count ?? 0;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      {dailyCountQuery.error ? (
        <Text style={styles.errorBanner}>
          {dailyCountQuery.error instanceof Error
            ? dailyCountQuery.error.message
            : "Could not load call count"}
        </Text>
      ) : (
        <Text style={styles.subtitle}>
          {dailyCount === 1 ? "1 call today" : `${dailyCount} calls today`}
        </Text>
      )}

      <Text style={styles.hint}>
        Search for a contact or quick-add a new one before logging a call.
      </Text>

      <Text style={styles.label}>Search contacts</Text>
      <TextInput
        style={styles.search}
        value={query}
        onChangeText={setQuery}
        placeholder="Name, phone, or address"
        autoCapitalize="none"
        autoCorrect={false}
        accessibilityLabel="Search contacts"
      />

      <Pressable
        style={styles.quickAdd}
        onPress={() => setQuickAddVisible(true)}
        accessibilityRole="button"
        accessibilityLabel="Quick add contact"
      >
        <Text style={styles.quickAddText}>Quick add contact</Text>
      </Pressable>

      {duplicateNotice ? (
        <Text style={styles.duplicateNotice}>{duplicateNotice}</Text>
      ) : null}

      {showHint ? (
        <Text style={styles.muted}>
          Type at least {CONTACT_SEARCH_MIN_LENGTH} characters to search.
        </Text>
      ) : null}

      {loading ? <Text style={styles.muted}>Searching…</Text> : null}
      {error ? (
        <Text style={styles.errorBanner} accessibilityRole="alert">
          {error}
        </Text>
      ) : null}

      {!showHint && !loading && !error && contacts.length === 0 ? (
        <Text style={styles.muted}>
          No contacts found. Try another search or quick-add a new contact.
        </Text>
      ) : null}

      {contacts.map((contact) => {
        const selected = selectedContact?.id === contact.id;
        const addressLine = formatContactAddressLine(contact);

        return (
          <Pressable
            key={contact.id}
            style={[styles.resultCard, selected && styles.resultCardSelected]}
            onPress={() => handleSelectContact(contact)}
            accessibilityRole="button"
            accessibilityState={{ selected }}
          >
            <View style={styles.resultHeader}>
              <Text style={styles.resultName}>
                {formatContactDisplayName(contact)}
              </Text>
              {contact.is_linked ? (
                <Text style={styles.linkedBadge}>Linked</Text>
              ) : null}
            </View>
            {contact.phone ? (
              <PhoneDialLink phone={contact.phone}>{contact.phone}</PhoneDialLink>
            ) : null}
            {addressLine ? (
              <Text style={styles.resultMeta}>{addressLine}</Text>
            ) : null}
          </Pressable>
        );
      })}

      {selectedContact ? (
        <View style={styles.selectedSection}>
          <Text style={styles.sectionLabel}>Selected contact</Text>
          <Text style={styles.selectedName}>
            {formatContactDisplayName(selectedContact)}
          </Text>
          {selectedContact.phone ? (
            <PhoneDialLink phone={selectedContact.phone}>
              {selectedContact.phone}
            </PhoneDialLink>
          ) : null}
          {formatContactAddressLine(selectedContact) ? (
            <Text style={styles.resultMeta}>
              {formatContactAddressLine(selectedContact)}
            </Text>
          ) : null}

          <CallLogForm
            key={selectedContact.id}
            contactId={selectedContact.id}
            onLogged={handleCallLogged}
          />

          {callLoggedNotice ? (
            <View style={styles.successBanner}>
              <Text style={styles.successText}>{callLoggedNotice}</Text>
              {promotedCallIds.includes(lastLoggedCall?.id ?? "") ? (
                <Pressable
                  onPress={() => router.push("/(tabs)/pipeline")}
                  accessibilityRole="link"
                >
                  <Text style={styles.pipelineLink}>View pipeline</Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}

          {showPromoteButton ? (
            <Pressable
              style={[styles.promoteButton, promoting && styles.disabled]}
              onPress={() => void handlePromote()}
              disabled={promoting}
              accessibilityRole="button"
              accessibilityLabel="Promote to pipeline"
            >
              <Text style={styles.promoteText}>
                {promoting ? "Promoting…" : "Promote to pipeline"}
              </Text>
            </Pressable>
          ) : null}

          {promoteError ? (
            <Text style={styles.errorBanner} accessibilityRole="alert">
              {promoteError}
            </Text>
          ) : null}

          <Text style={[styles.sectionLabel, styles.historyLabel]}>
            Call history
          </Text>
          <ContactCallHistoryList
            calls={callHistory}
            loading={callHistoryLoading}
            error={callHistoryError}
          />
        </View>
      ) : null}

      <ContactQuickAddSheet
        visible={quickAddVisible}
        onClose={() => setQuickAddVisible(false)}
        onCreated={(contact) => {
          setSelectedContact(toSelectedFromCreated(contact));
          setDuplicateNotice(null);
        }}
        onDuplicate={(contact) => {
          setSelectedContact(toSelectedFromDuplicate(contact));
          setDuplicateNotice(
            "A contact with this phone already exists. We selected the existing record.",
          );
        }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  content: { padding: 16, paddingBottom: 32, gap: 8 },
  subtitle: { fontSize: 14, fontWeight: "600", color: "#3f3f46" },
  hint: { fontSize: 14, color: "#52525b", marginBottom: 4 },
  label: { fontSize: 14, fontWeight: "600", color: "#18181b", marginTop: 8 },
  search: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: "#d4d4d8",
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 16,
  },
  quickAdd: {
    minHeight: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#d4d4d8",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  quickAddText: { fontSize: 14, fontWeight: "600", color: "#18181b" },
  duplicateNotice: {
    backgroundColor: "#fffbeb",
    color: "#78350f",
    padding: 10,
    borderRadius: 8,
    fontSize: 13,
  },
  muted: { fontSize: 13, color: "#71717a" },
  errorBanner: {
    backgroundColor: "#fef2f2",
    color: "#b91c1c",
    padding: 10,
    borderRadius: 8,
    fontSize: 13,
  },
  resultCard: {
    borderWidth: 1,
    borderColor: "#e4e4e7",
    borderRadius: 10,
    padding: 12,
    marginTop: 4,
    gap: 4,
  },
  resultCardSelected: {
    borderColor: "#18181b",
    backgroundColor: "#fafafa",
  },
  resultHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 8,
  },
  resultName: { flex: 1, fontSize: 15, fontWeight: "600", color: "#18181b" },
  linkedBadge: {
    fontSize: 11,
    fontWeight: "700",
    color: "#065f46",
    backgroundColor: "#d1fae5",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    overflow: "hidden",
  },
  resultMeta: { fontSize: 13, color: "#71717a" },
  selectedSection: {
    marginTop: 16,
    padding: 14,
    borderRadius: 12,
    backgroundColor: "#f4f4f5",
    gap: 6,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    color: "#71717a",
  },
  selectedName: { fontSize: 18, fontWeight: "700", color: "#18181b" },
  successBanner: {
    backgroundColor: "#ecfdf5",
    padding: 10,
    borderRadius: 8,
    marginTop: 8,
    gap: 4,
  },
  successText: { fontSize: 13, fontWeight: "600", color: "#065f46" },
  pipelineLink: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1d4ed8",
    textDecorationLine: "underline",
  },
  promoteButton: {
    minHeight: 44,
    borderRadius: 10,
    backgroundColor: "#15803d",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  promoteText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  historyLabel: { marginTop: 16 },
  disabled: { opacity: 0.6 },
});
