import { StyleSheet, View } from "react-native";

import {
  WeaponAwakeningBonusList,
  WeaponAwakeningPicker,
} from "@/features/builds";
import {
  weaponAwakeningColors,
  weaponAwakeningSlots,
} from "@/features/game-data/weapon-awakening";
import type { WeaponAwakeningActiveBonus } from "@/features/game-data/weapon-awakening";
import type { BranchBuildViewModel } from "../../utils/mapBuildToView";

type HeroBuildWeaponAwakeningSectionProps = {
  bonuses: readonly WeaponAwakeningActiveBonus[];
  selections: BranchBuildViewModel["weaponAwakeningSelections"];
};

export function HeroBuildWeaponAwakeningSection({
  bonuses,
  selections,
}: HeroBuildWeaponAwakeningSectionProps) {
  return (
    <View style={styles.wrapper}>
      <WeaponAwakeningPicker
        colors={weaponAwakeningColors}
        readOnly
        selections={selections}
        slots={weaponAwakeningSlots}
      />
      <WeaponAwakeningBonusList
        bonuses={bonuses}
        colors={weaponAwakeningColors}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: "100%",
    gap: 12,
  },
});
