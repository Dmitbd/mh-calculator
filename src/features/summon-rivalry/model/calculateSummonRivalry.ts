import {
  SUMMON_RIVALRY_MAJOR_THRESHOLDS,
  SUMMON_RIVALRY_MAX_SCORE,
  summonRivalryRewards,
} from "@/features/game-data/summon-rivalry";

import { calculateSummonPurchaseCosts } from "./calculateSummonPurchases";
import {
  normalizeSummonCount,
  normalizeSummonPurchaseCount,
} from "./normalizeSummonRivalryInput";
import type {
  SummonCashback,
  SummonPurchaseCounts,
  SummonResourceCounts,
  SummonRivalryInput,
  SummonRivalryResult,
} from "./types";

const SUMMON_SCORE = {
  commonScrolls: 27,
  limitedScrolls: 30,
  factionScrolls: 30,
  fateCrystals: 50,
} as const;

function calculateResourceScore(resources: SummonResourceCounts): number {
  return (
    resources.commonScrolls * SUMMON_SCORE.commonScrolls +
    resources.limitedScrolls * SUMMON_SCORE.limitedScrolls +
    resources.factionScrolls * SUMMON_SCORE.factionScrolls +
    resources.fateCrystals * SUMMON_SCORE.fateCrystals
  );
}

export function calculateSummonRivalry(
  input: SummonRivalryInput,
): SummonRivalryResult {
  const purchases: SummonPurchaseCounts = {
    commonScrolls: normalizeSummonPurchaseCount(
      input.purchasedCommonScrolls,
    ),
    limitedScrolls: normalizeSummonPurchaseCount(
      input.purchasedLimitedScrolls,
    ),
    fateCrystals: normalizeSummonPurchaseCount(input.purchasedFateCrystals),
  };
  const purchaseCosts = calculateSummonPurchaseCosts(purchases);
  const spentResources: SummonResourceCounts = {
    commonScrolls:
      normalizeSummonCount(input.ownedCommonScrolls) + purchases.commonScrolls,
    limitedScrolls:
      normalizeSummonCount(input.ownedLimitedScrolls) +
      purchases.limitedScrolls,
    factionScrolls: normalizeSummonCount(input.ownedFactionScrolls),
    fateCrystals:
      normalizeSummonCount(input.ownedFateCrystals) + purchases.fateCrystals,
  };
  const cashback: SummonCashback = {
    commonScrolls: 0,
    fateCrystals: 0,
    ssrFragments: 0,
    urFragments: 0,
  };
  const includeCashback = input.includeCashback !== false;
  const baseScore = calculateResourceScore(spentResources);
  let totalScore = baseScore;
  let openedNodes = 0;
  let openedMajorChests = 0;

  for (const reward of summonRivalryRewards) {
    if (reward.score > totalScore) {
      break;
    }

    openedNodes += 1;
    if (SUMMON_RIVALRY_MAJOR_THRESHOLDS.includes(reward.score)) {
      openedMajorChests += 1;
    }

    cashback.commonScrolls += reward.commonScrolls;
    cashback.fateCrystals += reward.fateCrystals;
    cashback.ssrFragments += reward.ssrFragments;
    cashback.urFragments += reward.urFragments;

    if (includeCashback) {
      spentResources.commonScrolls += reward.commonScrolls;
      spentResources.fateCrystals += reward.fateCrystals;
      totalScore +=
        reward.commonScrolls * SUMMON_SCORE.commonScrolls +
        reward.fateCrystals * SUMMON_SCORE.fateCrystals;
    }
  }

  return {
    baseScore,
    totalScore,
    scoreRemaining: Math.max(0, SUMMON_RIVALRY_MAX_SCORE - totalScore),
    openedNodes,
    openedMajorChests,
    spentResources,
    purchases,
    purchaseCosts,
    diamondCost: purchaseCosts.total,
    cashback,
  };
}

export type {
  SummonCashback,
  SummonPurchaseCosts,
  SummonPurchaseCounts,
  SummonResourceCounts,
  SummonRivalryInput,
  SummonRivalryResult,
} from "./types";
