import { StyleSheet, Text, View } from "react-native";

import { WeaponAwakeningBonusList, WeaponAwakeningPicker } from "@/features/builds";
import type { Hero } from "@/features/game-data/heroes/types";
import type {
  WeaponAwakeningActiveBonus,
  WeaponAwakeningColor,
  WeaponAwakeningColorId,
  WeaponAwakeningSlot,
} from "@/features/game-data/weapon-awakening/types";

import { ValidationErrorMessages } from "../ValidationErrorMessages";

type WeaponAwakeningSectionProps = {
  bonuses: readonly WeaponAwakeningActiveBonus[];
  colors: readonly WeaponAwakeningColor[];
  errors: readonly string[];
  onCycleSlot: (slot: number) => void;
  selectedHero: Hero | null;
  selections: Partial<Record<number, WeaponAwakeningColorId>>;
  slots: readonly WeaponAwakeningSlot[];
};

export function WeaponAwakeningSection({
  bonuses,
  colors,
  errors,
  onCycleSlot,
  selectedHero,
  selections,
  slots,
}: WeaponAwakeningSectionProps) {
  const hasSelections = Object.keys(selections).length > 0;

  return (
    <View style={styles.wrapper}>
      <WeaponAwakeningPicker
        colors={colors}
        onCycleSlot={onCycleSlot}
        selections={selections}
        slots={slots}
      />
      <ValidationErrorMessages messages={errors} />
      <WeaponAwakeningBonusList bonuses={bonuses} colors={colors} />
      {!selectedHero && hasSelections ? (
        <Text style={styles.hint}>
          Выберите героя из списка, чтобы увидеть бонусы цветов.
        </Text>
      ) : null}
      {selectedHero && hasSelections && bonuses.length === 0 ? (
        <Text style={styles.hint}>
          Бонусы появятся, когда минимум 2 ноды будут одного цвета.
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: "100%",
    gap: 12,
  },
  hint: {
    color: "#917968",
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18,
  },
});
