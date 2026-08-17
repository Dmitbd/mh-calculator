import { StyleSheet, Text, TextInput, View } from "react-native";

import {
  summonRivalryResourceCatalog,
  type SummonRivalryResourceMetadata,
} from "@/features/game-data/summon-rivalry";

import { SummonResourceIcon } from "./SummonResourceIcon";

type SummonOwnedResourcesProps = {
  ownedCommonScrolls: number;
  ownedLimitedScrolls: number;
  ownedFactionScrolls: number;
  ownedFateCrystals: number;
  onChangeOwnedCommonScrolls: (text: string) => void;
  onChangeOwnedLimitedScrolls: (text: string) => void;
  onChangeOwnedFactionScrolls: (text: string) => void;
  onChangeOwnedFateCrystals: (text: string) => void;
};

type ResourceFieldProps = {
  accessibilityLabel: string;
  value: number;
  resource: SummonRivalryResourceMetadata;
  onChangeText: (text: string) => void;
};

function ResourceField({
  accessibilityLabel,
  value,
  resource,
  onChangeText,
}: ResourceFieldProps) {
  return (
    <View style={styles.field}>
      <View style={styles.fieldHeader}>
        <SummonResourceIcon resource={resource} size={42} />
        <Text numberOfLines={2} style={styles.fieldLabel}>
          {resource.label}
        </Text>
      </View>
      <TextInput
        accessibilityLabel={accessibilityLabel}
        keyboardType="number-pad"
        onChangeText={onChangeText}
        selectTextOnFocus
        style={styles.input}
        value={String(value)}
      />
    </View>
  );
}

export function SummonOwnedResources({
  ownedCommonScrolls,
  ownedLimitedScrolls,
  ownedFactionScrolls,
  ownedFateCrystals,
  onChangeOwnedCommonScrolls,
  onChangeOwnedLimitedScrolls,
  onChangeOwnedFactionScrolls,
  onChangeOwnedFateCrystals,
}: SummonOwnedResourcesProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>Мои ресурсы</Text>
      <Text style={styles.description}>
        Укажите ресурсы, которые уже есть в инвентаре.
      </Text>
      <View style={styles.fields}>
        <ResourceField
          accessibilityLabel="Количество свитков обычного призыва"
          onChangeText={onChangeOwnedCommonScrolls}
          resource={summonRivalryResourceCatalog.commonScroll}
          value={ownedCommonScrolls}
        />
        <ResourceField
          accessibilityLabel="Количество свитков ограниченного призыва"
          onChangeText={onChangeOwnedLimitedScrolls}
          resource={summonRivalryResourceCatalog.limitedScroll}
          value={ownedLimitedScrolls}
        />
        <ResourceField
          accessibilityLabel="Количество свитков призыва фракции"
          onChangeText={onChangeOwnedFactionScrolls}
          resource={summonRivalryResourceCatalog.factionScroll}
          value={ownedFactionScrolls}
        />
        <ResourceField
          accessibilityLabel="Количество кристаллов судьбы"
          onChangeText={onChangeOwnedFateCrystals}
          resource={summonRivalryResourceCatalog.fateCrystal}
          value={ownedFateCrystals}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: "100%",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#734227",
    backgroundColor: "#2a160e",
    padding: 20,
    gap: 10,
  },
  title: {
    color: "#fff3d1",
    fontSize: 22,
    fontWeight: "800",
  },
  description: {
    color: "#bea17b",
    fontSize: 13,
    lineHeight: 19,
  },
  fields: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  field: {
    minWidth: 135,
    flex: 1,
    borderRadius: 16,
    backgroundColor: "#3b2114",
    padding: 12,
    gap: 10,
  },
  fieldHeader: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  fieldLabel: {
    minWidth: 0,
    flexShrink: 1,
    color: "#f4ddb0",
    fontSize: 13,
    fontWeight: "700",
  },
  input: {
    width: "100%",
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#75462a",
    backgroundColor: "#20120d",
    color: "#fff8e7",
    fontSize: 18,
    fontWeight: "700",
    paddingHorizontal: 12,
  },
});
