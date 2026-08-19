import { Pressable, StyleSheet, Text, View } from "react-native";

import type { WeeklyRivalryReward } from "@/features/game-data/weekly-rivalry";

import { WeeklyRivalryResourceIcon } from "./WeeklyRivalryResourceIcon";

type WeeklyRivalryToggleProps = {
  checked: boolean;
  label: string;
  description?: string;
  icon?: WeeklyRivalryReward;
  onChange: (checked: boolean) => void;
};

export function WeeklyRivalryToggle({
  checked,
  label,
  description,
  icon,
  onChange,
}: WeeklyRivalryToggleProps) {
  return (
    <Pressable
      accessibilityHint={description}
      accessibilityLabel={label}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      onPress={() => onChange(!checked)}
      style={({ pressed }) => [styles.container, pressed && styles.pressed]}
    >
      <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
        {checked ? <Text style={styles.checkmark}>✓</Text> : null}
      </View>
      {icon ? <WeeklyRivalryResourceIcon resource={icon} size={38} /> : null}
      <View style={styles.copy}>
        <Text style={styles.label}>{label}</Text>
        {description ? (
          <Text style={styles.description}>{description}</Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#734227",
    backgroundColor: "#2a160e",
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  pressed: { opacity: 0.8 },
  checkbox: {
    width: 22,
    height: 22,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 5,
    borderWidth: 2,
    borderColor: "#a87943",
    backgroundColor: "#1d110d",
  },
  checkboxChecked: { borderColor: "#64d66f", backgroundColor: "#2d873c" },
  checkmark: { color: "#fff", fontSize: 16, fontWeight: "900", lineHeight: 18 },
  copy: { minWidth: 0, flex: 1, gap: 3 },
  label: { color: "#f4ddb0", fontSize: 15, fontWeight: "700" },
  description: { color: "#bea17b", fontSize: 12, lineHeight: 17 },
});
