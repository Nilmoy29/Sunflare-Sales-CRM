import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { CALL_OUTCOMES, DOOR_OUTCOMES } from "@sunflare/shared";
import { CallHistoryRow } from "@/components/call-history-row";
import {
  HistoryDateRange,
  HistoryOutcomeFilters,
} from "@/components/history-filters";
import { KnockHistoryRow } from "@/components/knock-history-row";
import { useCallHistory } from "@/features/history/use-call-history";
import { useKnockHistory } from "@/features/history/use-knock-history";
import {
  DOOR_OUTCOME_BUTTON_COLORS,
  DOOR_OUTCOME_LABELS,
} from "@/lib/geo/door-outcome-colors";
import {
  CALL_OUTCOME_BUTTON_COLORS,
  CALL_OUTCOME_LABELS,
} from "@/features/calls/labels";

type HistorySegment = "knocks" | "calls";

export default function HistoryScreen() {
  const [segment, setSegment] = useState<HistorySegment>("knocks");
  const knockHistory = useKnockHistory();
  const callHistory = useCallHistory();

  const knockItems = useMemo(() => {
    return [...knockHistory.pendingKnocks, ...knockHistory.knocks];
  }, [knockHistory.pendingKnocks, knockHistory.knocks]);

  const doorChips = useMemo(
    () =>
      DOOR_OUTCOMES.map((outcome) => ({
        value: outcome,
        label: DOOR_OUTCOME_LABELS[outcome],
        color: DOOR_OUTCOME_BUTTON_COLORS[outcome],
      })),
    [],
  );

  const callChips = useMemo(
    () =>
      CALL_OUTCOMES.map((outcome) => ({
        value: outcome,
        label: CALL_OUTCOME_LABELS[outcome],
        color: CALL_OUTCOME_BUTTON_COLORS[outcome],
      })),
    [],
  );

  const loading =
    segment === "knocks" ? knockHistory.loading : callHistory.loading;
  const error = segment === "knocks" ? knockHistory.error : callHistory.error;
  const truncated =
    segment === "knocks" ? knockHistory.truncated : callHistory.truncated;
  const loadMore =
    segment === "knocks" ? knockHistory.loadMore : callHistory.loadMore;

  return (
    <View style={styles.container}>
      <View style={styles.segmentRow}>
        {(["knocks", "calls"] as const).map((value) => {
          const active = segment === value;
          return (
            <Pressable
              key={value}
              style={[styles.segment, active && styles.segmentActive]}
              onPress={() => setSegment(value)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
            >
              <Text
                style={[styles.segmentText, active && styles.segmentTextActive]}
              >
                {value === "knocks" ? "Knocks" : "Calls"}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {segment === "knocks" ? (
        <>
          <HistoryDateRange
            from={knockHistory.filters.from}
            to={knockHistory.filters.to}
            onChange={(partial) => knockHistory.setFilters(partial)}
          />
          <HistoryOutcomeFilters
            chips={doorChips}
            selected={knockHistory.filters.outcomes}
            onToggle={(value) =>
              knockHistory.toggleOutcome(value as (typeof DOOR_OUTCOMES)[number])
            }
            onSelectAll={knockHistory.selectAllOutcomes}
          />
        </>
      ) : (
        <>
          <HistoryDateRange
            from={callHistory.filters.from}
            to={callHistory.filters.to}
            onChange={(partial) => callHistory.setFilters(partial)}
          />
          <HistoryOutcomeFilters
            chips={callChips}
            selected={callHistory.filters.outcomes}
            onToggle={(value) =>
              callHistory.toggleOutcome(value as (typeof CALL_OUTCOMES)[number])
            }
            onSelectAll={callHistory.selectAllOutcomes}
          />
        </>
      )}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {segment === "knocks" ? (
        <FlatList
          data={knockItems}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => <KnockHistoryRow item={item} />}
          ListEmptyComponent={
            loading ? (
              <ActivityIndicator style={styles.loader} color="#15803d" />
            ) : (
              <Text style={styles.empty}>No knocks in this range.</Text>
            )
          }
          ListFooterComponent={
            truncated ? (
              <Pressable
                style={styles.loadMore}
                onPress={loadMore}
                disabled={loading}
                accessibilityRole="button"
              >
                <Text style={styles.loadMoreText}>
                  {loading ? "Loading…" : "Load more"}
                </Text>
              </Pressable>
            ) : null
          }
        />
      ) : (
        <FlatList
          data={callHistory.calls}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => <CallHistoryRow item={item} />}
          ListEmptyComponent={
            loading ? (
              <ActivityIndicator style={styles.loader} color="#15803d" />
            ) : (
              <Text style={styles.empty}>No calls in this range.</Text>
            )
          }
          ListFooterComponent={
            truncated ? (
              <Pressable
                style={styles.loadMore}
                onPress={loadMore}
                disabled={loading}
                accessibilityRole="button"
              >
                <Text style={styles.loadMoreText}>
                  {loading ? "Loading…" : "Load more"}
                </Text>
              </Pressable>
            ) : null
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc", padding: 16, gap: 12 },
  segmentRow: { flexDirection: "row", gap: 8 },
  segment: {
    flex: 1,
    minHeight: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  segmentActive: { backgroundColor: "#15803d", borderColor: "#15803d" },
  segmentText: { fontSize: 14, fontWeight: "600", color: "#334155" },
  segmentTextActive: { color: "#fff" },
  list: { gap: 10, paddingBottom: 24 },
  error: { color: "#b91c1c", fontSize: 14 },
  empty: { textAlign: "center", color: "#64748b", marginTop: 24 },
  loader: { marginTop: 24 },
  loadMore: {
    marginTop: 8,
    minHeight: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#15803d",
    alignItems: "center",
    justifyContent: "center",
  },
  loadMoreText: { color: "#15803d", fontWeight: "600" },
});
