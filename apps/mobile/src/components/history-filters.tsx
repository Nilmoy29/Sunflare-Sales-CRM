import DateTimePicker from "@react-native-community/datetimepicker";
import { useState } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import {
  dateToSydneyDateString,
  formatHistoryDateLabel,
  sydneyDateToDate,
} from "@/features/history/date-range";

type HistoryDateRangeProps = {
  from: string;
  to: string;
  onChange: (partial: { from?: string; to?: string }) => void;
};

export function HistoryDateRange({
  from,
  to,
  onChange,
}: HistoryDateRangeProps) {
  const [picker, setPicker] = useState<"from" | "to" | null>(null);

  function onDateChange(field: "from" | "to", date?: Date) {
    setPicker(null);
    if (!date) {
      return;
    }
    onChange({ [field]: dateToSydneyDateString(date) });
  }

  return (
    <View style={styles.row}>
      <Pressable
        style={styles.dateButton}
        onPress={() => setPicker("from")}
        accessibilityRole="button"
        accessibilityLabel={`From date ${formatHistoryDateLabel(from)}`}
      >
        <Text style={styles.dateLabel}>From</Text>
        <Text style={styles.dateValue}>{formatHistoryDateLabel(from)}</Text>
      </Pressable>
      <Pressable
        style={styles.dateButton}
        onPress={() => setPicker("to")}
        accessibilityRole="button"
        accessibilityLabel={`To date ${formatHistoryDateLabel(to)}`}
      >
        <Text style={styles.dateLabel}>To</Text>
        <Text style={styles.dateValue}>{formatHistoryDateLabel(to)}</Text>
      </Pressable>

      {picker ? (
        <DateTimePicker
          value={sydneyDateToDate(picker === "from" ? from : to)}
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={(_, date) => onDateChange(picker, date)}
        />
      ) : null}
    </View>
  );
}

type OutcomeChip = {
  value: string;
  label: string;
  color: string;
};

type HistoryOutcomeFiltersProps = {
  chips: OutcomeChip[];
  selected: string[] | null;
  onToggle: (value: string) => void;
  onSelectAll: () => void;
};

export function HistoryOutcomeFilters({
  chips,
  selected,
  onToggle,
  onSelectAll,
}: HistoryOutcomeFiltersProps) {
  const allSelected = selected === null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.chips}
    >
      <Pressable
        style={[styles.chip, allSelected && styles.chipActive]}
        onPress={onSelectAll}
        accessibilityRole="button"
        accessibilityState={{ selected: allSelected }}
      >
        <Text style={[styles.chipText, allSelected && styles.chipTextActive]}>
          All
        </Text>
      </Pressable>
      {chips.map((chip) => {
        const isActive = selected?.includes(chip.value) ?? false;
        return (
          <Pressable
            key={chip.value}
            style={[
              styles.chip,
              isActive && { backgroundColor: chip.color, borderColor: chip.color },
            ]}
            onPress={() => onToggle(chip.value)}
            accessibilityRole="button"
            accessibilityState={{ selected: isActive }}
          >
            <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
              {chip.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 8 },
  dateButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#fff",
  },
  dateLabel: { fontSize: 12, color: "#64748b", marginBottom: 2 },
  dateValue: { fontSize: 14, fontWeight: "600", color: "#0f172a" },
  chips: { gap: 8, paddingVertical: 4 },
  chip: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#fff",
  },
  chipActive: {
    backgroundColor: "#15803d",
    borderColor: "#15803d",
  },
  chipText: { fontSize: 13, color: "#334155", fontWeight: "500" },
  chipTextActive: { color: "#fff" },
});
