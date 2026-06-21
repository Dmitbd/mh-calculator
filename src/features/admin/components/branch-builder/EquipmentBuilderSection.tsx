import { StyleSheet, View } from "react-native";

import type { EquipmentOption } from "@/features/game-data/equipment/types";

import { EquipmentVariantBuilder } from "../EquipmentVariantBuilder";

type EquipmentBuilderSectionProps = {
  artifacts: readonly EquipmentOption[];
  onAddArtifact: (id: string) => void;
  onAddRune: (id: string) => void;
  onRemoveArtifact: (id: string) => void;
  onRemoveRune: (id: string) => void;
  runes: readonly EquipmentOption[];
  selectedArtifactIds: readonly string[];
  selectedRuneIds: readonly string[];
};

export function EquipmentBuilderSection({
  artifacts,
  onAddArtifact,
  onAddRune,
  onRemoveArtifact,
  onRemoveRune,
  runes,
  selectedArtifactIds,
  selectedRuneIds,
}: EquipmentBuilderSectionProps) {
  return (
    <View style={styles.wrapper}>
      <EquipmentVariantBuilder
        addLabel="Добавить оружие"
        label="Оружие"
        onAdd={onAddArtifact}
        onRemove={onRemoveArtifact}
        options={artifacts}
        selectedIds={selectedArtifactIds}
      />

      <EquipmentVariantBuilder
        addLabel="Добавить руну"
        label="Руны"
        onAdd={onAddRune}
        onRemove={onRemoveRune}
        options={runes}
        selectedIds={selectedRuneIds}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 32,
  },
});
