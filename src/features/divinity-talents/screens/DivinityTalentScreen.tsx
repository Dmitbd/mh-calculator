import { router } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { divinityTalentConfig } from "@/features/game-data/divinity-talents";
import { InstructionButton } from "@/shared/ui/InstructionButton";
import { ScreenHeader, SCREEN_HEADER_HEIGHT } from "@/shared/ui/ScreenHeader";

import { DivinityTalentSummary } from "../components/DivinityTalentSummary";
import { DivinityTalentTree } from "../components/DivinityTalentTree";
import { useDivinityTalentCalculator } from "../hooks/useDivinityTalentCalculator";

const SCREEN_PADDING = 24;

export default function DivinityTalentScreen() {
  const { top, bottom } = useSafeAreaInsets();
  const {
    selections,
    requiredResources,
    isLoaded,
    storageError,
    selectNode,
    reset,
  } = useDivinityTalentCalculator();

  if (!isLoaded) {
    return (
      <View style={styles.screen}>
        <ScreenHeader
          fallbackHref="/"
          title="Дерево навыков"
        />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Загрузка расчёта...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScreenHeader
        fallbackHref="/"
        title="Дерево навыков"
      />
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
            accessibilityLabel="Открыть инструкцию по талантам божественности"
            onPress={() => router.push("/divinity-talents/manual")}
          />
          <Text style={styles.hint}>
            В каждой нужной ветке выберите начало и конец пути.
          </Text>
          {storageError ? (
            <View
              accessible
              accessibilityRole="alert"
              style={styles.storageWarning}
            >
              <Text style={styles.storageWarningText}>{storageError}</Text>
            </View>
          ) : null}
          <DivinityTalentTree
            config={divinityTalentConfig}
            onSelectNode={selectNode}
            selections={selections}
          />
          <DivinityTalentSummary
            config={divinityTalentConfig}
            resources={requiredResources}
          />
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
  hint: {
    color: "#d7c19a",
    fontSize: 16,
    lineHeight: 24,
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
    color: "#d7c19a",
    fontSize: 16,
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
    color: "#ffd8b0",
    fontSize: 16,
    fontWeight: "700",
  },
});
