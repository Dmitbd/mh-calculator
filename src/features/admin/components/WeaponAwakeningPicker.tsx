import { Pressable, StyleSheet, Text, View } from "react-native";

import type {
  WeaponAwakeningColor,
  WeaponAwakeningColorId,
  WeaponAwakeningSlot,
} from "../types/admin.types";

type WeaponAwakeningPickerProps = {
  colors: readonly WeaponAwakeningColor[];
  slots: readonly WeaponAwakeningSlot[];
  selections: Partial<Record<number, WeaponAwakeningColorId>>;
  onCycleSlot: (slot: number) => void;
};

/** Пробуждение оружия: 8 кружков с выбором цвета по клику */
export function WeaponAwakeningPicker({
  colors,
  slots,
  selections,
  onCycleSlot,
}: WeaponAwakeningPickerProps) {
  const colorsById = new Map(colors.map((color) => [color.id, color]));

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>Пробуждение оружия</Text>
      <View style={styles.row}>
        {slots.map((slot) => {
          const colorId = selections[slot.slot] ?? null;
          const color = colorId ? colorsById.get(colorId) : null;

          return (
            <Pressable
              accessibilityLabel={`Weapon awakening slot ${slot.slot}${
                color ? `, ${color.label}` : ", empty"
              }`}
              accessibilityRole="button"
              key={slot.slot}
              onPress={() => onCycleSlot(slot.slot)}
              style={[
                styles.circle,
                color ? { backgroundColor: color.color, borderColor: color.color } : styles.circleEmpty,
              ]}
            />
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
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  circle: {
    flex: 1,
    aspectRatio: 1,
    maxWidth: 44,
    borderRadius: 999,
    borderWidth: 2,
  },
  circleEmpty: {
    backgroundColor: "#1c110d",
    borderColor: "#644932",
  },
});
