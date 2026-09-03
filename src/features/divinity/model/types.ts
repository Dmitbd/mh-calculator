import type {
  DivinityGemChestId,
  DivinityGemLevel,
} from "@/features/game-data/divinity";
export type { DivinityLevel, StoneCosts } from "@/features/game-data/divinity";

export type DivinityProgress = {
  startLevel: number;
  endLevel: number;
  currentLevel: number;
  filledSegments: number;
};

export type DivinityLocalDataLoadState = "loading" | "ready" | "error";

export type DivinityChestCounts = Record<DivinityGemChestId, number>;

export type DivinityGemCounts = Record<DivinityGemLevel, number>;

export type DivinityOwnedResources = {
  chestCounts: DivinityChestCounts;
  gemCounts: DivinityGemCounts;
};
