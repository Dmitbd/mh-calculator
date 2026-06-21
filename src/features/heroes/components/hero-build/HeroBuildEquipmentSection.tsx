import { StyleSheet, View } from "react-native";

import { EquipmentVariantTabs } from "@/features/builds";
import {
  equipmentArtifacts,
  equipmentRunes,
} from "@/features/game-data/equipment";

type HeroBuildEquipmentSectionProps = {
  artifactIds: readonly string[];
  runeIds: readonly string[];
};

export function HeroBuildEquipmentSection({
  artifactIds,
  runeIds,
}: HeroBuildEquipmentSectionProps) {
  return (
    <View style={styles.wrapper}>
      <EquipmentVariantTabs
        label="Оружие"
        options={equipmentArtifacts}
        selectedIds={artifactIds}
      />

      <EquipmentVariantTabs
        label="Руны"
        options={equipmentRunes}
        selectedIds={runeIds}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 32,
  },
});
