import { StyleSheet, Text, View } from "react-native";

import type { WeeklyRivalryReward } from "@/features/game-data/weekly-rivalry";

import { WeeklyRivalryResourceIcon } from "./WeeklyRivalryResourceIcon";

type WeeklyRewardListProps = {
  rewards: readonly WeeklyRivalryReward[];
  iconSize?: number;
};

export function WeeklyRewardList({
  rewards,
  iconSize = 28,
}: WeeklyRewardListProps) {
  return (
    <View style={styles.list}>
      {rewards.map((reward) => (
        <View
          key={reward.resourceId}
          accessible
          accessibilityLabel={`${reward.name}: ${reward.amount}`}
          style={styles.reward}
        >
          <WeeklyRivalryResourceIcon resource={reward} size={iconSize} />
          <Text style={styles.amount}>×{reward.amount}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  reward: {
    alignItems: "center",
    gap: 1,
  },
  amount: {
    color: "#f0c36a",
    fontSize: 10,
    fontWeight: "800",
  },
});
