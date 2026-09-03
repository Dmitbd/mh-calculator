import { Pressable, StyleSheet, Text, View } from "react-native";

import type {
  WeaponAwakeningColor,
  WeaponAwakeningColorId,
  WeaponAwakeningSlot,
} from "@/features/game-data/weapon-awakening/types";
import { AppImage } from "@/shared/ui/AppImage";
import { builderTheme } from "./builderTheme";

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
      <View style={styles.header}>
        <Text style={styles.title}>Пробуждение оружия</Text>
        {description ? (
          <Text style={styles.description}>{description}</Text>
        ) : null}
      </View>
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
            <AppImage
              accessible={false}
              accessibilityLabel={`${color.label} — цвет пробуждения оружия`}
              borderRadius={999}
              height="100%"
              source={color.icon}
              testID={`weapon-awakening-slot-icon-${slot.slot}`}
              width="100%"
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
    gap: builderTheme.spacing.sectionContentGap,
  },
  header: {
    gap: builderTheme.spacing.titleDescriptionGap,
  },
  title: {
    ...builderTheme.text.sectionTitle,
  },
  description: {
    ...builderTheme.text.sectionDescription,
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
  circleEmpty: {
    backgroundColor: "#1c110d",
    borderColor: "#644932",
  },
});
