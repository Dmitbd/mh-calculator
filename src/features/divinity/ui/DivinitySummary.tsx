import { StyleSheet, Text, View } from "react-native";

import type { StoneCosts } from "../model/types";
import { GemIcon } from "./GemIcon";

type DivinitySummaryProps = {
  totalCost: StoneCosts;
};

export function DivinitySummary({ totalCost }: DivinitySummaryProps) {
  const metrics = [
    { label: "1 ур.", value: totalCost.stone1 },
    { label: "2 ур.", value: totalCost.stone2 },
    { label: "3 ур.", value: totalCost.stone3 },
    { label: "4 ур.", value: totalCost.stone4 },
    { label: "5 ур.", value: totalCost.stone5 },
    { label: "6 ур.", value: totalCost.stone6 },
    { label: "7 ур.", value: totalCost.stone7 },
  ];

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Расход ресурсов</Text>
      <View style={styles.grid}>
        {metrics.map((metric, index) => (
            <View key={metric.label} style={styles.metric}>
              <View style={styles.metricHeader}>
                <GemIcon level={(index + 1) as 1 | 2 | 3 | 4 | 5 | 6 | 7} />
              <Text style={styles.metricLabel}>{metric.label}</Text>
            </View>
            <Text
              accessibilityLabel={`Осталось самоцветов ${index + 1} ур.: ${metric.value}`}
              style={styles.value}
            >
              {metric.value}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: "100%",
    borderRadius: 24,
    backgroundColor: "#2a160e",
    padding: 20,
    gap: 14,
    borderWidth: 1,
    borderColor: "#734227",
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: "#fff3d1",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  metric: {
    width: "30%",
    minWidth: 86,
    borderRadius: 18,
    backgroundColor: "#3b2114",
    paddingVertical: 12,
    paddingHorizontal: 10,
  },
  metricLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#e9c46a",
  },
  metricHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  value: {
    marginTop: 6,
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
    color: "#fff8e7",
  },
});
