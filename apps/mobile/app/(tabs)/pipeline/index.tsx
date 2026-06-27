import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  SectionList,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { PipelineLeadRow } from "@/components/pipeline-lead-row";
import { StagePickerModal } from "@/components/stage-picker-modal";
import {
  LEAD_STAGE_LABELS,
  PIPELINE_STAGE_ORDER,
} from "@/features/pipeline/labels";
import { usePipelineLeads } from "@/features/pipeline/use-pipeline";
import type { PipelineLeadCard } from "@/features/pipeline/types";
import type { LeadStage, LostReason } from "@sunflare/shared";
import { usePush } from "@/providers/push-provider";

export default function PipelineScreen() {
  const router = useRouter();
  const { promptStatus, showOptInModal } = usePush();

  useEffect(() => {
    if (promptStatus === "pending") {
      showOptInModal();
    }
  }, [promptStatus, showOptInModal]);
  const {
    leads,
    loading,
    refreshing,
    error,
    refresh,
    moveLeadStage,
    updatingLeadId,
  } = usePipelineLeads();

  const [stagePickerLead, setStagePickerLead] =
    useState<PipelineLeadCard | null>(null);

  const sections = useMemo(() => {
    return PIPELINE_STAGE_ORDER.map((stage) => ({
      stage,
      title: LEAD_STAGE_LABELS[stage],
      data: leads.filter((lead) => lead.stage === stage),
    })).filter((section) => section.data.length > 0);
  }, [leads]);

  async function handleStageSelect(stage: LeadStage, lostReason?: LostReason) {
    if (!stagePickerLead) {
      return;
    }

    const ok = await moveLeadStage(stagePickerLead.id, stage, {
      lost_reason: lostReason,
    });
    if (ok) {
      setStagePickerLead(null);
    }
  }

  if (loading && leads.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#15803d" />
        <Text style={styles.loadingText}>Loading leads…</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {error ? (
        <Text style={styles.error} accessibilityRole="alert">
          {error}
        </Text>
      ) : null}

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        contentContainerStyle={
          sections.length === 0 ? styles.emptyContainer : styles.listContent
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void refresh()}
            tintColor="#15803d"
          />
        }
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <Text style={styles.sectionCount}>{section.data.length}</Text>
          </View>
        )}
        renderItem={({ item }) => (
          <PipelineLeadRow
            lead={item}
            updating={updatingLeadId === item.id}
            onPress={() =>
              router.push({
                pathname: "/(tabs)/pipeline/[leadId]",
                params: { leadId: item.id },
              })
            }
            onChangeStage={() => setStagePickerLead(item)}
          />
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>No leads in your pipeline yet.</Text>
        }
      />

      <StagePickerModal
        visible={stagePickerLead !== null}
        lead={stagePickerLead}
        busy={Boolean(updatingLeadId)}
        onClose={() => setStagePickerLead(null)}
        onSelectStage={(stage, lostReason) => void handleStageSelect(stage, lostReason)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: { fontSize: 14, color: "#52525b" },
  listContent: { padding: 12, paddingBottom: 32 },
  emptyContainer: { flexGrow: 1, justifyContent: "center", padding: 24 },
  empty: { textAlign: "center", fontSize: 15, color: "#71717a" },
  error: {
    margin: 12,
    marginBottom: 0,
    padding: 10,
    borderRadius: 8,
    backgroundColor: "#fef2f2",
    color: "#b91c1c",
    fontSize: 13,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
    paddingHorizontal: 4,
    backgroundColor: "#f8fafc",
  },
  sectionTitle: { fontSize: 15, fontWeight: "700", color: "#18181b" },
  sectionCount: { fontSize: 13, color: "#71717a", fontWeight: "600" },
});
