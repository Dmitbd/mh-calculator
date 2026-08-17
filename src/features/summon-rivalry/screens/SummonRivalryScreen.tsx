import { router } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { InstructionButton } from "@/shared/ui/InstructionButton";
import { ScreenHeader, SCREEN_HEADER_HEIGHT } from "@/shared/ui/ScreenHeader";

import { SummonCashback } from "../components/SummonCashback";
import { SummonCashbackToggle } from "../components/SummonCashbackToggle";
import { SummonDiamondExchange } from "../components/SummonDiamondExchange";
import { SummonOwnedResources } from "../components/SummonOwnedResources";
import { SummonRewardTrack } from "../components/SummonRewardTrack";
import { SummonScoreProgress } from "../components/SummonScoreProgress";
import { SummonRivalrySummary } from "../components/SummonRivalrySummary";
import { useSummonRivalryCalculator } from "../hooks/useSummonRivalryCalculator";
import { calculateSummonRivalry } from "../model/calculateSummonRivalry";

const SCREEN_PADDING = 24;

export default function SummonRivalryScreen() {
  const { top, bottom } = useSafeAreaInsets();
  const {
    input,
    isLoaded,
    storageError,
    setOwnedCommonScrolls,
    setOwnedLimitedScrolls,
    setOwnedFactionScrolls,
    setOwnedFateCrystals,
    incrementPurchase,
    decrementPurchase,
    setIncludeCashback,
    reset,
  } = useSummonRivalryCalculator();
  const result = calculateSummonRivalry(input);

  if (!isLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Загрузка расчёта...</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Призыв" fallbackHref="/" />
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
            accessibilityLabel="Открыть инструкцию по призыву"
            onPress={() => router.push("/summon-rivalry/manual")}
          />
          <SummonRivalrySummary />
          {storageError ? (
            <View
              accessible
              accessibilityRole="alert"
              style={styles.storageWarning}
            >
              <Text style={styles.storageWarningText}>{storageError}</Text>
            </View>
          ) : null}
          <SummonOwnedResources
            ownedCommonScrolls={input.ownedCommonScrolls}
            ownedLimitedScrolls={input.ownedLimitedScrolls}
            ownedFactionScrolls={input.ownedFactionScrolls}
            ownedFateCrystals={input.ownedFateCrystals}
            onChangeOwnedCommonScrolls={(value) => {
              void setOwnedCommonScrolls(value);
            }}
            onChangeOwnedLimitedScrolls={(value) => {
              void setOwnedLimitedScrolls(value);
            }}
            onChangeOwnedFactionScrolls={(value) => {
              void setOwnedFactionScrolls(value);
            }}
            onChangeOwnedFateCrystals={(value) => {
              void setOwnedFateCrystals(value);
            }}
          />
          <SummonDiamondExchange
            commonScrolls={input.purchasedCommonScrolls}
            limitedScrolls={input.purchasedLimitedScrolls}
            fateCrystals={input.purchasedFateCrystals}
            costs={result.purchaseCosts}
            onDecrementCommonScrolls={() => {
              void decrementPurchase("purchasedCommonScrolls");
            }}
            onIncrementCommonScrolls={() => {
              void incrementPurchase("purchasedCommonScrolls");
            }}
            onDecrementLimitedScrolls={() => {
              void decrementPurchase("purchasedLimitedScrolls");
            }}
            onIncrementLimitedScrolls={() => {
              void incrementPurchase("purchasedLimitedScrolls");
            }}
            onDecrementFateCrystals={() => {
              void decrementPurchase("purchasedFateCrystals");
            }}
            onIncrementFateCrystals={() => {
              void incrementPurchase("purchasedFateCrystals");
            }}
          />
          <SummonCashbackToggle
            checked={input.includeCashback}
            onChange={(checked) => {
              void setIncludeCashback(checked);
            }}
          />
          <SummonScoreProgress totalScore={result.totalScore} />
          <SummonRewardTrack
            openedNodes={result.openedNodes}
            totalScore={result.totalScore}
          />
          <SummonCashback cashback={result.cashback} />
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              void reset();
            }}
            style={styles.resetButton}
          >
            <Text style={styles.resetButtonText}>Сбросить расчёт</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#140d0b" },
  container: {
    flexGrow: 1,
    padding: SCREEN_PADDING,
    backgroundColor: "#140d0b",
  },
  contentSection: { gap: 16, marginTop: 10 },
  storageWarning: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#9b642f",
    backgroundColor: "#3a2114",
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  storageWarningText: {
    color: "#ffd8b0",
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "700",
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: SCREEN_PADDING,
    backgroundColor: "#140d0b",
  },
  loadingText: { fontSize: 16, color: "#d7c19a" },
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
