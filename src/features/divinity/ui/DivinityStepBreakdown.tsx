import { StyleSheet, Text, View } from "react-native";

import type { DivinityLevel } from "../model/types";
import { GemIcon } from "./GemIcon";

type DivinityStepBreakdownProps = {
  nextStep: (DivinityLevel & {
    filledSegments: number;
    transitionReady: boolean;
  }) | null;
};

export function DivinityStepBreakdown({
  nextStep,
}: DivinityStepBreakdownProps) {
  if (!nextStep) {
    return (
      <View style={styles.card}>
        <Text style={styles.title}>Божественность завершена</Text>
        <Text style={styles.text}>Дальше повышать уже нечего.</Text>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Следующий шаг: Lv.{nextStep.level}</Text>
      <Text style={styles.segmentState}>
        Деления: {nextStep.filledSegments} / {nextStep.segmentCount}
      </Text>
      <View style={styles.breakdownRow}>
        <Text style={styles.tag}>1 деление</Text>
        <View style={styles.costRow}>
          {formatCosts(nextStep.segmentCost).map((cost) => (
            <View key={`${cost.label}-${cost.value}`} style={styles.costChip}>
              <GemIcon level={cost.level} />
              <Text style={styles.text}>
                {cost.label} {cost.value}
              </Text>
            </View>
          ))}
        </View>
      </View>
      <View style={styles.breakdownRow}>
        <Text style={styles.tag}>Переход</Text>
        <View style={styles.costRow}>
          {formatCosts(nextStep.transitionCost).map((cost) => (
            <View key={`${cost.label}-${cost.value}`} style={styles.costChip}>
              <GemIcon level={cost.level} />
              <Text style={styles.text}>
                {cost.label} {cost.value}
              </Text>
            </View>
          ))}
        </View>
      </View>
      {nextStep.note ? <Text style={styles.note}>{nextStep.note}</Text> : null}
    </View>
  );
}

function formatCosts(costs: DivinityLevel["segmentCost"]) {
  return [
    costs.stone1 ? { level: 1 as const, label: "1 ур.", value: costs.stone1 } : null,
    costs.stone2 ? { level: 2 as const, label: "2 ур.", value: costs.stone2 } : null,
    costs.stone3 ? { level: 3 as const, label: "3 ур.", value: costs.stone3 } : null,
    costs.stone4 ? { level: 4 as const, label: "4 ур.", value: costs.stone4 } : null,
    costs.stone5 ? { level: 5 as const, label: "5 ур.", value: costs.stone5 } : null,
  ].filter(Boolean) as Array<{ level: 1 | 2 | 3 | 4 | 5; label: string; value: number }>;
}

const styles = StyleSheet.create({
  card: {
    width: "100%",
    borderRadius: 24,
    backgroundColor: "#2a160e",
    padding: 20,
    gap: 12,
    borderWidth: 1,
    borderColor: "#734227",
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#fff3d1",
  },
  segmentState: {
    fontSize: 14,
    color: "#d7c19a",
  },
  breakdownRow: {
    borderRadius: 16,
    backgroundColor: "#3b2114",
    padding: 12,
  },
  tag: {
    fontSize: 12,
    fontWeight: "800",
    color: "#e9c46a",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  text: {
    fontSize: 16,
    color: "#fcefd0",
  },
  costRow: {
    marginTop: 6,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  costChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.04)",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  note: {
    fontSize: 13,
    color: "#bfa579",
  },
});
