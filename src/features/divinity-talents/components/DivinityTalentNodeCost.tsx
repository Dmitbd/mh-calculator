import { memo } from "react";
import { StyleSheet, Text, View } from "react-native";

import type {
  DivinityTalentConfig,
  DivinityTalentNodeCost as DivinityTalentNodeCostValue,
} from "@/features/game-data/divinity-talents";

import {
  DivinityTalentResourceIcon,
  type DivinityTalentResourceMetadata,
} from "./DivinityTalentResourceIcon";

export type DivinityTalentNodeCostItem = {
  readonly key: string;
  readonly value: number;
  readonly resource: DivinityTalentResourceMetadata;
};

type DivinityTalentNodeCostProps = {
  config: DivinityTalentConfig;
  cost: DivinityTalentNodeCostValue;
  items?: readonly DivinityTalentNodeCostItem[];
  testIDPrefix: string;
};

export function getDivinityTalentNodeCostItems(
  config: DivinityTalentConfig,
  cost: DivinityTalentNodeCostValue,
): readonly DivinityTalentNodeCostItem[] {
  return [
    {
      key: "faith",
      value: cost.faith,
      resource: config.resources.faith,
    },
    {
      key: "inherited",
      value: cost.inheritedDivinity,
      resource: config.resources.inheritedDivinity,
    },
    {
      key: "resonance",
      value: cost.resonanceStone,
      resource: config.resources.resonanceStone,
    },
  ].filter((item) => item.value > 0);
}

export const DivinityTalentNodeCost = memo(function DivinityTalentNodeCost({
  config,
  cost,
  items: preparedItems,
  testIDPrefix,
}: DivinityTalentNodeCostProps) {
  const items = preparedItems ?? getDivinityTalentNodeCostItems(config, cost);

  return (
    <View style={styles.list} testID={`${testIDPrefix}-list`}>
      {items.map((item) => (
        <View
          key={item.key}
          style={styles.item}
          testID={`${testIDPrefix}-${item.key}`}
        >
          <DivinityTalentResourceIcon
            accessible={false}
            loadingMode="static"
            resource={item.resource}
            size={14}
            testID={`${testIDPrefix}-${item.key}-icon`}
          />
          <Text style={styles.value}>{item.value}</Text>
        </View>
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  list: {
    width: "100%",
    maxWidth: 106,
    minWidth: 0,
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  value: {
    color: "#fff4d7",
    fontSize: 10,
    fontWeight: "800",
    lineHeight: 14,
  },
});
