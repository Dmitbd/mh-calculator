import type {
  WeeklyRivalryEventConfig,
  WeeklyRivalryReward,
} from "@/features/game-data/weekly-rivalry";

import { aggregateRewards } from "./aggregateRewards";
import { normalizeWeeklyRivalryInput } from "./normalizeWeeklyRivalryInput";
import type {
  WeeklyRivalryEventProgress,
  WeeklyRivalryInput,
} from "./types";

function rewardAmount(
  rewards: readonly WeeklyRivalryReward[],
  resourceId: number,
) {
  return rewards
    .filter((reward) => reward.resourceId === resourceId)
    .reduce((sum, reward) => sum + reward.amount, 0);
}

export function calculateWeeklyRivalryEventProgress(
  input: WeeklyRivalryInput,
  config: WeeklyRivalryEventConfig,
): WeeklyRivalryEventProgress {
  const normalized = normalizeWeeklyRivalryInput(input);
  const baseResources =
    normalized.ownedSpendResource + normalized.ownedWeeklyEventChests;
  let rivalryResources = baseResources;
  let questResources = baseResources;
  const openedNodeIds = new Set<number>();
  const completedTaskIds = new Set<number>();
  const completedSectionNumbers = new Set<number>();
  const rivalryRewards: WeeklyRivalryReward[] = [];
  const questRewards: WeeklyRivalryReward[] = [];

  // Both totals are monotonic and every validated node/task ID is consumed once.
  // Shared mode only mirrors enabled rewards into the other zone; section rewards
  // stay summary-only. The finite config therefore guarantees termination.
  let changed = true;
  while (changed) {
    changed = false;

    for (const node of config.rivalryNodes) {
      if (openedNodeIds.has(node.id)) {
        continue;
      }
      if (node.requiredScore > rivalryResources * config.pointsPerResource) {
        break;
      }

      openedNodeIds.add(node.id);
      rivalryRewards.push(...node.rewards);
      changed = true;

      const returnedResource = rewardAmount(
        node.rewards,
        config.spendResourceId,
      );
      const earnedChests = rewardAmount(
        node.rewards,
        config.weeklyEventChestResourceId,
      );
      if (normalized.includeRivalryCashback) {
        rivalryResources += returnedResource;
        if (normalized.includeSharedCashback) {
          questResources += returnedResource;
        }
      }
      if (normalized.includeWeeklyEventChestCashback) {
        rivalryResources += earnedChests;
        if (normalized.includeSharedCashback) {
          questResources += earnedChests;
        }
      }
    }

    for (const section of config.questSections) {
      for (const task of section.tasks) {
        if (completedTaskIds.has(task.id)) {
          continue;
        }
        if (task.requiredSpend > questResources) {
          break;
        }

        completedTaskIds.add(task.id);
        questRewards.push(...task.rewards);
        changed = true;

        const returnedResource = rewardAmount(
          task.rewards,
          config.spendResourceId,
        );
        if (normalized.includeQuestCashback) {
          questResources += returnedResource;
          if (normalized.includeSharedCashback) {
            rivalryResources += returnedResource;
          }
        }
      }

      if (
        !completedSectionNumbers.has(section.number) &&
        section.tasks.every((task) => completedTaskIds.has(task.id))
      ) {
        completedSectionNumbers.add(section.number);
        questRewards.push(...section.sectionRewards);
      }
    }
  }

  return {
    rivalryProgress: {
      totalScore: rivalryResources * config.pointsPerResource,
      openedNodes: openedNodeIds.size,
      cashbackRewards: aggregateRewards(rivalryRewards),
    },
    questProgress: {
      sections: config.questSections.map((section) => ({
        section,
        isComplete: completedSectionNumbers.has(section.number),
        tasks: section.tasks.map((task) => ({
          task,
          current: Math.min(questResources, task.requiredSpend),
          isComplete: completedTaskIds.has(task.id),
        })),
      })),
      cashbackRewards: aggregateRewards(questRewards),
    },
  };
}
