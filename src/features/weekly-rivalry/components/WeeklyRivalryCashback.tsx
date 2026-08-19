import { StyleSheet, Text, View } from "react-native";

import type { WeeklyRivalryReward } from "@/features/game-data/weekly-rivalry";

import type { AggregatedReward } from "../model/types";
import { WeeklyRivalryResourceIcon } from "./WeeklyRivalryResourceIcon";

type WeeklyRivalryCashbackProps = {
  title: string;
  resources: readonly WeeklyRivalryReward[];
  rewards: readonly AggregatedReward[];
};

export function WeeklyRivalryCashback({
  title,
  resources,
  rewards,
}: WeeklyRivalryCashbackProps) {
  const rewardAmounts = new Map(
    rewards.map((reward) => [reward.resourceId, reward.amount]),
  );

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>
        Все награды, полученные в этой зоне
      </Text>
      <View style={styles.grid}>
        {resources.map((resource) => {
          const value = rewardAmounts.get(resource.resourceId) ?? 0;
          return (
            <View
              key={resource.resourceId}
              accessible
              accessibilityLabel={`${title} — ${resource.name}: ${value}`}
              style={styles.resource}
            >
              <WeeklyRivalryResourceIcon resource={resource} size={42} />
              <Text numberOfLines={2} style={styles.resourceName}>
                {resource.name}
              </Text>
              <Text style={styles.amount}>{value}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: "100%",
    gap: 10,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#734227",
    backgroundColor: "#2a160e",
    padding: 20,
  },
  title: { color: "#fff3d1", fontSize: 22, fontWeight: "800" },
  description: { color: "#bea17b", fontSize: 13 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  resource: {
    minWidth: 128,
    flex: 1,
    alignItems: "center",
    gap: 7,
    borderRadius: 16,
    backgroundColor: "#3b2114",
    padding: 12,
  },
  resourceName: {
    minHeight: 34,
    color: "#d7c19a",
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 16,
    textAlign: "center",
  },
  amount: { color: "#f0c36a", fontSize: 24, fontWeight: "800" },
});
