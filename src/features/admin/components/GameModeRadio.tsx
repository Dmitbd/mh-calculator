import { Pressable, StyleSheet, Text, View } from "react-native";

import type { DivinityGameMode } from "../types/admin.types";

const gameModeOptions: { id: DivinityGameMode; label: string }[] = [
  { id: "pvp", label: "PvP" },
  { id: "pve", label: "PvE" },
];

type GameModeRadioProps = {
  value: DivinityGameMode;
  onChange: (mode: DivinityGameMode) => void;
};

/** Выбор режима игры (PvP / PvE) */
export function GameModeRadio({ value, onChange }: GameModeRadioProps) {
  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>Режим</Text>
      <View style={styles.options}>
        {gameModeOptions.map((option) => {
          const selected = option.id === value;

          return (
            <Pressable
              accessibilityLabel={`Select ${option.label} mode`}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              key={option.id}
              onPress={() => onChange(option.id)}
              style={[styles.option, selected && styles.optionSelected]}
            >
              <View style={[styles.indicator, selected && styles.indicatorSelected]} />
              <Text style={[styles.optionText, selected && styles.optionTextSelected]}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 8,
  },
  label: {
    color: "#d6c2a4",
    fontSize: 13,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  options: {
    flexDirection: "row",
    gap: 10,
  },
  option: {
    flex: 1,
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#644932",
    backgroundColor: "#241610",
    paddingHorizontal: 14,
  },
  optionSelected: {
    borderColor: "#f0c36a",
    backgroundColor: "#3a2415",
  },
  indicator: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "#917968",
    backgroundColor: "#1c110d",
  },
  indicatorSelected: {
    borderColor: "#f0c36a",
    backgroundColor: "#f0c36a",
  },
  optionText: {
    color: "#d8c4a8",
    fontSize: 15,
    fontWeight: "700",
  },
  optionTextSelected: {
    color: "#fff6df",
  },
});
