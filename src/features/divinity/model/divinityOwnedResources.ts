import type { DivinityGemLevel } from "@/features/game-data/divinity";

import type { DivinityOwnedResources } from "./types";

export const divinityGemLevels: DivinityGemLevel[] = [1, 2, 3, 4, 5, 6, 7];

export function createEmptyDivinityOwnedResources(): DivinityOwnedResources {
  return {
    chestCounts: {
      "600001": 0,
      "600076": 0,
    },
    gemCounts: {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0,
      6: 0,
      7: 0,
    },
  };
}
