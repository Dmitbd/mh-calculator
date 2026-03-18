import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import levels from "../src/features/divinity/data/divinity-levels.json";
import { useDivinityProgress } from "../src/features/divinity/hooks/useDivinityProgress";
import { calculateDivinityTotals } from "../src/features/divinity/model/calculateDivinityTotals";
import { getCurrentDivinityStep } from "../src/features/divinity/model/getCurrentDivinityStep";
import { DivinityRing } from "../src/features/divinity/ui/DivinityRing";
import { DivinityRangeSelector } from "../src/features/divinity/ui/DivinityRangeSelector";
import { DivinitySummary } from "../src/features/divinity/ui/DivinitySummary";

const SCREEN_PADDING = 24;

export default function DivinityScreen() {
  const { bottom } = useSafeAreaInsets();
  const {
    startLevel,
    endLevel,
    currentLevel,
    filledSegments,
    autofillEnabled,
    decrementEndLevel,
    decrementStartLevel,
    incrementEndLevel,
    incrementLevel,
    incrementStartLevel,
    isLoaded,
    resetLevel,
    toggleAutofill,
  } = useDivinityProgress(levels);
  const autofillLevel = levels.find((level) => level.level === endLevel) ?? null;
  const effectiveProgress = autofillEnabled
    ? {
        startLevel,
        endLevel,
        currentLevel: endLevel,
        filledSegments: 0,
      }
    : {
        startLevel,
        endLevel,
        currentLevel,
        filledSegments,
      };
  const totalCost = calculateDivinityTotals(levels, effectiveProgress);
  const nextStep = autofillEnabled
    ? null
    : getCurrentDivinityStep(levels, {
        startLevel,
        endLevel,
        currentLevel,
        filledSegments,
      });

  if (!isLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Загрузка прогресса...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={[
        styles.container,
        {
          paddingBottom: SCREEN_PADDING + bottom,
        },
      ]}
    >
      <DivinityRangeSelector
        startLevel={startLevel}
        endLevel={endLevel}
        autofillEnabled={autofillEnabled}
        onDecrementStart={() => {
          void decrementStartLevel();
        }}
        onIncrementStart={() => {
          void incrementStartLevel();
        }}
        onDecrementEnd={() => {
          void decrementEndLevel();
        }}
        onIncrementEnd={() => {
          void incrementEndLevel();
        }}
        onToggleAutofill={() => {
          void toggleAutofill();
        }}
      />
      <DivinityRing
        canIncrement={!autofillEnabled && Boolean(nextStep)}
        currentLevel={effectiveProgress.currentLevel}
        filledSegments={effectiveProgress.filledSegments}
        segmentCount={autofillEnabled ? (autofillLevel?.segmentCount ?? 0) : (nextStep?.segmentCount ?? 0)}
        targetLevel={autofillEnabled ? endLevel : nextStep?.level ?? null}
        transitionReady={nextStep?.transitionReady ?? false}
        onIncrement={() => {
          void incrementLevel();
        }}
      />
      <DivinitySummary totalCost={totalCost.totalCost} />
      <Pressable
        accessibilityRole="button"
        onPress={() => {
          void resetLevel();
        }}
        style={styles.resetButton}
      >
        <Text style={styles.resetButtonText}>Сбросить прогресс</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    gap: 16,
    padding: SCREEN_PADDING,
    backgroundColor: "#140d0b",
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#140d0b",
  },
  loadingText: {
    fontSize: 16,
    color: "#d7c19a",
  },
  resetButton: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#734227",
    backgroundColor: "#2a160e",
    paddingVertical: 16,
  },
  resetButtonText: {
    textAlign: "center",
    fontSize: 16,
    fontWeight: "700",
    color: "#ffd8b0",
  },
});
