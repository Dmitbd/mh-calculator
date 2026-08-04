import { StyleSheet, Text, View } from "react-native";

import type { AntiqueRivalryResult } from "../model/types";

type AntiqueSummaryProps = {
  result: AntiqueRivalryResult;
};

export function AntiqueSummary({ result }: AntiqueSummaryProps) {
  const metrics = [
    {
      accessibilityLabel: `Итоговые очки: ${result.totalScore}`,
      label: "Итоговые очки",
      value: result.totalScore,
      featured: true,
    },
    {
      accessibilityLabel: `Исходные очки: ${result.baseScore}`,
      label: "Исходные очки",
      value: result.baseScore,
    },
    {
      accessibilityLabel: `Осталось очков: ${result.scoreRemaining}`,
      label: "До 12 000",
      value: result.scoreRemaining,
    },
    {
      accessibilityLabel: `Открыто узлов: ${result.openedNodes} из 16`,
      label: "Узлы",
      value: `${result.openedNodes} из 16`,
    },
    {
      accessibilityLabel: `Открыто крупных сундуков: ${result.openedMajorChests} из 4`,
      label: "Крупные сундуки",
      value: `${result.openedMajorChests} из 4`,
    },
  ];

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Прогресс соперничества</Text>
      <View style={styles.grid}>
        {metrics.map((metric) => (
          <View
            key={metric.label}
            accessible
            accessibilityLabel={metric.accessibilityLabel}
            style={[styles.metric, metric.featured && styles.featuredMetric]}
          >
            <Text style={styles.metricLabel}>{metric.label}</Text>
            <Text style={[styles.value, metric.featured && styles.featuredValue]}>
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
    borderWidth: 1,
    borderColor: "#734227",
    backgroundColor: "#2a160e",
    padding: 20,
    gap: 14,
  },
  title: {
    color: "#fff3d1",
    fontSize: 22,
    fontWeight: "800",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  metric: {
    minWidth: 122,
    flexGrow: 1,
    flexBasis: "30%",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#58351f",
    backgroundColor: "#3b2114",
    paddingHorizontal: 12,
    paddingVertical: 14,
    gap: 6,
  },
  featuredMetric: {
    flexBasis: "100%",
    borderColor: "#b9853f",
    backgroundColor: "#4a2b18",
  },
  metricLabel: {
    color: "#d7c19a",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  value: {
    color: "#fff8e7",
    fontSize: 22,
    fontWeight: "800",
  },
  featuredValue: {
    color: "#f0c36a",
    fontSize: 32,
  },
});
