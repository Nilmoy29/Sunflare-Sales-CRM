import {
  LEAD_STAGE_LABELS,
  LOST_REASON_LABELS,
  LOST_REASONS,
  PIPELINE_STAGE_ORDER,
} from "@/features/pipeline/labels";
import type { PipelineLeadCard } from "@/features/pipeline/types";
import type { LeadStage, LostReason } from "@sunflare/shared";
import { useEffect, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

type StagePickerModalProps = {
  visible: boolean;
  lead: PipelineLeadCard | null;
  busy?: boolean;
  onClose: () => void;
  onSelectStage: (stage: LeadStage, lostReason?: LostReason) => void;
};

export function StagePickerModal({
  visible,
  lead,
  busy = false,
  onClose,
  onSelectStage,
}: StagePickerModalProps) {
  const [lostReasonVisible, setLostReasonVisible] = useState(false);

  useEffect(() => {
    if (!visible) {
      setLostReasonVisible(false);
    }
  }, [visible]);

  if (!lead) {
    return null;
  }

  function handleStagePress(stage: LeadStage) {
    if (stage === lead!.stage || busy) {
      return;
    }
    if (stage === "lost") {
      setLostReasonVisible(true);
      return;
    }
    onSelectStage(stage);
  }

  function handleLostReason(reason: LostReason) {
    setLostReasonVisible(false);
    onSelectStage("lost", reason);
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
          <Text style={styles.title}>Update stage</Text>
          <Text style={styles.subtitle}>{lead.contact_name}</Text>

          {lostReasonVisible ? (
            <ScrollView contentContainerStyle={styles.list}>
              <Text style={styles.lostTitle}>Why was this lead lost?</Text>
              {LOST_REASONS.map((reason) => (
                <Pressable
                  key={reason}
                  style={styles.option}
                  onPress={() => handleLostReason(reason)}
                  disabled={busy}
                  accessibilityRole="button"
                  accessibilityLabel={LOST_REASON_LABELS[reason]}
                >
                  <Text style={styles.optionText}>
                    {LOST_REASON_LABELS[reason]}
                  </Text>
                </Pressable>
              ))}
              <Pressable
                style={styles.cancel}
                onPress={() => setLostReasonVisible(false)}
              >
                <Text style={styles.cancelText}>Back</Text>
              </Pressable>
            </ScrollView>
          ) : (
            <ScrollView contentContainerStyle={styles.list}>
              {PIPELINE_STAGE_ORDER.map((stage) => {
                const selected = stage === lead.stage;
                return (
                  <Pressable
                    key={stage}
                    style={[styles.option, selected && styles.optionSelected]}
                    onPress={() => handleStagePress(stage)}
                    disabled={busy || selected}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    accessibilityLabel={LEAD_STAGE_LABELS[stage]}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        selected && styles.optionTextSelected,
                      ]}
                    >
                      {LEAD_STAGE_LABELS[stage]}
                    </Text>
                  </Pressable>
                );
              })}
              <Pressable style={styles.cancel} onPress={onClose}>
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end" },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: "rgba(0,0,0,0.4)" },
  sheet: {
    maxHeight: "75%",
    backgroundColor: "#fff",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
  },
  title: { fontSize: 18, fontWeight: "700", color: "#18181b" },
  subtitle: { fontSize: 14, color: "#52525b", marginBottom: 12 },
  lostTitle: { fontSize: 15, fontWeight: "600", marginBottom: 8 },
  list: { gap: 8, paddingBottom: 24 },
  option: {
    minHeight: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e4e4e7",
    paddingHorizontal: 14,
    justifyContent: "center",
  },
  optionSelected: {
    borderColor: "#15803d",
    backgroundColor: "#f0fdf4",
  },
  optionText: { fontSize: 15, color: "#18181b" },
  optionTextSelected: { fontWeight: "700", color: "#166534" },
  cancel: {
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  cancelText: { fontSize: 15, fontWeight: "600", color: "#52525b" },
});
