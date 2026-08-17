import { StyleSheet, Text, View } from "react-native";

import type { SummonRivalryResult } from "../model/types";

type SummonSummaryProps = {
  result: SummonRivalryResult;
};

export function SummonSummary({ result }: SummonSummaryProps) {
  const values = [
    ["Итоговые очки", result.totalScore],
    ["До 12 000", result.scoreRemaining],
    ["Узлы", `${result.openedNodes} / 16`],
    ["Крупные сундуки", `${result.openedMajorChests} / 4`],
  ] as const;

  return (
    <View style={styles.card}>
      {values.map(([label, value]) => (
        <View
          key={label}
          accessible
          accessibilityLabel={`${label}: ${value}`}
          style={styles.metric}
        >
          <Text style={styles.label}>{label}</Text>
          <Text style={styles.value}>{value}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: "100%",
    flexDirection: "row",
    flexWrap: "wrap",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#734227",
    backgroundColor: "#2a160e",
    padding: 10,
    gap: 10,
  },
  metric: {
    minWidth: 130,
    flex: 1,
    alignItems: "center",
    borderRadius: 16,
    backgroundColor: "#3b2114",
    paddingVertical: 12,
    paddingHorizontal: 8,
    gap: 5,
  },
  label: {
    minHeight: 32,
    color: "#bea17b",
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 16,
    textAlign: "center",
  },
  value: {
    color: "#f0c36a",
    fontSize: 22,
    fontWeight: "800",
  },
});
