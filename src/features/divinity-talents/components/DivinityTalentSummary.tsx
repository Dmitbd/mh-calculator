import { memo } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";

import type { DivinityTalentConfig } from "@/features/game-data/divinity-talents";

import type { DivinityTalentRequiredResources } from "../model/types";
import {
  DivinityTalentResourceIcon,
  type DivinityTalentResourceMetadata,
} from "./DivinityTalentResourceIcon";

type DivinityTalentSummaryProps = {
  config: DivinityTalentConfig;
  resources: DivinityTalentRequiredResources;
};

type SummaryMetric = {
  readonly key: string;
  readonly resource: DivinityTalentResourceMetadata;
  readonly value: number;
};

export function DivinityTalentSummary({
  config,
  resources,
}: DivinityTalentSummaryProps) {
  const metrics: readonly SummaryMetric[] = [
    {
      key: "faith",
      resource: config.resources.faith,
      value: resources.faith,
    },
    {
      key: "inherited",
      resource: config.resources.inheritedDivinity,
      value: resources.inheritedDivinity,
    },
    {
      key: "resonance",
      resource: config.resources.resonanceStone,
      value: resources.resonanceStone,
    },
  ];

  return (
    <View style={styles.card}>
      <View style={styles.titleRow}>
        <Text style={styles.title}>Расход ресурсов</Text>
        <Text
          accessibilityLabel={`Выбрано нод: ${resources.selectedNodeCount}`}
          style={styles.nodeCount}
        >
          Нод: {resources.selectedNodeCount}
        </Text>
      </View>
      <View
        testID="divinity-talent-summary-resource-list"
        style={styles.resourceList}
      >
        {metrics.map((metric) => (
          <SummaryMetricView key={metric.key} metric={metric} />
        ))}
      </View>
    </View>
  );
}

const decorativeChildrenAccessibility = {
  accessible: false,
  accessibilityElementsHidden: Platform.OS === "ios" ? true : undefined,
  importantForAccessibility:
    Platform.OS === "android" ? ("no-hide-descendants" as const) : undefined,
  "aria-hidden": Platform.OS === "web" ? true : undefined,
} as const;

const SummaryMetricView = memo(function SummaryMetricView({
  metric,
}: {
  readonly metric: SummaryMetric;
}) {
  return (
    <View
      accessible
      accessibilityLabel={`Требуется ${metric.resource.label}: ${metric.value}`}
      accessibilityRole="text"
      testID={`divinity-talent-summary-row-${metric.key}`}
      style={styles.metric}
    >
      <Text accessible={false} style={[styles.metricText, styles.metricLabel]}>
        {metric.resource.label}
      </Text>
      <View style={styles.metricCost}>
        <View {...decorativeChildrenAccessibility}>
          <DivinityTalentResourceIcon
            accessible={false}
            resource={metric.resource}
            size={26}
            testID={`divinity-talent-summary-icon-${metric.key}`}
          />
        </View>
        <Text accessible={false} style={styles.metricText}>
          :
        </Text>
        <Text accessible={false} style={styles.metricText}>
          {metric.value}
        </Text>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    width: "100%",
    borderRadius: 24,
    backgroundColor: "#2a160e",
    padding: 20,
    gap: 14,
    borderWidth: 1,
    borderColor: "#734227",
  },
  titleRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: 8,
  },
  title: {
    color: "#fff3d1",
    fontSize: 22,
    fontWeight: "800",
  },
  nodeCount: {
    color: "#e9c46a",
    fontSize: 14,
    fontWeight: "800",
  },
  resourceList: {
    width: "100%",
    gap: 10,
  },
  metric: {
    width: "100%",
    flexDirection: "column",
    alignItems: "center",
    gap: 10,
    borderRadius: 14,
    backgroundColor: "#3b2114",
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  metricCost: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  metricLabel: {
    alignSelf: "stretch",
    textAlign: "center",
  },
  metricText: {
    color: "#fff8e7",
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "700",
  },
});
