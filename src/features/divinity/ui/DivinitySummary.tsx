import { StyleSheet, Text, View } from "react-native";

import type { StoneCosts } from "../model/types";

type DivinitySummaryProps = {
  currentLevel: number;
  totalCost: StoneCosts;
};

export function DivinitySummary({
  currentLevel,
  totalCost,
}: DivinitySummaryProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>Текущий уровень: {currentLevel}</Text>
      <Text style={styles.value}>5 ур.: {totalCost.stone5}</Text>
      <Text style={styles.value}>6 ур.: {totalCost.stone6}</Text>
      <Text style={styles.value}>7 ур.: {totalCost.stone7}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: "100%",
    borderRadius: 20,
    backgroundColor: "#fff7ed",
    padding: 20,
    gap: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#17212b",
  },
  value: {
    fontSize: 18,
    color: "#334155",
  },
});
