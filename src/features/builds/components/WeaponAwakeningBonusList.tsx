import { Image, StyleSheet, Text, View } from "react-native";

import type { WeaponAwakeningColor } from "@/features/game-data/weapon-awakening/types";
import type { WeaponAwakeningActiveBonus } from "@/features/game-data/weapon-awakening/types";
import { resolveAssetUri } from "@/shared/lib/resolveAssetUri";

type WeaponAwakeningBonusListProps = {
  /** Активные бонусы, вычисленные из выбранных цветов */
  bonuses: readonly WeaponAwakeningActiveBonus[];
  /** Справочник цветов для иконок и подписей */
  colors: readonly WeaponAwakeningColor[];
};

function getTierLabel(threshold: WeaponAwakeningActiveBonus["threshold"]): string {
  return `Бонус за ${threshold} ноды`;
}

/** Список активных бонусов пробуждения оружия по цветам нод */
export function WeaponAwakeningBonusList({
  bonuses,
  colors,
}: WeaponAwakeningBonusListProps) {
  if (bonuses.length === 0) {
    return null;
  }

  const colorsById = new Map(colors.map((color) => [color.id, color]));

  return (
    <View style={styles.wrapper}>
      <Text style={styles.title}>Активные бонусы цветов</Text>
      {bonuses.map((bonus) => {
        const color = colorsById.get(bonus.color);

        return (
          <View key={bonus.color} style={styles.row}>
            <View style={styles.metaRow}>
              {color?.icon ? (
                <Image
                  accessibilityIgnoresInvertColors
                  source={{ uri: resolveAssetUri(color.icon) }}
                  style={styles.icon}
                />
              ) : (
                <View
                  style={[
                    styles.iconFallback,
                    color ? { backgroundColor: color.color } : null,
                  ]}
                />
              )}
              <Text style={styles.metaText}>
                {color?.label ?? bonus.color} · {bonus.count}/8 ·{" "}
                {getTierLabel(bonus.threshold)}
              </Text>
            </View>
            <Text style={styles.description}>{bonus.description}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 10,
  },
  title: {
    color: "#d6c2a4",
    fontSize: 13,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  row: {
    gap: 4,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  icon: {
    width: 20,
    height: 20,
    borderRadius: 999,
  },
  iconFallback: {
    width: 20,
    height: 20,
    borderRadius: 999,
    backgroundColor: "#644932",
  },
  metaText: {
    flex: 1,
    color: "#d7c19a",
    fontSize: 13,
    fontWeight: "700",
  },
  description: {
    color: "#b9a48a",
    fontSize: 13,
    lineHeight: 18,
  },
});
