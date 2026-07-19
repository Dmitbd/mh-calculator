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

const SCREEN_PADDING = 24;
const HEADER_HEIGHT = 76;

function DivinityHeader({ topInset }: { topInset: number }) {
  return (
    <View
      style={[
        styles.headerShell,
        {
          paddingTop: topInset,
          height: HEADER_HEIGHT + topInset,
        },
      ]}
    >
      <View style={styles.headerRow}>
        <Pressable
          accessibilityLabel="Назад"
          accessibilityRole="button"
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
              return;
            }

            router.replace("/");
          }}
          style={styles.backButton}
        >
          <Text style={styles.backArrow}>‹</Text>
        </Pressable>
        <Text numberOfLines={1} style={styles.headerTitle}>
          Божественность
        </Text>
        <View style={styles.backButtonPlaceholder} />
      </View>
    </View>
  );
}

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
    incrementChest,
    decrementChest,
    incrementGem,
    decrementGem,
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
      <DivinityHeader topInset={top} />
      <ScrollView
        contentContainerStyle={[
          styles.container,
          {
            paddingTop: HEADER_HEIGHT + top,
            paddingBottom: SCREEN_PADDING + bottom,
          },
        ]}
      >
        <View style={styles.contentSection}>
          <Pressable
            accessibilityLabel="Открыть инструкцию"
            accessibilityRole="button"
            onPress={() => router.push("/divinity/manual")}
            style={styles.instructionButton}
          >
            <View style={styles.instructionIcon}>
              <Text style={styles.instructionIconText}>?</Text>
            </View>
            <Text style={styles.instructionButtonText}>Инструкция</Text>
          </Pressable>
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
            onIncrementChest={(chestId) => {
              void incrementChest(chestId);
            }}
            onDecrementChest={(chestId) => {
              void decrementChest(chestId);
            }}
            onIncrementGem={(level) => {
              void incrementGem(level);
            }}
            onDecrementGem={(level) => {
              void decrementGem(level);
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
  headerShell: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    backgroundColor: "#140d0b",
    paddingHorizontal: SCREEN_PADDING,
  },
  headerRow: {
    height: HEADER_HEIGHT,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#140d0b",
  },
  backButton: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  backButtonPlaceholder: {
    width: 32,
    height: 32,
  },
  backArrow: {
    fontSize: 34,
    lineHeight: 34,
    fontWeight: "900",
    color: "#f3d38a",
  },
  contentSection: {
    gap: 16,
    marginTop: 10,
  },
  instructionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: "#734227",
    borderRadius: 18,
    backgroundColor: "#2a160e",
    paddingVertical: 14,
    paddingHorizontal: 18,
  },
  instructionIcon: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    backgroundColor: "#5a321c",
  },
  instructionIconText: {
    fontSize: 18,
    fontWeight: "900",
    color: "#fff3d1",
  },
  instructionButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#ffd8b0",
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 30,
    fontWeight: "900",
    letterSpacing: 0.2,
    color: "#f3d38a",
    textShadowColor: "rgba(56, 25, 8, 0.9)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
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
