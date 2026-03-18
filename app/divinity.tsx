import { ScrollView, StyleSheet, Text, View } from "react-native";

import steps from "../src/features/divinity/data/divinity-steps.json";
import { useDivinityProgress } from "../src/features/divinity/hooks/useDivinityProgress";
import { calculateDivinityTotals } from "../src/features/divinity/model/calculateDivinityTotals";
import { getNextDivinityStep } from "../src/features/divinity/model/getNextDivinityStep";
import { DivinityControls } from "../src/features/divinity/ui/DivinityControls";
import { DivinityStepBreakdown } from "../src/features/divinity/ui/DivinityStepBreakdown";
import { DivinitySummary } from "../src/features/divinity/ui/DivinitySummary";

const maxLevel = steps[steps.length - 1]?.toLevel ?? 0;

export default function DivinityScreen() {
  const { currentLevel, incrementLevel, isLoaded, resetLevel } =
    useDivinityProgress(maxLevel);
  const totalCost = calculateDivinityTotals(steps, currentLevel);
  const nextStep = getNextDivinityStep(steps, currentLevel);

  if (!isLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Загрузка прогресса...</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Божественность</Text>
      <Text style={styles.text}>Повышай прогресс шаг за шагом и смотри суммарные траты.</Text>
      <DivinitySummary currentLevel={currentLevel} totalCost={totalCost.totalCost} />
      <DivinityStepBreakdown nextStep={nextStep} />
      <DivinityControls
        canIncrement={Boolean(nextStep)}
        onIncrement={() => {
          void incrementLevel();
        }}
        onReset={() => {
          void resetLevel();
        }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    gap: 16,
    padding: 24,
    backgroundColor: "#fffaf2",
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#fffaf2",
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#17212b",
  },
  text: {
    fontSize: 16,
    color: "#4f5b66",
  },
  loadingText: {
    fontSize: 16,
    color: "#4f5b66",
  },
});
