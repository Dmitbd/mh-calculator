import {
  ANTIQUE_EVENT_MAX_SCORE,
  ANTIQUE_MAJOR_THRESHOLDS,
  antiqueRivalryRewards,
} from "../../game-data/antiques";
import { getCoinAllocation } from "./allocateAntiqueCoins";
import { normalizeAntiqueCount } from "./normalizeAntiqueInput";
import type {
  AntiqueCashback,
  AntiqueMapCounts,
  AntiqueRivalryInput,
  AntiqueRivalryResult,
} from "./types";

const TOMB_MAP_SCORE = 30;
const TEMPLE_MAP_SCORE = 60;

const emptyCashback = (): AntiqueCashback => ({
  tombMaps: 0,
  templeMaps: 0,
  legendaryChestFragments: 0,
  mythicChestFragments: 0,
});

export function calculateAntiqueRivalry(
  input: AntiqueRivalryInput,
): AntiqueRivalryResult {
  const includeCashback = input.includeCashback !== false;
  const allocation = getCoinAllocation(input.coins, input.templeMapAllocation);
  const spentMaps: AntiqueMapCounts = {
    tombMaps: allocation.tombMaps + normalizeAntiqueCount(input.ownedTombMaps),
    templeMaps: allocation.templeMaps + normalizeAntiqueCount(input.ownedTempleMaps),
  };
  const cashback = emptyCashback();
  const baseScore =
    spentMaps.tombMaps * TOMB_MAP_SCORE +
    spentMaps.templeMaps * TEMPLE_MAP_SCORE;
  let totalScore = baseScore;
  let openedNodes = 0;
  let openedMajorChests = 0;

  for (let index = 1; index < antiqueRivalryRewards.length; index += 1) {
    const current = antiqueRivalryRewards[index];

    if (totalScore < current.score) {
      break;
    }

    const previous = antiqueRivalryRewards[index - 1];
    const tombDelta = current.tombMaps - previous.tombMaps;
    const templeDelta = current.templeMaps - previous.templeMaps;

    cashback.tombMaps += tombDelta;
    cashback.templeMaps += templeDelta;
    cashback.legendaryChestFragments +=
      current.legendaryChestFragments - previous.legendaryChestFragments;
    cashback.mythicChestFragments +=
      current.mythicChestFragments - previous.mythicChestFragments;
    if (includeCashback) {
      spentMaps.tombMaps += tombDelta;
      spentMaps.templeMaps += templeDelta;
      totalScore += tombDelta * TOMB_MAP_SCORE + templeDelta * TEMPLE_MAP_SCORE;
    }
    openedNodes += 1;

    if (ANTIQUE_MAJOR_THRESHOLDS.includes(current.score)) {
      openedMajorChests += 1;
    }
  }

  return {
    baseScore,
    totalScore,
    scoreRemaining: Math.max(0, ANTIQUE_EVENT_MAX_SCORE - totalScore),
    openedNodes,
    openedMajorChests,
    allocation,
    cashback,
    spentMaps,
  };
}
