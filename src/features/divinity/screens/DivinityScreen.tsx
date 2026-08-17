import { router } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { divinityLevels } from "@/features/divinity/data/divinityLevels";
import { useDivinityProgress } from "@/features/divinity/hooks/useDivinityProgress";
import { useDivinityResources } from "@/features/divinity/hooks/useDivinityResources";
import { calculateDivinityTotals } from "@/features/divinity/model/calculateDivinityTotals";
import { calculateRemainingDivinityCosts } from "@/features/divinity/model/calculateRemainingDivinityCosts";
import { getCurrentDivinityStep } from "@/features/divinity/model/getCurrentDivinityStep";
import { DivinityRing } from "@/features/divinity/ui/DivinityRing";
import { DivinityRangeSelector } from "@/features/divinity/ui/DivinityRangeSelector";
import { DivinityResourcesPanel } from "@/features/divinity/ui/DivinityResourcesPanel";
import { DivinitySummary } from "@/features/divinity/ui/DivinitySummary";
import { InstructionButton } from "@/shared/ui/InstructionButton";
import { ScreenHeader, SCREEN_HEADER_HEIGHT } from "@/shared/ui/ScreenHeader";

const SCREEN_PADDING = 24;

export default function DivinityScreen() {
  const { top, bottom } = useSafeAreaInsets();
  const {
    startLevel,
    endLevel,
    currentLevel,
    filledSegments,
    autofillEnabled,
    canDecrement,
    decrementEndLevel,
    decrementLevel,
    decrementStartLevel,
    incrementEndLevel,
    incrementLevel,
    incrementStartLevel,
    isLoaded,
    resetLevel,
    toggleAutofill,
  } = useDivinityProgress(divinityLevels);
  const {
    resources,
    isLoaded: areResourcesLoaded,
    setChestCount,
    setGemCount,
    resetResources,
  } = useDivinityResources();
  const autofillLevel =
    divinityLevels.find((level) => level.level === endLevel) ?? null;
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
  const totalCost = calculateDivinityTotals(divinityLevels, effectiveProgress);
  const remainingCost = calculateRemainingDivinityCosts(
    totalCost.totalCost,
    resources,
  );
  const nextStep = autofillEnabled
    ? null
    : getCurrentDivinityStep(divinityLevels, {
        startLevel,
        endLevel,
        currentLevel,
        filledSegments,
      });

  if (!isLoaded || !areResourcesLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Загрузка прогресса...</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Божественность" fallbackHref="/" />
      <ScrollView
        contentContainerStyle={[
          styles.container,
          {
            paddingTop: SCREEN_HEADER_HEIGHT + top,
            paddingBottom: SCREEN_PADDING + bottom,
          },
        ]}
      >
        <View style={styles.contentSection}>
          <InstructionButton
            accessibilityLabel="Открыть инструкцию"
            onPress={() => router.push("/divinity/manual")}
          />
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
            canDecrement={!autofillEnabled && canDecrement}
            canIncrement={!autofillEnabled && Boolean(nextStep)}
            currentLevel={effectiveProgress.currentLevel}
            filledSegments={effectiveProgress.filledSegments}
            segmentCount={autofillEnabled ? (autofillLevel?.segmentCount ?? 0) : (nextStep?.segmentCount ?? 0)}
            targetLevel={autofillEnabled ? endLevel : nextStep?.level ?? null}
            transitionReady={nextStep?.transitionReady ?? false}
            onDecrement={() => {
              void decrementLevel();
            }}
            onIncrement={() => {
              void incrementLevel();
            }}
          />
          <DivinityResourcesPanel
            resources={resources}
            onSetChest={(chestId, count) => {
              void setChestCount(chestId, count);
            }}
            onSetGem={(level, count) => {
              void setGemCount(level, count);
            }}
            onReset={() => {
              void resetResources();
            }}
          />
          <DivinitySummary totalCost={remainingCost} />
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              void resetLevel();
            }}
            style={styles.resetButton}
          >
            <Text style={styles.resetButtonText}>Сбросить прогресс</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#140d0b",
  },
  container: {
    flexGrow: 1,
    padding: SCREEN_PADDING,
    backgroundColor: "#140d0b",
  },
  contentSection: {
    gap: 16,
    marginTop: 10,
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
