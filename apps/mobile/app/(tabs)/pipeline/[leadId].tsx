import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import { LeadFollowUpForm } from "@/components/lead-follow-up-form";
import {
  LeadDetailHeaderInfo,
  LeadDetailTimeline,
} from "@/components/lead-detail-timeline";
import { LeadNoteForm } from "@/components/lead-note-form";
import { StagePickerModal } from "@/components/stage-picker-modal";
import {
  createLeadFollowUp,
  createLeadNote,
} from "@/features/pipeline/api";
import { LEAD_SOURCE_LABELS } from "@/features/pipeline/labels";
import {
  invalidateLeadQueries,
  useLeadDetailQuery,
  usePipelineLeads,
} from "@/features/pipeline/use-pipeline";
import type { PipelineLeadCard } from "@/features/pipeline/types";
import type { LeadStage, LostReason } from "@sunflare/shared";

export default function LeadDetailScreen() {
  const { leadId } = useLocalSearchParams<{ leadId: string }>();
  const queryClient = useQueryClient();
  const detailQuery = useLeadDetailQuery(leadId ?? "");
  const { moveLeadStage, updatingLeadId } = usePipelineLeads();
  const [stagePickerOpen, setStagePickerOpen] = useState(false);

  const data = detailQuery.data;
  const loading = detailQuery.isLoading;
  const reloading = detailQuery.isRefetching;

  const pickerLead: PipelineLeadCard | null = data
    ? {
        id: data.lead.id,
        stage: data.lead.stage,
        source: data.lead.source,
        rep_id: data.lead.rep_id,
        rep_name: data.lead.rep_name,
        contact_name: data.lead.contact_name,
        phone: data.lead.phone,
        address: data.lead.address,
        suburb: data.lead.suburb,
        updated_at: data.lead.created_at,
        last_touch_at: data.lead.created_at,
        next_action_due_at: null,
        booked_at: data.lead.booked_at,
        closer_name: data.lead.closer_name,
        booking_notes: data.lead.booking_notes,
        proposal_sent_at: null,
        latest_note: null,
      }
    : null;

  async function handleAddNote(content: string) {
    if (!leadId) {
      return;
    }
    await createLeadNote(leadId, content);
    invalidateLeadQueries(queryClient, leadId);
    await detailQuery.refetch();
  }

  async function handleScheduleFollowUp(input: {
    due_at: string;
    note: string;
  }) {
    if (!leadId) {
      return;
    }
    await createLeadFollowUp(leadId, input);
    invalidateLeadQueries(queryClient, leadId);
    await detailQuery.refetch();
  }

  async function handleStageSelect(stage: LeadStage, lostReason?: LostReason) {
    if (!leadId) {
      return;
    }
    const ok = await moveLeadStage(leadId, stage, { lost_reason: lostReason });
    if (ok) {
      setStagePickerOpen(false);
      invalidateLeadQueries(queryClient, leadId);
      await detailQuery.refetch();
    }
  }

  if (loading && !data) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#15803d" />
      </View>
    );
  }

  if (detailQuery.error || !data) {
    return (
      <View style={styles.centered}>
        <Text style={styles.error}>
          {detailQuery.error instanceof Error
            ? detailQuery.error.message
            : "Could not load lead"}
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={reloading}
          onRefresh={() => void detailQuery.refetch()}
          tintColor="#15803d"
        />
      }
    >
      <LeadDetailHeaderInfo
        contactName={data.lead.contact_name}
        stage={data.lead.stage}
        source={LEAD_SOURCE_LABELS[data.lead.source]}
        phone={data.lead.phone}
        address={data.lead.address}
        suburb={data.lead.suburb}
        postcode={data.lead.postcode}
      />

      <Pressable
        style={styles.stageButton}
        onPress={() => setStagePickerOpen(true)}
        disabled={Boolean(updatingLeadId)}
        accessibilityRole="button"
        accessibilityLabel="Change pipeline stage"
      >
        <Text style={styles.stageButtonText}>
          {updatingLeadId ? "Updating stage…" : "Change stage"}
        </Text>
      </Pressable>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Add note</Text>
        <LeadNoteForm onSubmit={handleAddNote} disabled={reloading} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Schedule follow-up</Text>
        <LeadFollowUpForm
          onSubmit={handleScheduleFollowUp}
          disabled={reloading}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Activity</Text>
        <LeadDetailTimeline timeline={data.timeline} />
      </View>

      <StagePickerModal
        visible={stagePickerOpen}
        lead={pickerLead}
        busy={Boolean(updatingLeadId)}
        onClose={() => setStagePickerOpen(false)}
        onSelectStage={(stage, lostReason) =>
          void handleStageSelect(stage, lostReason)
        }
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  content: { padding: 12, paddingBottom: 32, gap: 12 },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  error: { color: "#b91c1c", fontSize: 14, textAlign: "center" },
  stageButton: {
    minHeight: 44,
    borderRadius: 10,
    backgroundColor: "#18181b",
    alignItems: "center",
    justifyContent: "center",
  },
  stageButtonText: { color: "#fff", fontWeight: "600", fontSize: 14 },
  section: {
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e4e4e7",
    padding: 14,
    gap: 10,
  },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: "#18181b" },
});
