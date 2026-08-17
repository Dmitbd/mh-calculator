import { StyleSheet, Text, View } from "react-native";

import { summonRivalryResourceCatalog } from "@/features/game-data/summon-rivalry";

import type { SummonCashback as SummonCashbackValue } from "../model/types";
import { SummonResourceIcon } from "./SummonResourceIcon";

type SummonCashbackProps = {
  cashback: SummonCashbackValue;
};

export function SummonCashback({ cashback }: SummonCashbackProps) {
  const resources = [
    {
      resource: summonRivalryResourceCatalog.commonScroll,
      value: cashback.commonScrolls,
    },
    {
      resource: summonRivalryResourceCatalog.fateCrystal,
      value: cashback.fateCrystals,
    },
    {
      resource: summonRivalryResourceCatalog.ssrHeroFragment,
      value: cashback.ssrFragments,
    },
    {
      resource: summonRivalryResourceCatalog.urHeroFragment,
      value: cashback.urFragments,
    },
  ];

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Кешбэк</Text>
      <Text style={styles.description}>Ресурсы из открытых сундуков</Text>
      <View style={styles.grid}>
        {resources.map(({ resource, value }) => (
          <View
            key={resource.kind}
            accessible
            accessibilityLabel={`Кешбэк — ${resource.label}: ${value}`}
            style={styles.resource}
          >
            <SummonResourceIcon resource={resource} size={42} />
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
