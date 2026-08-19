import type { WeeklyRivalryReward } from "@/features/game-data/weekly-rivalry";

import type { AggregatedReward } from "./types";

export function aggregateRewards(
  rewards: readonly WeeklyRivalryReward[],
): AggregatedReward[] {
  const aggregated = new Map<number, AggregatedReward>();

  for (const reward of rewards) {
    const current = aggregated.get(reward.resourceId);
    aggregated.set(reward.resourceId, {
      ...reward,
      amount: (current?.amount ?? 0) + reward.amount,
    });
  }

  return [...aggregated.values()];
}
