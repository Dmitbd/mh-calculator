import { divinityGemChests } from "@/features/game-data/divinity";
import type {
  DivinityGemChest,
  DivinityGemChestId,
  DivinityGemLevel,
} from "@/features/game-data/divinity";

import { divinityGemLevels } from "./divinityOwnedResources";
import type { DivinityOwnedResources, StoneCosts } from "./types";

const stoneKeyByLevel: Record<DivinityGemLevel, keyof StoneCosts> = {
  1: "stone1",
  2: "stone2",
  3: "stone3",
  4: "stone4",
  5: "stone5",
  6: "stone6",
  7: "stone7",
};

const chestById = new Map(
  divinityGemChests.map((chest) => [chest.id, chest] as const),
);

function applyChestCount(
  remaining: StoneCosts,
  chestId: DivinityGemChestId,
  count: number,
  levelOrder: DivinityGemLevel[],
): void {
  const chest = chestById.get(chestId) as DivinityGemChest | undefined;

  if (!chest) {
    return;
  }

  for (let index = 0; index < count; index += 1) {
    const level = levelOrder.find(
      (candidate) => remaining[stoneKeyByLevel[candidate]] > 0,
    );

    if (!level) {
      return;
    }

    const reward = chest.contents.find((content) => content.gemLevel === level);

    if (!reward) {
      continue;
    }

    const key = stoneKeyByLevel[level];
    remaining[key] = Math.max(0, remaining[key] - reward.amount);
  }
}

export function calculateRemainingDivinityCosts(
  totalCost: StoneCosts,
  resources: DivinityOwnedResources,
): StoneCosts {
  const remaining = { ...totalCost };

  for (const level of divinityGemLevels) {
    const key = stoneKeyByLevel[level];
    remaining[key] = Math.max(0, remaining[key] - resources.gemCounts[level]);
  }

  applyChestCount(remaining, "600001", resources.chestCounts["600001"], [
    1, 2, 3, 4, 5,
  ]);
  applyChestCount(remaining, "600076", resources.chestCounts["600076"], [
    6, 7, 1, 2, 3, 4, 5,
  ]);

  return remaining;
}
