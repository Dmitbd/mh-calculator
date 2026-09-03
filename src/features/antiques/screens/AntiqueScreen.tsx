import { router } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { InstructionButton } from "@/shared/ui/InstructionButton";
import { ScreenHeader, SCREEN_HEADER_HEIGHT } from "@/shared/ui/ScreenHeader";

import { AntiqueCashback } from "../components/AntiqueCashback";
import { AntiqueCashbackToggle } from "../components/AntiqueCashbackToggle";
import { AntiqueCoinAllocation } from "../components/AntiqueCoinAllocation";
import { AntiqueOwnedCards } from "../components/AntiqueOwnedCards";
import { AntiqueRewardTrack } from "../components/AntiqueRewardTrack";
import { AntiqueScoreProgress } from "../components/AntiqueScoreProgress";
import { AntiqueSummary } from "../components/AntiqueSummary";
import { useAntiqueCalculator } from "../hooks/useAntiqueCalculator";
import { calculateAntiqueRivalry } from "../model/calculateAntiqueRivalry";

const SCREEN_PADDING = 24;

export default function AntiqueScreen() {
  const { top, bottom } = useSafeAreaInsets();
  const {
    input,
    isLoaded,
    storageError,
    setCoins,
    setOwnedTombMaps,
    setOwnedTempleMaps,
    setIncludeCashback,
    convertOneToTemple,
    convertOneToTombs,
    reset,
  } = useAntiqueCalculator();
  const result = calculateAntiqueRivalry(input);

  if (!isLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Загрузка расчёта...</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Антиквариат" fallbackHref="/" />
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
            accessibilityLabel="Открыть инструкцию по антиквариату"
            onPress={() => router.push("/antiques/manual")}
          />
          {storageError ? (
            <View accessibilityRole="alert" style={styles.storageWarning}>
              <Text style={styles.storageWarningText}>{storageError}</Text>
            </View>
          ) : null}
          <AntiqueSummary />
          <AntiqueCoinAllocation
            allocation={result.allocation}
            canConvertToTemple={result.allocation.tombMaps >= 2}
            canConvertToTombs={result.allocation.templeMaps > 0}
            coins={input.coins}
            onChangeCoins={(value) => {
              void setCoins(value);
            }}
            onConvertToTemple={() => {
              void convertOneToTemple();
            }}
            onConvertToTombs={() => {
              void convertOneToTombs();
            }}
          />
          <AntiqueOwnedCards
            ownedTempleMaps={input.ownedTempleMaps}
            ownedTombMaps={input.ownedTombMaps}
            onChangeOwnedTempleMaps={(value) => {
              void setOwnedTempleMaps(value);
            }}
            onChangeOwnedTombMaps={(value) => {
              void setOwnedTombMaps(value);
            }}
          />
          <AntiqueCashbackToggle
            checked={input.includeCashback}
            onChange={(checked) => {
              void setIncludeCashback(checked);
            }}
          />
          <AntiqueScoreProgress totalScore={result.totalScore} />
          <AntiqueRewardTrack
            openedNodes={result.openedNodes}
            totalScore={result.totalScore}
          />
          <AntiqueCashback cashback={result.cashback} />
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
