import { StyleSheet, Text, View } from "react-native";

import type { DivinityStep } from "../model/types";

type DivinityStepBreakdownProps = {
  nextStep: DivinityStep | null;
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
      <Text style={styles.title}>Следующий шаг: {nextStep.label}</Text>
      <Text style={styles.text}>
        Деления: {nextStep.tapCost.stone5}/{nextStep.tapCost.stone6}/{nextStep.tapCost.stone7}
      </Text>
      <Text style={styles.text}>
        Переход: {nextStep.finishCost.stone5}/{nextStep.finishCost.stone6}/{nextStep.finishCost.stone7}
      </Text>
      <Text style={styles.text}>
        Итого: {nextStep.totalCost.stone5}/{nextStep.totalCost.stone6}/{nextStep.totalCost.stone7}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: "100%",
    borderRadius: 20,
    backgroundColor: "#fffbeb",
    padding: 20,
    gap: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#17212b",
  },
  text: {
    fontSize: 16,
    color: "#475569",
  },
});
