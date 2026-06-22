import { StyleSheet, View } from "react-native";

import type { EquipmentOption } from "@/features/game-data/equipment/types";

import { EquipmentVariantBuilder } from "../EquipmentVariantBuilder";
import { ValidationErrorMessages } from "../ValidationErrorMessages";

type EquipmentBuilderSectionProps = {
  artifactErrors: readonly string[];
  artifacts: readonly EquipmentOption[];
  onAddArtifact: (id: string) => void;
  onAddRune: (id: string) => void;
  onRemoveArtifact: (id: string) => void;
  onRemoveRune: (id: string) => void;
  runeErrors: readonly string[];
  runes: readonly EquipmentOption[];
  selectedArtifactIds: readonly string[];
  selectedRuneIds: readonly string[];
};

export function EquipmentBuilderSection({
  artifactErrors,
  artifacts,
  onAddArtifact,
  onAddRune,
  onRemoveArtifact,
  onRemoveRune,
  runeErrors,
  runes,
  selectedArtifactIds,
  selectedRuneIds,
}: EquipmentBuilderSectionProps) {
  return (
    <View style={styles.wrapper}>
      <View style={styles.field}>
        <EquipmentVariantBuilder
          addLabel="Добавить оружие"
          label="Оружие"
          onAdd={onAddArtifact}
          onRemove={onRemoveArtifact}
          options={artifacts}
          selectedIds={selectedArtifactIds}
        />
        <ValidationErrorMessages messages={artifactErrors} />
      </View>

      <View style={styles.field}>
        <EquipmentVariantBuilder
          addLabel="Добавить руну"
          label="Руны"
          onAdd={onAddRune}
          onRemove={onRemoveRune}
          options={runes}
          selectedIds={selectedRuneIds}
        />
        <ValidationErrorMessages messages={runeErrors} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 32,
  },
  field: {
    gap: 8,
  },
});
