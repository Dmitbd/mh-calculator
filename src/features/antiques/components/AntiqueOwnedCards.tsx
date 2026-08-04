import { StyleSheet, Text, TextInput, View } from "react-native";

import { antiqueResourceCatalog } from "@/features/game-data/antiques";

import { AntiqueResourceIcon } from "./AntiqueResourceIcon";

type AntiqueOwnedCardsProps = {
  ownedTempleMaps: number;
  ownedTombMaps: number;
  onChangeOwnedTempleMaps: (text: string) => void;
  onChangeOwnedTombMaps: (text: string) => void;
};

type OwnedCardFieldProps = {
  accessibilityLabel: string;
  value: number;
  resource:
    | typeof antiqueResourceCatalog.tombMap
    | typeof antiqueResourceCatalog.templeMap;
  onChangeText: (text: string) => void;
};

function OwnedCardField({
  accessibilityLabel,
  value,
  resource,
  onChangeText,
}: OwnedCardFieldProps) {
  return (
    <View style={styles.field}>
      <View style={styles.fieldHeader}>
        <AntiqueResourceIcon resource={resource} size={38} />
        <Text style={styles.fieldLabel}>{resource.label}</Text>
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

export function AntiqueOwnedCards({
  ownedTempleMaps,
  ownedTombMaps,
  onChangeOwnedTempleMaps,
  onChangeOwnedTombMaps,
}: AntiqueOwnedCardsProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>Мои карты</Text>
      <Text style={styles.description}>
        Добавьте карты, которые уже есть в инвентаре.
      </Text>
      <View style={styles.fields}>
        <OwnedCardField
          accessibilityLabel="Количество своих карт гробницы"
          resource={antiqueResourceCatalog.tombMap}
          value={ownedTombMaps}
          onChangeText={onChangeOwnedTombMaps}
        />
        <OwnedCardField
          accessibilityLabel="Количество своих карт храма"
          resource={antiqueResourceCatalog.templeMap}
          value={ownedTempleMaps}
          onChangeText={onChangeOwnedTempleMaps}
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
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  fieldLabel: {
    minWidth: 0,
    flexShrink: 1,
    color: "#f4ddb0",
    fontSize: 14,
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
