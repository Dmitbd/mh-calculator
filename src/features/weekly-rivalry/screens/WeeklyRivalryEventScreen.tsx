import { router, type Href } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { WeeklyRivalryEventConfig } from "@/features/game-data/weekly-rivalry";
import { InstructionButton } from "@/shared/ui/InstructionButton";
import { SCREEN_HEADER_HEIGHT, ScreenHeader } from "@/shared/ui/ScreenHeader";

import { WeeklyRivalryCompetitionSection } from "../components/WeeklyRivalryCompetitionSection";
import { WeeklyRivalryQuestZone } from "../components/WeeklyRivalryQuestZone";
import { WeeklyRivalryResourceSection } from "../components/WeeklyRivalryResourceSection";
import { useWeeklyRivalryCalculator } from "../hooks/useWeeklyRivalryCalculator";

const SCREEN_PADDING = 24;

type WeeklyRivalryEventScreenProps = {
  config: WeeklyRivalryEventConfig;
  manualRoute: Href;
};

export function WeeklyRivalryEventScreen({
  config,
  manualRoute,
}: WeeklyRivalryEventScreenProps) {
  const { top, bottom } = useSafeAreaInsets();
  const calculator = useWeeklyRivalryCalculator(config);

  if (!calculator.isLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Загрузка расчёта...</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScreenHeader title={config.title} fallbackHref="/" />
      <ScrollView
        contentContainerStyle={[
          styles.container,
          {
            paddingTop: SCREEN_HEADER_HEIGHT + top,
            paddingBottom: SCREEN_PADDING + bottom,
          },
        ]}
      >
        <View style={styles.content}>
          <InstructionButton
            accessibilityLabel={`Открыть инструкцию по событию ${config.title}`}
            onPress={() => router.push(manualRoute)}
          />
          <Text style={styles.calculatorTitle}>
            Калькулятор событий {config.title.toLocaleLowerCase("ru")}
          </Text>
          {calculator.storageError ? (
            <View
              accessible
              accessibilityRole="alert"
              style={styles.storageWarning}
            >
              <Text style={styles.storageWarningText}>
                {calculator.storageError}
              </Text>
            </View>
          ) : null}
          <WeeklyRivalryResourceSection
            config={config}
            input={calculator.input}
            onChangeSharedCashback={(checked) => {
              void calculator.setIncludeSharedCashback(checked);
            }}
            onChangeSpendResource={(value) => {
              void calculator.setOwnedSpendResource(value);
            }}
            onChangeWeeklyEventChests={(value) => {
              void calculator.setOwnedWeeklyEventChests(value);
            }}
          />
          <WeeklyRivalryCompetitionSection
            config={config}
            input={calculator.input}
            onChangeChestCashback={(checked) => {
              void calculator.setIncludeWeeklyEventChestCashback(checked);
            }}
            onChangeRivalryCashback={(checked) => {
              void calculator.setIncludeRivalryCashback(checked);
            }}
            progress={calculator.rivalryProgress}
          />
          <WeeklyRivalryQuestZone
            config={config}
            input={calculator.input}
            onChangeQuestCashback={(checked) => {
              void calculator.setIncludeQuestCashback(checked);
            }}
            progress={calculator.questProgress}
          />
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              void calculator.reset();
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
  content: { gap: 16, marginTop: 10 },
  calculatorTitle: {
    color: "#fff3d1",
    fontSize: 22,
    fontWeight: "800",
    textAlign: "center",
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
  loadingText: { color: "#d7c19a", fontSize: 16 },
  resetButton: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#734227",
    backgroundColor: "#2a160e",
    paddingVertical: 16,
  },
  resetButtonText: {
    color: "#ffd8b0",
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
  },
});
