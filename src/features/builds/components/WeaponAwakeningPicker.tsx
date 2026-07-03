import { Image, Pressable, StyleSheet, Text, View } from "react-native";

import type {
  WeaponAwakeningColor,
  WeaponAwakeningColorId,
  WeaponAwakeningSlot,
} from "@/features/game-data/weapon-awakening/types";
import { resolveAssetUri } from "@/shared/lib/resolveAssetUri";

type WeaponAwakeningPickerProps = {
  colors: readonly WeaponAwakeningColor[];
  description?: string;
  slots: readonly WeaponAwakeningSlot[];
  selections: Partial<Record<number, WeaponAwakeningColorId>>;
  onCycleSlot?: (slot: number) => void;
  /** Режим только для чтения — кружки без переключения цвета */
  readOnly?: boolean;
};

/** Пробуждение оружия: 8 кружков с выбором цвета по клику */
export function WeaponAwakeningPicker({
  colors,
  description,
  slots,
  selections,
  onCycleSlot,
  readOnly = false,
}: WeaponAwakeningPickerProps) {
  const colorsById = new Map(colors.map((color) => [color.id, color]));

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>Пробуждение оружия</Text>
      {description ? (
        <Text style={styles.description}>{description}</Text>
      ) : null}
      <View style={styles.row}>
        {slots.map((slot) => {
          const colorId = selections[slot.slot] ?? null;
          const color = colorId ? colorsById.get(colorId) : null;
          const circleStyle = [
            styles.circle,
            color
              ? [
                  styles.circleFilled,
                  color.icon ? null : { backgroundColor: color.color },
                ]
              : styles.circleEmpty,
          ];
          const accessibilityLabel = `Weapon awakening slot ${slot.slot}${
            color ? `, ${color.label}` : ", empty"
          }`;
          const content = color?.icon ? (
            <Image
              accessibilityIgnoresInvertColors
              source={{ uri: resolveAssetUri(color.icon) }}
              style={styles.circleIcon}
            />
          ) : null;

          if (readOnly) {
            return (
              <View
                accessibilityLabel={accessibilityLabel}
                key={slot.slot}
                style={circleStyle}
              >
                {content}
              </View>
            );
          }

          return (
            <Pressable
              accessibilityLabel={accessibilityLabel}
              accessibilityRole="button"
              key={slot.slot}
              onPress={() => onCycleSlot?.(slot.slot)}
              style={circleStyle}
            >
              {content}
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
  description: {
    color: "#917968",
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  circle: {
    flex: 1,
    alignItems: "center",
    aspectRatio: 1,
    justifyContent: "center",
    maxWidth: 44,
    borderRadius: 999,
    borderWidth: 2,
    overflow: "hidden",
  },
  circleFilled: {
    borderColor: "#644932",
  },
  circleIcon: {
    width: "100%",
    height: "100%",
  },
  circleEmpty: {
    backgroundColor: "#1c110d",
    borderColor: "#644932",
  },
});
