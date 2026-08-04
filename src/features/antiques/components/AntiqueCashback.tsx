import { StyleSheet, Text, View } from "react-native";

import { antiqueResourceCatalog } from "@/features/game-data/antiques";

import type { AntiqueCashback as AntiqueCashbackValue } from "../model/types";
import { AntiqueResourceIcon } from "./AntiqueResourceIcon";

type AntiqueCashbackProps = {
  cashback: AntiqueCashbackValue;
};

export function AntiqueCashback({ cashback }: AntiqueCashbackProps) {
  const resources = [
    { resource: antiqueResourceCatalog.tombMap, value: cashback.tombMaps },
    { resource: antiqueResourceCatalog.templeMap, value: cashback.templeMaps },
    {
      resource: antiqueResourceCatalog.legendaryChestFragments,
      value: cashback.legendaryChestFragments,
    },
    {
      resource: antiqueResourceCatalog.mythicChestFragments,
      value: cashback.mythicChestFragments,
    },
  ];

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Кешбэк</Text>
      <Text style={styles.description}>
        Ресурсы из открытых узлов в текущем расчёте.
      </Text>
      <View style={styles.grid}>
        {resources.map(({ resource, value }) => (
          <View
            key={resource.kind}
            accessibilityLabel={`Кешбэк — ${resource.label}: ${value}`}
            style={styles.resource}
          >
            <AntiqueResourceIcon resource={resource} size={42} />
            <Text numberOfLines={2} style={styles.resourceLabel}>
              {resource.label}
            </Text>
            <Text style={styles.value}>{value}</Text>
          </View>
        ))}
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
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  resource: {
    minWidth: 128,
    flex: 1,
    alignItems: "center",
    borderRadius: 16,
    backgroundColor: "#3b2114",
    padding: 12,
    gap: 7,
  },
  resourceLabel: {
    minHeight: 34,
    color: "#d7c19a",
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 16,
    textAlign: "center",
  },
  value: {
    color: "#f0c36a",
    fontSize: 24,
    fontWeight: "800",
  },
});
